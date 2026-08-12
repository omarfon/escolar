import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { AuthService } from '../../core/auth/services/auth.service';
import { DocenteDetail } from '../matricula/maestros/docentes/docentes.model';
import {
  mapMiAulaToDocenteDetail,
  PortalDocenteMiAulaResponse,
} from './portal-docente.model';

@Injectable({ providedIn: 'root' })
export class PortalDocenteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiBase = `${environment.apiUrl}/maestros/docentes/me`;

  private readonly _miAula = signal<PortalDocenteMiAulaResponse | null>(null);
  private loadRequest$: Observable<PortalDocenteMiAulaResponse | null> | null = null;

  readonly miAula = this._miAula.asReadonly();
  readonly docenteId = computed(() => this._miAula()?.docente.id ?? null);
  readonly hasPerfil = computed(() => this.docenteId() != null);
  readonly perfilError = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadingPerfil = signal(false);
  readonly savingPerfil = signal(false);

  constructor() {
    if (this.auth.isAuthenticated() && this.auth.isPortalDocente()) {
      this.ensureLoaded().subscribe();
    }
  }

  ensureLoaded(anioEscolar?: number): Observable<PortalDocenteMiAulaResponse | null> {
    if (this._miAula()) {
      return of(this._miAula());
    }
    if (this.loadRequest$) {
      return this.loadRequest$;
    }

    this.loading.set(true);
    this.perfilError.set(null);

    this.loadRequest$ = this.fetchMiAula(anioEscolar).pipe(
      tap((res) => this._miAula.set(res)),
      catchError((err) => {
        const msg = err?.error?.message;
        this.perfilError.set(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se encontró un perfil docente vinculado a tu usuario',
        );
        this._miAula.set(null);
        return of(null);
      }),
      finalize(() => this.loading.set(false)),
      shareReplay(1),
    );

    return this.loadRequest$;
  }

  loadMiAula(anioEscolar?: number): Observable<PortalDocenteMiAulaResponse> {
    this.loading.set(true);
    return this.fetchMiAula(anioEscolar).pipe(
      tap((res) => this._miAula.set(res)),
      catchError((err) => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  loadMisDatos(anioEscolar?: number): Observable<DocenteDetail> {
    this.loadingPerfil.set(true);
    let params = new HttpParams();
    if (anioEscolar) params = params.set('anioEscolar', anioEscolar);

    return this.http.get<DocenteDetail>(`${this.apiBase}/perfil`, { params }).pipe(
      catchError(() =>
        this.fetchMiAula(anioEscolar).pipe(
          map((aula) => mapMiAulaToDocenteDetail(aula, this.auth.currentUser())),
        ),
      ),
      finalize(() => this.loadingPerfil.set(false)),
    );
  }

  updateMiPerfil(
    payload: { telefono: string; direccion: string },
    anioEscolar?: number,
  ): Observable<DocenteDetail> {
    this.savingPerfil.set(true);
    let params = new HttpParams();
    if (anioEscolar) params = params.set('anioEscolar', anioEscolar);

    return this.http.patch<DocenteDetail>(`${this.apiBase}/perfil`, payload, { params }).pipe(
      finalize(() => this.savingPerfil.set(false)),
    );
  }

  private fetchMiAula(anioEscolar?: number): Observable<PortalDocenteMiAulaResponse> {
    let params = new HttpParams();
    if (anioEscolar) params = params.set('anioEscolar', anioEscolar);
    return this.http.get<PortalDocenteMiAulaResponse>(`${this.apiBase}/mi-aula`, { params });
  }
}
