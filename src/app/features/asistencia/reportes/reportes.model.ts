export type ReporteAsistenciaTipo = 'asistencia_detalle' | 'asistencia_resumen';
export type ReporteFormato = 'csv' | 'xlsx' | 'pdf';

export interface ReporteAsistenciaContext {
  institucion: {
    id: number;
    nombre: string;
    siglas: string;
    dre: string;
    ugel: string;
    anioEscolar: number;
  };
  alcance: {
    nivel: string;
    dre: string | null;
    ugel: string | null;
    label: string;
    consolidado: boolean;
    institucionesCount: number;
  };
  periodoActual: number;
  anioEscolar: number;
  mesActual: string;
  tiposDisponibles: ReporteAsistenciaTipo[];
  permisoConsulta: string;
  permisoExportacion: string;
  filtros: {
    niveles: string[];
    grados: string[];
    secciones: string[];
    periodos: number[];
    estados: string[];
    dres: string[];
    ugels: string[];
  };
  fuentes: Record<ReporteAsistenciaTipo, string>;
}

export interface ReporteColumn {
  key: string;
  label: string;
}

export interface ReporteRow {
  [key: string]: string | number | null | undefined;
}

export interface ReportePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ReporteMeta {
  fechaCorte: string;
  anioEscolar: number;
  bimestre: number | null;
  tipo: ReporteAsistenciaTipo;
  fuente: string;
  parametros: Record<string, unknown>;
  institucion: ReporteAsistenciaContext['institucion'];
  alcance?: ReporteAsistenciaContext['alcance'];
  totales: Record<string, number | null>;
}

export interface ReporteResponse {
  meta: ReporteMeta;
  columns: ReporteColumn[];
  items: ReporteRow[];
  pagination: ReportePagination;
}

export interface ReporteFilters {
  tipo: ReporteAsistenciaTipo;
  anio?: number;
  periodo?: number;
  mes?: string;
  dre?: string;
  ugel?: string;
  nivel?: string;
  grado?: string;
  seccion?: string;
  estado?: string;
  busqueda?: string;
  page?: number;
  pageSize?: number;
}

export interface ReporteJob {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reportType: ReporteAsistenciaTipo;
  format: ReporteFormato;
  totalFilas: number;
  archivoNombre?: string;
  errorMensaje?: string;
  createdAt: string;
  completedAt?: string;
}

export const TIPOS_REPORTE_ASISTENCIA: { value: ReporteAsistenciaTipo; label: string }[] = [
  { value: 'asistencia_detalle', label: 'Detalle de asistencia' },
  { value: 'asistencia_resumen', label: 'Resumen por estudiante' },
];

export const ESTADO_ASISTENCIA_LABEL: Record<string, string> = {
  P: 'Presente',
  F: 'Falta',
  T: 'Tardanza',
  J: 'Justificada',
};

export function tipoReporteAsistenciaLabel(tipo: ReporteAsistenciaTipo): string {
  return TIPOS_REPORTE_ASISTENCIA.find((t) => t.value === tipo)?.label ?? tipo;
}
