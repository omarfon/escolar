import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface AltaInstitucion {
  nombre: string;
  siglas: string;
  ruc: string;
  codigoModular: string;
  tipoGestion: string;
  ugel: string;
  dre: string;
  resolucion: string;
  direccion: string;
  distrito: string;
  provincia: string;
  region: string;
  codigoPostal: string;
  telefono: string;
  telefono2: string;
  email: string;
  web: string;
  facebook: string;
  director: string;
  subdirector: string;
  administrador: string;
  anio: string;
  sistemaEval: string;
  tipoPeriodo: string;
  notaMinima: number;
  escalaLogro: { AD: number; A: number; B: number };
}

export interface InstitucionDirectorio {
  id: number;
  nombre: string;
  siglas: string;
  codigoModular: string;
  ugel: string;
  dre: string;
  distrito: string;
  alumnos: number;
  solicitudes: number;
  rolAdministrativo?: string;
  credenciales?: { username: string; password: string };
}

export interface AlumnoInstitucion {
  id: number;
  codigoNacional: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  dni: string;
  nivel: string;
  grado: string;
  seccion: string;
  estadoMatricula: string;
  indicadorInstitucion: string;
  traslado?: SolicitudInstitucion | null;
  institucion: {
    id: number;
    nombre: string;
    codigoModular: string;
    ugel: string;
    dre: string;
  } | null;
  trayectoria?: Array<{
    anio: string;
    codigoInstitucion: string;
    institutionId: number | null;
    institucionNombre: string;
    grado: string;
    seccion: string;
    estado: string;
  }>;
}

export interface PersonaInstitucion {
  codigoNacional: string;
  alumnos: AlumnoInstitucion[];
}

export interface SolicitudInstitucion {
  id: number;
  codigo: string;
  studentId: number;
  studentNombre: string;
  studentDni: string;
  estado: string;
  anioEscolar: number;
  plazoHasta: string;
  createdAt: string;
  ieOrigenNombre: string;
  ieOrigenCodigoModular: string;
  ieDestinoNombre: string;
  ieDestinoCodigoModular: string;
  sentido: 'salida' | 'entrada';
}

export interface UsuarioAdministrativo {
  userId: number;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  username: string;
  cargo: string;
  estado: string;
  roles: { codigo: string; label: string; activo: boolean }[];
}

export interface FichaInstitucion {
  institucion: {
    id: number;
    nombre: string;
    siglas: string;
    ruc: string;
    codigoModular: string;
    tipoGestion: string;
    ugel: string;
    dre: string;
    resolucion: string;
    direccion: string;
    distrito: string;
    provincia: string;
    region: string;
    codigoPostal: string;
    telefono: string;
    telefono2: string;
    email: string;
    web: string;
    facebook: string;
    director: string;
    subdirector: string;
    administrador: string;
    anio: string;
    sistemaEval: string;
    tipoPeriodo: string;
    notaMinima: number;
    escalaLogro: { AD: number; A: number; B: number };
    niveles: { nombre: string; activo: boolean; grados: { nombre: string; secciones: string[] }[] }[];
    periodos: { numero: number; nombre: string; tipo: string; inicio: string; fin: string; actual: boolean }[];
    modulos: { key: string; label: string; activo: boolean }[];
  };
  personal: UsuarioAdministrativo[];
}

export interface AlumnosInstitucionPage {
  items: AlumnoInstitucion[];
  solicitudes: SolicitudInstitucion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class DirectorioInstitucionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/institution-directory`;

  instituciones(): Observable<InstitucionDirectorio[]> {
    return this.http.get<InstitucionDirectorio[]>(this.base);
  }

  crear(body: AltaInstitucion): Observable<InstitucionDirectorio> {
    return this.http.post<InstitucionDirectorio>(this.base, body);
  }

  detalle(institutionId: number): Observable<FichaInstitucion> {
    return this.http.get<FichaInstitucion>(`${this.base}/${institutionId}/detalle`);
  }

  cambiarCredencial(institutionId: number, userId: number, password: string): Observable<{ message: string; usuario: UsuarioAdministrativo }> {
    return this.http.patch<{ message: string; usuario: UsuarioAdministrativo }>(
      `${this.base}/${institutionId}/personal/${userId}/credenciales`,
      { password },
    );
  }

  cambiarEstado(
    institutionId: number,
    userId: number,
    estado: 'activo' | 'inactivo',
  ): Observable<{ message: string; usuario: UsuarioAdministrativo }> {
    return this.http.patch<{ message: string; usuario: UsuarioAdministrativo }>(
      `${this.base}/${institutionId}/personal/${userId}/estado`,
      { estado },
    );
  }

  alumnos(
    institutionId: number,
    query: { q?: string; grado?: string; page?: number } = {},
  ): Observable<AlumnosInstitucionPage> {
    let params = new HttpParams().set('page', query.page ?? 1).set('pageSize', 10);
    if (query.q?.trim()) params = params.set('q', query.q.trim());
    if (query.grado?.trim()) params = params.set('grado', query.grado.trim());
    return this.http.get<AlumnosInstitucionPage>(`${this.base}/${institutionId}/students`, { params });
  }

  persona(studentId: number): Observable<PersonaInstitucion> {
    return this.http.get<PersonaInstitucion>(`${this.base}/students/${studentId}`);
  }
}
