export type BitacoraAccion =
  | 'crear'
  | 'actualizar'
  | 'eliminar'
  | 'login'
  | 'logout'
  | 'exportar'
  | 'aprobar'
  | 'rechazar'
  | 'publicar'
  | 'configurar'
  | 'consultar';

export type BitacoraNivel = 'info' | 'warning' | 'critical';

export type BitacoraResultado = 'success' | 'error';
export type BitacoraTipoVista = 'todos' | 'accesos';

export interface BitacoraItem {
  id: number;
  usuarioId: number | null;
  usuarioNombre: string;
  usuarioRol: string;
  accion: BitacoraAccion;
  modulo: string;
  entidad: string;
  entidadId: string | null;
  descripcion: string;
  detalle: Record<string, unknown> | null;
  ip: string;
  nivel: BitacoraNivel;
  resultado: BitacoraResultado;
  correlationId: string | null;
  createdAt: string;
  fechaDisplay: string;
  horaDisplay: string;
}

export interface BitacoraResumen {
  total: number;
  hoy: number;
  criticos: number;
  advertencias: number;
  accesos: number;
  accesosFallidos: number;
  porModulo: { modulo: string; total: number }[];
}

export interface BitacoraPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface BitacoraResponse {
  resumen: BitacoraResumen;
  items: BitacoraItem[];
  pagination: BitacoraPagination;
}

export interface BitacoraContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel?: string;
    dre?: string;
  };
  retencionDias: number;
  permisoConsulta: string;
  permisoExportacion: string;
}

export interface BitacoraFilters {
  tipo: BitacoraTipoVista;
  modulo: string;
  accion: string;
  nivel: string;
  resultado: string;
  usuario: string;
  desde: string;
  hasta: string;
  busqueda: string;
  page: number;
  pageSize: number;
}

export const MODULOS_BITACORA = [
  { value: '', label: 'Todos los módulos' },
  { value: 'autenticacion', label: 'Autenticación' },
  { value: 'institucion', label: 'Institución' },
  { value: 'usuarios', label: 'Usuarios' },
  { value: 'matricula', label: 'Matrícula' },
  { value: 'asistencia', label: 'Asistencia' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'comunicaciones', label: 'Comunicaciones' },
  { value: 'recursos', label: 'Recursos' },
  { value: 'horarios', label: 'Horarios' },
  { value: 'convivencia', label: 'Convivencia' },
  { value: 'portal_padres', label: 'Portal padres' },
  { value: 'academico', label: 'Académico' },
  { value: 'sedes', label: 'Sedes' },
  { value: 'docentes', label: 'Docentes' },
  { value: 'tesoreria', label: 'Tesorería' },
];

export const ACCIONES_BITACORA = [
  { value: '', label: 'Todas las acciones' },
  { value: 'crear', label: 'Crear' },
  { value: 'actualizar', label: 'Actualizar' },
  { value: 'eliminar', label: 'Eliminar' },
  { value: 'login', label: 'Inicio de sesión' },
  { value: 'logout', label: 'Cierre de sesión' },
  { value: 'exportar', label: 'Exportar' },
  { value: 'aprobar', label: 'Aprobar' },
  { value: 'rechazar', label: 'Rechazar' },
  { value: 'publicar', label: 'Publicar' },
  { value: 'configurar', label: 'Configurar' },
  { value: 'consultar', label: 'Consultar' },
];

export const NIVELES_BITACORA = [
  { value: '', label: 'Todos los niveles' },
  { value: 'info', label: 'Informativo' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'critical', label: 'Crítico' },
];

export function accionLabel(accion: BitacoraAccion): string {
  return ACCIONES_BITACORA.find(a => a.value === accion)?.label ?? accion;
}

export function accionBadge(accion: BitacoraAccion): string {
  const map: Record<BitacoraAccion, string> = {
    crear: 'badge-green',
    actualizar: 'badge-blue',
    eliminar: 'badge-red',
    login: 'badge-indigo',
    logout: 'badge-gray',
    exportar: 'badge-purple',
    aprobar: 'badge-green',
    rechazar: 'badge-red',
    publicar: 'badge-yellow',
    configurar: 'badge-indigo',
    consultar: 'badge-gray',
  };
  return map[accion] ?? 'badge-gray';
}

export function nivelBadge(nivel: BitacoraNivel): string {
  return { info: 'badge-blue', warning: 'badge-yellow', critical: 'badge-red' }[nivel];
}

export function nivelLabel(nivel: BitacoraNivel): string {
  return { info: 'Info', warning: 'Advertencia', critical: 'Crítico' }[nivel];
}

export function moduloLabel(modulo: string): string {
  return MODULOS_BITACORA.find(m => m.value === modulo)?.label ?? modulo;
}

export function moduloIcon(modulo: string): string {
  const map: Record<string, string> = {
    autenticacion: 'login',
    institucion: 'domain',
    usuarios: 'group',
    matricula: 'how_to_reg',
    asistencia: 'fact_check',
    evaluacion: 'grading',
    comunicaciones: 'campaign',
    recursos: 'folder',
    horarios: 'schedule',
    convivencia: 'gavel',
    portal_padres: 'family_restroom',
    academico: 'school',
    sedes: 'location_city',
    docentes: 'person',
    tesoreria: 'payments',
  };
  return map[modulo] ?? 'history';
}
