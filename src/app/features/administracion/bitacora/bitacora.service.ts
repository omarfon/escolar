import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { withInstitutionParams } from '@core/tenant/tenant-http.util';
import { TenantContextService } from '@core/tenant/tenant-context.service';
import {
  BitacoraContext,
  BitacoraFilters,
  BitacoraResponse,
} from './bitacora.model';

@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/audit-logs`;

  readonly loading = signal(false);
  readonly exporting = signal(false);

  loadContext(): Observable<BitacoraContext> {
    return this.http.get<BitacoraContext>(
      `${this.base}/context`,
      { params: withInstitutionParams(this.tenant) },
    );
  }

  load(filters?: Partial<BitacoraFilters>): Observable<BitacoraResponse> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.tipo && filters.tipo !== 'todos') {
      params = params.set('tipo', filters.tipo);
    }
    if (filters?.modulo) params = params.set('modulo', filters.modulo);
    if (filters?.accion) params = params.set('accion', filters.accion);
    if (filters?.nivel) params = params.set('nivel', filters.nivel);
    if (filters?.resultado) params = params.set('resultado', filters.resultado);
    if (filters?.usuario) params = params.set('usuario', filters.usuario);
    if (filters?.desde) params = params.set('desde', filters.desde);
    if (filters?.hasta) params = params.set('hasta', filters.hasta);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));

    params = withInstitutionParams(this.tenant, params);

    return this.http.get<BitacoraResponse>(this.base, { params }).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  exportCsv(filters?: Partial<BitacoraFilters>): Observable<Blob> {
    this.exporting.set(true);
    let params = new HttpParams();
    if (filters?.tipo && filters.tipo !== 'todos') {
      params = params.set('tipo', filters.tipo);
    }
    if (filters?.modulo) params = params.set('modulo', filters.modulo);
    if (filters?.accion) params = params.set('accion', filters.accion);
    if (filters?.nivel) params = params.set('nivel', filters.nivel);
    if (filters?.resultado) params = params.set('resultado', filters.resultado);
    if (filters?.usuario) params = params.set('usuario', filters.usuario);
    if (filters?.desde) params = params.set('desde', filters.desde);
    if (filters?.hasta) params = params.set('hasta', filters.hasta);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);

    params = withInstitutionParams(this.tenant, params);

    return this.http
      .get(`${this.base}/export`, { params, responseType: 'blob' })
      .pipe(
        catchError(err => throwError(() => err)),
        finalize(() => this.exporting.set(false)),
      );
  }
}
