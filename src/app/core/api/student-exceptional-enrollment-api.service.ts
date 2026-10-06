import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiExpediente } from './api.models';

export interface ExceptionalEnrollmentContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel: string;
    dre: string;
    codigoModular: string;
    fechaCorteNormativa: string;
  };
  permisoRegistrar: string;
  permisoConsultar: string;
  motivos: string[];
  gradosDisponibles: Array<{ label: string; nivel: string; grado: string }>;
}

export interface ExceptionalEnrollmentAgeCheck {
  cumpleEdadNormativa: boolean;
  edadActual: number | null;
  edadEsperada: number | null;
  fechaCorte: string;
  mensaje: string | null;
  requiereExcepcional: boolean;
}

export interface CreateExceptionalEnrollmentPayload {
  nombres: string;
  apellidos: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  dni: string;
  tipoDocumento?: string;
  email?: string;
  fechaNac: string;
  sexo?: 'M' | 'F';
  direccion?: string;
  gradoLabel: string;
  seccion: string;
  excepcionalMotivo: string;
  excepcionalSustento: string;
  confirmarDuplicado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class StudentExceptionalEnrollmentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/students/matricula-excepcional`;

  getContext(): Observable<ExceptionalEnrollmentContext> {
    return this.http.get<ExceptionalEnrollmentContext>(`${this.base}/context`);
  }

  checkAge(fechaNac: string, gradoLabel: string): Observable<ExceptionalEnrollmentAgeCheck> {
    return this.http.post<ExceptionalEnrollmentAgeCheck>(`${this.base}/check-age`, {
      fechaNac,
      gradoLabel,
    });
  }

  checkDuplicates(payload: {
    nombres: string;
    apellidos: string;
    dni?: string;
    fechaNac?: string;
    sexo?: 'M' | 'F';
  }): Observable<unknown[]> {
    return this.http.post<unknown[]>(`${this.base}/check-duplicates`, payload);
  }

  register(payload: CreateExceptionalEnrollmentPayload): Observable<ApiExpediente> {
    return this.http.post<ApiExpediente>(this.base, payload);
  }
}
