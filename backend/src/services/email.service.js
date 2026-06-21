const nodemailer = require('nodemailer');

// Configurar transporter con variables de entorno
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verificar conexión al iniciar
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error al verificar transporter de email:', error.message);
  } else {
    console.log('✅ Transporter de email configurado correctamente');
  }
});

const enviarComprobanteEmail = async ({ email, comprobante, numeroQR }) => {
  if (!email) {
    const error = new Error('Email requerido');
    error.status = 400;
    throw error;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Email no configurado. Saltando envío.');
    return { enviado: false, motivo: 'Email no configurado en servidor' };
  }

  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .section { margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
    .section:last-child { border-bottom: none; }
    .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .value { font-size: 16px; font-weight: 600; color: #1e293b; }
    .qr-section { text-align: center; margin: 20px 0; }
    .qr-image { max-width: 200px; height: auto; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Comprobante de Compra</h2>
      <p>${comprobante.numero}</p>
    </div>
    <div class="content">
      <div class="section">
        <div class="label">Cliente</div>
        <div class="value">${comprobante.razonSocialCliente || 'Cliente'}</div>
        <div class="label" style="margin-top: 10px;">NIT/CID</div>
        <div class="value">${comprobante.nitCliente || '—'}</div>
      </div>

      <div class="section">
        <div class="label">Película</div>
        <div class="value">${comprobante.peliculaTitulo}</div>
        <div class="label" style="margin-top: 10px;">Fecha y Hora</div>
        <div class="value">${comprobante.fecha} • ${comprobante.horaInicio}</div>
        <div class="label" style="margin-top: 10px;">Sala</div>
        <div class="value">${comprobante.salaTipo || comprobante.idSala}</div>
        <div class="label" style="margin-top: 10px;">Asientos</div>
        <div class="value">${comprobante.asientos}</div>
      </div>

      <div class="section">
        <div class="label">Método de Pago</div>
        <div class="value">${comprobante.metodoPago}</div>
        <div class="label" style="margin-top: 10px;">Total</div>
        <div style="font-size: 24px; font-weight: bold; color: #4f46e5;">Bs${Number(comprobante.montoTotal).toFixed(2)}</div>
      </div>

      <div class="qr-section">
        <div class="label">Escanea para verificar tu comprobante</div>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(numeroQR)}" alt="QR Code" class="qr-image" />
      </div>
    </div>
    <div class="footer">
      <p>Comprobante generado el ${new Date().toLocaleString()}</p>
      <p>Sistema de Ventas de Cine</p>
    </div>
  </div>
</body>
</html>
    `;

    console.log(`📧 Enviando email a: ${email}`);
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Comprobante de Compra - ${comprobante.numero}`,
      html,
    });

    console.log(`✅ Email enviado correctamente. Message ID: ${info.messageId}`);
    return { enviado: true };
  } catch (error) {
    console.error('❌ Error al enviar email:', error.message);
    console.error('Detalles del error:', error);
    return { enviado: false, motivo: error.message };
  }
};

module.exports = {
  enviarComprobanteEmail,
};
