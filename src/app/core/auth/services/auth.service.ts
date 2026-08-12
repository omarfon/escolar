import { inject, Injectable, signal, computed, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap, catchError, throwError, timer, Subscription, map } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import {
  LoginRequest, LoginResponse, AuthUser,
  TokenPayload, ChangePasswordRequest,
  ForgotPasswordRequest, ResetPasswordRequest, RefreshTokenRequest
} from '../models/auth.model';
import { environment } from '@environments/environment';
import { GradingConfigService } from '../../grading/grading-config.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http       = inject(HttpClient);
  private readonly router     = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly gradingConfig = inject(GradingConfigService);
  private readonly API        = `${environment.apiUrl}/auth`;

  // ── Signals ────────────────────────────────────────────
  private readonly _user    = signal<AuthUser | null>(this._loadUser());
  private readonly _token   = signal<string | null>(this._loadToken());
  private readonly _loading = signal(false);
  private readonly _error   = signal<string | null>(null);

  readonly currentUser      = this._user.asReadonly();
  readonly accessToken      = this._token.asReadonly();
  readonly isLoading        = this._loading.asReadonly();
  readonly error            = this._error.asReadonly();
  readonly isAuthenticated  = computed(() => !!this._user() && !!this._token());
  readonly userRoles        = computed(() => this._user()?.roles.map(r => r.codigo) ?? []);
  readonly permisos         = computed(() => this._user()?.permisos ?? []);
  readonly nombreCompleto   = computed(() => {
    const u = this._user();
    return u ? `${u.nombre} ${u.apellido}` : '';
  });

  private refreshTimer?: Subscription;

  // ── Acciones ───────────────────────────────────────────
  login(req: LoginRequest): Observable<LoginResponse> {
    this._loading.set(true);
    this._error.set(null);
    return this.http.post<LoginResponse>(`${this.API}/login`, req).pipe(
      tap(res => {
        this._setSession(res);
        this._scheduleRefresh(res.expiresIn);
        this.gradingConfig.load().subscribe();
        this._loading.set(false);
      }),
      catchError(err => {
        this._loading.set(false);
        const msg = 'Credenciales inválidas. Verifica usuario y contraseña.';
        this._error.set(msg);
        return throwError(() => err);
      }),
    );
  }

  logout(redirect = true): void {
    this._clearSession();
    if (redirect) this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<LoginResponse> {
    const rt = this._loadRefreshToken();
    if (!rt) {
      if (this.isAuthenticated()) this.logout();
      return throwError(() => new Error('No refresh token'));
    }
    return this.http.post<LoginResponse>(`${this.API}/refresh`, { refreshToken: rt } as RefreshTokenRequest).pipe(
      tap(res => { this._setSession(res); this._scheduleRefresh(res.expiresIn); this.gradingConfig.load().subscribe(); }),
      catchError(err => { this.logout(); return throwError(() => err); })
    );
  }

  /** Recarga roles y permisos desde la BD (tabla role_permissions). */
  syncSessionFromServer(): Observable<AuthUser> {
    return this.http.get<{ user: AuthUser }>(`${this.API}/me`).pipe(
      map(res => res.user),
      tap(user => {
        if (!isPlatformBrowser(this.platformId)) return;
        localStorage.setItem('current_user', JSON.stringify(user));
        this._user.set(user);
      }),
      catchError(err => throwError(() => err)),
    );
  }

  changePassword(req: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.API}/change-password`, req);
  }
  forgotPassword(req: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.API}/forgot-password`, req);
  }
  resetPassword(req: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.API}/reset-password`, req);
  }

  // ── Helpers de autorización ────────────────────────────
  hasRole(...roles: string[]): boolean   { return roles.some(r => this.userRoles().includes(r as any)); }
  hasPermiso(...p: string[]): boolean    { return p.every(x => this.permisos().includes(x)); }
  hasAnyPermiso(...p: string[]): boolean { return p.some(x => this.permisos().includes(x)); }

  readonly isAdmin = computed(() =>
    this._user()?.esAdmin === true || this.userRoles().includes('ADMIN'),
  );
  readonly isStaffUser = computed(() =>
    this.userRoles().some(r =>
      ['ADMIN', 'DIRECTOR', 'SECRETARIA', 'TESORERO', 'BIBLIOTECARIO'].includes(r),
    ),
  );
  readonly isPortalDocente = computed(() =>
    this.userRoles().includes('DOCENTE') && !this.isStaffUser(),
  );
  readonly isPortalEstudiante = computed(() =>
    this.userRoles().includes('ESTUDIANTE') && !this.isStaffUser(),
  );
  readonly isPortalPadre = computed(() =>
    this.userRoles().includes('PADRE') && !this.isStaffUser(),
  );

  /** Ruta inicial según rol (después del login). */
  defaultHomeRoute(): string {
    if (this.isPortalDocente()) return '/portal-docente/inicio';
    if (this.isPortalEstudiante()) return '/portal-estudiante/inicio';
    if (this.isPortalPadre()) return '/portal-padre/inicio';
    if (this.isAdmin() || this.hasRole('DIRECTOR')) return '/dashboard';
    if (this.hasRole('SECRETARIA')) return '/matricula/matriculados';
    if (this.hasRole('TESORERO')) return '/tesoreria/pagos';
    if (this.hasRole('BIBLIOTECARIO')) return '/biblioteca/catalogo';
    return '/dashboard';
  }

  canSeeNavZone(zone?: 'staff' | 'portal-docente' | 'portal-estudiante' | 'portal-padre' | 'shared'): boolean {
    // shared (p. ej. Dashboard): lo define el permiso en el ítem del menú, no el rol portal
    if (!zone || zone === 'shared') {
      return true;
    }
    if (zone === 'staff') {
      if (this.isPortalDocente() || this.isPortalEstudiante() || this.isPortalPadre()) return false;
      return true;
    }
    if (zone === 'portal-docente') return this.isPortalDocente();
    if (zone === 'portal-estudiante') return this.isPortalEstudiante();
    if (zone === 'portal-padre') return this.isPortalPadre();
    return true;
  }

  isTokenExpired(): boolean {
    const token = this._token();
    if (!token) return true;
    try {
      const { exp } = jwtDecode<TokenPayload>(token);
      return Date.now() >= exp * 1000;
    } catch { return true; }
  }

  // ── Privados ───────────────────────────────────────────
  private _setSession(res: LoginResponse): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem('access_token',  res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    localStorage.setItem('current_user',  JSON.stringify(res.user));
    this._token.set(res.accessToken);
    this._user.set(res.user);
  }

  private _clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('current_user');
    }
    this._token.set(null);
    this._user.set(null);
    this.gradingConfig.reset();
    this.refreshTimer?.unsubscribe();
  }

  private _loadUser(): AuthUser | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try { return JSON.parse(localStorage.getItem('current_user') ?? 'null'); } catch { return null; }
  }
  private _loadToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem('access_token') : null;
  }
  private _loadRefreshToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem('refresh_token') : null;
  }

  private _scheduleRefresh(expiresIn: number): void {
    this.refreshTimer?.unsubscribe();
    const ms = (expiresIn - environment.tokenExpirationWarning) * 1000;
    if (ms > 0) this.refreshTimer = timer(ms).subscribe(() => this.refreshToken().subscribe());
  }
}
