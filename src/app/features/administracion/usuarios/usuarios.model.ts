export type RolUsuario =
  | 'ADMIN'
  | 'DIRECTOR'
  | 'DOCENTE'
  | 'SECRETARIA'
  | 'TESORERO'
  | 'PADRE'
  | 'ESTUDIANTE'
  | 'BIBLIOTECARIO'
  | 'UGEL'
  | 'DRE'
  | 'MINEDU';

export type AmbitoTerritorial = 'MINEDU' | 'DRE' | 'UGEL' | 'IE';
export type EstadoUsuario = 'activo' | 'inactivo' | 'bloqueado';

export interface UserRoleAssignment {
  id?: number;
  roleCodigo: RolUsuario;
  roleLabel?: string;
  ambito: AmbitoTerritorial;
  dreCodigo?: string;
  ugelCodigo?: string;
  institutionId?: number | null;
  esPrincipal: boolean;
  activo?: boolean;
}

export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  username?: string;
  telefono: string;
  rol: RolUsuario;
  roles: RolUsuario[];
  roleAssignments: UserRoleAssignment[];
  sede: string;
  estado: EstadoUsuario;
  ultimoAcceso: string | null;
  cargo: string;
}

export interface CreateUsuarioPayload {
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono?: string;
  rol: RolUsuario;
  sede?: string;
  estado?: EstadoUsuario;
  cargo?: string;
  password: string;
  roleAssignments?: UserRoleAssignment[];
  roleAssignmentsMotivo?: string;
}

export interface UpdateUsuarioPayload {
  nombres?: string;
  apellidos?: string;
  dni?: string;
  email?: string;
  telefono?: string;
  rol?: RolUsuario;
  sede?: string;
  estado?: EstadoUsuario;
  cargo?: string;
  password?: string;
}

export interface SetRoleAssignmentsPayload {
  motivo: string;
  assignments: UserRoleAssignment[];
}

export interface BulkImportUsuariosPayload {
  usuarios: CreateUsuarioPayload[];
}

export interface BulkImportUsuariosResult {
  total: number;
  creados: number;
  errores: { fila: number; email: string; dni: string; mensaje: string }[];
  usuarios: Usuario[];
}
