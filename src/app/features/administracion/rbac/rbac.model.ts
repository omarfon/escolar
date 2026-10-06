export interface RbacContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel?: string;
    dre?: string;
  };
  retencionDias: number;
  permisoConsulta: string;
  permisoGestionRoles: string;
  permisoGestionUsuarios: string;
  ambitos: Array<{ codigo: string; label: string }>;
  rolesTerritoriales: string[];
  reglaResolucion: string;
}

export interface RbacAuditItem {
  id: number;
  fechaDisplay: string;
  horaDisplay: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  actorNombre: string;
  actorRol: string;
  descripcion: string;
  detalle: Record<string, unknown> | null;
  resultado: string;
}

export interface RbacAuditResponse {
  items: RbacAuditItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface EffectiveAuthPreview {
  userId: number;
  roleCodigos: string[];
  permisos: string[];
  permisosCount: number;
  esAdmin: boolean;
  primaryRole: string;
  ambitos: string[];
  assignments: unknown[];
}
