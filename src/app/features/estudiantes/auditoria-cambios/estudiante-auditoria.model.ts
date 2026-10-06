export type EstudianteChangeAccion = 'crear' | 'actualizar' | 'eliminar' | 'cambio_seccion' | 'retiro' | 'reingreso';

export interface EstudianteChangeLog {
  id: number;
  studentId: number;
  studentCodigo: string;
  studentNombre: string;
  accion: EstudianteChangeAccion;
  actorUserId: number | null;
  actorNombre: string;
  actorRol: string;
  motivo: string;
  cambios: Record<string, { anterior?: unknown; nuevo?: unknown }>;
  ip: string;
  correlationId: string | null;
  resultado: 'success' | 'error';
  createdAt: string;
  fechaDisplay: string;
  horaDisplay: string;
}

export interface EstudianteAuditoriaContext {
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

export interface EstudianteAuditoriaFilters {
  studentId?: number;
  accion?: string;
  usuario?: string;
  desde?: string;
  hasta?: string;
  busqueda?: string;
  resultado?: string;
  page?: number;
  pageSize?: number;
}

export interface EstudianteAuditoriaResponse {
  items: EstudianteChangeLog[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const ACCIONES_ESTUDIANTE_AUDIT = [
  { value: '', label: 'Todas' },
  { value: 'crear', label: 'Creación' },
  { value: 'actualizar', label: 'Actualización' },
  { value: 'eliminar', label: 'Eliminación' },
  { value: 'cambio_seccion', label: 'Cambio de sección' },
  { value: 'retiro', label: 'Retiro de matrícula' },
  { value: 'reingreso', label: 'Reingreso de matrícula' },
];

export function accionEstudianteLabel(accion: EstudianteChangeAccion): string {
  return ACCIONES_ESTUDIANTE_AUDIT.find(a => a.value === accion)?.label ?? accion;
}

export interface SensitiveNotification {
  id: number;
  studentId: number;
  studentNombre: string;
  studentCodigo: string;
  camposNotificados: string[];
  camposLabels: string[];
  correoDestino: string;
  correoEnviado: boolean;
  actorNombre: string;
  actorRol: string;
  motivo: string;
  createdAt: string;
  fechaDisplay: string;
  horaDisplay: string;
}

export interface SensitiveNotificationContext {
  institucion: EstudianteAuditoriaContext['institucion'];
  retencionDias: number;
  permisoConsulta: string;
  notificacionesActivas: boolean;
  camposSensibles: { campo: string; label: string }[];
}

export interface SensitiveNotificationResponse {
  items: SensitiveNotification[];
  pagination: EstudianteAuditoriaResponse['pagination'];
}

export type AuditoriaVista = 'cambios' | 'notificaciones';
