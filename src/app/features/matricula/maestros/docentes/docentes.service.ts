import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import { DocenteDetail, DocentePayload, DocentesPage } from './docentes.model';

@Injectable({ providedIn: 'root' })
export class MaestrosDocentesService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/docentes`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  list(filters?: {
    estado?: string;
    sede?: string;
    busqueda?: string;
    anioEscolar?: number;
    page?: number;
    pageSize?: number;
  }): Observable<DocentesPage> {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', String(filters?.page ?? 1))
      .set('pageSize', String(filters?.pageSize ?? 10));
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.sede) params = params.set('sede', filters.sede);
    const busqueda = filters?.busqueda?.trim();
    if (busqueda) params = params.set('busqueda', busqueda);
    if (filters?.anioEscolar) params = params.set('anioEscolar', filters.anioEscolar);
    params = withInstitutionParams(this.tenant, params);

    return this.http.get<DocentesPage>(this.base, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  getById(id: number, anioEscolar?: number): Observable<DocenteDetail> {
    let params = new HttpParams();
    if (anioEscolar) params = params.set('anioEscolar', anioEscolar);
    params = withInstitutionParams(this.tenant, params);
    return this.http.get<DocenteDetail>(`${this.base}/${id}`, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
    );
  }

  create(payload: DocentePayload & { password: string }): Observable<DocenteDetail> {
    this.saving.set(true);
    return this.http.post<DocenteDetail>(this.base, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, payload: Partial<DocentePayload>): Observable<DocenteDetail> {
    this.saving.set(true);
    return this.http.patch<DocenteDetail>(`${this.base}/${id}`, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  remove(id: number): Observable<{ deleted: boolean; id: number }> {
    this.saving.set(true);
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.base}/${id}`).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const msg = err.error?.message;
      if (Array.isArray(msg)) return msg.join(', ');
      if (typeof msg === 'string') return msg;
      return err.message || 'Error de servidor';
    }
    if (err instanceof Error) return err.message;
    return 'Error desconocido';
  }
}
