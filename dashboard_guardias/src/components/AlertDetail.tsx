import { useState } from 'react';
import type { Alert, User } from '../types';
import { StatusHistory } from './StatusHistory';
import '../styles/alert-detail.css';

interface AlertDetailProps {
  alert: Alert | null;
  currentUser: User | null;
  onClose: () => void;
  onStatusChange: (alertId: number, newStatus: string, observacion: string) => Promise<void>;
  loading?: boolean;
}

const STATE_LABELS = {
  pendiente: { label: 'Pendiente', icon: '⏳', color: '#ff9800' },
  en_proceso: { label: 'En Proceso', icon: '🔄', color: '#2196f3' },
  cerrada: { label: 'Resuelta', icon: '✅', color: '#4caf50' },
  falsa_alarma: { label: 'Falsa Alarma', icon: '⚠️', color: '#f44336' },
};

export function AlertDetail({
  alert,
  currentUser,
  onClose,
  onStatusChange,
  loading,
}: AlertDetailProps) {
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [observacion, setObservacion] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!alert) return null;

  const stateInfo = STATE_LABELS[alert.estado as keyof typeof STATE_LABELS];
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${alert.latitude}&mlon=${alert.longitude}#map=17/${alert.latitude}/${alert.longitude}`;
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${alert.longitude - 0.002},${alert.latitude - 0.002},${alert.longitude + 0.002},${alert.latitude + 0.002}&layer=mapnik&marker=${alert.latitude},${alert.longitude}`;

  const createdTime = new Date(alert.createdAt).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const createdDate = new Date(alert.createdAt).toLocaleDateString('es-MX');

  const handleStatusChange = async () => {
    if (!newStatus || !observacion.trim()) {
      setError('Por favor selecciona un estado e ingresa una observación');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      await onStatusChange(alert.id, newStatus, observacion);
      setShowStatusChange(false);
      setNewStatus('');
      setObservacion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando el estado');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="alert-detail-overlay" onClick={onClose}>
      <div className="alert-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="alert-detail-header">
          <div className="alert-detail-title">
            <h2>Detalles del Incidente #{alert.id}</h2>
            <span className="state-badge" style={{ backgroundColor: stateInfo?.color }}>
              {stateInfo?.icon} {stateInfo?.label}
            </span>
          </div>
          <button className="alert-detail-close" onClick={onClose}>✕</button>
        </div>

        {/* Contenido con scroll */}
        <div className="alert-detail-content">
          {/* Información del usuario */}
          <section className="alert-detail-section">
            <h3>Información del Remitente</h3>
            <div className="alert-detail-user">
              {alert.fotoUrl ? (
                <img src={alert.fotoUrl} alt={alert.usuario} className="alert-detail-avatar" />
              ) : (
                <div className="alert-detail-avatar-placeholder">
                  {alert.usuario.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="alert-detail-user-info">
                <div>
                  <strong>{alert.usuario}</strong>
                  <p>{alert.role === 'student' ? 'Alumno' : 'Profesor'}</p>
                </div>
                <div>
                  <small>Email: {alert.email}</small>
                  <p>Reportado: {createdDate} {createdTime}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Ubicación */}
          <section className="alert-detail-section">
            <h3>Ubicación del Incidente</h3>
            <div className="alert-detail-coords">
              <code>📍 {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}</code>
            </div>
            <div className="alert-detail-map-container">
              <iframe
                title="Ubicación de alerta"
                src={mapEmbedUrl}
                className="alert-detail-map"
                loading="lazy"
              />
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="alert-detail-map-link">
                Ver en pantalla completa ↗
              </a>
            </div>
          </section>

          {/* Descripción */}
          <section className="alert-detail-section">
            <h3>Descripción del Incidente</h3>
            <div className="alert-detail-description">
              <p>{alert.descripcion || 'Sin descripción proporcionada'}</p>
            </div>
          </section>

          {/* Detalles técnicos */}
          <section className="alert-detail-section">
            <h3>Detalles Técnicos</h3>
            <div className="alert-detail-metadata">
              <div className="metadata-item">
                <strong>Prioridad:</strong>
                <span>{alert.prioridad}</span>
              </div>
              <div className="metadata-item">
                <strong>Creado:</strong>
                <span>{new Date(alert.createdAt).toLocaleString('es-MX')}</span>
              </div>
              <div className="metadata-item">
                <strong>Actualizado:</strong>
                <span>{new Date(alert.updatedAt).toLocaleString('es-MX')}</span>
              </div>
              {alert.handledBy && (
                <div className="metadata-item">
                  <strong>Atendido por:</strong>
                  <span>Guard ID: {alert.handledBy}</span>
                </div>
              )}
              {alert.observacion && (
                <div className="metadata-item">
                  <strong>Observación:</strong>
                  <span>{alert.observacion}</span>
                </div>
              )}
            </div>
          </section>

          {/* Historial de cambios */}
          <section className="alert-detail-section">
            <StatusHistory alertId={alert.id} currentUser={currentUser} />
          </section>

          {/* Cambio de estado */}
          <section className="alert-detail-section">
            {!showStatusChange ? (
              <button
                className="btn-change-status"
                onClick={() => setShowStatusChange(true)}
                disabled={loading || (alert.estado !== 'pendiente' && alert.estado !== 'en_proceso')}
              >
                Cambiar estado del incidente
              </button>
            ) : (
              <div className="alert-detail-status-change">
                <h3>Actualizar Estado</h3>

                <div className="form-group">
                  <label htmlFor="new-status">Nuevo estado:</label>
                  <select
                    id="new-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    disabled={updating}
                  >
                    <option value="">-- Seleccionar --</option>
                    {alert.estado === 'pendiente' && (
                      <>
                        <option value="en_proceso">En Proceso</option>
                        <option value="falsa_alarma">Falsa Alarma</option>
                      </>
                    )}
                    {alert.estado === 'en_proceso' && (
                      <>
                        <option value="cerrada">Resuelta</option>
                        <option value="falsa_alarma">Falsa Alarma</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="observacion">Observación:</label>
                  <textarea
                    id="observacion"
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Describe las acciones tomadas o razón del cambio..."
                    disabled={updating}
                    rows={4}
                  />
                </div>

                {error && <div className="alert-detail-error">{error}</div>}

                <div className="form-actions">
                  <button
                    className="btn-confirm"
                    onClick={handleStatusChange}
                    disabled={updating || !newStatus}
                  >
                    {updating ? 'Actualizando...' : 'Confirmar cambio'}
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setShowStatusChange(false);
                      setNewStatus('');
                      setObservacion('');
                      setError(null);
                    }}
                    disabled={updating}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
