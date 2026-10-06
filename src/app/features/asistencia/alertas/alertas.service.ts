import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  AlertaFilters,
  AlertasResponse,
  AlertSettings,
  RecurrentAlertsContext,
  RecurrentAlertsListResponse,
  ScanRecurrentAlertsResult,
} from './alertas.model';

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/attendances`;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly scanning = signal(false);
  readonly recurrentLoading = signal(false);

  loadAlerts(filters?: AlertaFilters): Observable<AlertasResponse> {
    this.loading.set(true);
    return this.http
      .get<AlertasResponse>(`${this.base}/alerts`, {
        params: this.buildParams(filters),
      })
      .pipe(
        catchError((err) => throwError(() => err)),
        finalize(() => this.loading.set(false)),
      );
  }

  getSettings(): Observable<AlertSettings> {
    return this.http.get<AlertSettings>(`${this.base}/alert-settings`);
  }

  updateSettings(payload: Partial<AlertSettings>): Observable<AlertSettings> {
    this.saving.set(true);
    return this.http
      .patch<AlertSettings>(`${this.base}/alert-settings`, payload)
      .pipe(
        catchError((err) => throwError(() => err)),
        finalize(() => this.saving.set(false)),
      );
  }

  getRecurrentContext(): Observable<RecurrentAlertsContext> {
    return this.http.get<RecurrentAlertsContext>(`${this.base}/recurrent-alerts/context`);
  }

  loadRecurrentAlerts(query?: {
    mes?: string;
    estado?: string;
    nivel?: string;
    grado?: string;
    page?: number;
    pageSize?: number;
  }): Observable<RecurrentAlertsListResponse> {
    this.recurrentLoading.set(true);
    let params = new HttpParams();
    if (query?.mes) params = params.set('mes', query.mes);
    if (query?.estado) params = params.set('estado', query.estado);
    if (query?.nivel) params = params.set('nivel', query.nivel);
    if (query?.grado) params = params.set('grado', query.grado);
    if (query?.page) params = params.set('page', String(query.page));
    if (query?.pageSize) params = params.set('pageSize', String(query.pageSize));

    return this.http
      .get<RecurrentAlertsListResponse>(`${this.base}/recurrent-alerts`, { params })
      .pipe(
        catchError((err) => throwError(() => err)),
        finalize(() => this.recurrentLoading.set(false)),
      );
  }

  scanRecurrentAlerts(payload?: {
    mes?: string;
    nivel?: string;
    grado?: string;
  }): Observable<ScanRecurrentAlertsResult> {
    this.scanning.set(true);
    return this.http
      .post<ScanRecurrentAlertsResult>(`${this.base}/recurrent-alerts/scan`, payload ?? {})
      .pipe(
        catchError((err) => throwError(() => err)),
        finalize(() => this.scanning.set(false)),
      );
  }

  atenderRecurrentAlert(id: number, motivo?: string) {
    return this.http.post(`${this.base}/recurrent-alerts/${id}/atender`, { motivo });
  }

  derivarRecurrentAlert(
    id: number,
    payload: { motivo?: string; derivadoARol?: string; derivadoAUsuario?: string },
  ) {
    return this.http.post(`${this.base}/recurrent-alerts/${id}/derivar`, payload);
  }

  cerrarRecurrentAlert(id: number, motivo: string) {
    return this.http.post(`${this.base}/recurrent-alerts/${id}/cerrar`, { motivo });
  }

  justificarRecurrentAlert(id: number, payload: { motivo?: string; justificationId?: number }) {
    return this.http.post(`${this.base}/recurrent-alerts/${id}/justificar`, payload);
  }

  notifyApoderado(payload: {
    studentId: number;
    mes: string;
    notificadoPor?: string;
  }): Observable<{
    studentId: number;
    mes: string;
    apoderadoNotificado: boolean;
    notificadoAt: string;
    notificadoPor: string;
    correoEnviado: boolean;
    correoDestino: string | null;
    correoSimulado: boolean;
    previewUrl?: string;
  }> {
    return this.http.post<{
      studentId: number;
      mes: string;
      apoderadoNotificado: boolean;
      notificadoAt: string;
      notificadoPor: string;
      correoEnviado: boolean;
      correoDestino: string | null;
      correoSimulado: boolean;
      previewUrl?: string;
    }>(`${this.base}/alerts/notify`, payload);
  }

  private buildParams(filters?: AlertaFilters): HttpParams {
    let params = new HttpParams();
    if (filters?.nivel) params = params.set('nivel', filters.nivel);
    if (filters?.grado) params = params.set('grado', filters.grado);
    if (filters?.mes) params = params.set('mes', filters.mes);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.soloCriticos) params = params.set('soloCriticos', 'true');
    return params;
  }
}
