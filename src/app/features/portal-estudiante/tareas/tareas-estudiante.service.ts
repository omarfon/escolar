import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { format, parseISO, differenceInCalendarDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { catchError, finalize, tap, map, switchMap } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiTask } from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/services/auth.service';
import { PortalEstudianteService } from '../services/portal-estudiante.service';
import {
  TareaEstudiante,
  TareaVista,
  diasRestantesLabel,
  estadoBadge,
  estadoLabel,
  prioridadBadge,
  prioridadLabel,
} from './tareas.model';

@Injectable({ providedIn: 'root' })
export class TareasEstudianteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly portal = inject(PortalEstudianteService);
  private readonly base = `${environment.apiUrl}/tasks`;

  private readonly _tareas = signal<TareaEstudiante[]>([]);
  readonly tareas = this._tareas.asReadonly();
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly pendientes = computed(() => this._tareas().filter(t => t.estado === 'PENDING'));
  readonly entregadas = computed(() => this._tareas().filter(t => t.estado === 'SUBMITTED'));
  readonly vencidas = computed(() => this._tareas().filter(t => t.vencida || t.estado === 'OVERDUE'));
  readonly calificadas = computed(() => this._tareas().filter(t => t.estado === 'GRADED'));

  readonly cursosDisponibles = computed(() =>
    [...new Set(this._tareas().map(t => t.curso))].sort(),
  );

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);

    const perfil$ = this.auth.isPortalEstudiante()
      ? this.portal.ensureLoaded()
      : of(null);

    perfil$.pipe(
      switchMap(perfil => {
        const studentId = perfil?.studentId ?? Number(this.getEstudianteId());
        const params = new HttpParams().set('studentId', String(studentId));
        return this.http.get<ApiTask[]>(this.base, { params });
      }),
      tap(items => this._tareas.set(items.map(t => this.mapTask(t)))),
      catchError(() => {
        this._tareas.set([]);
        return of([]);
      }),
      finalize(() => this.loading.set(false)),
    ).subscribe();
  }

  filtrar(vista: TareaVista, curso: string, busqueda: string): TareaEstudiante[] {
    const q = busqueda.trim().toLowerCase();
    return this._tareas().filter(t => {
      if (vista === 'pendientes' && t.estado !== 'PENDING') return false;
      if (vista === 'entregadas' && t.estado !== 'SUBMITTED') return false;
      if (vista === 'vencidas' && !t.vencida && t.estado !== 'OVERDUE') return false;
      if (vista === 'calificadas' && t.estado !== 'GRADED') return false;
      if (curso && t.curso !== curso) return false;
      if (q && !t.titulo.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  submitEntrega(id: number, file: File, comentario: string): Observable<boolean> {
    this.saving.set(true);
    const form = new FormData();
    form.append('file', file);
    if (comentario.trim()) {
      form.append('comentario', comentario.trim());
    }

    return this.http.post<ApiTask>(`${this.base}/${id}/submit`, form).pipe(
      tap(item => this._tareas.update(list => list.map(t => t.id === id ? this.mapTask(item) : t))),
      map(() => true),
      catchError(() => of(false)),
      finalize(() => this.saving.set(false)),
    );
  }

  loadDetalle(id: number): Observable<TareaEstudiante | null> {
    return this.http.get<ApiTask>(`${this.base}/${id}`).pipe(
      map(item => this.mapTask(item)),
      tap(mapped => {
        this._tareas.update(list => list.map(t => (t.id === id ? mapped : t)));
        const abierto = this._detalleAbiertoId();
        if (abierto === id) {
          this._detalleTarea.set(mapped);
        }
      }),
      catchError(() => of(null)),
    );
  }

  private readonly _detalleAbiertoId = signal<number | null>(null);
  private readonly _detalleTarea = signal<TareaEstudiante | null>(null);
  readonly detalleTarea = this._detalleTarea.asReadonly();
  readonly cargandoDetalle = signal(false);

  abrirDetallePanel(t: TareaEstudiante): void {
    this._detalleAbiertoId.set(t.id);
    this._detalleTarea.set(t);
    this.cargandoDetalle.set(true);
    this.loadDetalle(t.id).pipe(
      finalize(() => this.cargandoDetalle.set(false)),
    ).subscribe();
  }

  cerrarDetallePanel(): void {
    this._detalleAbiertoId.set(null);
    this._detalleTarea.set(null);
  }

  getEstudianteId(): string {
    return this.portal.getStudentIdString() || '5';
  }

  estadoLabel = estadoLabel;
  estadoBadge = estadoBadge;
  prioridadLabel = prioridadLabel;
  prioridadBadge = prioridadBadge;
  diasRestantesLabel = diasRestantesLabel;

  formatFecha(fecha: string): string {
    return format(parseISO(fecha.slice(0, 10)), 'dd/MM/yyyy', { locale: es });
  }

  private mapTask(t: ApiTask): TareaEstudiante {
    const hoy = startOfDay(new Date());
    const entrega = startOfDay(parseISO(t.fechaEntrega.slice(0, 10)));
    const dias = differenceInCalendarDays(entrega, hoy);
    const vencida = t.estado === 'OVERDUE' || (t.estado === 'PENDING' && dias < 0);
    const venceHoy = dias === 0 && t.estado === 'PENDING';

    return {
      id: t.id,
      titulo: t.titulo,
      curso: t.curso,
      fechaEntrega: t.fechaEntrega.slice(0, 10),
      estado: vencida && t.estado === 'PENDING' ? 'OVERDUE' : t.estado,
      prioridad: t.prioridad,
      diasRestantes: dias,
      venceHoy,
      vencida: vencida || t.estado === 'OVERDUE',
      resourceId: t.resourceId ?? null,
      recurso: t.resource ?? null,
      comentarioEntrega: t.comentarioEntrega ?? '',
      archivoEntregaUrl: t.archivoEntregaUrl ?? null,
      archivoEntregaNombre: t.archivoEntregaNombre ?? null,
      fechaEntregaReal: t.fechaEntregaReal?.slice(0, 10) ?? null,
      nota: t.nota ?? null,
      retroalimentacion: t.retroalimentacion ?? '',
      calificadoAt: t.calificadoAt ?? null,
    };
  }
}
