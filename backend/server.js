const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const dns = require('dns');
const swaggerUi = require('swagger-ui-express');
const openApiSpec = require('./openapi.json');
const { createServer } = require('http');
const { Server } = require('socket.io');
const emailService = require('./services/emailService');

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

// Función wrapper para enviar reportes usando el nuevo servicio
async function sendIncidentReport({ alert, guardName }) {
  try {
    await emailService.sendIncidentReport({ alert, guardName });
  } catch (error) {
    console.error('[Email] Error al enviar reporte:', error.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const alertStates = ['pendiente', 'en_proceso', 'cerrada', 'falsa_alarma'];
const alertPriorities = ['falsa_alarma', 'baja', 'media', 'alta', 'urgente'];
const mobileRoles = ['student', 'professor'];
const securityRoles = ['security', 'admin'];
const alertCooldownSeconds = Number(process.env.ALERT_COOLDOWN_SECONDS || 30);
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'profile-photos';

const uploadProfilePhoto = async (userId, base64DataUrl) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase Storage no configurado');
  }

  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato de imagen inválido');
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const filename = `user_${userId}_${Date.now()}.${ext}`;

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: buffer,
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error subiendo foto a Storage: ${err}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
};

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

const mapUser = (row) => ({
  id: row.id,
  email: row.email,
  nombre: row.nombre,
  matricula: row.matricula,
  role: row.role,
  vigente: row.vigente,
  fotoUrl: row.foto_url,
  createdAt: row.created_at,
});

const isInstitutionalEmail = (email) => /@tesch\.edu\.mx$/i.test(email);

const isPasswordValid = (password) => {
  // Requiere al menos 1 mayúscula, 1 número y 1 símbolo, sin tope artificial.
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(password);
};

const getAuthUser = async (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return { status: 401, error: 'Token requerido' };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { status: 401, error: 'Token inválido' };
  }

  const query = await pool.query(
    `SELECT id, email, nombre, matricula, role, vigente, foto_url, created_at
     FROM users
     WHERE id = $1`,
    [payload.userId],
  );

  if (query.rows.length === 0) {
    return { status: 404, error: 'Usuario no encontrado' };
  }

  const user = mapUser(query.rows[0]);
  if (!user.vigente) {
    return { status: 403, error: 'Usuario no vigente en la institución' };
  }

  return { user };
};

const requireRole = (user, allowedRoles) => allowedRoles.includes(user.role);

const createAlertLog = async ({ alertId, changedBy, previousStatus, newStatus, observacion }) => {
  await pool.query(
    `INSERT INTO alert_status_logs (alert_id, changed_by, previous_status, new_status, observacion)
     VALUES ($1, $2, $3, $4, $5)`,
    [alertId, changedBy, previousStatus, newStatus, observacion || null],
  );
};

const initSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      matricula TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      vigente BOOLEAN NOT NULL DEFAULT TRUE,
      foto_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      descripcion TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      prioridad TEXT NOT NULL DEFAULT 'media',
      observacion TEXT,
      handled_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alert_status_logs (
      id BIGSERIAL PRIMARY KEY,
      alert_id BIGINT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
      changed_by BIGINT,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      observacion TEXT,
      changed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS matricula TEXT UNIQUE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vigente BOOLEAN NOT NULL DEFAULT TRUE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_url TEXT;`);
  await pool.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS prioridad TEXT NOT NULL DEFAULT 'media';`);
  await pool.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS idempotency_key TEXT;`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS alerts_idempotency_key_idx ON alerts (idempotency_key) WHERE idempotency_key IS NOT NULL;`);

  const seedEmail = process.env.SECURITY_SEED_EMAIL || 'guardia@onalert.local';
  const seedPassword = process.env.SECURITY_SEED_PASSWORD || 'Guardia123#';
  const seedName = process.env.SECURITY_SEED_NAME || 'Guardia Demo';
  const seedPasswordHash = await bcrypt.hash(seedPassword, 10);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [seedEmail]);
  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO users (email, nombre, matricula, password_hash, role, vigente)
       VALUES ($1, $2, $3, $4, 'security', TRUE)`,
      [seedEmail, seedName, 'GUARDIA-BASE', seedPasswordHash],
    );
    console.log(`Usuario de guardia creado: ${seedEmail}`);
  } else {
    await pool.query(
      `UPDATE users
       SET nombre = $1,
           password_hash = $2,
           role = 'security',
           vigente = TRUE
       WHERE email = $3`,
      [seedName, seedPasswordHash, seedEmail],
    );
  }
};

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, nombre, matricula, role } = req.body;

    if (!email || !password || !nombre || !matricula) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    if (!isInstitutionalEmail(email)) {
      return res.status(400).json({ error: 'Solo se permite correo institucional @tesch.edu.mx' });
    }

    if (!isPasswordValid(password)) {
      return res.status(400).json({
        error: 'Contraseña inválida: requiere al menos 1 mayúscula, 1 número y 1 símbolo',
      });
    }

    const normalizedRole = role === 'professor' ? 'professor' : 'student';

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR matricula = $2',
      [email, matricula],
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Correo o matrícula ya registrados' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insert = await pool.query(
      `INSERT INTO users (email, nombre, matricula, password_hash, role, vigente)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, email, nombre, matricula, role, vigente, foto_url, created_at`,
      [email, nombre, matricula, passwordHash, normalizedRole],
    );

    const user = mapUser(insert.rows[0]);
    const token = generateToken(user);

    return res.json({ success: true, token, usuario: user });
  } catch (error) {
    return res.status(500).json({ error: `Error en registro: ${error.message}` });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan email y/o password' });
    }

    const query = await pool.query(
      `SELECT id, email, nombre, matricula, role, vigente, foto_url, password_hash, created_at
       FROM users
       WHERE email = $1`,
      [email],
    );

    const row = query.rows[0];
    if (!row) {
      return res.status(401).json({ error: 'Email no encontrado' });
    }

    if (!row.vigente) {
      return res.status(403).json({ error: 'Usuario no vigente en la institución' });
    }

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const user = mapUser(row);
    const token = generateToken(user);

    return res.json({ success: true, token, usuario: user });
  } catch (error) {
    return res.status(500).json({ error: `Error en login: ${error.message}` });
  }
});

app.get('/auth/me', async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ error: auth.error });
    }

    return res.json({ usuario: auth.user });
  } catch (error) {
    return res.status(500).json({ error: `Error consultando perfil: ${error.message}` });
  }
});

app.put('/auth/me', async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { password, fotoUrl } = req.body;
    if (!password && !fotoUrl) {
      return res.status(400).json({ error: 'No hay cambios por actualizar' });
    }

    if (password && !isPasswordValid(password)) {
      return res.status(400).json({
        error: 'Contraseña inválida: requiere al menos 1 mayúscula, 1 número y 1 símbolo',
      });
    }

    let resolvedFotoUrl = fotoUrl || null;
    if (fotoUrl && fotoUrl.startsWith('data:')) {
      resolvedFotoUrl = await uploadProfilePhoto(auth.user.id, fotoUrl);
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const update = await pool.query(
      `UPDATE users
       SET password_hash = COALESCE($1, password_hash),
           foto_url = COALESCE($2, foto_url)
       WHERE id = $3
       RETURNING id, email, nombre, matricula, role, vigente, foto_url, created_at`,
      [passwordHash, resolvedFotoUrl, auth.user.id],
    );

    return res.json({ success: true, usuario: mapUser(update.rows[0]) });
  } catch (error) {
    return res.status(500).json({ error: `Error actualizando perfil: ${error.message}` });
  }
});

app.post('/alerts', async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (!mobileRoles.includes(auth.user.role)) {
      return res.status(403).json({ error: 'Solo alumnado/profesorado pueden emitir alertas' });
    }

    const { latitude, longitude, descripcion } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'] || null;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Latitud y longitud son requeridas' });
    }

    if (idempotencyKey) {
      const existing = await pool.query(
        `SELECT id, user_id AS "userId", latitude, longitude, descripcion, estado, prioridad,
                observacion, handled_by AS "handledBy", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM alerts
         WHERE idempotency_key = $1`,
        [idempotencyKey],
      );
      if (existing.rows.length > 0) {
        return res.json({ alerta: existing.rows[0], deduplicated: true });
      }
    }

    const activeAlert = await pool.query(
      `SELECT id, estado, created_at
       FROM alerts
       WHERE user_id = $1 AND estado IN ('pendiente', 'en_proceso')
       ORDER BY created_at DESC
       LIMIT 1`,
      [auth.user.id],
    );

    if (activeAlert.rows.length > 0) {
      return res.status(409).json({
        error: 'Ya tienes una alerta activa. Espera a que sea atendida antes de enviar otra.',
        activeAlertId: activeAlert.rows[0].id,
      });
    }

    const recentAlert = await pool.query(
      `SELECT id,
              GREATEST(1, CEIL($2 - EXTRACT(EPOCH FROM (NOW() - created_at))))::INT AS "retryAfterSeconds"
       FROM alerts
       WHERE user_id = $1
         AND created_at >= NOW() - ($2 * INTERVAL '1 second')
       ORDER BY created_at DESC
       LIMIT 1`,
      [auth.user.id, alertCooldownSeconds],
    );

    if (recentAlert.rows.length > 0) {
      return res.status(429).json({
        error: `Espera ${recentAlert.rows[0].retryAfterSeconds}s antes de enviar otra alerta.`,
        retryAfterSeconds: recentAlert.rows[0].retryAfterSeconds,
      });
    }

    const insert = await pool.query(
      `INSERT INTO alerts (user_id, latitude, longitude, descripcion, estado, prioridad, idempotency_key)
       VALUES ($1, $2, $3, $4, 'pendiente', 'media', $5)
       RETURNING id, user_id AS "userId", latitude, longitude, descripcion, estado, prioridad,
                 observacion, handled_by AS "handledBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [auth.user.id, latitude, longitude, descripcion || 'Alerta emitida desde app móvil', idempotencyKey],
    );

    const alert = insert.rows[0];
    await createAlertLog({
      alertId: alert.id,
      changedBy: auth.user.id,
      previousStatus: null,
      newStatus: 'pendiente',
      observacion: 'Creación de alerta',
    });

    // 🚨 TRANSMITIR ALERTA A TODOS LOS GUARDIAS CONECTADOS VIA WEBSOCKET
    const fullAlertQuery = await pool.query(
      `SELECT a.*, u.nombre, u.email, u.role, u.foto_url
       FROM alerts a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [alert.id]
    );

    if (fullAlertQuery.rows.length > 0) {
      const fullAlert = fullAlertQuery.rows[0];
      const alertWithUser = {
        id: fullAlert.id,
        userId: fullAlert.user_id,
        usuario: fullAlert.nombre,
        email: fullAlert.email,
        role: fullAlert.role,
        latitude: fullAlert.latitude,
        longitude: fullAlert.longitude,
        descripcion: fullAlert.descripcion,
        estado: fullAlert.estado,
        prioridad: fullAlert.prioridad,
        observacion: fullAlert.observacion,
        handledBy: fullAlert.handled_by,
        fotoUrl: fullAlert.foto_url,
        createdAt: fullAlert.created_at,
        updatedAt: fullAlert.updated_at
      };
      
      io.emit('new-alert', alertWithUser);
      console.log(`[Alert] Nueva alerta ${alert.id} transmitida a ${guardConnections.size} guardias`);
    }

    return res.json({ success: true, alerta: alert });
  } catch (error) {
    return res.status(500).json({ error: `Error guardando alerta: ${error.message}` });
  }
});

app.get('/alerts', async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const params = [];
    let visibilityFilter = '';
    if (mobileRoles.includes(auth.user.role)) {
      params.push(auth.user.id);
      visibilityFilter = 'WHERE a.user_id = $1';
    }

    const query = await pool.query(
      `SELECT
         a.id,
         a.user_id AS "userId",
         u.nombre AS usuario,
         u.email,
         u.role,
         a.latitude,
         a.longitude,
         a.descripcion,
         a.estado,
         a.prioridad,
         a.observacion,
         a.handled_by AS "handledBy",
         a.created_at AS "createdAt",
         a.updated_at AS "updatedAt"
       FROM alerts a
       JOIN users u ON u.id = a.user_id
       ${visibilityFilter}
       ORDER BY a.created_at DESC`,
      params,
    );

    return res.json({ success: true, total: query.rows.length, alertas: query.rows });
  } catch (error) {
    return res.status(500).json({ error: `Error consultando alertas: ${error.message}` });
  }
});

app.patch('/alerts/:id/status', async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (!requireRole(auth.user, securityRoles)) {
      return res.status(403).json({ error: 'Acceso restringido para seguridad/administración' });
    }

    const { estado, observacion, prioridad } = req.body;
    if (!alertStates.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    if (prioridad && !alertPriorities.includes(prioridad)) {
      return res.status(400).json({ error: 'Prioridad no válida' });
    }

    const previous = await pool.query('SELECT estado FROM alerts WHERE id = $1', [req.params.id]);
    if (previous.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    const previousStatus = previous.rows[0].estado;

    const update = await pool.query(
      `UPDATE alerts
       SET estado = $1,
           prioridad = COALESCE($2, prioridad),
           observacion = COALESCE($3, observacion),
           handled_by = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, user_id AS "userId", latitude, longitude, descripcion, estado, prioridad,
                 observacion, handled_by AS "handledBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [estado, prioridad, observacion, auth.user.id, req.params.id],
    );

    const updatedAlert = update.rows[0];

    await createAlertLog({
      alertId: updatedAlert.id,
      changedBy: auth.user.id,
      previousStatus,
      newStatus: estado,
      observacion,
    });

      // Emitir cambio de estado a todos los clientes WebSocket
      const alertForSocket = {
        ...updatedAlert,
        usuario: auth.user.nombre,
        email: auth.user.email,
      };
      io.emit('alert-updated', alertForSocket);

      // Enviar reporte por email al cerrar el incidente
      if (['cerrada', 'falsa_alarma'].includes(estado)) {
        try {
          // Obtener datos completos del usuario que generó la alerta
          const alertOwner = await pool.query(
            'SELECT nombre, email FROM users WHERE id = $1',
            [updatedAlert.userId],
          );
          const ownerData = alertOwner.rows[0] || {};
          sendIncidentReport({
            alert: {
              ...updatedAlert,
              usuario: ownerData.nombre || 'Desconocido',
              email: ownerData.email || '',
            },
            guardName: auth.user.nombre,
          }).catch(err => console.error('[Email] Error enviando reporte:', err.message));
        } catch (err) {
          console.error('[Email] Error preparando reporte:', err.message);
        }
      }

    return res.json({ success: true, alerta: updatedAlert });
  } catch (error) {
    return res.status(500).json({ error: `Error actualizando alerta: ${error.message}` });
  }
});

app.get('/alerts/:id/logs', async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (!requireRole(auth.user, securityRoles)) {
      return res.status(403).json({ error: 'Acceso restringido para seguridad/administración' });
    }

    const logs = await pool.query(
      `SELECT
         l.id,
         l.alert_id AS "alertId",
         l.changed_by AS "changedBy",
         u.nombre AS "changedByName",
         l.previous_status AS "previousStatus",
         l.new_status AS "newStatus",
         l.observacion,
         l.changed_at AS "changedAt"
       FROM alert_status_logs l
       LEFT JOIN users u ON u.id = l.changed_by
       WHERE l.alert_id = $1
       ORDER BY l.changed_at DESC`,
      [req.params.id],
    );

    return res.json({ success: true, total: logs.rows.length, logs: logs.rows });
  } catch (error) {
    return res.status(500).json({ error: `Error consultando bitácora: ${error.message}` });
  }
});

// Alias para compatibilidad con dashboard
app.get('/alerts/:id/status-logs', async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (!requireRole(auth.user, securityRoles)) {
      return res.status(403).json({ error: 'Acceso restringido para seguridad/administración' });
    }

    const logs = await pool.query(
      `SELECT
         l.id,
         l.alert_id AS "alertId",
         l.changed_by AS "changedBy",
         u.nombre AS "changedByName",
         l.previous_status AS "previousStatus",
         l.new_status AS "newStatus",
         l.observacion,
         l.changed_at AS "changedAt"
       FROM alert_status_logs l
       LEFT JOIN users u ON u.id = l.changed_by
       WHERE l.alert_id = $1
       ORDER BY l.changed_at DESC`,
      [req.params.id],
    );

    return res.json({ success: true, total: logs.rows.length, logs: logs.rows });
  } catch (error) {
    return res.status(500).json({ error: `Error consultando historial: ${error.message}` });
  }
});

// Endpoint para generar reporte de incidente
app.get('/alerts/:id/report', async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (!requireRole(auth.user, securityRoles)) {
      return res.status(403).json({ error: 'Acceso restringido para seguridad/administración' });
    }

    // Obtener datos de la alerta
    const alertQuery = await pool.query(
      `SELECT a.*, u.nombre, u.email, u.role
       FROM alerts a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [req.params.id],
    );

    if (alertQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    const alert = alertQuery.rows[0];

    // Obtener historial de cambios
    const logsQuery = await pool.query(
      `SELECT l.*, u.nombre AS changed_by_name
       FROM alert_status_logs l
       LEFT JOIN users u ON u.id = l.changed_by
       WHERE l.alert_id = $1
       ORDER BY l.changed_at ASC`,
      [req.params.id],
    );

    const estadoLabel = {
      cerrada: 'Resuelta ✅',
      falsa_alarma: 'Falsa Alarma ⚠️',
      pendiente: 'Pendiente ⏳',
      en_proceso: 'En Proceso 🔄',
    }[alert.estado] || alert.estado;

    const mapsLink = alert.latitude && alert.longitude
      ? `https://www.openstreetmap.org/?mlat=${alert.latitude}&mlon=${alert.longitude}&zoom=17`
      : 'No disponible';

    // Generar HTML del reporte
    const reportHTML = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte de Incidente #${alert.id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; }
        .container { max-width: 800px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        header { background: linear-gradient(135deg, #0d5c63 0%, #06b6d4 100%); color: white; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
        header h1 { margin-bottom: 5px; }
        header p { font-size: 14px; opacity: 0.9; }
        section { margin-bottom: 25px; }
        h2 { color: #0d5c63; font-size: 18px; border-bottom: 2px solid #0d5c63; padding-bottom: 10px; margin-bottom: 15px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { background: #f9f9f9; padding: 12px; border-radius: 4px; border-left: 3px solid #0d5c63; }
        .info-label { color: #666; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
        .info-value { color: #333; font-size: 14px; font-weight: 600; }
        .user-info { display: flex; gap: 15px; align-items: flex-start; margin-bottom: 15px; }
        .user-avatar { width: 80px; height: 80px; border-radius: 6px; background: linear-gradient(135deg, #0d5c63 0%, #06b6d4 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; }
        .description { background: #f0f0f0; padding: 15px; border-radius: 4px; border-left: 4px solid #ff9800; }
        .timeline { position: relative; padding-left: 30px; }
        .timeline-item { position: relative; margin-bottom: 20px; }
        .timeline-item::before { content: ''; position: absolute; left: -20px; top: 6px; width: 12px; height: 12px; background: #0d5c63; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px #0d5c63; }
        .timeline-item-time { font-size: 12px; color: #666; font-weight: 600; }
        .timeline-item-status { background: #e8f4f8; padding: 8px 12px; border-radius: 4px; font-size: 13px; margin-top: 4px; }
        .timeline-item-obs { background: #f9f9f9; padding: 8px 12px; border-radius: 4px; font-size: 13px; margin-top: 4px; color: #555; }
        .footer { border-top: 1px solid #e0e0e0; padding-top: 15px; margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
        @media print { body { background: white; } .container { box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>🚨 Reporte de Incidente OnAlert</h1>
          <p>ID: #${alert.id} | Estado: ${estadoLabel}</p>
        </header>

        <section>
          <h2>Información del Remitente</h2>
          <div class="user-info">
            <div class="user-avatar">${alert.nombre.charAt(0).toUpperCase()}</div>
            <div>
              <div class="info-item">
                <div class="info-label">Nombre</div>
                <div class="info-value">${alert.nombre}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Correo</div>
                <div class="info-value">${alert.email}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Rol</div>
                <div class="info-value">${alert.role === 'student' ? 'Alumno' : alert.role === 'professor' ? 'Profesor' : 'Otro'}</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2>Detalles del Incidente</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Fecha de Reporte</div>
              <div class="info-value">${new Date(alert.created_at).toLocaleString('es-MX')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Estado Actual</div>
              <div class="info-value">${estadoLabel}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Prioridad</div>
              <div class="info-value">${alert.prioridad.toUpperCase()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Última Actualización</div>
              <div class="info-value">${new Date(alert.updated_at).toLocaleString('es-MX')}</div>
            </div>
          </div>

          <div style="margin-top: 15px;">
            <div class="description">
              <strong>Descripción:</strong><br>
              ${alert.descripcion || 'Sin descripción proporcionada'}
            </div>
          </div>

          ${alert.observacion ? `
            <div style="margin-top: 15px;">
              <div class="description" style="border-left-color: #4caf50;">
                <strong>Observación Final:</strong><br>
                ${alert.observacion}
              </div>
            </div>
          ` : ''}
        </section>

        <section>
          <h2>Ubicación del Incidente</h2>
          <div class="info-item">
            <div class="info-label">Coordenadas</div>
            <div class="info-value">${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}</div>
          </div>
          <div class="info-item" style="margin-top: 10px;">
            <div class="info-label">Mapa</div>
            <div class="info-value"><a href="${mapsLink}" target="_blank" rel="noreferrer">Ver en OpenStreetMap ↗</a></div>
          </div>
        </section>

        <section>
          <h2>Historial de Cambios</h2>
          <div class="timeline">
            ${logsQuery.rows.map(log => `
              <div class="timeline-item">
                <div class="timeline-item-time">${new Date(log.changed_at).toLocaleString('es-MX')}</div>
                ${log.changed_by_name ? `<div class="timeline-item-time">Por: ${log.changed_by_name}</div>` : ''}
                <div class="timeline-item-status">
                  ${log.previous_status ? `${log.previous_status} → ` : ''}${log.new_status}
                </div>
                ${log.observacion ? `<div class="timeline-item-obs">${log.observacion}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </section>

        <div class="footer">
          <p>Reporte generado automáticamente por OnAlert Sistema de Vigilancia</p>
          <p>${new Date().toLocaleString('es-MX')}</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return res.json({ 
      success: true, 
      report: reportHTML,
      metadata: {
        alertId: alert.id,
        estado: alert.estado,
        usuario: alert.nombre,
        email: alert.email,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at,
      }
    });
  } catch (error) {
    return res.status(500).json({ error: `Error generando reporte: ${error.message}` });
  }
});

app.get('/dashboard/summary', async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (!requireRole(auth.user, securityRoles)) {
      return res.status(403).json({ error: 'Acceso restringido para seguridad/administración' });
    }

    const summary = await pool.query(`
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE estado = 'pendiente')::INT AS pendientes,
        COUNT(*) FILTER (WHERE estado = 'en_proceso')::INT AS en_proceso,
        COUNT(*) FILTER (WHERE estado = 'cerrada')::INT AS cerradas,
        COUNT(*) FILTER (WHERE estado = 'falsa_alarma')::INT AS falsas_alarmas,
        COUNT(*) FILTER (WHERE prioridad = 'urgente')::INT AS urgentes
      FROM alerts
    `);

    return res.json({ success: true, summary: summary.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: `Error consultando resumen: ${error.message}` });
  }
});

app.get('/health', (_, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

// Crear HTTP server con socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Almacenar conexiones de guardias
const guardConnections = new Map(); // userId -> socket

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Cliente conectado: ${socket.id}`);

  // Cuando un guardia se conecta
  socket.on('guard-join', (userId) => {
    guardConnections.set(userId, socket);
    console.log(`[Socket] Guardia ${userId} registrado. Total guardias: ${guardConnections.size}`);
    
    // Notificar a todos que hay un guardia nuevo conectado
    io.emit('guard-status', { 
      connected: Array.from(guardConnections.keys()),
      timestamp: new Date().toISOString()
    });
  });

  // Cuando llega una alerta nueva (enviada desde mobile)
  socket.on('alert-triggered', async (alertData) => {
    console.log(`[Socket] Alerta recibida:`, alertData);
    
    try {
      // Buscar la alerta en BD para obtener datos completos
      const alertQuery = await pool.query(
        `SELECT a.*, u.nombre, u.email, u.role, u.foto_url
         FROM alerts a
         JOIN users u ON a.user_id = u.id
         WHERE a.id = $1`,
        [alertData.alertId]
      );

      if (alertQuery.rows.length > 0) {
        const alert = alertQuery.rows[0];
        const alertWithUser = {
          id: alert.id,
          userId: alert.user_id,
          usuario: alert.nombre,
          email: alert.email,
          role: alert.role,
          latitude: alert.latitude,
          longitude: alert.longitude,
          descripcion: alert.descripcion,
          estado: alert.estado,
          prioridad: alert.prioridad,
          observacion: alert.observacion,
          handledBy: alert.handled_by,
          fotoUrl: alert.foto_url,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at
        };

        // Enviar a todos los guardias conectados
        io.emit('new-alert', alertWithUser);
        console.log(`[Socket] Alerta ${alert.id} transmitida a ${guardConnections.size} guardia(s)`);
      }
    } catch (error) {
      console.error(`[Socket] Error procesando alerta:`, error.message);
    }
  });

  // Cuando un guardia cambia el estado de una alerta
  socket.on('alert-status-changed', (statusData) => {
    console.log(`[Socket] Estado de alerta actualizado:`, statusData);
    
    // Notificar a todos (incluyendo mobile) que el estado cambió
    io.emit('alert-updated', statusData);
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`[Socket] Cliente desconectado: ${socket.id}`);
    
    // Buscar y remover el guardia
    for (const [userId, userSocket] of guardConnections.entries()) {
      if (userSocket.id === socket.id) {
        guardConnections.delete(userId);
        console.log(`[Socket] Guardia ${userId} desconectado. Total guardias: ${guardConnections.size}`);
        
        // Notificar estado actualizado
        io.emit('guard-status', {
          connected: Array.from(guardConnections.keys()),
          timestamp: new Date().toISOString()
        });
        break;
      }
    }
  });
});

initSchema()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Servidor OnAlert corriendo en puerto ${PORT} con WebSockets`);
    });
  })
  .catch((error) => {
    console.error(`No se pudo iniciar el backend: ${error.message}`);
    process.exit(1);
  });
