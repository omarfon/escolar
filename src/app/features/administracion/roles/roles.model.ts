export type RolCodigo =
  | 'ADMIN'
  | 'DIRECTOR'
  | 'DOCENTE'
  | 'SECRETARIA'
  | 'TESORERO'
  | 'PADRE'
  | 'ESTUDIANTE'
  | 'BIBLIOTECARIO';

export interface Permiso {
  codigo: string;
  label: string;
}

export interface SeccionPermisos {
  modulo: string;
  icono: string;
  permisos: Permiso[];
}

export interface RolDto {
  codigo: string;
  label: string;
  descripcion: string;
  color: string;
  esAdmin: boolean;
  usuariosCount: number;
  permisos: string[];
  institutionId?: number | null;
  institucionNombre?: string | null;
  esSistema?: boolean;
}

export interface CreateRolePayload {
  label: string;
  descripcion?: string;
  basadoEn?: string;
  institutionId?: number;
}

export interface RolesResponse {
  roles: RolDto[];
  catalog: SeccionPermisos[];
}

export interface UpdateRolePermissionsPayload {
  permisos: string[];
  motivo?: string;
}
