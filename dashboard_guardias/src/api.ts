import type { Alert, Summary, User } from './types';

const API_BASE = 'http://127.0.0.1:3000';
const STORAGE_KEY = 'onalert-dashboard-token';

export const getToken = () => localStorage.getItem(STORAGE_KEY);
export const setToken = (token: string) => localStorage.setItem(STORAGE_KEY, token);
export const clearToken = () => localStorage.removeItem(STORAGE_KEY);

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export async function login(email: string, password: string): Promise<{ token: string; usuario: User }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'No se pudo iniciar sesión');
  }

  if (!['security', 'admin'].includes(data.usuario.role)) {
    throw new Error('Este acceso es exclusivo para guardias/administración.');
  }

  return data;
}

export async function getProfile(): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'No se pudo obtener el perfil');
  }
  return data.usuario;
}

export async function getSummary(): Promise<Summary> {
  const response = await fetch(`${API_BASE}/dashboard/summary`, { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'No se pudo obtener el resumen');
  }
  return data.summary;
}

export async function getAlerts(): Promise<Alert[]> {
  const response = await fetch(`${API_BASE}/alerts`, { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'No se pudieron cargar las alertas');
  }
  return data.alertas;
}

export async function updateAlertStatus(
  id: number,
  estado: string,
  observacion: string,
  prioridad?: string,
): Promise<Alert> {
  const response = await fetch(`${API_BASE}/alerts/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ estado, observacion, prioridad }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'No se pudo actualizar la alerta');
  }
  return data.alerta;
}

export async function getAlertLogs(alertId: number) {
  const response = await fetch(`${API_BASE}/alerts/${alertId}/status-logs`, {
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'No se pudo cargar el historial de cambios');
  }
  return data.logs || [];
}

export async function generateIncidentReport(alertId: number): Promise<string> {
  const response = await fetch(`${API_BASE}/alerts/${alertId}/report`, {
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'No se pudo generar el reporte');
  }
  return data.report;
}
