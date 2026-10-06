import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';

/** Redirige /traslados a la primera sección disponible según permisos del usuario. */
export const trasladosDefaultGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAdmin() || auth.hasAnyPermiso('traslados.solicitar')) {
    return router.createUrlTree(['/traslados/solicitar']);
  }
  if (auth.hasAnyPermiso('traslados.aprobar_destino')) {
    return router.createUrlTree(['/traslados/recibidos']);
  }
  if (auth.hasAnyPermiso('traslados.resolver')) {
    return router.createUrlTree(['/traslados/supervision']);
  }
  return router.createUrlTree(['/traslados/solicitar']);
};
