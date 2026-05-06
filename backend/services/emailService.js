/**
 * Email Service - OnAlert
 * Servicio centralizado para envío de notificaciones por email
 */

const nodemailer = require('nodemailer');
const emailTemplates = require('../templates/emailTemplates');

// Configuración de transporte
let transporter = null;

/**
 * Inicializar transporte de email
 */
function initializeTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // false para TLS, true para SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Obtener lista de coordinadores/receptores
 */
function getRecipients() {
  const coordEmails = (process.env.COORD_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  return [...new Set([...coordEmails, ...adminEmails])];
}

/**
 * Validar que SMTP esté configurado
 */
function isEmailConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Enviar email genérico
 */
async function sendEmail({ to, subject, html, replyTo }) {
  try {
    if (!isEmailConfigured()) {
      console.warn('[Email] Email no configurado. Saltando envío de:', subject);
      return { success: false, reason: 'Email not configured' };
    }

    const transporter = initializeTransporter();
    const recipients = Array.isArray(to) ? to : [to];

    const result = await transporter.sendMail({
      from: `"OnAlert Sistema" <${process.env.SMTP_USER}>`,
      to: recipients.join(', '),
      subject,
      html,
      replyTo: replyTo || process.env.SMTP_USER,
    });

    console.log(`[Email] ✅ Correo enviado: ${subject}`);
    console.log(`[Email] Destinatarios: ${recipients.join(', ')}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Email] ❌ Error enviando correo:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar reporte de incidente cerrado/falsa alarma
 */
async function sendIncidentReport({ alert, guardName }) {
  if (!isEmailConfigured()) {
    console.log('[Email] Configuración de SMTP no encontrada. Saltando envío de reporte.');
    return { success: false, reason: 'Email not configured' };
  }

  try {
    const recipients = getRecipients();
    if (recipients.length === 0) {
      console.warn('[Email] No hay coordinadores configurados para recibir reportes');
      return { success: false, reason: 'No recipients configured' };
    }

    const template = emailTemplates.incidentReportTemplate({
      alert,
      guardName,
      coordEmails: recipients,
    });

    return await sendEmail({
      to: recipients,
      subject: template.subject,
      html: template.html,
    });
  } catch (error) {
    console.error('[Email] Error en sendIncidentReport:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar notificación de alerta pendiente urgente
 */
async function sendUrgentAlertNotification({ alert, userName }) {
  if (!isEmailConfigured()) return { success: false };

  try {
    const recipients = getRecipients();
    const template = emailTemplates.pendingAlertTemplate({ alert, userName });

    return await sendEmail({
      to: recipients,
      subject: template.subject,
      html: template.html,
    });
  } catch (error) {
    console.error('[Email] Error en sendUrgentAlertNotification:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar confirmación de falsa alarma
 */
async function sendFalseAlarmConfirmation({ alert, guardName, reason }) {
  if (!isEmailConfigured()) return { success: false };

  try {
    const recipients = getRecipients();
    const template = emailTemplates.falseAlarmTemplate({ alert, guardName, reason });

    return await sendEmail({
      to: recipients,
      subject: template.subject,
      html: template.html,
    });
  } catch (error) {
    console.error('[Email] Error en sendFalseAlarmConfirmation:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar resumen diario
 */
async function sendDailySummary({ summary, date }) {
  if (!isEmailConfigured()) return { success: false };

  try {
    const recipients = getRecipients();
    const template = emailTemplates.dailySummaryTemplate({ summary, date });

    return await sendEmail({
      to: recipients,
      subject: template.subject,
      html: template.html,
    });
  } catch (error) {
    console.error('[Email] Error en sendDailySummary:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar notificación de guardia conectado (opcional para admin)
 */
async function sendGuardOnlineNotification({ guardName, adminEmails }) {
  if (!isEmailConfigured()) return { success: false };

  try {
    const recipients = adminEmails || getRecipients();
    const html = `
      <html>
        <body style="font-family: Arial; color: #333;">
          <h2>✅ Guardia Conectado</h2>
          <p><strong>${guardName}</strong> acaba de conectarse al dashboard de OnAlert.</p>
          <p>Timestamp: ${new Date().toLocaleString('es-MX')}</p>
        </body>
      </html>
    `;

    return await sendEmail({
      to: recipients,
      subject: `[OnAlert] ✅ Guardia conectado: ${guardName}`,
      html,
    });
  } catch (error) {
    console.error('[Email] Error en sendGuardOnlineNotification:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeTransporter,
  isEmailConfigured,
  getRecipients,
  sendEmail,
  sendIncidentReport,
  sendUrgentAlertNotification,
  sendFalseAlarmConfirmation,
  sendDailySummary,
  sendGuardOnlineNotification,
};
