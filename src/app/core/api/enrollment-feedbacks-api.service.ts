import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface EnrollmentFeedbackContext {
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
  canales: string[];
  fechaMin: string;
  fechaMax: string;
}

export interface EnrollmentFeedbackEligibility {
  enrollmentEvaluationId: number;
  candidatoNombre: string;
  candidatoDni: string;
  tipoEvaluacion: string;
  resultadoEvaluacion: string;
  anioEscolar: number;
  elegible: boolean;
  motivoInelegible: string | null;
  fechaMin: string;
  fechaMax: string;
  retroalimentacionExistenteId: number | null;
}

export interface EnrollmentFeedback {
  id: number;
  anioEscolar: number;
  enrollmentEvaluationId: number;
  candidatoNombre: string;
  candidatoDni: string;
  tipoEvaluacion: string;
  resultadoEvaluacion: string;
  canal: string;
  fechaRetroalimentacion: string;
  destinatario: string;
  mensaje: string;
  acuseRecibo: boolean;
  actorNombre: string;
  actorRol: string;
  createdAt: string;
}

export interface EnrollmentFeedbackListResponse {
  items: EnrollmentFeedback[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface CreateEnrollmentFeedbackPayload {
  enrollmentEvaluationId: number;
  canal: string;
  fechaRetroalimentacion: string;
  destinatario: string;
  mensaje: string;
  acuseRecibo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EnrollmentFeedbacksApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/enrollment-feedbacks`;

  getContext(): Observable<EnrollmentFeedbackContext> {
    return this.http.get<EnrollmentFeedbackContext>(`${this.base}/context`);
  }

  list(filters?: { busqueda?: string; page?: number; pageSize?: number }) {
    let params = new HttpParams();
    if (filters?.busqueda?.trim()) params = params.set('busqueda', filters.busqueda.trim());
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));
    return this.http.get<EnrollmentFeedbackListResponse>(this.base, { params });
  }

  getEligibility(evaluationId: number): Observable<EnrollmentFeedbackEligibility> {
    return this.http.get<EnrollmentFeedbackEligibility>(
      `${this.base}/evaluations/${evaluationId}/eligibility`,
    );
  }

  register(payload: CreateEnrollmentFeedbackPayload, idempotencyKey: string) {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<EnrollmentFeedback>(this.base, payload, { headers });
  }
}
