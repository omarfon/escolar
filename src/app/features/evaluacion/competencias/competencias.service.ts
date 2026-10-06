import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  CompetencyChangeAuditItem,
  CompetencyMatrixFilters,
  CompetencyMatrixResponse,
  CompetencyRegistryContextResponse,
  SaveCompetencyBulkPayload,
} from './competencias.model';

@Injectable({ providedIn: 'root' })
export class CompetenciasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/competency-evaluations`;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadingContexts = signal(false);

  loadRegistryContext(bimestre = 2): Observable<CompetencyRegistryContextResponse> {
    this.loadingContexts.set(true);
    const params = new HttpParams().set('bimestre', String(bimestre));
    return this.http
      .get<CompetencyRegistryContextResponse>(`${this.base}/registry/context`, { params })
      .pipe(
        catchError((err) => throwError(() => err)),
        finalize(() => this.loadingContexts.set(false)),
      );
  }

  loadChangeAudit(filters?: {
    studentId?: number;
    competenciaId?: number;
    bimestre?: number;
    page?: number;
    pageSize?: number;
  }): Observable<{
    items: CompetencyChangeAuditItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    let params = new HttpParams();
    if (filters?.studentId) params = params.set('studentId', filters.studentId);
    if (filters?.competenciaId) params = params.set('competenciaId', filters.competenciaId);
    if (filters?.bimestre) params = params.set('bimestre', filters.bimestre);
    if (filters?.page) params = params.set('page', filters.page);
    if (filters?.pageSize) params = params.set('pageSize', filters.pageSize);
    return this.http.get<{
      items: CompetencyChangeAuditItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`${this.base}/change-audit`, { params });
  }

  loadPeriodMeta(): Observable<{ bimestreActual: number }> {
    return this.http.get<{ bimestreActual: number }>(`${this.base}/period-meta`);
  }

  loadMatrix(filters: CompetencyMatrixFilters): Observable<CompetencyMatrixResponse> {
    this.loading.set(true);
    let params = new HttpParams()
      .set('nivel', filters.nivel)
      .set('grado', filters.grado)
      .set('seccion', filters.seccion)
      .set('bimestre', filters.bimestre);

    if (filters.anio) params = params.set('anio', filters.anio);
    if (filters.curriculumId) params = params.set('curriculumId', filters.curriculumId);
    if (filters.areaId) params = params.set('areaId', filters.areaId);
    if (filters.cursoId) params = params.set('cursoId', filters.cursoId);

    return this.http.get<CompetencyMatrixResponse>(`${this.base}/matrix`, { params }).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  saveBulk(payload: SaveCompetencyBulkPayload): Observable<{ saved: number; deleted: number }> {
    this.saving.set(true);
    return this.http.post<{ saved: number; deleted: number }>(`${this.base}/bulk`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }
}
