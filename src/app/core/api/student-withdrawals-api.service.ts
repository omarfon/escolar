import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface StudentWithdrawalContext {
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

export interface StudentWithdrawalEligibility {
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
  retiroExistenteId: number | null;
}

export interface StudentWithdrawal {
  id: number;
  studentId: number;
  studentCodigo: string;
  studentNombre: string;
  anioEscolar: number;
  nivel: string;
  grado: string;
  seccion: string;
  fechaRetiro: string;
  motivo: string;
  sustento: string;
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

export interface StudentWithdrawalListResponse {
  items: StudentWithdrawal[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CreateStudentWithdrawalPayload {
  fechaRetiro: string;
  motivo: string;
  sustento: string;
}

@Injectable({ providedIn: 'root' })
export class StudentWithdrawalsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/students`;

  getContext(): Observable<StudentWithdrawalContext> {
    return this.http.get<StudentWithdrawalContext>(`${this.base}/withdrawals/context`);
  }

  list(filters?: {
    studentId?: number;
    anioEscolar?: number;
    busqueda?: string;
    page?: number;
    pageSize?: number;
  }): Observable<StudentWithdrawalListResponse> {
    let params = new HttpParams();
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.anioEscolar) params = params.set('anioEscolar', String(filters.anioEscolar));
    if (filters?.busqueda?.trim()) params = params.set('busqueda', filters.busqueda.trim());
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));
    return this.http.get<StudentWithdrawalListResponse>(`${this.base}/withdrawals`, { params });
  }

  getEligibility(studentId: number): Observable<StudentWithdrawalEligibility> {
    return this.http.get<StudentWithdrawalEligibility>(
      `${this.base}/${studentId}/withdrawal-eligibility`,
    );
  }

  register(
    studentId: number,
    payload: CreateStudentWithdrawalPayload,
    idempotencyKey: string,
  ): Observable<StudentWithdrawal> {
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey,
    });
    return this.http.post<StudentWithdrawal>(
      `${this.base}/${studentId}/withdrawals`,
      payload,
      { headers },
    );
  }
}
