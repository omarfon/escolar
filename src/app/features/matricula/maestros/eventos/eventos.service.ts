import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import {
  EventoFilters,
  EventoItem,
  EventoPayload,
} from '../../../comunicaciones/eventos/eventos.model';

@Injectable({ providedIn: 'root' })
export class MaestrosEventosService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/eventos`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  list(filters?: EventoFilters): Observable<EventoItem[]> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.mes) params = params.set('mes', filters.mes);
    if (filters?.tipo) params = params.set('tipo', filters.tipo);
    if (filters?.destinatarios) params = params.set('destinatarios', filters.destinatarios);
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    params = withInstitutionParams(this.tenant, params);

    return this.http.get<EventoItem[]>(this.base, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  create(payload: EventoPayload): Observable<EventoItem> {
    this.saving.set(true);
    return this.http.post<EventoItem>(this.base, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, payload: Partial<EventoPayload>): Observable<EventoItem> {
    this.saving.set(true);
    return this.http.patch<EventoItem>(`${this.base}/${id}`, payload).pipe(
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
