import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ReporteContext,
  ReporteFilters,
  ReporteFormato,
  ReporteJob,
  ReporteResponse,
} from './reportes.model';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/evaluation-reports`;

  readonly loading = signal(false);
  readonly exporting = signal(false);

  loadContext(filters?: Pick<ReporteFilters, 'dre' | 'ugel'>): Observable<ReporteContext> {
    let params = new HttpParams();
    if (filters?.dre) params = params.set('dre', filters.dre);
    if (filters?.ugel) params = params.set('ugel', filters.ugel);
    return this.http.get<ReporteContext>(`${this.base}/context`, { params });
  }

  load(filters: ReporteFilters): Observable<ReporteResponse> {
    this.loading.set(true);
    const params = this.buildParams(filters);
    return this.http.get<ReporteResponse>(this.base, { params }).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  exportSync(filters: ReporteFilters, format: ReporteFormato): Observable<Blob> {
    this.exporting.set(true);
    let params = this.buildParams(filters);
    params = params.set('format', format);
    return this.http
      .get(`${this.base}/export`, { params, responseType: 'blob' })
      .pipe(
        catchError((err) => throwError(() => err)),
        finalize(() => this.exporting.set(false)),
      );
  }

  createJob(filters: ReporteFilters, format: ReporteFormato): Observable<{
    async: boolean;
    jobId?: number;
    status?: string;
    message?: string;
    totalFilasEstimadas?: number;
  }> {
    return this.http.post<{
      async: boolean;
      jobId?: number;
      status?: string;
      message?: string;
      totalFilasEstimadas?: number;
    }>(`${this.base}/jobs`, { ...filters, format });
  }

  getJob(jobId: number, filters?: Pick<ReporteFilters, 'dre' | 'ugel'>): Observable<ReporteJob> {
    let params = new HttpParams();
    if (filters?.dre) params = params.set('dre', filters.dre);
    if (filters?.ugel) params = params.set('ugel', filters.ugel);
    return this.http.get<ReporteJob>(`${this.base}/jobs/${jobId}`, { params });
  }

  downloadJob(jobId: number, filters?: Pick<ReporteFilters, 'dre' | 'ugel'>): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.dre) params = params.set('dre', filters.dre);
    if (filters?.ugel) params = params.set('ugel', filters.ugel);
    return this.http.get(`${this.base}/jobs/${jobId}/download`, {
      params,
      responseType: 'blob',
    });
  }

  listJobs(filters?: Pick<ReporteFilters, 'dre' | 'ugel'>): Observable<ReporteJob[]> {
    let params = new HttpParams();
    if (filters?.dre) params = params.set('dre', filters.dre);
    if (filters?.ugel) params = params.set('ugel', filters.ugel);
    return this.http.get<ReporteJob[]>(`${this.base}/jobs`, { params });
  }

  private buildParams(filters: ReporteFilters): HttpParams {
    let params = new HttpParams().set('tipo', filters.tipo);
    if (filters.anio) params = params.set('anio', String(filters.anio));
    if (filters.bimestre) params = params.set('bimestre', String(filters.bimestre));
    if (filters.dre) params = params.set('dre', filters.dre);
    if (filters.ugel) params = params.set('ugel', filters.ugel);
    if (filters.nivel) params = params.set('nivel', filters.nivel);
    if (filters.grado) params = params.set('grado', filters.grado);
    if (filters.seccion) params = params.set('seccion', filters.seccion);
    if (filters.curso) params = params.set('curso', filters.curso);
    if (filters.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.pageSize) params = params.set('pageSize', String(filters.pageSize));
    return params;
  }
}

export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
