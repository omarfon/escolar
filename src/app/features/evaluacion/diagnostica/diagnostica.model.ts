import { ValidacionRangos } from '../notas/notas-registro.model';

export type NivelLogroDiagnostico = 'AD' | 'A' | 'B' | 'C';
export type ModoRegistroDiagnostico = 'numerico' | 'competencia' | 'mixto';

export interface DiagnosticContextCurso {
  nombre: string;
  conEvaluaciones: boolean;
}

export interface DiagnosticContextItem {
  id: string;
  nivel: string;
  grado: string;
  seccion: string;
  label: string;
  alumnosCount: number;
  cursos: DiagnosticContextCurso[];
  cursoSugerido: string;
  actaCerrada?: boolean;
}

export interface DiagnosticRegistryContextResponse {
  bimestre: number;
  bimestreActual: number;
  anioEscolar: number;
  modoRegistro: ModoRegistroDiagnostico;
  permisos: { consultar: boolean; registrar: boolean };
  contexts: DiagnosticContextItem[];
}

export interface DiagnosticAlumnoRow {
  studentId: number;
  nombre: string;
  apellido: string;
  codigo: string;
  evaluationId?: number;
  nota: number | null;
  nivelLogro: NivelLogroDiagnostico | null;
  nivelDerivado: string | null;
  observacion: string | null;
}

export interface DiagnosticRegistryResponse {
  bimestre: number;
  bimestreActual: number;
  bimestreHabilitado: boolean;
  anioEscolar: number;
  curso: string;
  nivel: string;
  grado: string;
  seccion: string;
  modoRegistro: ModoRegistroDiagnostico;
  validacionRangos?: ValidacionRangos;
  alumnos: DiagnosticAlumnoRow[];
  actaCerrada?: boolean;
  edicionBloqueada?: boolean;
}

export interface DiagnosticFilters {
  nivel: string;
  grado: string;
  seccion: string;
  curso: string;
}

export interface SaveDiagnosticPayload {
  nivel: string;
  grado: string;
  seccion: string;
  curso: string;
  fechaEvaluacion: string;
  auditMotivo?: string;
  entries: Array<{
    studentId: number;
    evaluationId?: number;
    nota?: number;
    nivelLogro?: NivelLogroDiagnostico;
    observacion?: string;
  }>;
}

export const NIVELES_DIAGNOSTICO: NivelLogroDiagnostico[] = ['AD', 'A', 'B', 'C'];

export const NCFG: Record<NivelLogroDiagnostico, { label: string; cls: string }> = {
  AD: { label: 'AD', cls: 'badge-indigo' },
  A: { label: 'A', cls: 'badge-green' },
  B: { label: 'B', cls: 'badge-yellow' },
  C: { label: 'C', cls: 'badge-red' },
};
