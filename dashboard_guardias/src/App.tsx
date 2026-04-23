import { FormEvent, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './styles.css';
import { clearToken, getAlerts, getProfile, getSummary, getToken, login, setToken, updateAlertStatus } from './api';
import type { Alert, Summary, User } from './types';

const states = ['pendiente', 'en_proceso', 'cerrada', 'falsa_alarma'];
const priorities = ['falsa_alarma', 'baja', 'media', 'alta', 'urgente'];
const SOCKET_URL = 'http://127.0.0.1:3000';

// ─── Modal de Alerta Entrante ────────────────────────────────────────────────
function IncomingAlertModal({ alert, onClose, onHandle }: {
  alert: Alert;
  onClose: () => void;
  onHandle: (alert: Alert, estado: string) => void;
}) {
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${alert.longitude - 0.002},${alert.latitude - 0.002},${alert.longitude + 0.002},${alert.latitude + 0.002}&layer=mapnik&marker=${alert.latitude},${alert.longitude}`;
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${alert.latitude}&mlon=${alert.longitude}#map=17/${alert.latitude}/${alert.longitude}`;

  return (
    <div className="alert-modal-overlay" onClick={onClose}>
      <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="alert-modal-header">
          <span className="alert-modal-badge">🚨 ALERTA ENTRANTE</span>
          <button className="alert-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Datos del remitente */}
        <div className="alert-modal-user">
          <div className="alert-modal-avatar">
            {alert.fotoUrl ? (
              <img src={alert.fotoUrl} alt={alert.usuario} />
            ) : (
              <span>{alert.usuario.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="alert-modal-user-info">
            <strong>{alert.usuario}</strong>
            <small>{alert.email}</small>
            <small>{alert.role === 'student' ? 'Alumno' : 'Profesor'}</small>
            <small className="alert-modal-time">
              {new Date(alert.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </small>
          </div>
        </div>

        {/* Mapa embebido */}
        <div className="alert-modal-map-container">
          <iframe
            title="Ubicación de alerta"
            src={mapSrc}
            className="alert-modal-map"
            loading="lazy"
          />
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="alert-modal-map-link"
          >
            Ver en pantalla completa ↗
          </a>
        </div>

        {/* Coordenadas */}
        <div className="alert-modal-coords">
          <span>📍 {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}</span>
        </div>

        {/* Acciones */}
        <div className="alert-modal-actions">
          <button
            className="alert-modal-btn-attend"
            onClick={() => { onHandle(alert, 'en_proceso'); onClose(); }}
          >
            Atender alerta
          </button>
          <button
            className="alert-modal-btn-false"
            onClick={() => { onHandle(alert, 'falsa_alarma'); onClose(); }}
          >
            Falsa alarma
          </button>
          <button className="alert-modal-btn-later" onClick={onClose}>
            Ver después
          </button>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('guardia@onalert.local');
  const [password, setPassword] = useState('Guardia123#');
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [incomingAlert, setIncomingAlert] = useState<Alert | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [profile, dashboardSummary, dashboardAlerts] = await Promise.all([
        getProfile(),
        getSummary(),
        getAlerts(),
      ]);
      setUser(profile);
      setSummary(dashboardSummary);
      setAlerts(dashboardAlerts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando dashboard';
      setError(message);
      if (message.toLowerCase().includes('token')) {
        clearToken();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  // Conectar WebSocket cuando el usuario inicia sesión
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Conectar socket.io
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Conectado al servidor');
      setSocketConnected(true);
      
      // Registrar este guardia
      if (user.id) {
        socket.emit('guard-join', user.id);
        console.log(`[Socket] Guardia ${user.id} registrado`);
      }
    });

    // Escuchar nuevas alertas
    socket.on('new-alert', (newAlert: Alert) => {
      console.log('[Socket] Nueva alerta recibida:', newAlert);
      
      setAlerts((prevAlerts) => {
        const exists = prevAlerts.some(a => a.id === newAlert.id);
        if (exists) return prevAlerts;
        return [newAlert, ...prevAlerts];
      });

      setSummary((prev) => {
        if (!prev) return prev;
        return { ...prev, total: prev.total + 1, pendientes: prev.pendientes + 1 };
      });

      // 🚨 Mostrar modal con foto + mapa
      setIncomingAlert(newAlert);

      // Notificación del navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 Alerta de Emergencia', {
          body: `${newAlert.usuario} necesita ayuda`,
          icon: newAlert.fotoUrl || undefined,
        });
      }
    });

    // Escuchar cambios de estado
    socket.on('alert-updated', (updatedAlert: Alert) => {
      console.log('[Socket] Alerta actualizada:', updatedAlert);
      
      setAlerts((prevAlerts) =>
        prevAlerts.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
      );

      // Recargar resumen
      void loadDashboard().catch(console.error);
    });

    socket.on('guard-status', (data) => {
      console.log('[Socket] Estado de guardias:', data);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Desconectado del servidor');
      setSocketConnected(false);
    });

    socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
      setError(`Error de conexión: ${error}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (getToken()) {
      void loadDashboard();
    } else {
      setLoading(false);
    }
  }, []);

  // Refrescar datos cada 10 segundos (reducido de 5s)
  useEffect(() => {
    if (!user) {
      return;
    }

    const id = window.setInterval(() => {
      void loadDashboard();
    }, 10000);

    return () => window.clearInterval(id);
  }, [user]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, password);
      setToken(data.token);
      
      // Pedir permiso para notificaciones
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
      setLoading(false);
    }
  }

  async function handleStatusChange(alert: Alert, estado: string, observacion?: string) {
    const obs = observacion ?? window.prompt('Observación de seguimiento (opcional):', '') ?? '';
    const prioridad = window.prompt(
      `Prioridad (${priorities.join(', ')})`,
      alert.prioridad ?? 'media',
    ) ?? alert.prioridad;
    try {
      await updateAlertStatus(alert.id, estado, obs, prioridad);
      
      if (socketRef.current) {
        socketRef.current.emit('alert-status-changed', {
          id: alert.id,
          estado,
          observacion: obs,
          prioridad,
        });
      }
      
      await loadDashboard();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo actualizar la alerta');
    }
  }

  if (!user) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">OnAlert</p>
          <h1>Dashboard de Guardias</h1>
          <p className="muted">HU-06 y HU-07: recepción, seguimiento y perfil restringido para seguridad.</p>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Contraseña
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button disabled={loading} type="submit">
              {loading ? 'Ingresando...' : 'Ingresar al dashboard'}
            </button>
          </form>
          <div className="hint-box">
            <strong>Demo guardia:</strong>
            <span>guardia@onalert.local / Guardia123#</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      {/* Modal alerta entrante */}
      {incomingAlert && (
        <IncomingAlertModal
          alert={incomingAlert}
          onClose={() => setIncomingAlert(null)}
          onHandle={(alert, estado) => void handleStatusChange(alert, estado)}
        />
      )}

      <header className="topbar">
        <div>
          <p className="eyebrow">OnAlert Seguridad</p>
          <h1>Centro de alertas</h1>
        </div>
        <div className="topbar-actions">
          <div className="guard-card">
            <span>{user.nombre}</span>
            <small>{user.role}</small>
            <small className={`socket-status ${socketConnected ? 'connected' : 'disconnected'}`}>
              {socketConnected ? '● En línea' : '○ Desconectado'}
            </small>
          </div>
          <button
            className="secondary-button"
            onClick={() => {
              clearToken();
              setUser(null);
              setAlerts([]);
              setSummary(null);
              if (socketRef.current) {
                socketRef.current.disconnect();
              }
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="summary-grid">
        <SummaryCard title="Total" value={summary?.total ?? 0} />
        <SummaryCard title="Pendientes" value={summary?.pendientes ?? 0} accent="red" />
        <SummaryCard title="En proceso" value={summary?.en_proceso ?? 0} accent="amber" />
        <SummaryCard title="Urgentes" value={summary?.urgentes ?? 0} accent="red" />
        <SummaryCard title="Cerradas" value={summary?.cerradas ?? 0} accent="green" />
        <SummaryCard title="Falsas alarmas" value={summary?.falsas_alarmas ?? 0} accent="slate" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Recepción integral</p>
            <h2>Alertas activas e históricas (tiempo real)</h2>
          </div>
          <button className="secondary-button" onClick={() => void loadDashboard()}>
            Refrescar
          </button>
        </div>

        <div className="alerts-table">
          <div className="alerts-head">
            <span>Alumno</span>
            <span>Ubicación</span>
            <span>Descripción</span>
            <span>Estado</span>
            <span>Prioridad</span>
            <span>Acción</span>
          </div>
          {alerts.length === 0 ? (
            <div className="empty-state">No hay alertas registradas todavía.</div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="alerts-row">
                <div>
                  <strong>{alert.usuario}</strong>
                  <small>{alert.email}</small>
                </div>
                <div>
                  <strong>{alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</strong>
                  <small>{new Date(alert.createdAt).toLocaleString()}</small>
                  <small>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${alert.latitude}&mlon=${alert.longitude}#map=18/${alert.latitude}/${alert.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver en mapa
                    </a>
                  </small>
                </div>
                <div>
                  <strong>{alert.descripcion || 'Sin descripción'}</strong>
                  <small>{alert.observacion || 'Sin observación'}</small>
                </div>
                <div>
                  <span className={`status-pill status-${alert.estado}`}>{alert.estado}</span>
                </div>
                <div>
                  <strong>{alert.prioridad}</strong>
                </div>
                <div>
                  <select
                    value={alert.estado}
                    onChange={(event) => void handleStatusChange(alert, event.target.value)}
                  >
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

type SummaryCardProps = {
  title: string;
  value: number;
  accent?: 'red' | 'amber' | 'green' | 'slate';
};

function SummaryCard({ title, value, accent }: SummaryCardProps) {
  return (
    <article className={`summary-card ${accent ?? ''}`.trim()}>
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}
