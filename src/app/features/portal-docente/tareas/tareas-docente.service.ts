import { Injectable, inject, signal } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable, catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { environment } from '@environments/environment';

import { ApiTask } from '../../../core/api/api.models';

import { isoToDisplay } from '../../../core/api/date.util';

import { AsistenciaDocenteService } from '../asistencia/asistencia-docente.service';

import { DocenteSalonAsignado } from '../asistencia/asistencia-docente.model';

import { RecursosService } from '../recursos/recursos.service';

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



@Injectable({ providedIn: 'root' })

export class TareasDocenteService {

  private readonly http = inject(HttpClient);

  private readonly asistenciaSvc = inject(AsistenciaDocenteService);

  private readonly recursosSvc = inject(RecursosService);

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

      map(items => items.map(t => this.mapEntrega(t))),

      catchError(() => of([])),

      finalize(() => this.loading.set(false)),

    );

  }



  /** Entregas SUBMITTED y tareas vencidas sin entrega del docente logueado. */
  loadPendientesRevision(anioEscolar?: number): Observable<{
    porCalificar: PendienteRevisionDocente[];
    vencidasSinEntrega: PendienteRevisionDocente[];
  }> {
    this.loadingPendientes.set(true);
    const anio = anioEscolar ?? new Date().getFullYear();

    return this.asistenciaSvc.loadMisSalones(anio).pipe(
      switchMap((res) => {
        const salones = res.salones ?? [];
        if (!salones.length) {
          return of({ porCalificar: [], vencidasSinEntrega: [] });
        }

        const cargasSalon = salones.map((salon) =>
          this.recursosSvc.load({
            nivel: salon.nivel,
            grado: salon.grado,
            seccion: salon.seccion,
          }).pipe(
            map((items) =>
              items
                .filter((r) => r.tipo === 'tarea' || r.tipo === 'evaluacion')
                .map((resource) => ({ resource, salon })),
            ),
            catchError(() => of([] as { resource: { id: number; descripcion: string; curso: string }; salon: DocenteSalonAsignado }[])),
          ),
        );

        return forkJoin(cargasSalon).pipe(
          switchMap((grupos) => {
            const pares = grupos.flat();
            if (!pares.length) {
              return of({ porCalificar: [], vencidasSinEntrega: [] });
            }

            const cargasEntregas = pares.map(({ resource, salon }) =>
              this.loadEntregas({
                resourceId: resource.id,
                nivel: salon.nivel,
                grado: salon.grado,
                seccion: salon.seccion,
              }).pipe(
                map((entregas) => {
                  const salonLabel = `${salon.grado} "${salon.seccion}" · ${salon.nivel}`;
                  const enrich = (e: EntregaTareaDocente): PendienteRevisionDocente => ({
                    ...e,
                    tareaTitulo: resource.descripcion || e.titulo,
                    salonLabel,
                    fechaEntregaDisplay: isoToDisplay(e.fechaEntrega),
                  });
                  return {
                    porCalificar: entregas
                      .filter((e) => e.estado === 'SUBMITTED')
                      .map(enrich),
                    vencidasSinEntrega: entregas
                      .filter((e) => e.estado === 'OVERDUE' || e.estado === 'PENDING')
                      .filter((e) => e.fechaEntrega < new Date().toISOString().slice(0, 10))
                      .map(enrich),
                  };
                }),
              ),
            );

            return forkJoin(cargasEntregas).pipe(
              map((bloques) => {
                const porCalificar = bloques
                  .flatMap((b) => b.porCalificar)
                  .sort((a, b) => (b.fechaEntregaReal ?? b.fechaEntrega).localeCompare(a.fechaEntregaReal ?? a.fechaEntrega));
                const vencidasSinEntrega = bloques
                  .flatMap((b) => b.vencidasSinEntrega)
                  .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));
                return { porCalificar, vencidasSinEntrega };
              }),
            );
          }),
        );
      }),
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

}


