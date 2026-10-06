import { HttpParams } from '@angular/common/http';
import { TenantContextService } from './tenant-context.service';

/** Añade `institutionId` a query params cuando hay IE efectiva. */
export function withInstitutionParams(
  tenant: TenantContextService,
  params: HttpParams = new HttpParams(),
): HttpParams {
  const id = tenant.effectiveInstitutionId();
  if (id != null && id > 0) {
    return params.set('institutionId', String(id));
  }
  return params;
}
