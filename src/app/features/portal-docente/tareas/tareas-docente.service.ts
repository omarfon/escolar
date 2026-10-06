import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, map, of } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiTask } from '../../../core/api/api.models';
import { isoToDisplay } from '../../../core/api/date.util';
import { alumnoNombreCompleto } from './tareas-docente.model';

export interface EntregaTareaDocente extends ApiTask {
  alumnoLabel: string;
  alumnoIniciales: string;
}

export interface PendienteRevisionDocente extends EntregaTareaDocente {
  tareaTitulo: string;
  salonLabel: string;
  fechaEntregaDisplay: string;
}

interface PendingReviewApiResponse {
  porCalificar: Array<ApiTask & { tareaTitulo: string; salonLabel: string }>;
  vencidasSinEntrega: Array<ApiTask & { tareaTitulo: string; salonLabel: string }>;
}

@Injectable({ providedIn: 'root' })
export class TareasDocenteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/tasks`;

  readonly loading = signal(false);
  readonly loadingPendientes = signal(false);
  readonly saving = signal(false);

  loadEntregas(query: {
    resourceId: number;
    nivel?: string;
    grado?: string;
    seccion?: string;
  }): Observable<EntregaTareaDocente[]> {
    this.loading.set(true);
    let params = new HttpParams().set('resourceId', String(query.resourceId));
    if (query.nivel) params = params.set('nivel', query.nivel);
    if (query.grado) params = params.set('grado', query.grado);
    if (query.seccion) params = params.set('seccion', query.seccion);

    return this.http.get<ApiTask[]>(`${this.base}/entregas`, { params }).pipe(
      map((items) => items.map((t) => this.mapEntrega(t))),
      catchError(() => of([])),
      finalize(() => this.loading.set(false)),
    );
  }

  /** Entregas SUBMITTED y tareas vencidas sin entrega del docente logueado (una sola petición). */
  loadPendientesRevision(anioEscolar?: number): Observable<{
    porCalificar: PendienteRevisionDocente[];
    vencidasSinEntrega: PendienteRevisionDocente[];
  }> {
    this.loadingPendientes.set(true);
    let params = new HttpParams();
    if (anioEscolar !== undefined) {
      params = params.set('anioEscolar', String(anioEscolar));
    }

    return this.http
      .get<PendingReviewApiResponse>(`${this.base}/pending-review`, { params })
      .pipe(
        map((res) => ({
          porCalificar: res.porCalificar.map((t) => this.mapPendiente(t)),
          vencidasSinEntrega: res.vencidasSinEntrega.map((t) => this.mapPendiente(t)),
        })),
        catchError(() => of({ porCalificar: [], vencidasSinEntrega: [] })),
        finalize(() => this.loadingPendientes.set(false)),
      );
  }

  calificar(id: number, payload: { nota?: number; retroalimentacion?: string }): Observable<boolean> {
    if (!id) return of(false);
    this.saving.set(true);
    return this.http.patch<ApiTask>(`${this.base}/${id}/grade`, payload).pipe(
      map(() => true),
      catchError(() => of(false)),
      finalize(() => this.saving.set(false)),
    );
  }

  private mapEntrega(t: ApiTask): EntregaTareaDocente {
    const label = alumnoNombreCompleto(t);
    const a = t.studentApellido?.trim()?.[0] ?? '';
    const n = t.studentNombre?.trim()?.[0] ?? '';
    return {
      ...t,
      alumnoLabel: label,
      alumnoIniciales: `${a}${n}`.toUpperCase() || '#',
    };
  }

  private mapPendiente(
    t: ApiTask & { tareaTitulo: string; salonLabel: string },
  ): PendienteRevisionDocente {
    return {
      ...this.mapEntrega(t),
      tareaTitulo: t.tareaTitulo,
      salonLabel: t.salonLabel,
      fechaEntregaDisplay: isoToDisplay(t.fechaEntrega),
    };
  }
}
