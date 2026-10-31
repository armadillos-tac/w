import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { nombre, correo, tipo, materiales, descripcion } = body || {};

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    // 1. Notificar a Discord
    if (webhookUrl) {
      const discordPayload = {
        embeds: [{
          title: "🛠️ Nueva Solicitud de Proyecto / Cotización",
          color: 3447003,
          fields: [
            { name: "Cliente", value: nombre || "No indicado", inline: true },
            { name: "Contacto", value: correo || "No indicado", inline: true },
            { name: "Tipo de Trabajo", value: tipo || "No indicado", inline: false },
            { name: "Materiales", value: materiales || "No indicado", inline: false },
            { name: "Descripción", value: descripcion || "No indicado", inline: false }
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
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const fechaHora = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreArchivo = `Cotizacion_${fechaHora}_${nombre.replace(/[^a-zA-Z0-9]/g, '_')}.md`;

    const contenidoMarkdown = 
      `# Nueva Solicitud de Proyecto - Armadillo Tacticals\n\n` +
      `* **Cliente:** ${nombre}\n` +
      `* **Correo:** ${correo}\n` +
      `* **Tipo de Trabajo:** ${tipo}\n` +
      `* **Materiales Deseados:** ${materiales}\n\n` +
      `## Descripción del Proyecto\n${descripcion}\n\n` +
      `---\n*Generado automáticamente por el sistema web.*`;

    await drive.files.create({
      requestBody: {
        name: nombreArchivo,
        mimeType: 'text/markdown',
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // ID de la carpeta que compartiste
      },
      media: {
        mimeType: 'text/markdown',
        body: contenidoMarkdown,
      },
    });

    return res.status(200).json({ status: "success" });

  } catch (err) {
    console.error("Error en la API:", err);
    return res.status(500).json({ status: "error", message: err.toString() });
  }
}
