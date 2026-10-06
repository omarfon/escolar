export type DocenteTipo = 'nombrado' | 'contratado';
export type DocenteEstado = 'activo' | 'inactivo' | 'bloqueado';

export interface DocenteAsignacion {
  id: number;
  cursoId: number;
  cursoNombre: string;
  nivel: string;
  grado: string;
  secciones: string[];
  horasSemanales: number;
  salones: { seccion: string; aforo: number }[];
}

export interface DocenteSalon {
  nivel: string;
  grado: string;
  seccion: string;
  aforo: number;
  anioEscolar: number;
}

export interface DocenteItem {
  id: number;
  institutionId: number;
  institutionNombre?: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  dni: string;
  email: string;
  username: string;
  telefono: string;
  direccion: string;
  sede: string;
  estado: DocenteEstado;
  especialidad: string;
  tipo: DocenteTipo;
  maxHoras: number;
  horasAsignadas: number;
  totalAsignaciones: number;
  totalSalones: number;
}

export interface DocenteDetail extends DocenteItem {
  asignaciones: DocenteAsignacion[];
  salones: DocenteSalon[];
}

export interface DocentesPageMeta {
  activos: number;
  horasAsignadas: number;
  sobreCarga: number;
}

export interface DocentesPage {
  items: DocenteItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  meta: DocentesPageMeta;
  /** true cuando SIAGIE consulta sin IE (todas las instituciones). */
  vistaGlobal?: boolean;
}

export interface DocentePayload {
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  username?: string;
  telefono?: string;
  direccion?: string;
  sede?: string;
  estado?: DocenteEstado;
  especialidad: string;
  password?: string;
}

export const ESPECIALIDADES_DOCENTE = [
  'Docente de Matemáticas',
  'Docente de Comunicación',
  'Docente de Ciencias',
  'Docente de Historia',
  'Docente de Educación Física',
  'Docente de Arte',
  'Docente de Inglés',
  'Docente de Música',
  'Docente de Religión',
  'Docente de Tecnología',
  'Docente de Tutoría',
  'Otra especialidad',
];

export const ESTADOS_DOCENTE: { value: DocenteEstado | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
  { value: 'bloqueado', label: 'Bloqueados' },
];
