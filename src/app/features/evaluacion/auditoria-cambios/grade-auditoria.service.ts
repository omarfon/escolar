import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  GradeAuditoriaContext,
  GradeAuditoriaFilters,
  GradeAuditoriaResponse,
} from './grade-auditoria.model';

@Injectable({ providedIn: 'root' })
export class GradeAuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/grades/change-audit`;

  readonly loading = signal(false);
  readonly exporting = signal(false);

  loadContext(): Observable<GradeAuditoriaContext> {
    return this.http.get<GradeAuditoriaContext>(`${this.base}/context`);
  }

  load(filters?: GradeAuditoriaFilters): Observable<GradeAuditoriaResponse> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.gradeId) params = params.set('gradeId', String(filters.gradeId));
    if (filters?.curso) params = params.set('curso', filters.curso);
    if (filters?.bimestre) params = params.set('bimestre', String(filters.bimestre));
    if (filters?.accion) params = params.set('accion', filters.accion);
    if (filters?.usuario) params = params.set('usuario', filters.usuario);
    if (filters?.desde) params = params.set('desde', filters.desde);
    if (filters?.hasta) params = params.set('hasta', filters.hasta);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.resultado) params = params.set('resultado', filters.resultado);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));

    return this.http.get<GradeAuditoriaResponse>(this.base, { params }).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  exportCsv(filters?: GradeAuditoriaFilters): Observable<Blob> {
    this.exporting.set(true);
    let params = new HttpParams();
    if (filters?.studentId) params = params.set('studentId', String(filters.studentId));
    if (filters?.gradeId) params = params.set('gradeId', String(filters.gradeId));
    if (filters?.curso) params = params.set('curso', filters.curso);
    if (filters?.bimestre) params = params.set('bimestre', String(filters.bimestre));
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
