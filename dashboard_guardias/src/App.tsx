import { FormEvent, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './styles.css';
import { clearToken, getAlerts, getProfile, getSummary, getToken, login, setToken, updateAlertStatus } from './api';
import type { Alert, Summary, User } from './types';
import { AlertsList } from './components/AlertsList';
import { AlertDetail } from './components/AlertDetail';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

// ─── Summary Card Component ───────────────────────────────────────────────────
function SummaryCard({ title, value, accent }: { title: string; value: number; accent?: string }) {
  const colors = {
    red: '#f44336',
    amber: '#ff9800',
    green: '#4caf50',
    slate: '#9e9e9e',
  };

  return (
    <div className="summary-card" style={{ borderTopColor: colors[accent as keyof typeof colors] || '#0d5c63' }}>
      <p className="summary-label">{title}</p>
      <p className="summary-value">{value}</p>
    </div>
  );
}

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
  const [mobileGuardsOnline, setMobileGuardsOnline] = useState<number[]>([]);
  const [incomingAlert, setIncomingAlert] = useState<Alert | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

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
      if (selectedAlert?.id === updatedAlert.id) {
        setSelectedAlert(updatedAlert);
      }

      // Recargar resumen
      void loadDashboard().catch(console.error);
    });

    socket.on('guard-status', (data) => {
      console.log('[Socket] Estado de guardias móviles:', data);
      if (Array.isArray(data.connected)) {
        setMobileGuardsOnline(data.connected);
      }
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
  }, [user, selectedAlert?.id]);

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
      'Prioridad (falsa_alarma, baja, media, alta, urgente)',
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

  async function handleDetailStatusChange(alertId: number, newStatus: string, observacion: string) {
    try {
      await updateAlertStatus(alertId, newStatus, observacion);
      await loadDashboard();
      setSelectedAlert(null);
      setView('list');
    } catch (err) {
      throw err;
    }
  }

  async function handleSelectAlert(alert: Alert) {
    setSelectedAlert(alert);
    setView('detail');
  }

  async function handleQuickStatusChange(alertId: number, newStatus: string) {
    try {
      await updateAlertStatus(alertId, newStatus, `Cambio rápido a ${newStatus}`);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando estado');
    }
  }

  if (!user) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">OnAlert</p>
          <h1>Dashboard de Guardias</h1>
          <p className="muted">Sprint 3: Gestión Institucional y Reportes de Incidentes</p>
          <form onSubmit={handleLogin} className="login-form">
            <label>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
              />
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

      {/* Modal detalle de incidente */}
      {view === 'detail' && selectedAlert && (
        <AlertDetail
          alert={selectedAlert}
          currentUser={user}
          onClose={() => {
            setSelectedAlert(null);
            setView('list');
          }}
          onStatusChange={handleDetailStatusChange}
          loading={loading}
        />
      )}

      <header className="topbar">
        <div>
          <p className="eyebrow">OnAlert Seguridad</p>
          <h1>
            {view === 'list' ? 'Centro de alertas' : `Detalles del incidente #${selectedAlert?.id}`}
          </h1>
        </div>
        <div className="topbar-actions">
          <div className="guard-card">
            <span>{user.nombre}</span>
            <small>{user.role}</small>
            <small className={`socket-status ${socketConnected ? 'connected' : 'disconnected'}`}>
              {socketConnected ? '● En línea' : '○ Desconectado'}
            </small>
            <small className="mobile-guards-status">
              📱 {mobileGuardsOnline.length} guardia{mobileGuardsOnline.length !== 1 ? 's' : ''} móvil{mobileGuardsOnline.length !== 1 ? 'es' : ''} conectado{mobileGuardsOnline.length !== 1 ? 's' : ''}
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

      {view === 'list' && (
        <>
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
                <p className="eyebrow">HU-08: Gestión Institucional</p>
                <h2>Gestión de Incidentes y Reportes (Sprint 3)</h2>
              </div>
              <button
                className="secondary-button"
                onClick={() => void loadDashboard()}
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Refrescar'}
              </button>
            </div>

            <AlertsList
              alerts={alerts}
              onSelectAlert={handleSelectAlert}
              onStatusChange={handleQuickStatusChange}
              loading={loading}
            />
          </section>
        </>
      )}
    </main>
  );
}
