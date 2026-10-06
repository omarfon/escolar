import { ApiStudent } from '../../../core/api/api.models';

export type MotivoCambioSeccion =
  | 'equilibrio'
  | 'solicitud_apoderado'
  | 'rendimiento'
  | 'capacidad'
  | 'otro';

export interface EstudianteMatricula extends ApiStudent {
  codigo: string;
  nombres: string;
  apellidos: string;
  dni: string;
  tipoDocumento: string;
}

export interface OcupacionSeccion {
  seccion: string;
  matriculados: number;
  capacidad: number;
  disponibles: number;
}

export interface CambioSeccionPayload {
  nuevaSeccion: string;
  motivo: string;
  autorizadoPor: string;
  observacion?: string;
  realizadoPor?: string;
}

export interface CambioSeccionResult {
  student: ApiStudent;
  seccionAnterior: string;
  seccionNueva: string;
  vacanteLiberadaEn: string;
  vacanteOcupadaEn: string;
  disponiblesOrigen: number | null;
  disponiblesDestino: number | null;
  motivo: string;
  autorizadoPor: string;
  realizadoPor: string;
}

export interface HistorialCambioSeccion {
  id: number;
  studentId: number;
  estudiante: string;
  dni: string;
  tipoDocumento: string;
  nivel: string;
  grado: string;
  seccionAnterior: string;
  seccionNueva: string;
  motivo: string;
  observacion: string;
  autorizadoPor: string;
  realizadoPor: string;
  anioEscolar?: number;
  estado?: 'completado';
  createdAt: string;
}

export interface SolicitudCambioSeccion {
  id: number;
  studentId: number;
  estudiante: string;
  dni: string;
  tipoDocumento: string;
  nivel: string;
  grado: string;
  seccionActual: string;
  seccionDeseada: string | null;
  motivo: string;
  observacion: string;
  autorizadoPor: string;
  solicitadoPor: string;
  anioEscolar: number;
  estado: 'pendiente' | 'cancelado';
  createdAt: string;
}

export interface CreateSolicitudCambioSeccionPayload {
  studentId: number;
  seccionDeseada?: string;
  motivo: string;
  autorizadoPor: string;
  observacion?: string;
  solicitadoPor?: string;
}

export const MOTIVOS_CAMBIO: { value: MotivoCambioSeccion; label: string }[] = [
  { value: 'equilibrio', label: 'Equilibrio de aulas' },
  { value: 'solicitud_apoderado', label: 'Solicitud del apoderado' },
  { value: 'rendimiento', label: 'Agrupacion por rendimiento' },
  { value: 'capacidad', label: 'Capacidad / vacante' },
  { value: 'otro', label: 'Otro motivo' },
];

export const CARGOS_AUTORIZADORES = [
  'Director(a) de la IE',
  'Subdirector(a) academico',
  'Administrador(a) del sistema',
  'Coordinador(a) de nivel',
];
