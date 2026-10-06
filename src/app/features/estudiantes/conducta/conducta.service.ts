import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, map, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiExpediente } from '../../../core/api/api.models';
import {
  AlumnoConducta,
  ConductIncidentFilters,
  ConductIncidentPayload,
  ConductIncidentsPage,
  Incidente,
  mapAlumnoFromExpediente,
  mapIncidenteFromApi,
} from './conducta.model';

@Injectable({ providedIn: 'root' })
export class ConductaService {
  private readonly http = inject(HttpClient);
  private readonly incidentsBase = `${environment.apiUrl}/conduct-incidents`;
  private readonly studentsBase = `${environment.apiUrl}/students`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  loadStudents(): Observable<AlumnoConducta[]> {
    const params = new HttpParams()
      .set('page', '1')
      .set('pageSize', '500')
      .set('estado', 'activo');
    return this.http
      .get<{ items: ApiExpediente[] }>(this.studentsBase, { params })
      .pipe(
        map((res) =>
          (res.items ?? [])
            .filter((s) => s.activo)
            .map(mapAlumnoFromExpediente)
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        ),
        catchError((err) => throwError(() => err)),
      );
  }

  loadPage(filters: ConductIncidentFilters = {}): Observable<ConductIncidentsPage> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters.studentId) {
      params = params.set('studentId', String(filters.studentId));
    }
    if (filters.grado && filters.grado !== 'todos') {
      params = params.set('grado', filters.grado);
    }
    if (filters.seccion && filters.seccion !== 'todos') {
      params = params.set('seccion', filters.seccion);
    }
    if (filters.tipo && filters.tipo !== 'todos') {
      params = params.set('tipo', filters.tipo);
    }
    if (filters.estado && filters.estado !== 'todos') {
      params = params.set('estado', filters.estado);
    }
    if (filters.busqueda?.trim()) {
      params = params.set('busqueda', filters.busqueda.trim());
    }
    if (filters.nivel && filters.nivel !== 'todos') {
      params = params.set('nivel', filters.nivel);
    }
    params = params.set('page', String(filters.page ?? 1));
    params = params.set('pageSize', String(filters.pageSize ?? 10));
    params = params.set('resumenPage', String(filters.resumenPage ?? 1));
    params = params.set('resumenPageSize', String(filters.resumenPageSize ?? 10));

    return this.http.get<ConductIncidentsPage>(this.incidentsBase, { params }).pipe(
      map((page) => ({
        ...page,
        items: page.items.map(mapIncidenteFromApi),
      })),
      catchError((err) => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  loadStudentIncidents(studentId: number): Observable<Incidente[]> {
    return this.loadPage({ studentId, page: 1, pageSize: 200 }).pipe(
      map((page) => page.items),
    );
  }

  create(payload: ConductIncidentPayload): Observable<Incidente> {
    this.saving.set(true);
    return this.http.post<Incidente>(this.incidentsBase, payload).pipe(
      map(mapIncidenteFromApi),
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  update(
    id: number,
    payload: Partial<ConductIncidentPayload>,
  ): Observable<Incidente> {
    this.saving.set(true);
    return this.http.patch<Incidente>(`${this.incidentsBase}/${id}`, payload).pipe(
      map(mapIncidenteFromApi),
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  remove(id: number): Observable<{ deleted: boolean; id: number }> {
    this.saving.set(true);
    return this.http
      .delete<{ deleted: boolean; id: number }>(`${this.incidentsBase}/${id}`)
      .pipe(
        catchError((err) => throwError(() => err)),
        finalize(() => this.saving.set(false)),
      );
  }
}
