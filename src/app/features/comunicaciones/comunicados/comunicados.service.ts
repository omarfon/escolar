import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiAnnouncement } from '../../../core/api/api.models';
import { displayToIso, isoToDisplay } from '../../../core/api/date.util';
import { AuthService } from '../../../core/auth/services/auth.service';

export type AudienceCom = 'padre' | 'estudiante' | 'docente';

export type TipoCom  = 'general' | 'academico' | 'administrativo' | 'urgente' | 'evento';
export type DestCom  = 'alumnos' | 'padres' | 'todos' | 'docentes';
export type PrioCom  = 'alta' | 'media' | 'baja';

export interface Comunicado {
  id: number;
  titulo: string;
  cuerpo: string;
  tipo: TipoCom;
  destinatarios: DestCom;
  prioridad: PrioCom;
  habilitado: boolean;
  fechaCreacion: string;
  fechaPublicacion: string;
  fechaVencimiento: string | null;
  autor: string;
  leidos: number;
}

function fromApi(item: ApiAnnouncement): Comunicado {
  return {
    id: item.id,
    titulo: item.titulo,
    cuerpo: item.cuerpo,
    tipo: item.tipo,
    destinatarios: item.destinatarios,
    prioridad: item.prioridad,
    habilitado: item.habilitado,
    fechaCreacion: isoToDisplay(item.fechaPublicacion),
    fechaPublicacion: isoToDisplay(item.fechaPublicacion),
    fechaVencimiento: item.fechaVencimiento ? isoToDisplay(item.fechaVencimiento) : null,
    autor: 'Dirección',
    leidos: 0,
  };
}

@Injectable({ providedIn: 'root' })
export class ComunicadosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiUrl}/announcements`;

  comunicados = signal<Comunicado[]>([]);
  loading = signal(false);
  private readonly _leidosPadre = signal<Set<number>>(new Set());
  private readonly _leidosEstudiante = signal<Set<number>>(new Set());
  private readonly _leidosDocente = signal<Set<number>>(new Set());

  readonly leidosPadre = this._leidosPadre.asReadonly();
  readonly leidosEstudiante = this._leidosEstudiante.asReadonly();
  readonly leidosDocente = this._leidosDocente.asReadonly();

  habilitados  = computed(() => this.comunicados().filter(c => c.habilitado));
  paraAlumnos  = computed(() => this.habilitados().filter(c => c.destinatarios === 'alumnos' || c.destinatarios === 'todos'));
  paraPadres   = computed(() => this.habilitados().filter(c => c.destinatarios === 'padres'  || c.destinatarios === 'todos'));
  paraDocentes = computed(() => this.habilitados().filter(c => c.destinatarios === 'docentes' || c.destinatarios === 'todos'));

  readonly noLeidosPadre = computed(() =>
    this.paraPadres().filter(c => !this._leidosPadre().has(c.id)).length,
  );
  readonly noLeidosEstudiante = computed(() =>
    this.paraAlumnos().filter(c => !this._leidosEstudiante().has(c.id)).length,
  );
  readonly noLeidosDocente = computed(() =>
    this.paraDocentes().filter(c => !this._leidosDocente().has(c.id)).length,
  );

  readonly urgentesNoLeidosPadre = computed(() =>
    this.paraPadres().filter(
      c => (c.tipo === 'urgente' || c.prioridad === 'alta') && !this._leidosPadre().has(c.id),
    ),
  );

  readonly urgentesNoLeidosEstudiante = computed(() =>
    this.paraAlumnos().filter(
      c => (c.tipo === 'urgente' || c.prioridad === 'alta') && !this._leidosEstudiante().has(c.id),
    ),
  );

  readonly urgentesNoLeidosDocente = computed(() =>
    this.paraDocentes().filter(
      c => (c.tipo === 'urgente' || c.prioridad === 'alta') && !this._leidosDocente().has(c.id),
    ),
  );

  private lastLoadedUserId: string | null = null;

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id;
      this.syncLeidosFromStorage();
      if (userId && this.auth.isAuthenticated() && this.lastLoadedUserId !== userId) {
        this.lastLoadedUserId = userId;
        this.load();
      }
      if (!userId) this.lastLoadedUserId = null;
    });
  }

  syncLeidosFromStorage(): void {
    this._leidosPadre.set(this.loadLeidos('padre'));
    this._leidosEstudiante.set(this.loadLeidos('estudiante'));
    this._leidosDocente.set(this.loadLeidos('docente'));
  }

  marcarLeido(id: number, audience: AudienceCom): void {
    if (this.estaLeido(id, audience)) return;
    const signalRef = this.leidosRef(audience);
    signalRef.update(s => {
      const next = new Set(s);
      next.add(id);
      this.saveLeidos(audience, next);
      return next;
    });
  }

  noLeido(id: number, audience: AudienceCom): boolean {
    return !this.leidosRef(audience)().has(id);
  }

  estaLeido(id: number, audience: AudienceCom): boolean {
    return this.leidosRef(audience)().has(id);
  }

  private leidosRef(audience: AudienceCom) {
    if (audience === 'padre') return this._leidosPadre;
    if (audience === 'estudiante') return this._leidosEstudiante;
    return this._leidosDocente;
  }

  private storageKey(audience: AudienceCom): string {
    const userId = this.auth.currentUser()?.id ?? 'anon';
    return `escolar_comunicados_leidos_${audience}_${userId}`;
  }

  private loadLeidos(audience: AudienceCom): Set<number> {
    try {
      const raw = localStorage.getItem(this.storageKey(audience));
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as number[]);
    } catch {
      return new Set();
    }
  }

  private saveLeidos(audience: AudienceCom, ids: Set<number>): void {
    localStorage.setItem(this.storageKey(audience), JSON.stringify([...ids]));
  }

  load(): void {
    if (!this.auth.isAuthenticated()) return;
    this.loading.set(true);
    this.http.get<ApiAnnouncement[]>(this.base).pipe(
      tap(items => {
        this.comunicados.set(items.map(fromApi));
        this.loading.set(false);
      }),
      catchError(() => {
        this.loading.set(false);
        return of([]);
      }),
    ).subscribe();
  }

  toggle(id: number) {
    const current = this.comunicados().find(c => c.id === id);
    if (!current) return;
    this.http.patch<ApiAnnouncement>(`${this.base}/${id}`, { habilitado: !current.habilitado }).pipe(
      tap(item => this.comunicados.update(list => list.map(c => c.id === id ? fromApi(item) : c))),
    ).subscribe();
  }

  crear(data: Omit<Comunicado, 'id' | 'leidos'>) {
    const payload = {
      titulo: data.titulo,
      cuerpo: data.cuerpo,
      tipo: data.tipo,
      destinatarios: data.destinatarios,
      prioridad: data.prioridad,
      habilitado: data.habilitado,
      fechaPublicacion: displayToIso(data.fechaPublicacion),
      fechaVencimiento: data.fechaVencimiento ? displayToIso(data.fechaVencimiento) : undefined,
    };
    this.http.post<ApiAnnouncement>(this.base, payload).pipe(
      tap(item => this.comunicados.update(list => [fromApi(item), ...list])),
    ).subscribe();
  }

  actualizar(id: number, data: Partial<Omit<Comunicado, 'id'>>) {
    const payload: Partial<ApiAnnouncement> = {};
    if (data.titulo !== undefined) payload.titulo = data.titulo;
    if (data.cuerpo !== undefined) payload.cuerpo = data.cuerpo;
    if (data.tipo !== undefined) payload.tipo = data.tipo;
    if (data.destinatarios !== undefined) payload.destinatarios = data.destinatarios;
    if (data.prioridad !== undefined) payload.prioridad = data.prioridad;
    if (data.habilitado !== undefined) payload.habilitado = data.habilitado;
    if (data.fechaPublicacion !== undefined) payload.fechaPublicacion = displayToIso(data.fechaPublicacion);
    if (data.fechaVencimiento !== undefined) {
      payload.fechaVencimiento = data.fechaVencimiento ? displayToIso(data.fechaVencimiento) : undefined;
    }
    this.http.patch<ApiAnnouncement>(`${this.base}/${id}`, payload).pipe(
      tap(item => this.comunicados.update(list => list.map(c => c.id === id ? { ...fromApi(item), autor: data.autor ?? c.autor, leidos: c.leidos } : c))),
    ).subscribe();
  }

  eliminar(id: number) {
    this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.comunicados.update(list => list.filter(c => c.id !== id))),
    ).subscribe();
  }
}
