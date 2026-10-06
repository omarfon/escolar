import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import {
  CreateMaestroConductaDescripcionPayload,
  CreateMaestroConductaTipoPayload,
  MaestroConductaDescripcionItem,
  MaestroConductaTipoItem,
  UpdateMaestroConductaDescripcionPayload,
  UpdateMaestroConductaTipoPayload,
} from './faltas-reconocimientos.model';

@Injectable({ providedIn: 'root' })
export class FaltasReconocimientosService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/faltas-reconocimientos`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  list(activo = true): Observable<MaestroConductaTipoItem[]> {
    this.loading.set(true);
    const params = withInstitutionParams(
      this.tenant,
      new HttpParams().set('activo', String(activo)),
    );
    return this.http.get<MaestroConductaTipoItem[]>(this.base, { params }).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.loading.set(false)),
    );
  }

  createTipo(payload: CreateMaestroConductaTipoPayload): Observable<MaestroConductaTipoItem> {
    this.saving.set(true);
    return this.http.post<MaestroConductaTipoItem>(`${this.base}/tipos`, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  updateTipo(
    id: number,
    payload: UpdateMaestroConductaTipoPayload,
  ): Observable<MaestroConductaTipoItem> {
    this.saving.set(true);
    return this.http.patch<MaestroConductaTipoItem>(`${this.base}/tipos/${id}`, payload).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  removeTipo(id: number): Observable<{ deleted: boolean; id: number }> {
    this.saving.set(true);
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.base}/tipos/${id}`).pipe(
      catchError((err) => throwError(() => new Error(this.extractError(err)))),
      finalize(() => this.saving.set(false)),
    );
  }

  createDescripcion(
    tipoId: number,
    payload: CreateMaestroConductaDescripcionPayload,
  ): Observable<MaestroConductaDescripcionItem> {
    this.saving.set(true);
    return this.http
      .post<MaestroConductaDescripcionItem>(
        `${this.base}/tipos/${tipoId}/descripciones`,
        payload,
      )
      .pipe(
        catchError((err) => throwError(() => new Error(this.extractError(err)))),
        finalize(() => this.saving.set(false)),
      );
  }

  updateDescripcion(
    id: number,
    payload: UpdateMaestroConductaDescripcionPayload,
  ): Observable<MaestroConductaDescripcionItem> {
    this.saving.set(true);
    return this.http
      .patch<MaestroConductaDescripcionItem>(`${this.base}/descripciones/${id}`, payload)
      .pipe(
        catchError((err) => throwError(() => new Error(this.extractError(err)))),
        finalize(() => this.saving.set(false)),
      );
  }

  removeDescripcion(id: number): Observable<{ deleted: boolean; id: number }> {
    this.saving.set(true);
    return this.http
      .delete<{ deleted: boolean; id: number }>(`${this.base}/descripciones/${id}`)
      .pipe(
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
