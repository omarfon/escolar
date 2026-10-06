import { effect, inject, Injectable } from '@angular/core';
import { TenantContextService } from './tenant-context.service';

export type TenantReloadHandler = () => void;

/**
 * Bus central de recarga al cambiar la IE activa (SIAGIE).
 * - `registerGlobalReset`: limpia cachés singleton (ExpedientesService, etc.)
 * - `register`: recarga pantallas activas que usan setupTenantReload
 */
@Injectable({ providedIn: 'root' })
export class TenantReloadService {
  private readonly tenant = inject(TenantContextService);
  private readonly handlers = new Set<TenantReloadHandler>();
  private readonly globalResets = new Set<TenantReloadHandler>();

  constructor() {
    effect(() => {
      const token = this.tenant.changeToken();
      const ie = this.tenant.effectiveInstitutionId();
      if (token === 0) return;
      void ie;
      queueMicrotask(() => this.dispatch());
    });
  }

  /** Limpia estado en memoria de servicios compartidos antes de recargar vistas. */
  registerGlobalReset(handler: TenantReloadHandler): () => void {
    this.globalResets.add(handler);
    return () => this.globalResets.delete(handler);
  }

  register(handler: TenantReloadHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private dispatch(): void {
    for (const reset of [...this.globalResets]) {
      try {
        reset();
      } catch {
        /* noop */
      }
    }
    for (const handler of [...this.handlers]) {
      try {
        handler();
      } catch {
        /* noop */
      }
    }
  }
}
