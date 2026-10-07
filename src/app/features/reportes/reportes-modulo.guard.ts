import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { REPORTES_NAV_ITEMS } from './reportes-nav.model';

function puedeVerReporte(auth: AuthService, permisos: string[]): boolean {
  if (auth.isAdmin() || auth.hasRole('DIRECTOR')) return true;
  return auth.hasAnyPermiso(...permisos);
}

/** Valida /reportes/:modulo y redirige si el módulo no existe o no hay permiso. */
export const reportesModuloGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const modulo = String(route.paramMap.get('modulo') ?? '');

  const item = REPORTES_NAV_ITEMS.find((entry) => entry.id === modulo);
  if (!item || !puedeVerReporte(auth, item.permisos)) {
    return router.createUrlTree(['/sin-permiso']);
  }

  return true;
};
