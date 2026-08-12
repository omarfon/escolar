import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiStudentMe } from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/services/auth.service';
import { Nivel } from '../../academico/horarios/models/horario.model';

export interface PerfilEstudiantePortal {
  studentId: number;
  nombres: string;
  apellidos: string;
  email: string;
  dni: string;
  nivel: Nivel;
  grado: string;
  gradoLabel: string;
  seccion: string;
  aulaLabel: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class PortalEstudianteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiUrl}/students`;

  private readonly _perfil = signal<PerfilEstudiantePortal | null>(null);
  private readonly _error = signal<string | null>(null);
  readonly perfil = this._perfil.asReadonly();
  readonly error = this._error.asReadonly();
  readonly loading = signal(false);

  readonly studentId = computed(() => this._perfil()?.studentId ?? null);

  private loadRequest$: Observable<PerfilEstudiantePortal | null> | null = null;

  constructor() {
    if (this.auth.isAuthenticated() && this.auth.isPortalEstudiante()) {
      this.load().subscribe();
    }
  }

  load(): Observable<PerfilEstudiantePortal | null> {
    if (this._perfil()) {
      return of(this._perfil());
    }
    if (this.loadRequest$) {
      return this.loadRequest$;
    }

    this.loading.set(true);
    this._error.set(null);

    this.loadRequest$ = this.http.get<ApiStudentMe>(`${this.base}/me`).pipe(
      map(api => this.mapPerfil(api)),
      tap(perfil => this._perfil.set(perfil)),
      catchError(() => {
        this._error.set('No se pudo cargar tu perfil académico');
        this._perfil.set(null);
        return of(null);
      }),
      finalize(() => this.loading.set(false)),
      shareReplay(1),
    );

    return this.loadRequest$;
  }

  ensureLoaded(): Observable<PerfilEstudiantePortal | null> {
    const current = this._perfil();
    if (current) return of(current);
    return this.load();
  }

  getStudentId(): number | null {
    return this.studentId();
  }

  getStudentIdString(): string {
    return String(this.studentId() ?? '');
  }

  getPerfilOrNull(): PerfilEstudiantePortal | null {
    return this._perfil();
  }

  private mapPerfil(api: ApiStudentMe): PerfilEstudiantePortal {
    return {
      studentId: api.id,
      nombres: api.nombres,
      apellidos: api.apellidos,
      email: api.email,
      dni: api.dni,
      nivel: api.nivel as Nivel,
      grado: api.grado,
      gradoLabel: api.gradoLabel,
      seccion: api.seccion,
      aulaLabel: api.aulaLabel,
      activo: api.activo,
    };
  }
}
