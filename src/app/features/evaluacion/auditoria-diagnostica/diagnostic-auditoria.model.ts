export type DiagnosticChangeAccion = 'crear' | 'actualizar' | 'registro_masivo';

export interface DiagnosticChangeLog {
  id: number;
  evaluationId: number | null;
  studentId: number;
  studentNombre: string;
  curso: string;
  bimestre: number;
  anio: number;
  accion: DiagnosticChangeAccion;
  actorNombre: string;
  actorRol: string;
  motivo: string;
  cambios: Record<string, { anterior?: unknown; nuevo?: unknown }>;
  createdAt: string;
  fechaDisplay: string;
  horaDisplay: string;
}

export interface DiagnosticAuditoriaContext {
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

export interface DiagnosticAuditoriaFilters {
  studentId?: number;
  curso?: string;
  accion?: string;
  page?: number;
  pageSize?: number;
}

export interface DiagnosticAuditoriaResponse {
  items: DiagnosticChangeLog[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const ACCIONES_DIAGNOSTIC_AUDIT = [
  { value: '', label: 'Todas' },
  { value: 'crear', label: 'Creación' },
  { value: 'actualizar', label: 'Actualización' },
  { value: 'registro_masivo', label: 'Registro masivo' },
];

export function accionDiagnosticLabel(accion: DiagnosticChangeAccion): string {
  return ACCIONES_DIAGNOSTIC_AUDIT.find(a => a.value === accion)?.label ?? accion;
}

export function resumenCambioDiagnostico(
  cambios: DiagnosticChangeLog['cambios'],
): string {
  const partes: string[] = [];
  for (const [campo, diff] of Object.entries(cambios ?? {})) {
    const anterior = diff.anterior;
    const nuevo = diff.nuevo;
    if (anterior !== undefined && nuevo !== undefined) {
      partes.push(`${campo}: ${formatVal(anterior)} → ${formatVal(nuevo)}`);
    } else if (nuevo !== undefined) {
      partes.push(`${campo}: ${formatVal(nuevo)}`);
    }
  }
  return partes.length ? partes.join(' · ') : '—';
}

function formatVal(value: unknown): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}
