import { useState } from 'react';
import type { Alert } from '../types';
import '../styles/alerts-list.css';

interface AlertsListProps {
  alerts: Alert[];
  onSelectAlert: (alert: Alert) => void;
  onStatusChange: (alertId: number, newStatus: string) => void;
  loading?: boolean;
}

const STATE_LABELS = {
  pendiente: { label: 'Pendiente', icon: '⏳', color: '#ff9800' },
  en_proceso: { label: 'En Proceso', icon: '🔄', color: '#2196f3' },
  cerrada: { label: 'Resuelta', icon: '✅', color: '#4caf50' },
  falsa_alarma: { label: 'Falsa Alarma', icon: '⚠️', color: '#f44336' },
};

const PRIORITY_LABELS = {
  falsa_alarma: '⚠️ Falsa',
  baja: '🟢 Baja',
  media: '🟡 Media',
  alta: '🔴 Alta',
  urgente: '🚨 Urgente',
};

export function AlertsList({ alerts, onSelectAlert, onStatusChange, loading }: AlertsListProps) {
  const [filter, setFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  const filteredAlerts = filter === 'todos'
    ? alerts
    : alerts.filter(a => a.estado === filter);

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    const priorityOrder = { urgente: 5, alta: 4, media: 3, baja: 2, falsa_alarma: 1 };
    return (priorityOrder[b.prioridad as keyof typeof priorityOrder] || 0) -
           (priorityOrder[a.prioridad as keyof typeof priorityOrder] || 0);
  });

  if (loading) {
    return <div className="alerts-list-loading">Cargando incidentes...</div>;
  }

  return (
    <div className="alerts-list-container">
      {/* Controles */}
      <div className="alerts-list-controls">
        <div className="controls-group">
          <label>Filtrar por estado:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="todos">Todos ({alerts.length})</option>
            <option value="pendiente">Pendientes ({alerts.filter(a => a.estado === 'pendiente').length})</option>
            <option value="en_proceso">En Proceso ({alerts.filter(a => a.estado === 'en_proceso').length})</option>
            <option value="cerrada">Resueltas ({alerts.filter(a => a.estado === 'cerrada').length})</option>
            <option value="falsa_alarma">Falsas Alarmas ({alerts.filter(a => a.estado === 'falsa_alarma').length})</option>
          </select>
        </div>

        <div className="controls-group">
          <label>Ordenar por:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguas</option>
            <option value="priority">Prioridad</option>
          </select>
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="alerts-list">
        {sortedAlerts.length === 0 ? (
          <div className="alerts-list-empty">
            <p>No hay incidentes que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          sortedAlerts.map((alert) => {
            const stateInfo = STATE_LABELS[alert.estado as keyof typeof STATE_LABELS];
            const priorityLabel = PRIORITY_LABELS[alert.prioridad as keyof typeof PRIORITY_LABELS];
            const createdTime = new Date(alert.createdAt).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const createdDate = new Date(alert.createdAt).toLocaleDateString('es-MX');

            return (
              <div
                key={alert.id}
                className="alert-item"
                style={{ borderLeftColor: stateInfo?.color }}
              >
                {/* Encabezado del incidente */}
                <div className="alert-item-header">
                  <div className="alert-item-info">
                    <div className="alert-item-user">
                      {alert.fotoUrl ? (
                        <img src={alert.fotoUrl} alt={alert.usuario} className="alert-item-avatar" />
                      ) : (
                        <div className="alert-item-avatar-placeholder">
                          {alert.usuario.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="alert-item-user-info">
                        <strong>{alert.usuario}</strong>
                        <small>{alert.email}</small>
                      </div>
                    </div>
                    <div className="alert-item-meta">
                      <span className="alert-item-id">#{alert.id}</span>
                      <span className="alert-item-time">
                        {createdDate} {createdTime}
                      </span>
                    </div>
                  </div>

                  {/* Estado y Prioridad */}
                  <div className="alert-item-status">
                    <span className="state-badge" style={{ backgroundColor: stateInfo?.color }}>
                      {stateInfo?.icon} {stateInfo?.label}
                    </span>
                    <span className="priority-badge">{priorityLabel}</span>
                  </div>
                </div>

                {/* Descripción */}
                <div className="alert-item-description">
                  <p>{alert.descripcion || 'Sin descripción'}</p>
                </div>

                {/* Coordenadas */}
                <div className="alert-item-location">
                  <span>📍 {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}</span>
                </div>

                {/* Acciones */}
                <div className="alert-item-actions">
                  <button
                    className="btn-action btn-details"
                    onClick={() => onSelectAlert(alert)}
                  >
                    Ver detalles
                  </button>

                  {alert.estado === 'pendiente' && (
                    <>
                      <button
                        className="btn-action btn-attend"
                        onClick={() => onStatusChange(alert.id, 'en_proceso')}
                      >
                        Atender
                      </button>
                      <button
                        className="btn-action btn-false-alarm"
                        onClick={() => onStatusChange(alert.id, 'falsa_alarma')}
                      >
                        Falsa alarma
                      </button>
                    </>
                  )}

                  {alert.estado === 'en_proceso' && (
                    <>
                      <button
                        className="btn-action btn-resolve"
                        onClick={() => onStatusChange(alert.id, 'cerrada')}
                      >
                        Resolver
                      </button>
                      <button
                        className="btn-action btn-false-alarm"
                        onClick={() => onStatusChange(alert.id, 'falsa_alarma')}
                      >
                        Falsa alarma
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
