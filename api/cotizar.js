import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { nombre, correo, tipo, materiales, descripcion } = body || {};

    // Valores seguros por defecto para evitar que falle si faltan datos
    const clienteSeguro = nombre ? String(nombre) : "Cliente";
    const correoSeguro = correo ? String(correo) : "No indicado";
    const tipoSeguro = tipo ? String(tipo) : "No indicado";
    const materialesSeguros = materiales ? String(materiales) : "No indicado";
    const descSegura = descripcion ? String(descripcion) : "No indicada";

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    // 1. Notificar a Discord
    if (webhookUrl) {
      const discordPayload = {
        embeds: [{
          title: "🛠️ Nueva Solicitud de Proyecto / Cotización",
          color: 3447003,
          fields: [
            { name: "Cliente", value: clienteSeguro, inline: true },
            { name: "Contacto", value: correoSeguro, inline: true },
            { name: "Tipo de Trabajo", value: tipoSeguro, inline: false },
            { name: "Materiales", value: materialesSeguros, inline: false },
            { name: "Descripción", value: descSegura, inline: false }
          ],
          footer: { text: "Armadillo Tacticals | Sistema Web" },
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordPayload)
      });
    }

    // 2. Crear archivo .md directamente en Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const fechaHora = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreLimpio = clienteSeguro.replace(/[^a-zA-Z0-9]/g, '_');
    const nombreArchivo = `Cotizacion_${fechaHora}_${nombreLimpio}.md`;

    const contenidoMarkdown = 
      `# Nueva Solicitud de Proyecto - Armadillo Tacticals\n\n` +
      `* **Cliente:** ${clienteSeguro}\n` +
      `* **Correo:** ${correoSeguro}\n` +
      `* **Tipo de Trabajo:** ${tipoSeguro}\n` +
      `* **Materiales Deseados:** ${materialesSeguros}\n\n` +
      `## Descripción del Proyecto\n${descSegura}\n\n` +
      `---\n*Generado automáticamente por el sistema web.*`;

    await drive.files.create({
      requestBody: {
        name: nombreArchivo,
        mimeType: 'text/markdown',
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: 'text/markdown',
        body: contenidoMarkdown,
      },
    });

    return res.status(200).json({ status: "success" });

  } catch (err) {
    console.error("Error detallado en la API:", err);
    return res.status(500).json({ status: "error", message: err.toString() });
  }
}
