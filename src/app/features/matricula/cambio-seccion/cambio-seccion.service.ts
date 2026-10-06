import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiExpediente } from '../../../core/api/api.models';
import {
  CambioSeccionPayload,
  CambioSeccionResult,
  CreateSolicitudCambioSeccionPayload,
  HistorialCambioSeccion,
  OcupacionSeccion,
  SolicitudCambioSeccion,
} from './cambio-seccion.model';

@Injectable({ providedIn: 'root' })
export class CambioSeccionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/students`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  loadStudents(params?: { nivel?: string; grado?: string }): Observable<ApiExpediente[]> {
    this.loading.set(true);
    let httpParams = new HttpParams();
    if (params?.nivel) httpParams = httpParams.set('nivel', params.nivel);
    if (params?.grado) httpParams = httpParams.set('grado', params.grado);
    return this.http
      .get<ApiExpediente[]>(`${this.base}/section-change-candidates`, { params: httpParams })
      .pipe(
        catchError((err) => throwError(() => err)),
        finalize(() => this.loading.set(false)),
      );
  }

  loadHistory(params?: { nivel?: string; grado?: string }): Observable<HistorialCambioSeccion[]> {
    let httpParams = new HttpParams();
    if (params?.nivel) httpParams = httpParams.set('nivel', params.nivel);
    if (params?.grado) httpParams = httpParams.set('grado', params.grado);
    return this.http.get<HistorialCambioSeccion[]>(`${this.base}/section-changes`, {
      params: httpParams,
    });
  }

  loadOccupancy(
    nivel: string,
    grado: string,
    anioEscolar?: number,
  ): Observable<OcupacionSeccion[]> {
    let params = new HttpParams().set('nivel', nivel).set('grado', grado);
    if (anioEscolar) params = params.set('anioEscolar', anioEscolar);
    return this.http.get<OcupacionSeccion[]>(`${this.base}/section-occupancy`, { params });
  }

  changeSection(studentId: number, payload: CambioSeccionPayload): Observable<CambioSeccionResult> {
    this.saving.set(true);
    return this.http.post<CambioSeccionResult>(`${this.base}/${studentId}/change-section`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  searchStudents(q?: string): Observable<ApiExpediente[]> {
    let params = new HttpParams();
    if (q?.trim()) params = params.set('q', q.trim());
    return this.http.get<ApiExpediente[]>(this.base, { params });
  }

  loadRequests(params?: { nivel?: string; grado?: string }): Observable<SolicitudCambioSeccion[]> {
    let httpParams = new HttpParams();
    if (params?.nivel) httpParams = httpParams.set('nivel', params.nivel);
    if (params?.grado) httpParams = httpParams.set('grado', params.grado);
    return this.http.get<SolicitudCambioSeccion[]>(`${this.base}/section-change-requests`, {
      params: httpParams,
    });
  }

  createRequest(payload: CreateSolicitudCambioSeccionPayload): Observable<SolicitudCambioSeccion> {
    this.saving.set(true);
    return this.http
      .post<SolicitudCambioSeccion>(`${this.base}/section-change-requests`, payload)
      .pipe(
        catchError((err) => throwError(() => err)),
        finalize(() => this.saving.set(false)),
      );
  }

  cancelRequest(id: number): Observable<{ id: number; estado: string }> {
    return this.http.patch<{ id: number; estado: string }>(
      `${this.base}/section-change-requests/${id}/cancel`,
      {},
    );
  }

  processRequest(id: number, nuevaSeccion?: string): Observable<CambioSeccionResult> {
    this.saving.set(true);
    return this.http
      .post<CambioSeccionResult>(`${this.base}/section-change-requests/${id}/process`, {
        nuevaSeccion,
      })
      .pipe(
        catchError((err) => throwError(() => err)),
        finalize(() => this.saving.set(false)),
      );
  }
}
