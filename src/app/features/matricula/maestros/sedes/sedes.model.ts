export interface MaestroInstitucionResumen {
  id: number;
  nombre: string;
  siglas: string;
  ruc: string;
  codigoModular: string;
}

export interface MaestroSedeItem {
  id: number;
  institutionId: number;
  nombre: string;
  codigo: string;
  direccion: string;
  distrito: string;
  provincia: string;
  region: string;
  telefono: string;
  email: string;
  director: string;
  niveles: string[];
  turnos: string[];
  estado: 'activo' | 'inactivo';
  institucionNombre?: string;
}

export interface MaestroSedesCatalog {
  institution: MaestroInstitucionResumen;
  sedes: MaestroSedeItem[];
}

export interface CreateMaestroSedePayload {
  institutionId?: number;
  nombre: string;
  codigo?: string;
  direccion?: string;
  distrito?: string;
  provincia?: string;
  region?: string;
  telefono?: string;
  email?: string;
  director?: string;
  niveles?: string[];
  turnos?: string[];
  estado?: 'activo' | 'inactivo';
}

export type UpdateMaestroSedePayload = Partial<Omit<CreateMaestroSedePayload, 'institutionId'>>;

export const NIVELES_SEDE = ['Inicial', 'Primaria', 'Secundaria'];
export const TURNOS_SEDE = ['Manana', 'Tarde'];
