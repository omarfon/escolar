import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, map, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import type { AnioEscolarPage } from '../anios-escolares/anios-escolares.model';
import {
  AnioEscolarCatalogoItem,
  DividirPeriodosPayload,
  DividirPeriodosResult,
  PeriodoAcademicoItem,
  PeriodoAcademicoPayload,
} from './periodos-academicos.model';

export interface PeriodoAcademicoContext {
  anioEscolar: number;
  periodoActual: PeriodoAcademicoItem | null;
}

@Injectable({ providedIn: 'root' })
export class MaestrosPeriodosAcademicosService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/periodos-academicos`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  /** Año escolar y periodo en curso según configuración institucional. */
  resolveContext(): Observable<PeriodoAcademicoContext> {
    return this.http.get<PeriodoAcademicoItem | null>(`${this.base}/actual`, {
      params: withInstitutionParams(this.tenant),
    }).pipe(
      map((periodoActual) => ({
        anioEscolar: periodoActual?.anioEscolar ?? new Date().getFullYear(),
        periodoActual,
      })),
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
    );
  }

  resolveAnioEscolarActual(): Observable<number> {
    return this.resolveContext().pipe(map((ctx) => ctx.anioEscolar));
  }

  listCatalogoAnios(): Observable<AnioEscolarCatalogoItem[]> {
    return this.http.get<AnioEscolarCatalogoItem[]>(`${this.base}/catalogo-anios`, {
      params: withInstitutionParams(this.tenant),
    }).pipe(
      map((rows) => this.normalizarCatalogoAnios(rows)),
      catchError(() =>
        this.http
          .get<AnioEscolarPage>(`${environment.apiUrl}/maestros/anios-escolares`, {
            params: withInstitutionParams(
              this.tenant,
              new HttpParams().set('page', 1).set('pageSize', 50),
            ),
          })
          .pipe(
            map((page) =>
              this.normalizarCatalogoAnios(
                (page?.items ?? []).map((a) => ({
                  anio: a.anio,
                  tipoPeriodo: a.tipoPeriodo,
                  estado: a.estado,
                  fechaInicio: a.fechaInicio,
                  fechaFin: a.fechaFin,
                })),
              ),
            ),
            catchError(() =>
              this.list({ activo: true }).pipe(
                map((periodos) => {
                  const mapa = new Map<number, AnioEscolarCatalogoItem>();
                  for (const p of periodos) {
                    if (!mapa.has(p.anioEscolar)) {
                      mapa.set(p.anioEscolar, {
                        anio: p.anioEscolar,
                        tipoPeriodo: p.tipo,
                      });
                    }
                  }
                  return this.normalizarCatalogoAnios(Array.from(mapa.values()));
                }),
              ),
            ),
          ),
      ),
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
    );
  }

  private normalizarCatalogoAnios(rows: AnioEscolarCatalogoItem[] | null | undefined): AnioEscolarCatalogoItem[] {
    if (!Array.isArray(rows)) return [];
    return [...rows].sort((a, b) => b.anio - a.anio);
  }

  list(filters?: {
    anioEscolar?: number;
    tipo?: string;
    activo?: boolean;
  }): Observable<PeriodoAcademicoItem[]> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.anioEscolar) params = params.set('anioEscolar', filters.anioEscolar);
    if (filters?.tipo) params = params.set('tipo', filters.tipo);
    if (filters?.activo !== undefined) params = params.set('activo', filters.activo);
    params = withInstitutionParams(this.tenant, params);

    return this.http.get<PeriodoAcademicoItem[]>(this.base, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  create(payload: PeriodoAcademicoPayload): Observable<PeriodoAcademicoItem> {
    this.saving.set(true);
    return this.http.post<PeriodoAcademicoItem>(this.base, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, payload: Partial<PeriodoAcademicoPayload>): Observable<PeriodoAcademicoItem> {
    this.saving.set(true);
    return this.http.patch<PeriodoAcademicoItem>(`${this.base}/${id}`, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  marcarActual(id: number): Observable<PeriodoAcademicoItem> {
    this.saving.set(true);
    return this.http.patch<PeriodoAcademicoItem>(`${this.base}/${id}/actual`, {}).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  dividir(payload: DividirPeriodosPayload): Observable<DividirPeriodosResult> {
    this.saving.set(true);
    return this.http.post<DividirPeriodosResult>(`${this.base}/dividir`, payload).pipe(
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
