import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import {
  CreateMaestroFeriadoPayload,
  DiasClaseResumen,
  MaestroFeriadoItem,
  UpdateMaestroFeriadoPayload,
} from './feriados.model';

@Injectable({ providedIn: 'root' })
export class MaestrosFeriadosService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/feriados`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  list(query?: {
    anioEscolar?: number;
    activo?: boolean;
    desde?: string;
    hasta?: string;
  }): Observable<MaestroFeriadoItem[]> {
    this.loading.set(true);
    let params = new HttpParams();
    if (query?.anioEscolar) params = params.set('anioEscolar', query.anioEscolar);
    if (query?.activo !== undefined) params = params.set('activo', query.activo);
    if (query?.desde) params = params.set('desde', query.desde);
    if (query?.hasta) params = params.set('hasta', query.hasta);
    params = withInstitutionParams(this.tenant, params);

    return this.http.get<MaestroFeriadoItem[]>(this.base, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  verificarFecha(fecha: string, anioEscolar?: number): Observable<MaestroFeriadoItem | null> {
    let params = new HttpParams().set('fecha', fecha);
    if (anioEscolar) params = params.set('anioEscolar', anioEscolar);
    params = withInstitutionParams(this.tenant, params);
    return this.http.get<MaestroFeriadoItem | null>(`${this.base}/verificar`, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
    );
  }

  calcularDiasClase(
    desde: string,
    hasta: string,
    anioEscolar?: number,
  ): Observable<DiasClaseResumen> {
    let params = new HttpParams().set('desde', desde).set('hasta', hasta);
    if (anioEscolar) params = params.set('anioEscolar', anioEscolar);
    params = withInstitutionParams(this.tenant, params);
    return this.http.get<DiasClaseResumen>(`${this.base}/dias-clase`, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
    );
  }

  create(payload: CreateMaestroFeriadoPayload): Observable<MaestroFeriadoItem> {
    this.saving.set(true);
    return this.http.post<MaestroFeriadoItem>(this.base, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, payload: UpdateMaestroFeriadoPayload): Observable<MaestroFeriadoItem> {
    this.saving.set(true);
    return this.http.patch<MaestroFeriadoItem>(`${this.base}/${id}`, payload).pipe(
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
