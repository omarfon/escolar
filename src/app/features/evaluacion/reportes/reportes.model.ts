export type ReporteTipo = 'promedios' | 'notas' | 'competencias' | 'diagnostico';
export type ReporteFormato = 'csv' | 'xlsx' | 'pdf';

export interface ReporteContext {
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
  bimestreActual: number;
  anioEscolar: number;
  tiposDisponibles: ReporteTipo[];
  permisoConsulta: string;
  permisoExportacion: string;
  filtros: {
    niveles: string[];
    grados: string[];
    secciones: string[];
    cursos: string[];
    bimestres: number[];
    dres: string[];
    ugels: string[];
  };
  fuentes: Record<ReporteTipo, string>;
}

export interface ReporteColumn {
  key: string;
  label: string;
}

export interface ReporteRow {
  [key: string]: string | number | null;
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
  tipo: ReporteTipo;
  fuente: string;
  parametros: Record<string, unknown>;
  institucion: ReporteContext['institucion'];
  alcance?: ReporteContext['alcance'];
  totales: Record<string, number | null>;
}

export interface ReporteResponse {
  meta: ReporteMeta;
  columns: ReporteColumn[];
  items: ReporteRow[];
  pagination: ReportePagination;
}

export interface ReporteFilters {
  tipo: ReporteTipo;
  anio?: number;
  bimestre?: number;
  dre?: string;
  ugel?: string;
  nivel?: string;
  grado?: string;
  seccion?: string;
  curso?: string;
  busqueda?: string;
  page?: number;
  pageSize?: number;
}

export interface ReporteJob {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reportType: ReporteTipo;
  format: ReporteFormato;
  totalFilas: number;
  archivoNombre?: string;
  errorMensaje?: string;
  createdAt: string;
  completedAt?: string;
}

export const TIPOS_REPORTE: { value: ReporteTipo; label: string }[] = [
  { value: 'promedios', label: 'Promedios por aula' },
  { value: 'notas', label: 'Registro de notas' },
  { value: 'competencias', label: 'Evaluación por competencias' },
  { value: 'diagnostico', label: 'Evaluación diagnóstica' },
];

export function tipoReporteLabel(tipo: ReporteTipo): string {
  return TIPOS_REPORTE.find((t) => t.value === tipo)?.label ?? tipo;
}
