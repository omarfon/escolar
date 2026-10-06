import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../core/tenant/tenant-http.util';
import {
  AssignEsperaPayload,
  AssignEsperaResult,
  CreateEsperaPayload,
  EsperaItem,
  UpdateEsperaPayload,
} from './espera.model';

@Injectable({ providedIn: 'root' })
export class EsperaService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/waitlist`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  load(filters?: {
    nivel?: string;
    grado?: string;
    estado?: string;
    prioridad?: string;
  }): Observable<EsperaItem[]> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.nivel) params = params.set('nivel', filters.nivel);
    if (filters?.grado) params = params.set('grado', filters.grado);
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.prioridad) params = params.set('prioridad', filters.prioridad);
    params = withInstitutionParams(this.tenant, params);

    return this.http.get<EsperaItem[]>(this.base, { params }).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  create(payload: CreateEsperaPayload): Observable<EsperaItem> {
    this.saving.set(true);
    return this.http.post<EsperaItem>(this.base, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, payload: UpdateEsperaPayload): Observable<EsperaItem> {
    this.saving.set(true);
    return this.http.patch<EsperaItem>(`${this.base}/${id}`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  notify(id: number): Observable<EsperaItem> {
    return this.http.patch<EsperaItem>(`${this.base}/${id}/notify`, {});
  }

  assign(id: number, payload: AssignEsperaPayload = {}): Observable<AssignEsperaResult> {
    this.saving.set(true);
    return this.http.post<AssignEsperaResult>(`${this.base}/${id}/assign`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  delete(id: number): Observable<{ deleted: boolean; id: number }> {
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.base}/${id}`);
  }
}
