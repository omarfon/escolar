import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import {
  CreateMaestroSedePayload,
  MaestroSedeItem,
  MaestroSedesCatalog,
  UpdateMaestroSedePayload,
} from './sedes.model';

@Injectable({ providedIn: 'root' })
export class MaestrosSedesService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/sedes`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  list(institutionId?: number): Observable<MaestroSedesCatalog> {
    this.loading.set(true);
    let params = new HttpParams();
    if (institutionId) {
      params = params.set('institutionId', String(institutionId));
    } else {
      params = withInstitutionParams(this.tenant, params);
    }
    return this.http.get<MaestroSedesCatalog>(this.base, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  create(payload: CreateMaestroSedePayload): Observable<MaestroSedeItem> {
    this.saving.set(true);
    return this.http.post<MaestroSedeItem>(this.base, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, payload: UpdateMaestroSedePayload): Observable<MaestroSedeItem> {
    this.saving.set(true);
    return this.http.patch<MaestroSedeItem>(`${this.base}/${id}`, payload).pipe(
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
