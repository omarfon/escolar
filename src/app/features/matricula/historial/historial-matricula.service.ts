import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, map, throwError } from 'rxjs';
import {
  EnrollmentHistoryApiService,
  MatriculaHistorialContext,
  MatriculaHistorialDetalle,
} from '../../../core/api/enrollment-history-api.service';
import { HistorialAcademicoListItem } from '../../academico/historial-academico/historial-academico.model';

@Injectable({ providedIn: 'root' })
export class HistorialMatriculaService {
  private readonly api = inject(EnrollmentHistoryApiService);

  readonly loading = signal(false);
  readonly loadingDetalle = signal(false);

  loadContext(): Observable<MatriculaHistorialContext> {
    return this.api.getContext().pipe(catchError((err) => throwError(() => new Error(this.extractError(err)))));
  }

  loadList(q?: string, page = 1, pageSize = 20): Observable<HistorialAcademicoListItem[]> {
    this.loading.set(true);
    return this.api.list(q, page, pageSize).pipe(
      map((res) => res.items),
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  loadDetalle(studentId: number): Observable<MatriculaHistorialDetalle> {
    this.loadingDetalle.set(true);
    return this.api.getDetalle(studentId).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loadingDetalle.set(false)),
    );
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string' && body) return body;
      if (body?.message) {
        return Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
      }
      return err.message || 'Error al cargar historial de matrícula';
    }
    if (err instanceof Error) return err.message;
    return 'Error al cargar historial de matrícula';
  }
}

export function httpErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
