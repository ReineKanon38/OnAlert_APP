export type User = {
  id: number;
  email: string;
  nombre: string;
  matricula?: string | null;
  role: string;
  vigente?: boolean;
  fotoUrl?: string | null;
};

export type Alert = {
  id: number;
  userId: number;
  usuario: string;
  email: string;
  role: string;
  latitude: number;
  longitude: number;
  descripcion: string;
  estado: string;
  prioridad: string;
  observacion: string | null;
  handledBy: number | null;
  fotoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Summary = {
  total: number;
  pendientes: number;
  en_proceso: number;
  cerradas: number;
  falsas_alarmas: number;
  urgentes: number;
};
