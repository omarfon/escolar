import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { environment } from '@environments/environment';
import type { ApiStudentDocumentsResponse } from '../../core/api/api.models';

export interface TrasladoContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel: string;
    dre: string;
    codigoModular: string;
  } | null;
  alcanceTerritorial: {
    nivel: 'MINEDU' | 'DRE' | 'UGEL' | 'IE';
    ugel: string;
    dre: string;
    fuente: 'asignacion' | 'institucion_referencia' | 'global';
    requiereInstitucionReferencia: boolean;
  };
  permisoVer: string;
  permisoSolicitar: string;
  permisoResolver: string;
  permisoAprobarDestino: string;
  estados: string[];
}

export interface TrasladoInstitucion {
  id: number;
  nombre: string;
  codigoModular: string;
  ugel: string;
  dre: string;
}

export interface MatriculaNacional {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  dni: string;
  nivel: string;
  grado: string;
  seccion: string;
  estadoMatricula: string;
  anioIngreso: string;
  institucion: {
    id: number;
    nombre: string;
    codigoModular: string;
    ugel: string;
    dre: string;
  } | null;
}

export interface TrasladoAlumno {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  dni: string;
  nivel: string;
  grado: string;
  seccion: string;
  estadoMatricula: string;
}

export interface TrasladoResumen {
  id: number;
  codigo: string;
  studentId: number;
  studentCodigo: string;
  studentNombre: string;
  studentDni: string;
  anioEscolar: number;
  estado: string;
  ieOrigenNombre: string;
  ieOrigenCodigoModular: string;
  ieDestinoNombre: string;
  ieDestinoCodigoModular: string;
  plazoHasta: string;
  createdAt: string;
}

export type EvidenciaTrasladoTipo = 'documento' | 'referencia';

export interface TrasladoVacanteSeccion {
  seccion: string;
  matriculados: number;
  capacidad: number;
  disponibles: number;
  esIngresante: boolean;
}

export interface TrasladoVacanteDestino {
  studentId: number;
  grado: string;
  nivel: string;
  seccionOrigen: string;
  seccionDestinoAsignada: string | null;
  vacanteDisponible: boolean;
  vacantesDisponibles: number;
  vacantesEnSeccion: number | null;
  seccionAsignada: string | null;
  seccionSugerida: string | null;
  secciones: TrasladoVacanteSeccion[];
}

export interface TrasladoTransparenciaSnapshot {
  datosCongeladosEn: string;
  snapshot: {
    ieOrigen: { nombre: string; codigoModular: string; ugel: string; dre: string };
    ieDestino: { nombre: string; codigoModular: string; ugel: string; dre: string };
  };
  padronDestinoActual: {
    encontrada: boolean;
    nombre: string;
    codigoModular: string;
    ugel: string;
    dre: string;
    difiereDelSnapshot: boolean;
    camposDistintos: Array<'nombre' | 'ugel' | 'dre'>;
  } | null;
  vacanteAprobacion: {
    seccionAsignada: string | null;
    vacantesDisponibles: number;
    vacantesEnSeccion: number;
    grado: string;
    nivel: string;
    registradaEn: string | null;
  } | null;
}

export interface TrasladoMatriculaDestino {
  studentId: number;
  institutionId: number | null;
  codigoModular: string;
  seccion: string;
}

export interface TrasladoEvidenciaDocumento {
  id: number;
  tipo: string;
  numero: string;
  estado: string;
  tieneArchivo: boolean;
  versionId: number | null;
}

export interface TrasladoDetalle extends TrasladoResumen {
  recuperada: boolean;
  ieOrigenUgel: string;
  ieOrigenDre: string;
  ieDestinoUgel: string;
  ieDestinoDre: string;
  motivo: string;
  observacion: string;
  evidencia: string;
  evidenciaTipo: EvidenciaTrasladoTipo | null;
  evidenciaDocumentId: number | null;
  evidenciaReferencia: string;
  evidenciaDocumento: TrasladoEvidenciaDocumento | null;
  seccionDestino: string | null;
  matriculaDestino: TrasladoMatriculaDestino | null;
  actorNombre: string;
  actorRol: string;
  eventos: Array<{
    id: number;
    accion: string;
    estadoAnterior: string | null;
    estadoNuevo: string;
    motivo: string;
    actorNombre: string;
    createdAt: string;
  }>;
  notificaciones: TrasladoNotificacion[];
  transparencia?: TrasladoTransparenciaSnapshot | null;
  historialAcademico?: {
    estudiante: {
      id: number;
      nombres: string;
      apellidos: string;
      dni: string;
      nivel: string;
      grado: string;
      seccion: string;
      estadoMatricula: string;
      anioIngreso: string;
    } | null;
    trayectoria: Array<{
      anio: string;
      grado: string;
      seccion: string;
      promedio: number;
      estado: string;
    }>;
  } | null;
}

export interface TrasladoPage {
  items: TrasladoResumen[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TrasladoNotificacion {
  id: number;
  plantilla: string;
  ambito: string;
  destinatario: string;
  destinatarioTipo?: string;
  destinatarioUserId?: number | null;
  destinatarioEmail?: string;
  destinatarioInstitutionId?: number | null;
  destinatarioAmbitoNivel?: string | null;
  destinatarioRol?: string;
  mensaje: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  estadoEntrega: string;
  canalEntrega?: string | null;
  correoSimulado?: boolean;
  correoMessageId?: string;
  intentos: number;
  maxIntentos: number;
  ultimoError: string;
  leida: boolean;
  entregadoAt: string | null;
  leidoAt: string | null;
  createdAt: string;
}

export interface TrasladoNotificacionPage {
  items: TrasladoNotificacion[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TrasladoNotificacionMine extends TrasladoNotificacion {
  transferRequestId: number;
  codigo: string;
  studentNombre: string;
}

export interface TrasladoEtapaSeguimiento {
  id: string;
  etiqueta: string;
  estado: 'pendiente' | 'en_curso' | 'completado' | 'fallido' | 'omitido';
  fechaCompletado: string | null;
  descripcion: string;
}

export interface TrasladoLineaTiempoItem {
  id: string;
  tipo: 'evento' | 'notificacion' | 'auditoria';
  fecha: string;
  titulo: string;
  detalle: string;
  actor: string;
  metadata?: Record<string, unknown>;
}

export interface TrasladoSeguimiento {
  solicitud: TrasladoResumen & {
    motivo: string;
    observacion: string;
    evidencia: string;
    updatedAt: string;
    ieOrigenUgel: string;
    ieOrigenDre: string;
    ieDestinoUgel: string;
    ieDestinoDre: string;
    actorNombre: string;
    actorRol: string;
    rolVisualizador: 'origen' | 'destino' | 'territorial';
  };
  etapas: TrasladoEtapaSeguimiento[];
  lineaTiempo: TrasladoLineaTiempoItem[];
  resumen: {
    estadoActual: string;
    diasEnProceso: number;
    plazoVence: string;
    plazoVencido: boolean;
    ultimaActividad: string | null;
    esTerminal: boolean;
  };
  eventos: TrasladoDetalle['eventos'];
  notificaciones: TrasladoNotificacion[];
  auditoria: Array<{
    id: number;
    accion: string;
    descripcion: string;
    usuarioNombre: string;
    resultado: string;
    detalle: Record<string, unknown> | null;
    createdAt: string;
  }>;
  transparencia?: TrasladoTransparenciaSnapshot | null;
}

@Injectable({ providedIn: 'root' })
export class TrasladosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/transfer-requests`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  getContext(): Observable<TrasladoContext> {
    return this.http.get<TrasladoContext>(`${this.base}/context`);
  }

  searchStudents(q: string): Observable<TrasladoAlumno[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<TrasladoAlumno[]>(`${this.base}/students`, { params });
  }

  searchInstitutions(q: string): Observable<TrasladoInstitucion[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<TrasladoInstitucion[]>(`${this.base}/institutions`, { params });
  }

  matriculaNacional(q: string): Observable<MatriculaNacional[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<MatriculaNacional[]>(`${environment.apiUrl}/students/matricula-nacional`, { params });
  }

  listStudentDocuments(studentId: number): Observable<ApiStudentDocumentsResponse> {
    return this.http.get<ApiStudentDocumentsResponse>(
      `${environment.apiUrl}/students/${studentId}/documents`,
    );
  }

  list(page = 1, q = '', estado = ''): Observable<TrasladoPage> {
    this.loading.set(true);
    let params = new HttpParams().set('page', page).set('pageSize', 20);
    if (q.trim()) params = params.set('q', q.trim());
    if (estado) params = params.set('estado', estado);
    return this.http.get<TrasladoPage>(this.base, { params }).pipe(
      finalize(() => this.loading.set(false)),
    );
  }

  /** Solicitudes recibidas en la IE destino (bandeja de aprobación). */
  /** Listado para seguimiento del proceso (activos por defecto). */
  listSeguimiento(
    page = 1,
    q = '',
    estado = '',
    soloActivos = true,
  ): Observable<TrasladoPage> {
    this.loading.set(true);
    let params = new HttpParams().set('page', page).set('pageSize', 20);
    if (q.trim()) params = params.set('q', q.trim());
    if (estado) params = params.set('estado', estado);
    if (soloActivos) params = params.set('activos', 'true');
    return this.http.get<TrasladoPage>(this.base, { params }).pipe(
      finalize(() => this.loading.set(false)),
    );
  }

  listRecibidosDestino(
    page = 1,
    q = '',
    pendientes = true,
  ): Observable<TrasladoPage> {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', 20)
      .set('alcance', 'destino');
    if (q.trim()) params = params.set('q', q.trim());
    if (pendientes) params = params.set('pendientes', 'true');
    return this.http.get<TrasladoPage>(this.base, { params }).pipe(
      finalize(() => this.loading.set(false)),
    );
  }

  detail(id: number): Observable<TrasladoDetalle> {
    return this.http.get<TrasladoDetalle>(`${this.base}/${id}`);
  }

  vacanteDestino(id: number): Observable<TrasladoVacanteDestino> {
    return this.http.get<TrasladoVacanteDestino>(`${this.base}/${id}/vacante-destino`);
  }

  seguimiento(id: number): Observable<TrasladoSeguimiento> {
    this.loading.set(true);
    return this.http.get<TrasladoSeguimiento>(`${this.base}/${id}/seguimiento`).pipe(
      finalize(() => this.loading.set(false)),
    );
  }

  create(body: Record<string, unknown>): Observable<TrasladoDetalle> {
    this.saving.set(true);
    return this.http.post<TrasladoDetalle>(this.base, body).pipe(
      finalize(() => this.saving.set(false)),
    );
  }

  transition(
    id: number,
    accion: string,
    motivo?: string,
    observacion?: string,
    seccionDestino?: string,
  ): Observable<TrasladoDetalle> {
    this.saving.set(true);
    return this.http
      .post<TrasladoDetalle>(`${this.base}/${id}/transition`, {
        accion,
        motivo,
        observacion,
        seccionDestino,
      })
      .pipe(finalize(() => this.saving.set(false)));
  }

  registerMotivo(
    id: number,
    body: { motivo: string; observacion?: string; idempotencyKey?: string },
  ): Observable<TrasladoDetalle> {
    this.saving.set(true);
    return this.http.post<TrasladoDetalle>(`${this.base}/${id}/motivo`, body).pipe(
      finalize(() => this.saving.set(false)),
    );
  }

  listMyNotifications(
    page = 1,
    soloPendientes = false,
  ): Observable<{ items: TrasladoNotificacionMine[]; total: number; page: number; pageSize: number }> {
    let params = new HttpParams().set('page', page).set('pageSize', 20);
    if (soloPendientes) params = params.set('soloPendientes', 'true');
    return this.http.get<{ items: TrasladoNotificacionMine[]; total: number; page: number; pageSize: number }>(
      `${this.base}/notifications/mine`,
      { params },
    );
  }

  listNotifications(
    id: number,
    page = 1,
    estadoEntrega = '',
  ): Observable<TrasladoNotificacionPage> {
    let params = new HttpParams().set('page', page).set('pageSize', 20);
    if (estadoEntrega) params = params.set('estadoEntrega', estadoEntrega);
    return this.http.get<TrasladoNotificacionPage>(`${this.base}/${id}/notifications`, { params });
  }

  markNotificationRead(id: number, notificationId: number): Observable<TrasladoNotificacion> {
    return this.http.patch<TrasladoNotificacion>(
      `${this.base}/${id}/notifications/${notificationId}/read`,
      {},
    );
  }

  retryNotifications(id: number, notificationId?: number): Observable<{ reintentadas: number; items: TrasladoNotificacion[] }> {
    this.saving.set(true);
    const body = notificationId ? { notificationId } : {};
    return this.http
      .post<{ reintentadas: number; items: TrasladoNotificacion[] }>(
        `${this.base}/${id}/notifications/retry`,
        body,
      )
      .pipe(finalize(() => this.saving.set(false)));
  }
}

export function trasladoErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (typeof body === 'string' && body) return body;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
    }
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
