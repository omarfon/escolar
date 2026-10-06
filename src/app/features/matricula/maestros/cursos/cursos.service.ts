import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import {
  CreateMaestroCursoPayload,
  MaestroCursoItem,
  MaestroCursosPage,
  UpdateMaestroCursoPayload,
} from './cursos.model';

@Injectable({ providedIn: 'root' })
export class MaestrosCursosService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/cursos`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  list(query?: {
    page?: number;
    pageSize?: number;
    nivel?: string;
    area?: string;
    activo?: boolean;
  }): Observable<MaestroCursosPage> {
    this.loading.set(true);
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page);
    if (query?.pageSize) params = params.set('pageSize', query.pageSize);
    if (query?.nivel) params = params.set('nivel', query.nivel);
    if (query?.area) params = params.set('area', query.area);
    if (query?.activo !== undefined) params = params.set('activo', query.activo);
    params = withInstitutionParams(this.tenant, params);

    return this.http.get<MaestroCursosPage>(this.base, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  create(payload: CreateMaestroCursoPayload): Observable<MaestroCursoItem> {
    this.saving.set(true);
    return this.http.post<MaestroCursoItem>(this.base, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, payload: UpdateMaestroCursoPayload): Observable<MaestroCursoItem> {
    this.saving.set(true);
    return this.http.patch<MaestroCursoItem>(`${this.base}/${id}`, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  deactivate(id: number): Observable<{ deleted: boolean; id: number }> {
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
