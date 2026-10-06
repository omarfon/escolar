import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import { CreateSalonPayload, SalonItem, SyncSalonesResult, VacanteItem } from './salones.model';

@Injectable({ providedIn: 'root' })
export class SalonesService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/salones`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  list(query?: {
    anioEscolar?: number;
    nivel?: string;
    grado?: string;
    activo?: boolean;
  }): Observable<SalonItem[]> {
    this.loading.set(true);
    let params = new HttpParams();
    if (query?.anioEscolar) params = params.set('anioEscolar', query.anioEscolar);
    if (query?.nivel) params = params.set('nivel', query.nivel);
    if (query?.grado) params = params.set('grado', query.grado);
    if (query?.activo !== undefined) params = params.set('activo', query.activo);
    params = withInstitutionParams(this.tenant, params);

    return this.http.get<SalonItem[]>(this.base, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  listVacancies(query?: {
    anioEscolar?: number;
    nivel?: string;
    grado?: string;
  }): Observable<VacanteItem[]> {
    this.loading.set(true);
    let params = new HttpParams();
    if (query?.anioEscolar) params = params.set('anioEscolar', query.anioEscolar);
    if (query?.nivel) params = params.set('nivel', query.nivel);
    if (query?.grado) params = params.set('grado', query.grado);
    params = withInstitutionParams(this.tenant, params);

    return this.http.get<VacanteItem[]>(`${this.base}/vacancies`, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  create(payload: CreateSalonPayload): Observable<SalonItem> {
    this.saving.set(true);
    return this.http.post<SalonItem>(this.base, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  updateAforo(id: number, aforo: number): Observable<SalonItem> {
    this.saving.set(true);
    return this.http.patch<SalonItem>(`${this.base}/${id}`, { aforo }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  sync(anioEscolar: number): Observable<SyncSalonesResult> {
    this.saving.set(true);
    return this.http.post<SyncSalonesResult>(`${this.base}/sync`, { anioEscolar }).pipe(
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
