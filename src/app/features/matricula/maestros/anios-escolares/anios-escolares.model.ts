export type AnioEscolarEstado = 'planificado' | 'activo' | 'cerrado';
export type AnioEscolarTipoPeriodo = 'bimestre' | 'trimestre' | 'semestre';

export interface AnioEscolarItem {
  id: number;
  anio: number;
  fechaInicio: string;
  fechaFin: string;
  tipoPeriodo: AnioEscolarTipoPeriodo;
  estado: AnioEscolarEstado;
  vigente: boolean;
  version: number;
  publicado: boolean;
  motivo: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnioEscolarContext {
  institucion: {
    id: number;
    nombre: string;
    siglas: string;
    anioEscolarActivo: number;
    ugel: string;
    dre: string;
    codigoModular: string;
  };
  permisoVer: string;
  permisoGestionar: string;
  anioVigente: AnioEscolarItem | null;
  estados: Array<{ codigo: string; label: string }>;
  tiposPeriodo: AnioEscolarTipoPeriodo[];
}

export interface AnioEscolarPage {
  items: AnioEscolarItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateAnioEscolarPayload {
  anio: number;
  fechaInicio: string;
  fechaFin: string;
  tipoPeriodo: AnioEscolarTipoPeriodo;
  motivo?: string;
  generarPeriodos?: boolean;
  activar?: boolean;
  idempotencyKey?: string;
}

export interface CopiarCalendarioResumen {
  copiados: number;
  omitidos: number;
  fueraDeRango: number;
}

export interface CopiarCalendarioResult {
  anioDestino: number;
  anioOrigen: number;
  deltaAnios: number;
  periodos: CopiarCalendarioResumen;
  feriados: CopiarCalendarioResumen;
  eventos: CopiarCalendarioResumen;
  version: number;
  mensaje: string;
  recuperado?: boolean;
}

export interface CopiarCalendarioPayload {
  anioOrigen?: number;
  copiarPeriodos?: boolean;
  copiarFeriados?: boolean;
  copiarEventos?: boolean;
  motivo?: string;
  idempotencyKey?: string;
}

export interface AnioEscolarEvento {
  id: number;
  accion: string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  motivo: string;
  cambios: Record<string, unknown>;
  actorNombre: string;
  actorRol: string;
  createdAt: string;
}

export interface AnioEscolarDetalle extends AnioEscolarItem {
  eventos: AnioEscolarEvento[];
}

export interface PublicarComunicadoCalendarioPayload {
  titulo?: string;
  cuerpo?: string;
  destinatarios?: 'alumnos' | 'padres' | 'todos' | 'docentes';
  prioridad?: 'alta' | 'media' | 'baja';
  motivo?: string;
  republicar?: boolean;
  idempotencyKey?: string;
}

export interface PublicarComunicadoCalendarioResult {
  anioEscolar: AnioEscolarItem;
  comunicado: {
    id: number;
    titulo: string;
    destinatarios: string;
    prioridad: string;
    fechaPublicacion: string;
  };
  version: number;
  mensaje: string;
  recuperado?: boolean;
}

export const ACCION_ANIO_ESCOLAR_LABEL: Record<string, string> = {
  registrar: 'Registro',
  copiar_calendario: 'Copia de calendario',
  dividir_periodos: 'División en periodos',
  activar: 'Activación',
  cerrar: 'Cierre',
  publicar_comunicado: 'Publicación de comunicado',
};

export const ESTADO_ANIO_CFG: Record<AnioEscolarEstado, string> = {
  planificado: 'badge badge-gray',
  activo: 'badge badge-green',
  cerrado: 'badge badge-red',
};
