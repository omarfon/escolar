import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface EnrollmentEvaluationContext {
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
  tiposEvaluacion: string[];
  resultados: string[];
  resultadoLabels: Record<string, string>;
  fechaMin: string;
  fechaMax: string;
}

export interface EnrollmentEvaluationEligibility {
  origen: 'waitlist' | 'estudiante';
  waitlistEntryId: number | null;
  studentId: number | null;
  candidatoNombre: string;
  candidatoDni: string;
  nivel: string;
  grado: string;
  seccionDeseada: string;
  anioEscolar: number;
  elegible: boolean;
  motivoInelegible: string | null;
  fechaMin: string;
  fechaMax: string;
  tiposRegistrados: string[];
  tiposDisponibles: string[];
}

export interface EnrollmentEvaluation {
  id: number;
  anioEscolar: number;
  origen: 'waitlist' | 'estudiante';
  waitlistEntryId: number | null;
  studentId: number | null;
  candidatoNombre: string;
  candidatoDni: string;
  nivel: string;
  grado: string;
  seccionDeseada: string;
  tipoEvaluacion: string;
  fechaEvaluacion: string;
  resultado: string;
  puntaje: number | null;
  observaciones: string;
  resolucion: string;
  estado: string;
  actorUserId: number | null;
  actorNombre: string;
  actorRol: string;
  cambios: Record<string, { anterior?: unknown; nuevo?: unknown }>;
  ip: string;
  correlationId: string | null;
  createdAt: string;
  duplicadoIdempotente?: boolean;
}

export interface EnrollmentEvaluationListResponse {
  items: EnrollmentEvaluation[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CreateEnrollmentEvaluationPayload {
  waitlistEntryId?: number;
  studentId?: number;
  tipoEvaluacion: string;
  fechaEvaluacion: string;
  resultado: string;
  puntaje?: number;
  observaciones?: string;
  resolucion: string;
}

@Injectable({ providedIn: 'root' })
export class EnrollmentEvaluationsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/enrollment-evaluations`;

  getContext(): Observable<EnrollmentEvaluationContext> {
    return this.http.get<EnrollmentEvaluationContext>(`${this.base}/context`);
  }

  list(filters?: {
    waitlistEntryId?: number;
    studentId?: number;
    anioEscolar?: number;
    resultado?: string;
    tipoEvaluacion?: string;
    busqueda?: string;
    page?: number;
    pageSize?: number;
  }): Observable<EnrollmentEvaluationListResponse> {
    let params = new HttpParams();
    if (filters?.waitlistEntryId) {
      params = params.set('waitlistEntryId', String(filters.waitlistEntryId));
    }
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.anioEscolar) params = params.set('anioEscolar', String(filters.anioEscolar));
    if (filters?.resultado) params = params.set('resultado', filters.resultado);
    if (filters?.tipoEvaluacion) {
      params = params.set('tipoEvaluacion', filters.tipoEvaluacion);
    }
    if (filters?.busqueda?.trim()) params = params.set('busqueda', filters.busqueda.trim());
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));
    return this.http.get<EnrollmentEvaluationListResponse>(this.base, { params });
  }

  get(id: number): Observable<EnrollmentEvaluation> {
    return this.http.get<EnrollmentEvaluation>(`${this.base}/${id}`);
  }

  getWaitlistEligibility(waitlistEntryId: number): Observable<EnrollmentEvaluationEligibility> {
    return this.http.get<EnrollmentEvaluationEligibility>(
      `${this.base}/waitlist/${waitlistEntryId}/eligibility`,
    );
  }

  getStudentEligibility(studentId: number): Observable<EnrollmentEvaluationEligibility> {
    return this.http.get<EnrollmentEvaluationEligibility>(
      `${this.base}/students/${studentId}/eligibility`,
    );
  }

  register(
    payload: CreateEnrollmentEvaluationPayload,
    idempotencyKey: string,
  ): Observable<EnrollmentEvaluation> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<EnrollmentEvaluation>(this.base, payload, { headers });
  }
}
