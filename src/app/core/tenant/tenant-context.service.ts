import { Injectable, Injector, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { TENANT_INSTITUTION_STORAGE_KEY } from './tenant.constants';

export interface ActiveInstitutionMeta {
  label?: string;
}

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  /** Lazy: evita ciclo AuthService → GradingConfig → TenantReload → TenantContext → Auth. */
  private get auth(): AuthService {
    return this.injector.get(AuthService);
  }

  private readonly _activeInstitutionId = signal<number | null>(this.loadStored());
  private readonly _activeInstitutionLabel = signal<string | null>(null);

  /** IE elegida por SIAGIE (persistida en localStorage). */
  readonly activeInstitutionId = this._activeInstitutionId.asReadonly();
  readonly activeInstitutionLabel = this._activeInstitutionLabel.asReadonly();

  /** IE efectiva para requests: asignación del usuario IE o selección SIAGIE. */
  readonly effectiveInstitutionId = computed(() => {
    if (this.auth.isSiagie()) {
      return this._activeInstitutionId();
    }
    return this.auth.institutionId();
  });

  readonly canSelectInstitution = computed(() => this.auth.isSiagie());

  readonly requiresSelection = computed(
    () => this.auth.isSiagie() && this._activeInstitutionId() == null,
  );

  /** Incrementa al cambiar IE activa (interceptor + recargas registradas). */
  readonly changeToken = signal(0);

  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this._activeInstitutionId.set(null);
        this._activeInstitutionLabel.set(null);
        this.persist(null);
      }
    });
  }

  setActiveInstitutionId(id: number | null, meta?: ActiveInstitutionMeta): void {
    const normalized =
      id != null && Number.isInteger(id) && id > 0 ? id : null;
    const prev = this._activeInstitutionId();
    if (meta?.label?.trim()) {
      this._activeInstitutionLabel.set(meta.label.trim());
    } else if (normalized == null) {
      this._activeInstitutionLabel.set(null);
    }
    if (prev === normalized) return;

    this._activeInstitutionId.set(normalized);
    this.persist(normalized);
    this.changeToken.update((v) => v + 1);
    this.reloadActiveRoute();
  }

  clear(): void {
    this.setActiveInstitutionId(null);
  }

  /** Recrea la ruta activa para que ngOnInit vuelva a cargar datos con la nueva IE. */
  private reloadActiveRoute(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = this.changeToken();
    const tree = this.router.parseUrl(this.router.url);
    tree.queryParams = {
      ...tree.queryParams,
      _tenant: String(token),
    };
    void this.router.navigateByUrl(tree, {
      replaceUrl: true,
      onSameUrlNavigation: 'reload',
    });
  }

  private loadStored(): number | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(TENANT_INSTITUTION_STORAGE_KEY);
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private persist(id: number | null): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (id == null) {
      localStorage.removeItem(TENANT_INSTITUTION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(TENANT_INSTITUTION_STORAGE_KEY, String(id));
  }
}
