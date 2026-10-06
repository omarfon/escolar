import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  CompetencyAuditoriaContext,
  CompetencyAuditoriaFilters,
  CompetencyAuditoriaResponse,
} from './competency-auditoria.model';

@Injectable({ providedIn: 'root' })
export class CompetencyAuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/competency-evaluations/change-audit`;

  readonly loading = signal(false);

  loadContext(): Observable<CompetencyAuditoriaContext> {
    return this.http.get<CompetencyAuditoriaContext>(`${this.base}/context`);
  }

  load(filters?: CompetencyAuditoriaFilters): Observable<CompetencyAuditoriaResponse> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.competenciaId) params = params.set('competenciaId', String(filters.competenciaId));
    if (filters?.bimestre) params = params.set('bimestre', String(filters.bimestre));
    if (filters?.accion) params = params.set('accion', filters.accion);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));

    return this.http.get<CompetencyAuditoriaResponse>(this.base, { params }).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }
}
