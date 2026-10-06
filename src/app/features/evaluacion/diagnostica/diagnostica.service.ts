import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  DiagnosticFilters,
  DiagnosticRegistryContextResponse,
  DiagnosticRegistryResponse,
  SaveDiagnosticPayload,
} from './diagnostica.model';

@Injectable({ providedIn: 'root' })
export class DiagnosticaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/diagnostic-evaluations`;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadingContexts = signal(false);

  loadContexts(): Observable<DiagnosticRegistryContextResponse> {
    this.loadingContexts.set(true);
    return this.http
      .get<DiagnosticRegistryContextResponse>(`${this.base}/registry/context`)
      .pipe(
        catchError(err => throwError(() => err)),
        finalize(() => this.loadingContexts.set(false)),
      );
  }

  loadRegistry(filters: DiagnosticFilters): Observable<DiagnosticRegistryResponse> {
    this.loading.set(true);
    const params = new HttpParams()
      .set('nivel', filters.nivel)
      .set('grado', filters.grado)
      .set('seccion', filters.seccion)
      .set('curso', filters.curso);

    return this.http
      .get<DiagnosticRegistryResponse>(`${this.base}/registry`, { params })
      .pipe(
        catchError(err => throwError(() => err)),
        finalize(() => this.loading.set(false)),
      );
  }

  saveBulk(
    payload: SaveDiagnosticPayload,
  ): Observable<{ saved: number; registry: DiagnosticRegistryResponse }> {
    this.saving.set(true);
    return this.http
      .post<{ saved: number; registry: DiagnosticRegistryResponse }>(
        `${this.base}/bulk`,
        payload,
      )
      .pipe(
        catchError(err => throwError(() => err)),
        finalize(() => this.saving.set(false)),
      );
  }
}
