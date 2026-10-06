export type NivelCurricula = 'Inicial' | 'Primaria' | 'Secundaria';
export type EstadoCurr = 'activo' | 'inactivo' | 'borrador';
export type TipoEscala = 'numerica' | 'literal' | 'competencia';
export type TipoPeriodo = 'bimestral' | 'trimestral';
export type MainTab = 'curriculas' | 'areas' | 'competencias' | 'malla' | 'config';

export interface Curricula {
  id: number;
  anio: number;
  nivel: NivelCurricula;
  estado: EstadoCurr;
  version: string;
  tipoEscala: TipoEscala;
  tipoPeriodo: TipoPeriodo;
  fechaCreacion: string;
}

export interface Area {
  id: number;
  curriculumId: number;
  nombre: string;
  nivel: NivelCurricula;
  orden: number;
  colorClass: string;
  dotClass: string;
  activo: boolean;
}

export interface Curso {
  id: number;
  curriculumId: number;
  maestroCursoId?: number | null;
  nombre: string;
  areaId: number;
  nivel: NivelCurricula;
  grados: string[];
  horasSemanales: number;
  activo: boolean;
}

export interface Competencia {
  id: number;
  cursoId: number;
  nombre: string;
  activo: boolean;
}

export interface Capacidad {
  id: number;
  competenciaId: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface Indicador {
  id: number;
  capacidadId: number;
  descripcion: string;
  ponderacion: number;
  activo: boolean;
}

export interface AsignDocente {
  id: number;
  docenteId: number | null;
  docenteNombre: string;
  cursoId: number;
  curriculumId?: number | null;
  nivel: NivelCurricula;
  grado: string;
  secciones: string[];
  horasSemanales?: number;
  activo?: boolean;
}

export interface CurriculaCatalog {
  curriculas: Curricula[];
  areas: Area[];
  cursos: Curso[];
  competencias: Competencia[];
  capacidades: Capacidad[];
  indicadores: Indicador[];
  asignaciones: AsignDocente[];
}

export interface MallaCurricular {
  curriculo: Curricula;
  curriculas: Curricula[];
  areas: Area[];
  cursos: Curso[];
  asignaciones: AsignDocente[];
  grados: string[];
  totalesPorGrado: Record<string, number>;
  docentesAsignados: number;
}

export interface CurriculaDetail extends Curricula {
  areasCount: number;
  cursosCount: number;
  competenciasCount: number;
  totalHoras: number;
}

export interface CreateCurriculaPayload {
  anio: number;
  nivel: NivelCurricula;
  tipoEscala: TipoEscala;
  tipoPeriodo: TipoPeriodo;
}

export interface UpdateCurriculaPayload {
  version?: string;
  tipoEscala?: TipoEscala;
  tipoPeriodo?: TipoPeriodo;
}

export interface CreateAreaPayload {
  curriculumId: number;
  nombre: string;
  nivel?: NivelCurricula;
  orden?: number;
  colorClass?: string;
  dotClass?: string;
}

export interface UpdateAreaPayload {
  nombre?: string;
  orden?: number;
  activo?: boolean;
  motivo?: string;
}

export interface CreateCursoPayload {
  curriculumId: number;
  maestroCursoId: number;
  nombre: string;
  areaId: number;
  nivel: NivelCurricula;
  grados: string[];
  horasSemanales: number;
}

export interface UpdateCursoPayload {
  nombre?: string;
  areaId?: number;
  grados?: string[];
  horasSemanales?: number;
  activo?: boolean;
}
