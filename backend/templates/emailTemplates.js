/**
 * Email Templates - OnAlert Sistema de Vigilancia
 * Plantillas HTML profesionales para diferentes tipos de notificaciones
 */

const BRANDING = {
  primaryColor: '#0d5c63',
  accentColor: '#06b6d4',
  logoUrl: 'https://via.placeholder.com/200x60/0d5c63/ffffff?text=OnAlert',
  companyName: 'OnAlert TESCH',
};

const STATE_EMOJI = {
  pendiente: '⏳',
  en_proceso: '🔄',
  cerrada: '✅',
  falsa_alarma: '⚠️',
};

const STATE_LABELS = {
  pendiente: 'Pendiente',
  en_proceso: 'En Proceso',
  cerrada: 'Resuelta',
  falsa_alarma: 'Falsa Alarma',
};

/**
 * Template: Incident Report (sent to coordinators when incident is closed)
 */
exports.incidentReportTemplate = ({ alert, guardName, coordEmails }) => {
  const stateEmoji = STATE_EMOJI[alert.estado] || '❓';
  const stateLabel = STATE_LABELS[alert.estado] || alert.estado;
  const mapsLink = alert.latitude && alert.longitude
    ? `https://www.openstreetmap.org/?mlat=${alert.latitude}&mlon=${alert.longitude}&zoom=17`
    : 'No disponible';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte de Incidente OnAlert</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a2a36; background: #f5f7fa; }
        .container { max-width: 600px; margin: 20px auto; }
        .wrapper { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        header { background: linear-gradient(135deg, ${BRANDING.primaryColor} 0%, ${BRANDING.accentColor} 100%); color: white; padding: 30px 20px; text-align: center; }
        header h1 { font-size: 22px; margin-bottom: 8px; }
        header p { font-size: 14px; opacity: 0.9; }
        .content { padding: 30px; }
        .section { margin-bottom: 25px; }
        .section-title { color: ${BRANDING.primaryColor}; font-size: 16px; font-weight: 700; border-bottom: 2px solid ${BRANDING.primaryColor}; padding-bottom: 10px; margin-bottom: 15px; }
        .user-card { display: flex; gap: 15px; align-items: flex-start; background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid ${BRANDING.primaryColor}; }
        .avatar { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, ${BRANDING.primaryColor} 0%, ${BRANDING.accentColor} 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px; flex-shrink: 0; }
        .user-info { flex: 1; }
        .user-name { font-weight: 700; font-size: 16px; color: #1a2a36; }
        .user-detail { font-size: 13px; color: #666; line-height: 1.6; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .info-box { background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 3px solid ${BRANDING.accentColor}; }
        .info-label { font-size: 12px; color: #666; font-weight: 600; margin-bottom: 4px; }
        .info-value { font-size: 14px; color: #1a2a36; font-weight: 600; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; background: #e8f4f8; color: ${BRANDING.primaryColor}; font-size: 13px; font-weight: 600; }
        .description-box { background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9; }
        .description-label { font-weight: 600; color: ${BRANDING.primaryColor}; margin-bottom: 8px; }
        .description-text { font-size: 14px; color: #333; line-height: 1.6; }
        .map-link { display: inline-block; margin-top: 10px; padding: 8px 12px; background: ${BRANDING.primaryColor}; color: white; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 600; }
        .timeline { margin-top: 15px; }
        .timeline-item { display: flex; gap: 10px; margin-bottom: 12px; font-size: 13px; }
        .timeline-marker { color: ${BRANDING.primaryColor}; font-weight: bold; min-width: 40px; }
        .timeline-text { color: #666; }
        footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #999; }
        .footer-link { color: ${BRANDING.primaryColor}; text-decoration: none; }
        @media (max-width: 600px) {
          .info-grid { grid-template-columns: 1fr; }
          .user-card { flex-direction: column; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="wrapper">
          <header>
            <h1>🚨 Reporte de Incidente OnAlert</h1>
            <p>#${alert.id} - ${stateEmoji} ${stateLabel}</p>
          </header>

          <div class="content">
            <!-- Información del Usuario -->
            <div class="section">
              <div class="section-title">Remitente del Incidente</div>
              <div class="user-card">
                <div class="avatar">${alert.usuario.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                  <div class="user-name">${alert.usuario}</div>
                  <div class="user-detail">
                    <strong>Email:</strong> ${alert.email}<br>
                    <strong>Rol:</strong> ${alert.role === 'student' ? 'Alumno' : alert.role === 'professor' ? 'Profesor' : 'Personal'}<br>
                    <strong>Reportado:</strong> ${new Date(alert.createdAt).toLocaleString('es-MX')}
                  </div>
                </div>
              </div>
            </div>

            <!-- Detalles Técnicos -->
            <div class="section">
              <div class="section-title">Detalles del Incidente</div>
              <div class="info-grid">
                <div class="info-box">
                  <div class="info-label">Estado Actual</div>
                  <div class="info-value">${stateEmoji} ${stateLabel}</div>
                </div>
                <div class="info-box">
                  <div class="info-label">Prioridad</div>
                  <div class="info-value">${alert.prioridad.toUpperCase()}</div>
                </div>
                <div class="info-box">
                  <div class="info-label">Fecha Creación</div>
                  <div class="info-value">${new Date(alert.createdAt).toLocaleDateString('es-MX')}</div>
                </div>
                <div class="info-box">
                  <div class="info-label">Última Actualización</div>
                  <div class="info-value">${new Date(alert.updatedAt).toLocaleDateString('es-MX')}</div>
                </div>
              </div>
            </div>

            <!-- Descripción -->
            <div class="section">
              <div class="description-box">
                <div class="description-label">📝 Descripción del Incidente</div>
                <div class="description-text">
                  ${alert.descripcion || 'Sin descripción proporcionada'}
                </div>
              </div>
            </div>

            <!-- Observación Final -->
            ${alert.observacion ? `
            <div class="section">
              <div class="description-box" style="border-left-color: #10b981; background: #f0fdf4;">
                <div class="description-label" style="color: #10b981;">✓ Observación del Guardia</div>
                <div class="description-text">
                  ${alert.observacion}
                </div>
              </div>
            </div>
            ` : ''}

            <!-- Ubicación -->
            <div class="section">
              <div class="section-title">📍 Ubicación</div>
              <div class="info-box">
                <div class="info-label">Coordenadas GPS</div>
                <div class="info-value" style="font-family: 'Courier New', monospace;">
                  ${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}
                </div>
                <a href="${mapsLink}" target="_blank" class="map-link">Ver en OpenStreetMap ↗</a>
              </div>
            </div>

            <!-- Atención -->
            <div class="section">
              <div class="section-title">👮 Atención</div>
              <div class="info-box">
                <div class="info-label">Atendido por</div>
                <div class="info-value">${guardName}</div>
              </div>
            </div>

            <!-- Call to Action -->
            <div class="section" style="text-align: center; padding: 20px; background: #f0f9ff; border-radius: 8px;">
              <p style="margin: 0; color: #666; font-size: 13px;">
                Para más detalles o seguimiento, accede al dashboard de OnAlert.
              </p>
            </div>
          </div>

          <footer>
            <p style="margin-bottom: 10px;">
              ¿Preguntas? Contacta a administración de sistemas
            </p>
            <p>
              © 2026 ${BRANDING.companyName} | 
              <a href="#" class="footer-link">Dashboard</a> | 
              <a href="#" class="footer-link">Soporte</a>
            </p>
            <p style="margin-top: 10px; font-size: 11px; color: #bbb;">
              Este correo fue generado automáticamente. No responder a este correo.
            </p>
          </footer>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject: `[OnAlert] Incidente ${stateLabel} — ${alert.usuario}`,
    html,
  };
};

/**
 * Template: Pending Alert Notification (sent to coordinators for urgent alerts)
 */
exports.pendingAlertTemplate = ({ alert, userName }) => {
  const mapsLink = `https://www.openstreetmap.org/?mlat=${alert.latitude}&mlon=${alert.longitude}&zoom=17`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alerta Pendiente - OnAlert</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff3cd; }
        .container { max-width: 600px; margin: 20px auto; }
        .wrapper { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border-left: 5px solid #ff9800; }
        header { background: #ff9800; color: white; padding: 20px; }
        header h1 { font-size: 20px; margin-bottom: 5px; }
        .content { padding: 20px; }
        .alert-box { background: #fff3cd; border: 2px solid #ff9800; border-radius: 6px; padding: 15px; margin-bottom: 20px; }
        .alert-title { color: #ff6b00; font-weight: 700; font-size: 16px; margin-bottom: 10px; }
        .alert-text { color: #333; font-size: 14px; line-height: 1.6; }
        .action-button { display: inline-block; margin-top: 15px; padding: 12px 24px; background: #ff9800; color: white; text-decoration: none; border-radius: 4px; font-weight: 600; }
        footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="wrapper">
          <header>
            <h1>⏳ Alerta Pendiente de Atención</h1>
          </header>
          <div class="content">
            <div class="alert-box">
              <div class="alert-title">🚨 Nueva alerta pendiente en el sistema</div>
              <div class="alert-text">
                <strong>${userName}</strong> ha reportado un incidente que requiere atención inmediata.
                <br><br>
                <strong>ID:</strong> #${alert.id}<br>
                <strong>Prioridad:</strong> ${alert.prioridad.toUpperCase()}<br>
                <strong>Ubicación:</strong> ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}<br>
                <strong>Hora:</strong> ${new Date(alert.createdAt).toLocaleTimeString('es-MX')}
              </div>
              <a href="${mapsLink}" target="_blank" class="action-button">Ver ubicación en mapa</a>
            </div>
          </div>
          <footer>
            Accede al dashboard de OnAlert para más detalles y coordinar respuesta.
          </footer>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject: `[OnAlert] ⏳ ALERTA PENDIENTE — ${userName}`,
    html,
  };
};

/**
 * Template: False Alarm Confirmation (sent to coordinators)
 */
exports.falseAlarmTemplate = ({ alert, guardName, reason }) => {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Falsa Alarma - OnAlert</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; }
        .wrapper { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 20px; }
        header h1 { font-size: 20px; margin-bottom: 5px; }
        .content { padding: 20px; }
        .warning-box { background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .warning-title { color: #ff6b00; font-weight: 700; margin-bottom: 10px; }
        .info-item { display: flex; gap: 10px; margin-bottom: 10px; font-size: 14px; }
        .info-label { font-weight: 600; color: #333; min-width: 120px; }
        .info-value { color: #666; }
        footer { background: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="wrapper">
          <header>
            <h1>⚠️ Incidente Clasificado como Falsa Alarma</h1>
          </header>
          <div class="content">
            <div class="warning-box">
              <div class="warning-title">Clasificación: FALSA ALARMA</div>
              <div class="info-item">
                <div class="info-label">ID Incidente:</div>
                <div class="info-value">#${alert.id}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Clasificado por:</div>
                <div class="info-value">${guardName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Fecha:</div>
                <div class="info-value">${new Date().toLocaleString('es-MX')}</div>
              </div>
              ${reason ? `
              <div class="info-item">
                <div class="info-label">Razón:</div>
                <div class="info-value">${reason}</div>
              </div>
              ` : ''}
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Este incidente ha sido clasificado como una falsa alarma en el sistema OnAlert. 
              Se ha registrado en el historial de auditoría para seguimiento institucional.
            </p>
          </div>
          <footer>
            Sistema OnAlert de Vigilancia Universitaria
          </footer>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject: `[OnAlert] ⚠️ FALSA ALARMA — Incidente #${alert.id}`,
    html,
  };
};

/**
 * Template: Daily Summary (sent to coordinators)
 */
exports.dailySummaryTemplate = ({ summary, date }) => {
  const totalIncidents = summary.total || 0;
  const resolved = summary.cerradas || 0;
  const pending = summary.pendientes || 0;
  const falseAlarms = summary.falsas_alarmas || 0;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resumen Diario - OnAlert</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
        .container { max-width: 600px; margin: 20px auto; }
        .wrapper { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        header { background: linear-gradient(135deg, #0d5c63 0%, #06b6d4 100%); color: white; padding: 30px 20px; text-align: center; }
        header h1 { font-size: 24px; margin-bottom: 5px; }
        header p { font-size: 14px; opacity: 0.9; }
        .content { padding: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: #f9fafb; border-radius: 8px; padding: 20px; text-align: center; border-top: 4px solid #0d5c63; }
        .stat-number { font-size: 32px; font-weight: 700; color: #0d5c63; }
        .stat-label { font-size: 13px; color: #666; margin-top: 5px; }
        .highlight { background: linear-gradient(135deg, #0d5c63 0%, #06b6d4 100%); color: white; }
        .highlight .stat-number { color: white; }
        .highlight .stat-label { color: rgba(255,255,255,0.9); }
        footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="wrapper">
          <header>
            <h1>📊 Resumen Diario de Incidentes</h1>
            <p>${date}</p>
          </header>
          <div class="content">
            <div class="stats-grid">
              <div class="stat-card highlight">
                <div class="stat-number">${totalIncidents}</div>
                <div class="stat-label">Total de Incidentes</div>
              </div>
              <div class="stat-card">
                <div class="stat-number" style="color: #4caf50;">${resolved}</div>
                <div class="stat-label">Resueltos</div>
              </div>
              <div class="stat-card">
                <div class="stat-number" style="color: #ff9800;">${pending}</div>
                <div class="stat-label">Pendientes</div>
              </div>
              <div class="stat-card">
                <div class="stat-number" style="color: #f44336;">${falseAlarms}</div>
                <div class="stat-label">Falsas Alarmas</div>
              </div>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
              Accede al dashboard para revisar todos los detalles de los incidentes del día.
            </p>
          </div>
          <footer>
            © 2026 OnAlert TESCH | Sistema de Vigilancia Universitaria
          </footer>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject: `[OnAlert] 📊 Resumen Diario — ${date}`,
    html,
  };
};
