import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import {
  CreateExceptionalEnrollmentPayload,
  ExceptionalEnrollmentAgeCheck,
  ExceptionalEnrollmentContext,
  StudentExceptionalEnrollmentApiService,
} from '../../../core/api/student-exceptional-enrollment-api.service';
import { ApiExpediente } from '../../../core/api/api.models';

@Injectable({ providedIn: 'root' })
export class MatriculaExcepcionalService {
  private readonly api = inject(StudentExceptionalEnrollmentApiService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly checkingAge = signal(false);

  loadContext(): Observable<ExceptionalEnrollmentContext> {
    this.loading.set(true);
    return this.api.getContext().pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  verifyAge(fechaNac: string, gradoLabel: string): Observable<ExceptionalEnrollmentAgeCheck> {
    this.checkingAge.set(true);
    return this.api.checkAge(fechaNac, gradoLabel).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.checkingAge.set(false)),
    );
  }

  register(payload: CreateExceptionalEnrollmentPayload): Observable<ApiExpediente> {
    this.saving.set(true);
    return this.api.register(payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string' && body) return body;
      if (body?.message) {
        return Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
      }
      return err.message || 'Error en matrícula excepcional';
    }
    if (err instanceof Error) return err.message;
    return 'Error en matrícula excepcional';
  }
}

export function httpErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
