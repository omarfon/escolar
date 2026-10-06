export type GradeChangeAccion =
  | 'crear'
  | 'actualizar'
  | 'eliminar'
  | 'registro_masivo'
  | 'rectificar';

export interface GradeChangeLog {
  id: number;
  gradeId: number | null;
  studentId: number;
  studentCodigo: string;
  studentNombre: string;
  curso: string;
  componenteCodigo: string;
  bimestre: number;
  nivel: string;
  grado: string;
  seccion: string;
  accion: GradeChangeAccion;
  actorUserId: number | null;
  actorNombre: string;
  actorRol: string;
  motivo: string;
  cambios: Record<string, { anterior?: unknown; nuevo?: unknown }>;
  ip: string;
  correlationId: string | null;
  resultado: 'success' | 'error';
  createdAt: string;
  fechaDisplay: string;
  horaDisplay: string;
}

export interface GradeAuditoriaContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel?: string;
    dre?: string;
  };
  retencionDias: number;
  permisoConsulta: string;
  permisoExportacion: string;
}

export interface GradeAuditoriaFilters {
  studentId?: number;
  gradeId?: number;
  curso?: string;
  bimestre?: number;
  accion?: string;
  usuario?: string;
  desde?: string;
  hasta?: string;
  busqueda?: string;
  resultado?: string;
  page?: number;
  pageSize?: number;
}

export interface GradeAuditoriaResponse {
  items: GradeChangeLog[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const ACCIONES_GRADE_AUDIT = [
  { value: '', label: 'Todas' },
  { value: 'crear', label: 'Creación' },
  { value: 'actualizar', label: 'Actualización' },
  { value: 'eliminar', label: 'Eliminación' },
  { value: 'registro_masivo', label: 'Registro masivo' },
  { value: 'rectificar', label: 'Rectificación oficial' },
];

export function accionGradeLabel(accion: GradeChangeAccion): string {
  return ACCIONES_GRADE_AUDIT.find(a => a.value === accion)?.label ?? accion;
}
