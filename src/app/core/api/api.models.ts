export interface ApiStudent {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  nivel: string;
  grado: string;
  seccion: string;
  activo: boolean;
}

export interface StudentsStats {
  total: number;
  activos: number;
  inactivos: number;
  retirados: number;
  mujeres: number;
  varones: number;
  matriculadosActivos: number;
}

export interface ApiStudentMe {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  dni: string;
  nivel: string;
  grado: string;
  gradoLabel: string;
  seccion: string;
  aulaLabel: string;
  activo: boolean;
}

export interface ApiStudentContactoAula {
  nivel: string;
  grado: string;
  seccion: string;
  aulaLabel: string;
  anioEscolar: number;
}

export interface ApiStudentCompaneroContacto {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
}

export interface ApiStudentDocenteContacto {
  id: number;
  nombres: string;
  apellidos: string;
  abrev: string;
  email: string;
  telefono: string;
  especialidad: string;
  cursos: string[];
}

export interface ApiStudentContactos {
  aula: ApiStudentContactoAula;
  companeros: ApiStudentCompaneroContacto[];
  docentes: ApiStudentDocenteContacto[];
}

export interface ApiRepresentante {
  nombres: string;
  apellidos: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  tipoDocumento?: string;
  dni: string;
  telefono: string;
  email: string;
  trabajo: string;
}

export interface ApiExpedienteDocumento {
  id: number;
  tipo: string;
  numero: string;
  estado: 'entregado' | 'pendiente' | 'vencido';
  fechaEntrega: string;
  imagenUrl?: string;
}

export interface ApiDocumentoArchivo {
  versionId: number;
  version: number;
  nombreArchivo: string;
  mimeType: string;
  tamanoBytes: number;
  sha256: string;
  url: string;
  vigenciaHasta: string | null;
  uploadedAt: string;
  uploadedByNombre: string;
}

export interface ApiDocumentoMatricula {
  id?: number;
  tipo: string;
  obligatorio: boolean;
  estado: 'entregado' | 'pendiente' | 'vencido';
  numero: string;
  fechaEntrega: string;
  imagenUrl?: string;
  registrado: boolean;
  archivo?: ApiDocumentoArchivo | null;
}

export interface StudentDocumentsContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel: string;
    dre: string;
  };
  permisoConsulta: string;
  permisoCarga: string;
  permisoDescarga: string;
  maxBytes: number;
  maxMb: number;
  formatosPermitidos: string[];
  mimeTypes: string[];
  storageDriver?: 'local' | 'minio';
}

export interface ApiStudentDocumentsResponse {
  studentId: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  gradoLabel: string;
  seccion: string;
  anioIngreso: string;
  documentos: ApiDocumentoMatricula[];
  entregados: number;
  total: number;
  obligatoriosPendientes: number;
}

export interface ApiExpedienteHistorial {
  anio: string;
  grado: string;
  seccion: string;
  promedio: number;
  estado: string;
}

export interface ApiExpediente {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  dni: string;
  tipoDocumento?: string;
  email: string;
  fechaNac: string;
  sexo: 'M' | 'F';
  direccion: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  telefonoEmergencia?: string;
  foto: string;
  grupoSanguineo: string;
  alergias: string;
  condicionesSalud: string;
  observaciones: string;
  nivel: string;
  grado: string;
  gradoLabel: string;
  seccion: string;
  anioIngreso: string;
  estado: 'activo' | 'inactivo' | 'retirado';
  activo: boolean;
  estadoCambioSeccion?: 'elegible' | 'cambio_realizado';
  padre: ApiRepresentante;
  madre: ApiRepresentante;
  apoderado: ApiRepresentante;
  historialAcademico: ApiExpedienteHistorial[];
  asistenciaPct: number;
  conductaNota: string;
  documentos: ApiExpedienteDocumento[];
  estadoDocumento?: string;
  sinDocumentoMotivo?: string;
  sinDocumentoSustento?: string;
  matriculaExcepcional?: boolean;
  excepcionalMotivo?: string;
  excepcionalSustento?: string;
  edadNormativaAlRegistro?: number | null;
}

export interface ApiCourse {
  id: number;
  nombre: string;
  area: string;
  nivel: string;
  grado: string;
  seccion: string;
  docente: string;
}

export interface ApiSchedule {
  id: number;
  studentId: number;
  nivel: string;
  grado: string;
  seccion: string;
  dia: number;
  horaInicio: string;
  horaFin: string;
  curso: string;
  docente: string;
}

export interface ApiGrade {
  id: number;
  studentId: number;
  courseId?: number;
  curso: string;
  tipo: 'daily' | 'partial' | 'final';
  componenteCodigo?: string;
  bimestre: number;
  nota: number;
  fechaEvaluacion: string;
  descripcion?: string;
}

export interface ApiStudentGradeItem {
  id: number;
  descripcion: string;
  fecha: string;
  bimestre: number;
  nota: number;
}

export interface ApiStudentCursoGrades {
  id: number;
  nombre: string;
  area: string;
  docenteAbrev: string;
  controlesDiarios: ApiStudentGradeItem[];
  parciales: ApiStudentGradeItem[];
  finales: ApiStudentGradeItem[];
}

export interface ApiStudentGrades {
  bimestreActual: number;
  anioEscolar: number;
  cursos: ApiStudentCursoGrades[];
}

export interface ApiAttendance {
  id: number;
  studentId: number;
  fecha: string;
  estado: 'P' | 'F' | 'T' | 'J';
  observacion?: string;
}

export interface ApiTaskResource {
  id: number;
  descripcion: string;
  tipo: ApiResource['tipo'];
  url: string;
  nombreArchivo: string;
  mimeType: string;
  tamanoBytes: number;
  docente: string;
}

export interface ApiTask {
  id: number;
  studentId: number;
  studentNombre?: string;
  studentApellido?: string;
  studentGrado?: string;
  studentSeccion?: string;
  resourceId?: number | null;
  resource?: ApiTaskResource | null;
  titulo: string;
  curso: string;
  fechaEntrega: string;
  estado: 'PENDING' | 'SUBMITTED' | 'OVERDUE' | 'GRADED';
  prioridad: 'alta' | 'media' | 'baja';
  comentarioEntrega?: string;
  archivoEntregaUrl?: string | null;
  archivoEntregaNombre?: string | null;
  archivoEntregaMime?: string | null;
  fechaEntregaReal?: string | null;
  nota?: number | null;
  retroalimentacion?: string;
  calificadoAt?: string | null;
}

export interface ApiAnnouncement {
  id: number;
  titulo: string;
  cuerpo: string;
  tipo: 'general' | 'academico' | 'administrativo' | 'urgente' | 'evento';
  destinatarios: 'alumnos' | 'padres' | 'todos' | 'docentes';
  prioridad: 'alta' | 'media' | 'baja';
  fechaPublicacion: string;
  fechaVencimiento?: string;
  habilitado: boolean;
}

export interface ApiResource {
  id: number;
  titulo: string;
  descripcion: string;
  tipo:
    | 'tarea'
    | 'clase'
    | 'lectura'
    | 'video'
    | 'enlace'
    | 'evaluacion'
    | 'imagen'
    | 'documento'
    | 'excel'
    | 'ppt';
  courseId: number | null;
  curso: string;
  nivel: string;
  grado: string;
  seccion: string;
  docente: string;
  fechaPublicacion: string;
  fechaEntrega: string | null;
  url: string;
  nombreArchivo: string;
  mimeType: string;
  tamanoBytes: number;
  visible: boolean;
  fechaPublicacionDisplay: string;
  fechaEntregaDisplay: string | null;
  tareasGeneradas: number;
}

export type ApiTemarioClaseEstado =
  | 'programada'
  | 'dictada'
  | 'reprogramada'
  | 'cancelada';

export type ApiTemarioMaterialTipo = 'texto' | 'documento' | 'enlace' | 'video';

export type ApiModoLiberacionTemario =
  | 'oculto'
  | 'inmediato'
  | 'programada'
  | 'dias_antes';

export interface ApiTemarioImagenClase {
  url: string;
  nombre: string;
  leyenda: string;
  urlDisplay: string;
}

export interface ApiTemarioClase {
  id: number;
  docenteId: number;
  docenteNombre: string;
  assignmentId: number | null;
  cursoId: number;
  cursoNombre: string;
  nivel: string;
  grado: string;
  seccion: string;
  anioEscolar: number;
  numero: number;
  titulo: string;
  descripcion: string;
  objetivos: string;
  contenidoClase: string;
  imagenesClase: ApiTemarioImagenClase[];
  fechaClase: string;
  fechaClaseDisplay: string;
  estado: ApiTemarioClaseEstado;
  visibleEstudiante: boolean;
  modoLiberacion: ApiModoLiberacionTemario;
  fechaLiberacion: string | null;
  fechaLiberacionDisplay: string | null;
  horaLiberacion: string;
  diasAntesLiberacion: number | null;
  liberadoAlumno: boolean;
  liberacionLabel: string;
  materialTitulo: string;
  materialDescripcion: string;
  materialTipo: ApiTemarioMaterialTipo;
  materialUrl: string;
  materialNombreArchivo: string;
  materialMimeType: string;
  materialUrlDisplay: string;
  tieneMaterial: boolean;
  createdAt: string;
  updatedAt: string;
}
