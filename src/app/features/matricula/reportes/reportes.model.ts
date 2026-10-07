export type ReporteMatriculaTipo = 'matricula_global' | 'matricula_resumen';
export type ReporteFormato = 'csv' | 'xlsx' | 'pdf';

export interface ReporteMatriculaContext {
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
  tiposDisponibles: ReporteMatriculaTipo[];
  permisoConsulta: string;
  permisoExportacion: string;
  filtros: {
    niveles: string[];
    grados: string[];
    secciones: string[];
    periodos: number[];
    estadosMatricula: string[];
    dres: string[];
    ugels: string[];
  };
  fuentes: Record<ReporteMatriculaTipo, string>;
}

export interface ReporteColumn {
  key: string;
  label: string;
}

export interface ReporteRow {
  _tipoFila?: string;
  tituloGrupo?: string;
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
  tipo: ReporteMatriculaTipo;
  fuente: string;
  parametros: Record<string, unknown>;
  institucion: ReporteMatriculaContext['institucion'];
  alcance?: ReporteMatriculaContext['alcance'];
  totales: Record<string, number | null>;
}

export interface ReporteResponse {
  meta: ReporteMeta;
  columns: ReporteColumn[];
  items: ReporteRow[];
  pagination: ReportePagination;
}

export interface ReporteFilters {
  tipo: ReporteMatriculaTipo;
  anio?: number;
  periodo?: number;
  dre?: string;
  ugel?: string;
  nivel?: string;
  grado?: string;
  seccion?: string;
  estadoMatricula?: string;
  busqueda?: string;
  page?: number;
  pageSize?: number;
}

export interface ReporteJob {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reportType: ReporteMatriculaTipo;
  format: ReporteFormato;
  totalFilas: number;
  archivoNombre?: string;
  errorMensaje?: string;
  createdAt: string;
  completedAt?: string;
}

export const TIPOS_REPORTE_MATRICULA: { value: ReporteMatriculaTipo; label: string }[] = [
  { value: 'matricula_global', label: 'Matrícula global por IE' },
  { value: 'matricula_resumen', label: 'Resumen por aula' },
];

export function tipoReporteMatriculaLabel(tipo: ReporteMatriculaTipo): string {
  return TIPOS_REPORTE_MATRICULA.find((t) => t.value === tipo)?.label ?? tipo;
}

export function esFilaEncabezadoGrupo(row: ReporteRow): boolean {
  return row._tipoFila === 'encabezado';
}
