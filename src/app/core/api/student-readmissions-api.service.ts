import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface StudentReadmissionContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel: string;
    dre: string;
    codigoModular: string;
  };
  permisoRegistrar: string;
  permisoConsultar: string;
  motivos: string[];
  fechaMin: string;
  fechaMax: string;
}

export interface StudentReadmissionEligibility {
  studentId: number;
  studentCodigo: string;
  studentNombre: string;
  nivel: string;
  grado: string;
  seccion: string;
  estadoMatricula: string;
  anioEscolar: number;
  elegible: boolean;
  motivoInelegible: string | null;
  fechaMin: string;
  fechaMax: string;
  withdrawalId: number | null;
  fechaRetiro: string | null;
  vacantesDisponibles: number;
  reingresoExistenteId: number | null;
}

export interface StudentReadmission {
  id: number;
  studentId: number;
  studentCodigo: string;
  studentNombre: string;
  anioEscolar: number;
  withdrawalId: number;
  nivel: string;
  grado: string;
  seccion: string;
  fechaReingreso: string;
  fechaRetiroVinculada: string;
  motivo: string;
  autorizacion: string;
  estado: string;
  actorUserId: number | null;
  actorNombre: string;
  actorRol: string;
  cambios: Record<string, { anterior?: unknown; nuevo?: unknown }>;
  ip: string;
  correlationId: string | null;
  notasConservadas: number;
  asistenciasConservadas: number;
  vacantesDisponiblesDespues: number;
  createdAt: string;
  duplicadoIdempotente?: boolean;
}

export interface StudentReadmissionListResponse {
  items: StudentReadmission[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CreateStudentReadmissionPayload {
  fechaReingreso: string;
  motivo: string;
  autorizacion: string;
}

@Injectable({ providedIn: 'root' })
export class StudentReadmissionsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/students`;

  getContext(): Observable<StudentReadmissionContext> {
    return this.http.get<StudentReadmissionContext>(`${this.base}/readmissions/context`);
  }

  list(filters?: {
    studentId?: number;
    anioEscolar?: number;
    busqueda?: string;
    page?: number;
    pageSize?: number;
  }): Observable<StudentReadmissionListResponse> {
    let params = new HttpParams();
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.anioEscolar) params = params.set('anioEscolar', String(filters.anioEscolar));
    if (filters?.busqueda?.trim()) params = params.set('busqueda', filters.busqueda.trim());
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));
    return this.http.get<StudentReadmissionListResponse>(`${this.base}/readmissions`, { params });
  }

  getEligibility(studentId: number): Observable<StudentReadmissionEligibility> {
    return this.http.get<StudentReadmissionEligibility>(
      `${this.base}/${studentId}/readmission-eligibility`,
    );
  }

  register(
    studentId: number,
    payload: CreateStudentReadmissionPayload,
    idempotencyKey: string,
  ): Observable<StudentReadmission> {
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey,
    });
    return this.http.post<StudentReadmission>(
      `${this.base}/${studentId}/readmissions`,
      payload,
      { headers },
    );
  }
}
