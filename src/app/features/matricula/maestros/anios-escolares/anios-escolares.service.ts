import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import type {
  AnioEscolarContext,
  AnioEscolarDetalle,
  AnioEscolarItem,
  AnioEscolarPage,
  CopiarCalendarioPayload,
  CopiarCalendarioResult,
  CreateAnioEscolarPayload,
  PublicarComunicadoCalendarioPayload,
  PublicarComunicadoCalendarioResult,
} from './anios-escolares.model';

@Injectable({ providedIn: 'root' })
export class MaestrosAniosEscolaresService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/anios-escolares`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  getContext(): Observable<AnioEscolarContext> {
    return this.http.get<AnioEscolarContext>(`${this.base}/context`, {
      params: withInstitutionParams(this.tenant),
    });
  }

  list(page = 1, estado = ''): Observable<AnioEscolarPage> {
    this.loading.set(true);
    let params = new HttpParams().set('page', page).set('pageSize', 20);
    if (estado) params = params.set('estado', estado);
    params = withInstitutionParams(this.tenant, params);
    return this.http.get<AnioEscolarPage>(this.base, { params }).pipe(
      finalize(() => this.loading.set(false)),
    );
  }

  detail(id: number): Observable<AnioEscolarDetalle> {
    return this.http.get<AnioEscolarDetalle>(`${this.base}/${id}`);
  }

  create(body: CreateAnioEscolarPayload): Observable<AnioEscolarItem & { recuperado?: boolean }> {
    this.saving.set(true);
    return this.http
      .post<AnioEscolarItem & { recuperado?: boolean }>(this.base, body)
      .pipe(finalize(() => this.saving.set(false)));
  }

  activate(id: number, motivo?: string): Observable<AnioEscolarItem> {
    this.saving.set(true);
    return this.http
      .post<AnioEscolarItem>(`${this.base}/${id}/activar`, { motivo, generarPeriodos: true })
      .pipe(finalize(() => this.saving.set(false)));
  }

  close(id: number, motivo: string): Observable<AnioEscolarItem> {
    this.saving.set(true);
    return this.http
      .post<AnioEscolarItem>(`${this.base}/${id}/cerrar`, { motivo })
      .pipe(finalize(() => this.saving.set(false)));
  }

  copyCalendar(id: number, body: CopiarCalendarioPayload): Observable<CopiarCalendarioResult> {
    this.saving.set(true);
    return this.http
      .post<CopiarCalendarioResult>(`${this.base}/${id}/copiar-calendario`, body)
      .pipe(finalize(() => this.saving.set(false)));
  }

  publishComunicado(
    id: number,
    body: PublicarComunicadoCalendarioPayload,
  ): Observable<PublicarComunicadoCalendarioResult> {
    this.saving.set(true);
    return this.http
      .post<PublicarComunicadoCalendarioResult>(`${this.base}/${id}/publicar-comunicado`, body)
      .pipe(finalize(() => this.saving.set(false)));
  }
}

export function anioEscolarErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (typeof body === 'string' && body) return body;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
    }
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
