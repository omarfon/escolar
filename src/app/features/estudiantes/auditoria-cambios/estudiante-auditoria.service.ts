import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  EstudianteAuditoriaContext,
  EstudianteAuditoriaFilters,
  EstudianteAuditoriaResponse,
  SensitiveNotificationContext,
  SensitiveNotificationResponse,
} from './estudiante-auditoria.model';

@Injectable({ providedIn: 'root' })
export class EstudianteAuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/students/change-audit`;

  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly loadingNotif = signal(false);

  private readonly sensitiveBase = `${environment.apiUrl}/students/sensitive-notifications`;

  loadContext(): Observable<EstudianteAuditoriaContext> {
    return this.http.get<EstudianteAuditoriaContext>(`${this.base}/context`);
  }

  load(filters?: EstudianteAuditoriaFilters): Observable<EstudianteAuditoriaResponse> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.accion) params = params.set('accion', filters.accion);
    if (filters?.usuario) params = params.set('usuario', filters.usuario);
    if (filters?.desde) params = params.set('desde', filters.desde);
    if (filters?.hasta) params = params.set('hasta', filters.hasta);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.resultado) params = params.set('resultado', filters.resultado);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));

    return this.http.get<EstudianteAuditoriaResponse>(this.base, { params }).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  loadByStudent(studentId: number, page = 1, pageSize = 20) {
    return this.http.get<EstudianteAuditoriaResponse>(
      `${environment.apiUrl}/students/${studentId}/change-audit`,
      { params: new HttpParams().set('page', String(page)).set('pageSize', String(pageSize)) },
    );
  }

  loadSensitiveContext(): Observable<SensitiveNotificationContext> {
    return this.http.get<SensitiveNotificationContext>(`${this.sensitiveBase}/context`);
  }

  loadSensitiveNotifications(filters?: {
    studentId?: number;
    correoEnviado?: string;
    desde?: string;
    hasta?: string;
    busqueda?: string;
    page?: number;
    pageSize?: number;
  }): Observable<SensitiveNotificationResponse> {
    this.loadingNotif.set(true);
    let params = new HttpParams();
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.correoEnviado) params = params.set('correoEnviado', filters.correoEnviado);
    if (filters?.desde) params = params.set('desde', filters.desde);
    if (filters?.hasta) params = params.set('hasta', filters.hasta);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));

    return this.http.get<SensitiveNotificationResponse>(this.sensitiveBase, { params }).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.loadingNotif.set(false)),
    );
  }

  exportCsv(filters?: EstudianteAuditoriaFilters): Observable<Blob> {
    this.exporting.set(true);
    let params = new HttpParams();
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.accion) params = params.set('accion', filters.accion);
    if (filters?.usuario) params = params.set('usuario', filters.usuario);
    if (filters?.desde) params = params.set('desde', filters.desde);
    if (filters?.hasta) params = params.set('hasta', filters.hasta);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.resultado) params = params.set('resultado', filters.resultado);

    return this.http.get(`${this.base}/export`, { params, responseType: 'blob' }).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.exporting.set(false)),
    );
  }
}
