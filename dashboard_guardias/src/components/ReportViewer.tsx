import { useState, useEffect, useRef } from 'react';
import { generateIncidentReport } from '../api';
import '../styles/report-viewer.css';

interface ReportViewerProps {
  alertId: number;
  onClose: () => void;
}

export function ReportViewer({ alertId, onClose }: ReportViewerProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    generateIncidentReport(alertId)
      .then(setHtml)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [alertId]);

  const handlePrint = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.focus();
    iframeRef.current.contentWindow.print();
  };

  // Renderizar el HTML en el iframe via srcDoc
  const iframeSrc = html ?? '';

  return (
    <div className="report-viewer-overlay" onClick={onClose}>
      <div className="report-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-viewer-header">
          <h2>📄 Reporte del Incidente #{alertId}</h2>
          <div className="report-viewer-actions">
            {html && (
              <button className="btn-print" onClick={handlePrint}>
                🖨️ Imprimir
              </button>
            )}
            <button className="report-viewer-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="report-viewer-body">
          {loading && (
            <div className="report-viewer-loading">
              <div className="spinner" />
              <p>Generando reporte...</p>
            </div>
          )}

          {error && (
            <div className="report-viewer-error">
              <p>❌ No se pudo cargar el reporte</p>
              <small>{error}</small>
            </div>
          )}

          {html && (
            <iframe
              ref={iframeRef}
              className="report-viewer-iframe"
              srcDoc={iframeSrc}
              title={`Reporte incidente ${alertId}`}
              sandbox="allow-same-origin allow-modals"
            />
          )}
        </div>
      </div>
    </div>
  );
}
