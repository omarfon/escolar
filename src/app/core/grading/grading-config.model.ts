export type SistemaEval = 'numerico' | 'literal' | 'mixto';
export type TipoPeriodo = 'bimestre' | 'trimestre' | 'semestre';
export type EvalNavMode = 'numerico' | 'competencia';

export interface EscalaLogroConfig {
  AD: number;
  A: number;
  B: number;
}

export interface GradingConfig {
  sistemaEval: SistemaEval;
  tipoPeriodo: TipoPeriodo;
  notaMinima: number;
  notaMaxima: number;
  escalaLogro: EscalaLogroConfig;
  usesNumeric: boolean;
  usesCompetencias: boolean;
  periodosCount: number;
}

export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  sistemaEval: 'numerico',
  tipoPeriodo: 'bimestre',
  notaMinima: 11,
  notaMaxima: 20,
  escalaLogro: { AD: 17.5, A: 14, B: 11 },
  usesNumeric: true,
  usesCompetencias: false,
  periodosCount: 4,
};

export function sistemaEvalLabel(sistema: SistemaEval): string {
  const map: Record<SistemaEval, string> = {
    numerico: 'Numérico (0–20)',
    literal: 'Por competencias (AD/A/B/C)',
    mixto: 'Mixto (números y competencias)',
  };
  return map[sistema] ?? sistema;
}

export function nivelFromNota(nota: number, escala: EscalaLogroConfig): string {
  if (nota >= escala.AD) return 'AD';
  if (nota >= escala.A) return 'A';
  if (nota >= escala.B) return 'B';
  return 'C';
}

export function nivelBadge(nivel: string | null): string {
  return (
    {
      AD: 'badge-indigo',
      A: 'badge-green',
      B: 'badge-yellow',
      C: 'badge-red',
    } as Record<string, string>
  )[nivel ?? ''] ?? 'badge-gray';
}

export function promedioColor(nota: number | null, cfg: GradingConfig): string {
  if (nota === null) return 'text-gray-400';
  if (nota >= cfg.escalaLogro.A) return 'text-green-600';
  if (nota >= cfg.notaMinima) return 'text-yellow-600';
  return 'text-red-600';
}

export function matchesEvalNav(mode: EvalNavMode | undefined, cfg: GradingConfig): boolean {
  if (!mode) return true;
  if (mode === 'numerico') return cfg.usesNumeric;
  return cfg.usesCompetencias;
}

export type TipoEscalaCurriculum = 'numerica' | 'literal' | 'competencia';

export interface GradingScaleNivelItem {
  curriculumId: number;
  nivel: string;
  anio: number;
  estado: string;
  version: string;
  tipoEscala: TipoEscalaCurriculum;
  tipoEscalaLabel: string;
  modalidad: string;
  editable: boolean;
}

export interface ValidacionRangosConfig {
  min: number;
  max: number;
  notaMinimaAprobatoria: number;
  escalaLogro: EscalaLogroConfig;
  mensaje: string;
  mensajeAprobacion: string;
}

export interface GradingScaleContext {
  institucion: {
    id: number;
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel: string;
    dre: string;
  } | null;
  config: GradingConfig & { modalidad: string; modalidadLabel: string };
  escalasPorNivel: GradingScaleNivelItem[];
  permisos: { consultar: boolean; configurar: boolean };
  validacionRangos: ValidacionRangosConfig;
  alcance: string;
}

export interface GradingScaleHistoryItem {
  id: number;
  alcance: string;
  nivel: string;
  motivo: string;
  actorNombre: string;
  actorRol: string;
  valorAnterior: Record<string, unknown> | null;
  valorNuevo: Record<string, unknown>;
  createdAt: string;
}
