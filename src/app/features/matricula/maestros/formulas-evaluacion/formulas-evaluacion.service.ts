import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import {
  CreateMaestroFormulaPayload,
  MaestroFormulaEvaluacionItem,
  UpdateMaestroFormulaPayload,
} from './formulas-evaluacion.model';

@Injectable({ providedIn: 'root' })
export class MaestrosFormulasEvaluacionService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/formulas-evaluacion`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  list(): Observable<MaestroFormulaEvaluacionItem[]> {
    this.loading.set(true);
    return this.http.get<MaestroFormulaEvaluacionItem[]>(this.base, {
      params: withInstitutionParams(this.tenant),
    }).pipe(
      catchError(err => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  resolve(query: {
    nivel?: string;
    grado?: string;
    curso?: string;
    bimestre?: number;
  }): Observable<MaestroFormulaEvaluacionItem> {
    let params = new HttpParams();
    if (query.nivel) params = params.set('nivel', query.nivel);
    if (query.grado) params = params.set('grado', query.grado);
    if (query.curso) params = params.set('curso', query.curso);
    if (query.bimestre) params = params.set('bimestre', String(query.bimestre));
    params = withInstitutionParams(this.tenant, params);
    return this.http.get<MaestroFormulaEvaluacionItem>(`${this.base}/resolve`, { params }).pipe(
      catchError(err => throwError(() => new Error(this.extractError(err)))),
    );
  }

  create(payload: CreateMaestroFormulaPayload): Observable<MaestroFormulaEvaluacionItem> {
    this.saving.set(true);
    return this.http.post<MaestroFormulaEvaluacionItem>(this.base, payload).pipe(
      catchError(err => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, payload: UpdateMaestroFormulaPayload): Observable<MaestroFormulaEvaluacionItem> {
    this.saving.set(true);
    return this.http.patch<MaestroFormulaEvaluacionItem>(`${this.base}/${id}`, payload).pipe(
      catchError(err => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  remove(id: number): Observable<{ deleted: boolean; id: number }> {
    this.saving.set(true);
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.base}/${id}`).pipe(
      catchError(err => throwError(() => new Error(this.extractError(err)))),
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
