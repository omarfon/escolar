import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  GradeRegistryResponse,
  NotasRegistroFilters,
  RectifyNotasRegistroPayload,
  RectifyRegistryContextResponse,
  RegistryContextsResponse,
  SaveNotasRegistroPayload,
} from './notas-registro.model';

@Injectable({ providedIn: 'root' })
export class NotasRegistroService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/grades`;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadingContexts = signal(false);

  loadContexts(bimestre = 2): Observable<RegistryContextsResponse> {
    this.loadingContexts.set(true);
    const params = new HttpParams().set('bimestre', String(bimestre));
    return this.http
      .get<RegistryContextsResponse>(`${this.base}/registry/contexts`, { params })
      .pipe(
        catchError(err => throwError(() => err)),
        finalize(() => this.loadingContexts.set(false)),
      );
  }

  loadRegistry(filters: NotasRegistroFilters): Observable<GradeRegistryResponse> {
    this.loading.set(true);
    const params = new HttpParams()
      .set('nivel', filters.nivel)
      .set('grado', filters.grado)
      .set('seccion', filters.seccion)
      .set('curso', filters.curso)
      .set('bimestre', String(filters.bimestre));

    return this.http.get<GradeRegistryResponse>(`${this.base}/registry`, { params }).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  saveBulk(payload: SaveNotasRegistroPayload): Observable<{ saved: number; registry: GradeRegistryResponse }> {
    this.saving.set(true);
    return this.http.post<{ saved: number; registry: GradeRegistryResponse }>(
      `${this.base}/registry/bulk`,
      payload,
    ).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  loadRectifyContext(bimestre = 2): Observable<RectifyRegistryContextResponse> {
    this.loadingContexts.set(true);
    const params = new HttpParams().set('bimestre', String(bimestre));
    return this.http
      .get<RectifyRegistryContextResponse>(`${this.base}/registry/rectify/context`, { params })
      .pipe(
        catchError(err => throwError(() => err)),
        finalize(() => this.loadingContexts.set(false)),
      );
  }

  saveRectify(
    payload: RectifyNotasRegistroPayload,
  ): Observable<{ saved: number; registry: GradeRegistryResponse; actaCerrada: boolean }> {
    this.saving.set(true);
    return this.http
      .post<{ saved: number; registry: GradeRegistryResponse; actaCerrada: boolean }>(
        `${this.base}/registry/rectify`,
        payload,
      )
      .pipe(
        catchError(err => throwError(() => err)),
        finalize(() => this.saving.set(false)),
      );
  }
}
