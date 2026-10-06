import { Component, inject } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';
import { TenantContextService } from '../../../tenant/tenant-context.service';

@Component({
  selector: 'app-tenant-scope-banner',
  standalone: true,
  template: `
    @if (auth.isSiagie() && tenant.requiresSelection()) {
      <div
        class="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900 shrink-0"
        role="status">
        Seleccione una institución educativa en la barra superior. Todo el sistema operará en el contexto de esa IE.
      </div>
    }
    @if (auth.isSiagie() && tenant.activeInstitutionId(); as ieId) {
      <div
        class="bg-indigo-50 border-b border-indigo-100 px-4 py-1.5 text-xs text-indigo-800 shrink-0 flex items-center gap-2"
        role="status">
        <span class="icon icon-sm text-indigo-600">school</span>
        <span>
          Contexto activo:
          <strong>{{ tenant.activeInstitutionLabel() ?? ('Institución #' + ieId) }}</strong>
          — alumnos, matrículas, asistencia y demás datos corresponden a esta IE.
        </span>
      </div>
    }
  `,
})
export class TenantScopeBannerComponent {
  readonly auth = inject(AuthService);
  readonly tenant = inject(TenantContextService);
}
