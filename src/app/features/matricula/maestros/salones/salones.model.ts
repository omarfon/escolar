export interface SalonItem {
  id: number;
  anioEscolar: number;
  nivel: string;
  grado: string;
  seccion: string;
  aforo: number;
  activo: boolean;
  esIngresante: boolean;
}

export interface VacanteItem extends SalonItem {
  matriculados: number;
  pendientesContinuidad: number;
  ocupados: number;
  vacantesActuales: number;
  disponibles: number;
  estado: 'disponible' | 'completa' | 'sobreocupada';
}

export interface SyncSalonesResult {
  created: number;
  skipped: number;
}

export interface CreateSalonPayload {
  anioEscolar: number;
  nivel: string;
  grado: string;
  seccion: string;
  aforo: number;
  activo?: boolean;
}
