export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, correo, tipo, materiales, descripcion } = req.body;

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const driveScriptUrl = process.env.GOOGLE_DRIVE_SCRIPT_URL; // La pegamos en las variables de Vercel

    const payload = { nombre, correo, tipo, materiales, descripcion };

    // 1. Notificar a Discord
    const discordPayload = {
      embeds: [{
        title: "🛠️ Nueva Cotización Recibida",
        color: 3447003,
        fields: [
          { name: "Cliente", value: nombre, inline: true },
          { name: "Email", value: correo, inline: true },
          { name: "Tipo", value: tipo, inline: false },
          { name: "Materiales", value: materiales, inline: false },
          { name: "Descripción", value: descripcion, inline: false }
        ],
        footer: { text: "Armadillo Tacticals | Sistema Automatizado" },
        timestamp: new Date().toISOString()
      }]
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload)
    });

    // 2. Registrar automáticamente en Google Drive
    await fetch(driveScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    return res.status(200).json({ status: "success" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.toString() });
  }
}
