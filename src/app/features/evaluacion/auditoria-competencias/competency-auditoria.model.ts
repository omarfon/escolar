export type CompetencyChangeAccion = 'crear' | 'actualizar' | 'eliminar';

export interface CompetencyChangeLog {
  id: number;
  evaluationId: number | null;
  studentId: number;
  studentNombre: string;
  competenciaId: number;
  bimestre: number;
  anio: number;
  accion: CompetencyChangeAccion;
  actorNombre: string;
  actorRol: string;
  motivo: string;
  cambios: Record<string, { anterior?: unknown; nuevo?: unknown }>;
  createdAt: string;
  fechaDisplay: string;
  horaDisplay: string;
}

export interface CompetencyAuditoriaContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel?: string;
    dre?: string;
  };
  retencionDias: number;
  permisoConsulta: string;
}

export interface CompetencyAuditoriaFilters {
  studentId?: number;
  competenciaId?: number;
  bimestre?: number;
  accion?: string;
  page?: number;
  pageSize?: number;
}

export interface CompetencyAuditoriaResponse {
  items: CompetencyChangeLog[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const ACCIONES_COMPETENCY_AUDIT = [
  { value: '', label: 'Todas' },
  { value: 'crear', label: 'Creación' },
  { value: 'actualizar', label: 'Actualización' },
  { value: 'eliminar', label: 'Eliminación' },
];

export function accionCompetencyLabel(accion: CompetencyChangeAccion): string {
  return ACCIONES_COMPETENCY_AUDIT.find((a) => a.value === accion)?.label ?? accion;
}

export function nivelLogroLabel(cambios: CompetencyChangeLog['cambios']): string {
  const nivel = cambios?.['nivelLogro'];
  if (!nivel) return '—';
  const anterior = nivel.anterior as string | null | undefined;
  const nuevo = nivel.nuevo as string | null | undefined;
  if (anterior && nuevo) return `${anterior} → ${nuevo}`;
  if (nuevo) return String(nuevo);
  if (anterior) return `Eliminado (${anterior})`;
  return '—';
}
