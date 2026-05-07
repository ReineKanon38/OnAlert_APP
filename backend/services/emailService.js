/**
 * Email Service - OnAlert
 * Usa Resend (HTTPS) en lugar de SMTP directo (bloqueado en Render free tier)
 */

const { Resend } = require('resend');
const emailTemplates = require('../templates/emailTemplates');

let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
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
 * Validar que Resend esté configurado
 */
function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Enviar email genérico usando Resend
 */
async function sendEmail({ to, subject, html }) {
  try {
    if (!isEmailConfigured()) {
      console.warn('[Email] RESEND_API_KEY no configurado. Saltando envío de:', subject);
      return { success: false, reason: 'Email not configured' };
    }

    const resend = getResendClient();
    const recipients = Array.isArray(to) ? to : [to];

    const { data, error } = await resend.emails.send({
      from: 'OnAlert Sistema <onboarding@resend.dev>',
      to: recipients,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] ❌ Error Resend:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`[Email] ✅ Correo enviado: ${subject}`);
    console.log(`[Email] Destinatarios: ${recipients.join(', ')}`);
    return { success: true, messageId: data.id };
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
    console.log('[Email] RESEND_API_KEY no encontrada. Saltando envío de reporte.');
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
  isEmailConfigured,
  getRecipients,
  sendEmail,
  sendIncidentReport,
  sendUrgentAlertNotification,
  sendFalseAlarmConfirmation,
  sendDailySummary,
  sendGuardOnlineNotification,
};
