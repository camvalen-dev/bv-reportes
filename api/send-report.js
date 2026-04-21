import { Resend } from 'resend';

export default async function handler(req, res) {
  // CORS (por si se llama desde otro dominio)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar RESEND_API_KEY en Vercel' });
  }

  try {
    const { to, obraNombre, equipo, fecha, totalHH, numTrabajadores, fileBase64, fileName } = req.body;

    if (!to || !fileBase64 || !fileName) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const resend = new Resend(apiKey);

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #ea580c); padding: 30px; border-radius: 16px; color: #0f172a;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900;">Reporte Diario de Trabajo</h1>
          <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">${obraNombre || ''}</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 20px;">
          <h2 style="margin: 0 0 16px; font-size: 16px; color: #0f172a;">Resumen</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Fecha</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${fecha || ''}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Equipo</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${equipo || ''}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Trabajadores</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${numTrabajadores || 0}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Total HH</td><td style="padding: 8px 0; font-weight: 600; text-align: right; color: #f59e0b;">${totalHH || 0} HH</td></tr>
          </table>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #86efac; border-radius: 12px; padding: 16px; margin-top: 16px;">
          <p style="margin: 0; font-size: 13px; color: #065f46;">
            📎 El reporte detallado se encuentra adjunto en formato Excel (.xlsx) con dos pestañas: <strong>REPORTE DIARIO</strong> y <strong>RESUMEN</strong>.
          </p>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center;">
          Enviado automáticamente desde BV Reportes
        </p>
      </div>
    `;

    const data = await resend.emails.send({
      from: `BV Reportes <${fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject: `Reporte Diario · ${obraNombre || 'Obra'} · ${fecha || ''} · ${equipo || ''}`,
      html,
      attachments: [{ filename: fileName, content: fileBase64 }],
    });

    return res.status(200).json({ success: true, id: data?.data?.id });
  } catch (err) {
    console.error('Error enviando correo:', err);
    return res.status(500).json({ error: err.message || 'Error desconocido' });
  }
}
