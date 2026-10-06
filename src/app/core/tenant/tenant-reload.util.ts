import { DestroyRef, inject, signal, WritableSignal } from '@angular/core';
import { TenantContextService } from './tenant-context.service';
import { TenantReloadService } from './tenant-reload.service';

export interface TenantReloadOptions {
  /** Signal opcional compartida para coordinar carga inicial. */
  cargaInicial?: WritableSignal<boolean>;
  /** Si true, no ejecuta cargar cuando falta selección SIAGIE. */
  skipWhenRequiresSelection?: boolean;
  /** Se invoca antes de cargar al cambiar IE (p. ej. limpiar UI). */
  onBeforeReload?: () => void;
}

/**
 * Registra recarga automática al cambiar la IE activa (header SIAGIE).
 * Usar en constructor: `setupTenantReload(() => this.cargar());`
 */
export function setupTenantReload(
  cargar: () => void,
  options: TenantReloadOptions = {},
): WritableSignal<boolean> {
  const tenant = inject(TenantContextService);
  const reloadBus = inject(TenantReloadService);
  const destroyRef = inject(DestroyRef);
  const cargaInicial = options.cargaInicial ?? signal(false);

  const unregister = reloadBus.register(() => {
    if (!cargaInicial()) return;
    options.onBeforeReload?.();
    if (options.skipWhenRequiresSelection !== false && tenant.requiresSelection()) return;
    cargar();
  });

  destroyRef.onDestroy(unregister);

  return cargaInicial;
}

/** Marca listo para reaccionar a cambios de IE tras la primera carga. */
export function markTenantReloadReady(cargaInicial: WritableSignal<boolean>): void {
  cargaInicial.set(true);
}
