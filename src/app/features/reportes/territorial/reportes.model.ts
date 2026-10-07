export type ReporteTerritorialTipo = 'consolidado_ugel_dre';
export type ReporteFormato = 'csv' | 'xlsx' | 'pdf';

export interface ReporteTerritorialContext {
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
  mesActual: string;
  tiposDisponibles: ReporteTerritorialTipo[];
  permisoConsulta: string;
  permisoExportacion: string;
  filtros: {
    bimestres: number[];
    dres: string[];
    ugels: string[];
  };
  fuente: string;
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
  tipo: ReporteTerritorialTipo;
  fuente: string;
  parametros: Record<string, unknown>;
  institucion: ReporteTerritorialContext['institucion'];
  alcance?: ReporteTerritorialContext['alcance'];
  totales: Record<string, number | null>;
}

export interface ReporteResponse {
  meta: ReporteMeta;
  columns: ReporteColumn[];
  items: ReporteRow[];
  pagination: ReportePagination;
}

export interface ReporteFilters {
  tipo: ReporteTerritorialTipo;
  anio?: number;
  bimestre?: number;
  mes?: string;
  dre?: string;
  ugel?: string;
  busqueda?: string;
  page?: number;
  pageSize?: number;
}
