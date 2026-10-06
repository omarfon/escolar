import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  DiagnosticAuditoriaContext,
  DiagnosticAuditoriaFilters,
  DiagnosticAuditoriaResponse,
} from './diagnostic-auditoria.model';

@Injectable({ providedIn: 'root' })
export class DiagnosticAuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/diagnostic-evaluations/change-audit`;

  readonly loading = signal(false);

  loadContext(): Observable<DiagnosticAuditoriaContext> {
    return this.http.get<DiagnosticAuditoriaContext>(`${this.base}/context`);
  }

  load(filters?: DiagnosticAuditoriaFilters): Observable<DiagnosticAuditoriaResponse> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.curso) params = params.set('curso', filters.curso);
    if (filters?.accion) params = params.set('accion', filters.accion);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));

    return this.http.get<DiagnosticAuditoriaResponse>(this.base, { params }).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }
}
