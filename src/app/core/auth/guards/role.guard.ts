import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

function redirectSinPermiso(): ReturnType<Router['createUrlTree']> {
  return inject(Router).createUrlTree(['/sin-permiso']);
}

/** Redirige al home correcto sin volver al portal que se intentó abrir. */
function redirectHomeForUser(): ReturnType<Router['createUrlTree']> {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }
  return router.createUrlTree([auth.defaultHomeRoute()]);
}

/** Acceso al dashboard según permiso en BD (p. ej. dashboard.ver). */
export const dashboardGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isPortalPadre()) {
    return router.createUrlTree(['/portal-padre/inicio']);
  }
  if (auth.isPortalEstudiante()) {
    return router.createUrlTree(['/portal-estudiante/inicio']);
  }
  if (auth.isPortalDocente()) {
    return router.createUrlTree(['/portal-docente/inicio']);
  }
  if (!auth.hasAnyPermiso('dashboard.ver')) {
    return router.createUrlTree(['/sin-permiso']);
  }
  return true;
};

/** Bloquea módulos administrativos a roles de portal (docente, estudiante, padre). */
export const staffAreaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAdmin()) return true;
  if (auth.isPortalDocente() || auth.isPortalEstudiante() || auth.isPortalPadre()) {
    return redirectSinPermiso();
  }
  return true;
};

/** Acceso exclusivo al portal docente (solo docente puro, no staff). */
export const portalDocenteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isPortalDocente() ? true : redirectHomeForUser();
};

/** Acceso exclusivo al portal estudiante (solo alumno puro, no staff). */
export const portalEstudianteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isPortalEstudiante() ? true : redirectHomeForUser();
};

/** Acceso exclusivo al portal padre (solo apoderado puro, no staff). */
export const portalPadreGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isPortalPadre() ? true : redirectHomeForUser();
};

/** Requiere al menos uno de los roles indicados */
export const roleGuard = (...roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  if (!roles.length) return true;
  return auth.hasRole(...roles) ? true : redirectSinPermiso();
};

/** Requiere al menos uno de los permisos indicados */
export const permisoGuard = (...permisos: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  if (!permisos.length) return true;
  if (auth.isAdmin() || auth.hasRole('DIRECTOR')) return true;
  return auth.hasAnyPermiso(...permisos) ? true : redirectSinPermiso();
};

/** Requiere todos los permisos indicados */
export const permisoAllGuard = (...permisos: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  if (!permisos.length) return true;
  return auth.hasPermiso(...permisos) ? true : redirectSinPermiso();
};
