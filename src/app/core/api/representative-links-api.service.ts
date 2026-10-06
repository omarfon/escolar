import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface RepresentativeLinksContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel: string;
    dre: string;
  };
  permisoConsulta: string;
  permisoGestion: string;
  tiposVinculo: string[];
}

export interface RepresentativeResponse {
  id: number | null;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  pendienteRegistro?: boolean;
}

export interface RepresentativeLinkStudentSummary {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  gradoLabel: string;
  seccion: string;
  estado: string;
}

export interface RepresentativeLinkResponse {
  id: number;
  representativeId: number;
  studentId: number;
  tipoVinculo: string;
  esPrincipal: boolean;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  activo: boolean;
  motivoCese: string;
  student?: RepresentativeLinkStudentSummary;
}

export interface RepresentativeLookupResponse {
  representante: RepresentativeResponse | null;
  vinculosActivos: RepresentativeLinkResponse[];
  vinculosHistoricos: RepresentativeLinkResponse[];
  sugeridoDesdeExpediente: boolean;
}

export interface AssociateStudentsPayload {
  tipoDocumento: string;
  numeroDocumento: string;
  representante: {
    nombres?: string;
    apellidos?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    email?: string;
    telefono?: string;
  };
  studentIds: number[];
  tipoVinculo: string;
  esPrincipal?: boolean;
  motivo: string;
}

export interface AssociateStudentsResult {
  representante: RepresentativeResponse;
  creados: RepresentativeLinkResponse[];
  omitidos: Array<{ studentId: number; razon: string }>;
}

export interface RepresentativeLinkLog {
  id: number;
  linkId: number | null;
  representativeId: number;
  studentId: number;
  accion: string;
  actorNombre: string;
  actorRol: string;
  motivo: string;
  cambios: Record<string, { anterior?: unknown; nuevo?: unknown }>;
  resultado: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class RepresentativeLinksApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/representative-links`;

  getContext(): Observable<RepresentativeLinksContext> {
    return this.http.get<RepresentativeLinksContext>(`${this.base}/context`);
  }

  findByDocument(tipoDocumento: string, numeroDocumento: string): Observable<RepresentativeLookupResponse> {
    const params = new HttpParams()
      .set('tipoDocumento', tipoDocumento)
      .set('numeroDocumento', numeroDocumento);
    return this.http.get<RepresentativeLookupResponse>(`${this.base}/by-document`, { params });
  }

  associate(payload: AssociateStudentsPayload): Observable<AssociateStudentsResult> {
    return this.http.post<AssociateStudentsResult>(`${this.base}/associate`, payload);
  }

  updateLink(
    id: number,
    payload: { tipoVinculo?: string; esPrincipal?: boolean; motivo: string },
  ): Observable<RepresentativeLinkResponse> {
    return this.http.patch<RepresentativeLinkResponse>(`${this.base}/${id}`, payload);
  }

  ceaseLink(id: number, motivo: string): Observable<RepresentativeLinkResponse> {
    return this.http.post<RepresentativeLinkResponse>(`${this.base}/${id}/cessation`, { motivo });
  }

  getAudit(filters?: {
    representativeId?: number;
    studentId?: number;
    limit?: number;
  }): Observable<{ items: RepresentativeLinkLog[]; total: number }> {
    let params = new HttpParams();
    if (filters?.representativeId) {
      params = params.set('representativeId', String(filters.representativeId));
    }
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.limit) params = params.set('limit', String(filters.limit));
    return this.http.get<{ items: RepresentativeLinkLog[]; total: number }>(`${this.base}/audit`, {
      params,
    });
  }
}
