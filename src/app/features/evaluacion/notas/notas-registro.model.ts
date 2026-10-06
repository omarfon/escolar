import {
  FormulaComponenteItem,
  FormulaEscalaLogro,
  MaestroFormulaEvaluacionItem,
} from '../../matricula/maestros/formulas-evaluacion/formulas-evaluacion.model';

export interface RegistryAlumnoRow {
  studentId: number;
  nombre: string;
  apellido: string;
  codigo: string;
  componentes: Record<string, RegistryComponenteNota>;
  promedioBimestre: number | null;
  nivel: string | null;
}

export interface RegistryComponenteNota {
  gradeId?: number;
  nota: number | null;
}

export interface ValidacionRangos {
  min: number;
  max: number;
  notaMinimaAprobatoria: number;
  escalaLogro: FormulaEscalaLogro;
  mensaje: string;
  mensajeAprobacion: string;
}

export interface GradeRegistryResponse {
  formula: MaestroFormulaEvaluacionItem;
  bimestre: number;
  curso: string;
  nivel: string;
  grado: string;
  seccion: string;
  alumnos: RegistryAlumnoRow[];
  bimestreActual: number;
  bimestreHabilitado: boolean;
  validacionRangos?: ValidacionRangos;
  actaCerrada?: boolean;
  edicionBloqueada?: boolean;
}

export interface RegistryContextsResponse {
  bimestreActual: number;
  contexts: RegistryContextItem[];
}

export interface NotasRegistroFilters {
  nivel: string;
  grado: string;
  seccion: string;
  curso: string;
  bimestre: number;
}

export interface RegistryContextCurso {
  nombre: string;
  conNotas: boolean;
}

export interface RegistryContextItem {
  id: string;
  nivel: string;
  grado: string;
  seccion: string;
  label: string;
  alumnosCount: number;
  cursos: RegistryContextCurso[];
  cursoSugerido: string;
  actaCerrada?: boolean;
}

export interface RectifyRegistryContextResponse {
  bimestreActual: number;
  anioEscolar: number;
  permisos: { rectificar: boolean };
  contexts: RegistryContextItem[];
}

export interface SaveNotasRegistroPayload {
  curso: string;
  bimestre: number;
  fechaEvaluacion: string;
  nivel?: string;
  grado?: string;
  seccion?: string;
  entries: Array<{
    studentId: number;
    componenteCodigo: string;
    gradeId?: number;
    nota: number;
  }>;
}

export interface RectifyNotasRegistroPayload extends SaveNotasRegistroPayload {
  motivo: string;
}

export function calcNotaPonderada(
  componentes: FormulaComponenteItem[],
  notas: Record<string, number | null | undefined>,
): number | null {
  const items = componentes.filter(c => c.activo !== false);
  if (!items.length) return null;
  let weighted = 0;
  for (const item of items) {
    const value = notas[item.codigo];
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    weighted += value * (item.peso / 100);
  }
  return Math.round(weighted * 10) / 10;
}

export function nivelFromNota(nota: number, escala: FormulaEscalaLogro): string {
  if (nota >= escala.AD) return 'AD';
  if (nota >= escala.A) return 'A';
  if (nota >= escala.B) return 'B';
  return 'C';
}

export function nivelBadge(nivel: string | null): string {
  return ({ AD: 'badge-indigo', A: 'badge-green', B: 'badge-yellow', C: 'badge-red' } as Record<string, string>)[nivel ?? ''] ?? 'badge-gray';
}

export function promedioColor(nota: number | null, cfg?: { notaMinima: number; escalaLogro: FormulaEscalaLogro }): string {
  if (nota === null) return 'text-gray-400';
  const min = cfg?.notaMinima ?? 11;
  const a = cfg?.escalaLogro?.A ?? 14;
  if (nota >= a) return 'text-green-600';
  if (nota >= min) return 'text-yellow-600';
  return 'text-red-600';
}
