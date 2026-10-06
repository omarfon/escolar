import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TenantContextService } from '../tenant/tenant-context.service';
import { withInstitutionParams } from '../tenant/tenant-http.util';
import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, finalize, switchMap, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ApiExpediente,
  ApiStudentDocumentsResponse,
  StudentsStats,
} from './api.models';

import { DocumentoRequerido } from '../../features/estudiantes/shared/documentos-requisitos';

export interface ExpedientePayload {
  nombres: string;
  apellidos: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  codigo?: string;
  dni?: string;
  tipoDocumento?: string;
  email: string;
  fechaNac?: string;
  sexo?: 'M' | 'F';
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  telefonoEmergencia?: string;
  foto?: string;
  grupoSanguineo?: string;
  alergias?: string;
  condicionesSalud?: string;
  observaciones?: string;
  gradoLabel: string;
  seccion: string;
  anioIngreso?: string;
  estado?: 'activo' | 'inactivo' | 'retirado';
  conductaNota?: string;
  padre?: import('./api.models').ApiRepresentante;
  madre?: import('./api.models').ApiRepresentante;
  apoderado?: import('./api.models').ApiRepresentante;
  historialAcademico?: Array<{
    anio: string;
    grado: string;
    seccion: string;
    promedio: number;
    estado: string;
  }>;
  auditMotivo?: string;
  documentos?: Array<{
    id?: number;
    tipo: string;
    numero?: string;
    estado?: 'entregado' | 'pendiente' | 'vencido';
    fechaEntrega?: string;
    imagenUrl?: string;
  }>;
}

export interface DocumentoPayload {
  tipo: string;
  numero?: string;
  estado?: 'entregado' | 'pendiente' | 'vencido';
  fechaEntrega?: string;
  imagenUrl?: string;
}

export interface ExpedientesPageQuery {
  q?: string;
  page?: number;
  pageSize?: number;
  grado?: string;
  estado?: string;
  estadoDocumento?: string;
}

export interface ExpedientesPageResponse {
  items: ApiExpediente[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class ExpedientesApiService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/students`;

  listPage(query: ExpedientesPageQuery = {}): Observable<ExpedientesPageResponse> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 20));
    if (query.q?.trim()) params = params.set('q', query.q.trim());
    if (query.grado?.trim()) params = params.set('grado', query.grado.trim());
    if (query.estado?.trim()) params = params.set('estado', query.estado.trim());
    if (query.estadoDocumento?.trim()) {
      params = params.set('estadoDocumento', query.estadoDocumento.trim());
    }
    params = withInstitutionParams(this.tenant, params);
    return this.http.get<ExpedientesPageResponse>(this.base, { params });
  }

  /** Compatibilidad: primera página reducida para búsquedas puntuales. */
  list(q?: string, pageSize = 25): Observable<ApiExpediente[]> {
    return this.listPage({ q, page: 1, pageSize }).pipe(
      tap((res) => res),
      switchMap((res) => of(res.items)),
    );
  }

  getStats(): Observable<StudentsStats> {
    const params = withInstitutionParams(this.tenant);
    return this.http.get<StudentsStats>(`${this.base}/stats`, { params });
  }

  getRequisitos(gradoLabel: string): Observable<DocumentoRequerido[]> {
    return this.http.get<DocumentoRequerido[]>(
      `${this.base}/document-requirements/${encodeURIComponent(gradoLabel)}`,
    );
  }

  syncRequisitos(studentId: number): Observable<ApiExpediente> {
    return this.http.post<ApiExpediente>(
      `${this.base}/${studentId}/documents/sync-requisitos`,
      {},
    );
  }

  get(id: number): Observable<ApiExpediente> {
    return this.http.get<ApiExpediente>(`${this.base}/${id}`);
  }

  listDocuments(studentId: number): Observable<ApiStudentDocumentsResponse> {
    return this.http.get<ApiStudentDocumentsResponse>(
      `${this.base}/${studentId}/documents`,
    );
  }

  getDocumentsContext() {
    return this.http.get<import('./api.models').StudentDocumentsContext>(
      `${this.base}/documents/context`,
    );
  }

  uploadDocumentFile(
    studentId: number,
    docId: number,
    file: File,
    payload: { motivo: string; numero?: string; vigenciaHasta?: string },
  ) {
    const form = new FormData();
    form.append('file', file);
    form.append('motivo', payload.motivo);
    if (payload.numero?.trim()) form.append('numero', payload.numero.trim());
    if (payload.vigenciaHasta?.trim()) {
      form.append('vigenciaHasta', payload.vigenciaHasta.trim());
    }
    return this.http.post<{
      documento: import('./api.models').ApiExpedienteDocumento;
      archivo: import('./api.models').ApiDocumentoArchivo;
    }>(`${this.base}/${studentId}/documents/${docId}/upload`, form);
  }

  listDocumentVersions(studentId: number, docId: number) {
    return this.http.get<import('./api.models').ApiDocumentoArchivo[]>(
      `${this.base}/${studentId}/documents/${docId}/versions`,
    );
  }

  documentDownloadUrl(studentId: number, docId: number, versionId: number): string {
    return `${this.base}/${studentId}/documents/${docId}/versions/${versionId}/download`;
  }

  downloadDocumentBlob(studentId: number, docId: number, versionId: number) {
    return this.http.get(this.documentDownloadUrl(studentId, docId, versionId), {
      responseType: 'blob',
    });
  }

  create(payload: ExpedientePayload): Observable<ApiExpediente> {
    return this.http.post<ApiExpediente>(this.base, payload);
  }

  createSinDocumento(payload: {
    nombres: string;
    apellidos: string;
    fechaNac: string;
    gradoLabel: string;
    seccion: string;
    sinDocumentoMotivo: string;
    sinDocumentoSustento: string;
    sexo?: 'M' | 'F';
    email?: string;
    direccion?: string;
    padre?: import('./api.models').ApiRepresentante;
    madre?: import('./api.models').ApiRepresentante;
    apoderado?: import('./api.models').ApiRepresentante;
    confirmarDuplicado?: boolean;
  }): Observable<ApiExpediente> {
    return this.http.post<ApiExpediente>(`${this.base}/sin-documento`, payload);
  }

  checkSinDocumentoDuplicates(payload: {
    nombres: string;
    apellidos: string;
    fechaNac?: string;
    sexo?: 'M' | 'F';
    padreDni?: string;
    madreDni?: string;
    apoderadoDni?: string;
  }): Observable<Array<{ id: number; codigo: string; coincidencias: string[] }>> {
    return this.http.post<Array<{ id: number; codigo: string; coincidencias: string[] }>>(
      `${this.base}/sin-documento/check-duplicates`,
      payload,
    );
  }

  regularizarDocumento(
    id: number,
    payload: { dni: string; tipoDocumento?: string; auditMotivo: string },
  ): Observable<ApiExpediente> {
    return this.http.patch<ApiExpediente>(
      `${this.base}/${id}/regularizar-documento`,
      payload,
    );
  }

  update(id: number, payload: Partial<ExpedientePayload>): Observable<ApiExpediente> {
    return this.http.patch<ApiExpediente>(`${this.base}/${id}`, payload);
  }

  remove(id: number): Observable<{ deleted: boolean; id: number }> {
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.base}/${id}`);
  }

  addDocument(studentId: number, payload: DocumentoPayload): Observable<import('./api.models').ApiExpedienteDocumento> {
    return this.http.post<import('./api.models').ApiExpedienteDocumento>(
      `${this.base}/${studentId}/documents`,
      payload,
    );
  }

  updateDocument(
    studentId: number,
    docId: number,
    payload: Partial<DocumentoPayload>,
  ): Observable<import('./api.models').ApiExpedienteDocumento> {
    return this.http.patch<import('./api.models').ApiExpedienteDocumento>(
      `${this.base}/${studentId}/documents/${docId}`,
      payload,
    );
  }

  removeDocument(
    studentId: number,
    docId: number,
  ): Observable<{ deleted: boolean; id: number }> {
    return this.http.delete<{ deleted: boolean; id: number }>(
      `${this.base}/${studentId}/documents/${docId}`,
    );
  }

  downloadExport(filters?: {
    q?: string;
    grado?: string;
    estado?: string;
    estadoDocumento?: string;
  }): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.q?.trim()) params = params.set('q', filters.q.trim());
    if (filters?.grado?.trim()) params = params.set('grado', filters.grado.trim());
    if (filters?.estado?.trim()) params = params.set('estado', filters.estado.trim());
    if (filters?.estadoDocumento?.trim()) {
      params = params.set('estadoDocumento', filters.estadoDocumento.trim());
    }
    params = withInstitutionParams(this.tenant, params);
    return this.http.get(`${this.base}/export`, { params, responseType: 'blob' });
  }
}
