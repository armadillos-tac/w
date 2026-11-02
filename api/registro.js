import { createHash, timingSafeEqual } from 'node:crypto';

const CARPETAS = { cotizacion: 'cotizaciones', proyecto: 'proyectos', entrenamiento: 'entrenamiento', plan: 'planes' };
const txt = (v, max) => String(v ?? '').trim().slice(0, max);
const una = v => String(v).replace(/\s+/g, ' ');
const slug = t => txt(t, 80).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const hash = s => createHash('sha256').update(String(s)).digest();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { GITHUB_TOKEN, GITHUB_REPO, DISCORD_WEBHOOK_URL, CENTRO_CLAVE } = process.env;

  let b;
  try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}; }
  catch { return res.status(400).json({ error: 'JSON inválido' }); }

  const tipo = txt(b.tipo, 20), carpeta = CARPETAS[tipo];
  if (!carpeta) return res.status(400).json({ error: 'Tipo desconocido' });

  let id, md, resumen;
  if (tipo === 'cotizacion') {
    // Público: el servidor arma el Markdown, el cliente no puede escribir archivos arbitrarios
    if (b.web) return res.status(200).json({ status: 'success' }); // campo trampa anti-bots
    const f = { nombre: una(txt(b.nombre, 100)), correo: una(txt(b.correo, 150)), tipo: una(txt(b.trabajo ?? b.tipo_trabajo, 100)),
      materiales: una(txt(b.materiales, 300)), descripcion: txt(b.descripcion, 1500) };
    if (!f.nombre || !f.correo || !f.descripcion) return res.status(400).json({ error: 'Faltan datos' });
    const ahora = new Date().toISOString();
    id = `${ahora.slice(0, 10)}_${ahora.slice(11, 19).replace(/:/g, '')}_${slug(f.nombre) || 'cliente'}`;
    md = `---\ntipo: cotizacion\nid: ${JSON.stringify(id)}\nfecha: ${ahora.slice(0, 10)}\nestado: pendiente\n` +
      `nombre: ${JSON.stringify(f.nombre)}\ncorreo: ${JSON.stringify(f.correo)}\n---\n\n# Solicitud de ${f.nombre}\n\n` +
      `- **Tipo de trabajo:** ${f.tipo}\n- **Materiales:** ${f.materiales}\n\n## Descripción\n${f.descripcion}\n`;
    resumen = `**${f.nombre}** · ${f.correo}\n${f.tipo}`;
  } else {
    // Privado (Centro de Control): exige la clave
    const ok = CENTRO_CLAVE && timingSafeEqual(hash(req.headers['x-clave']), hash(CENTRO_CLAVE));
    if (!ok) return res.status(401).json({ error: 'Clave incorrecta' });
    id = slug(b.id);
    md = String(b.markdown ?? '').slice(0, 20000);
    if (!id || !md.trim()) return res.status(400).json({ error: 'Faltan datos' });
    resumen = `Archivo \`${carpeta}/${id}.md\``;
  }

  const github = async () => {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${carpeta}/${id}.md`;
    const h = { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'armadillo-web' };
    const put = sha => fetch(url, { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `${tipo}: ${id}`, content: Buffer.from(md).toString('base64'), ...(sha && { sha }) }) });
    let r = await put();
    if (r.status === 422 || r.status === 409) { // ya existía: se actualiza
      const g = await fetch(url, { headers: h });
      if (g.ok) r = await put((await g.json()).sha);
    }
    if (!r.ok) throw new Error('GitHub respondió ' + r.status);
  };

  const discord = async () => {
    const form = new FormData();
    form.append('payload_json', JSON.stringify({ embeds: [{ title: tipo === 'cotizacion' ? '🛠️ Nueva cotización' : '📋 Nuevo registro: ' + tipo,
      description: resumen, color: 3447003, timestamp: new Date().toISOString() }] }));
    form.append('files[0]', new Blob([md], { type: 'text/markdown' }), id + '.md');
    const r = await fetch(DISCORD_WEBHOOK_URL, { method: 'POST', body: form });
    if (!r.ok) throw new Error('Discord respondió ' + r.status);
  };

  // Basta con que un canal funcione para no perder el registro
  const canales = { github: false, discord: false };
  const intentar = async (nombre, activo, fn) => {
    if (!activo) return console.error('registro:', nombre, 'sin configurar');
    try { await fn(); canales[nombre] = true; } catch (e) { console.error('registro:', nombre, e); }
  };
  await Promise.all([intentar('github', GITHUB_TOKEN && GITHUB_REPO, github), intentar('discord', DISCORD_WEBHOOK_URL, discord)]);
  if (!canales.github && !canales.discord) return res.status(500).json({ error: 'No se pudo guardar', canales });
  res.status(200).json({ status: 'success', canales });
}
