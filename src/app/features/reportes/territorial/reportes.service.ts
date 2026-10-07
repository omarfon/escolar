import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ReporteFilters,
  ReporteFormato,
  ReporteResponse,
  ReporteTerritorialContext,
} from './reportes.model';

@Injectable({ providedIn: 'root' })
export class TerritorialReportesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/territorial-reports`;

  readonly loading = signal(false);
  readonly exporting = signal(false);

  loadContext(filters?: Pick<ReporteFilters, 'dre' | 'ugel'>): Observable<ReporteTerritorialContext> {
    let params = new HttpParams();
    if (filters?.dre) params = params.set('dre', filters.dre);
    if (filters?.ugel) params = params.set('ugel', filters.ugel);
    return this.http.get<ReporteTerritorialContext>(`${this.base}/context`, { params });
  }

  load(filters: ReporteFilters): Observable<ReporteResponse> {
    this.loading.set(true);
    return this.http.get<ReporteResponse>(this.base, { params: this.buildParams(filters) }).pipe(
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

  private buildParams(filters: ReporteFilters): HttpParams {
    let params = new HttpParams().set('tipo', filters.tipo);
    if (filters.anio) params = params.set('anio', String(filters.anio));
    if (filters.bimestre) params = params.set('bimestre', String(filters.bimestre));
    if (filters.mes) params = params.set('mes', filters.mes);
    if (filters.dre) params = params.set('dre', filters.dre);
    if (filters.ugel) params = params.set('ugel', filters.ugel);
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
