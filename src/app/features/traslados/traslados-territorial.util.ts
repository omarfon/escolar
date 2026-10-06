import { AuthService } from '../../core/auth/services/auth.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

/** Indica si falta contexto territorial/institucional para operar traslados. */
export function trasladosRequiereSeleccionInstitucion(
  auth: AuthService,
  tenant: TenantContextService,
): boolean {
  if (auth.isSiagie()) {
    return tenant.requiresSelection();
  }
  if (!auth.hasAnyPermiso('traslados.resolver')) {
    return false;
  }
  if (auth.hasTerritorialAssignmentScope()) {
    return false;
  }
  return tenant.effectiveInstitutionId() == null;
}

export function mensajeSeleccionInstitucionTraslados(): string {
  return 'Seleccione una institución educativa en el encabezado o configure su ámbito UGEL/DRE.';
}
