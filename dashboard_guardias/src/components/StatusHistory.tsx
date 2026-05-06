import { useEffect, useState } from 'react';
import type { User } from '../types';
import { getAlertLogs } from '../api';
import '../styles/status-history.css';

interface StatusLog {
  id: number;
  alertId: number;
  changedBy: number | null;
  changedByName: string | null;
  previousStatus: string | null;
  newStatus: string;
  observacion: string | null;
  changedAt: string;
}

interface StatusHistoryProps {
  alertId: number;
  currentUser: User | null;
}

const STATE_EMOJI = {
  pendiente: '⏳',
  en_proceso: '🔄',
  cerrada: '✅',
  falsa_alarma: '⚠️',
};

export function StatusHistory({ alertId, currentUser }: StatusHistoryProps) {
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const data = await getAlertLogs(alertId);
        setLogs(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando historial');
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, [alertId]);

  if (loading) {
    return <div className="status-history-loading">Cargando historial...</div>;
  }

  if (error) {
    return <div className="status-history-error">{error}</div>;
  }

  if (logs.length === 0) {
    return <div className="status-history-empty">No hay cambios registrados</div>;
  }

  return (
    <div className="status-history">
      <h3>Historial de cambios</h3>
      <div className="status-history-timeline">
        {logs.map((log, index) => {
          const time = new Date(log.changedAt).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          const date = new Date(log.changedAt).toLocaleDateString('es-MX');

          return (
            <div key={log.id} className="status-history-item">
              <div className="status-history-marker" />
              <div className="status-history-content">
                <div className="status-history-header">
                  <span className="status-history-time">
                    {date} {time}
                  </span>
                  {log.changedByName && (
                    <span className="status-history-by">Por: {log.changedByName}</span>
                  )}
                </div>

                <div className="status-history-status">
                  {log.previousStatus && (
                    <>
                      <span className="status-old">
                        {STATE_EMOJI[log.previousStatus as keyof typeof STATE_EMOJI]} {log.previousStatus}
                      </span>
                      <span className="status-arrow">→</span>
                    </>
                  )}
                  <span className="status-new">
                    {STATE_EMOJI[log.newStatus as keyof typeof STATE_EMOJI]} {log.newStatus}
                  </span>
                </div>

                {log.observacion && (
                  <div className="status-history-observation">
                    <strong>Observación:</strong> {log.observacion}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
