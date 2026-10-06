import { Injectable, inject, signal } from '@angular/core';
import {
  AssociateStudentsPayload,
  RepresentativeLinksApiService,
  RepresentativeLookupResponse,
} from '../../../core/api/representative-links-api.service';

@Injectable({ providedIn: 'root' })
export class RepresentanteVinculosService {
  private readonly api = inject(RepresentativeLinksApiService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lookup = signal<RepresentativeLookupResponse | null>(null);

  setLookup(value: RepresentativeLookupResponse | null): void {
    this.lookup.set(value);
  }

  loadContext() {
    return this.api.getContext();
  }

  buscarPorDocumento(tipoDocumento: string, numeroDocumento: string) {
    this.loading.set(true);
    this.error.set(null);
    return this.api.findByDocument(tipoDocumento, numeroDocumento);
  }

  asociar(payload: AssociateStudentsPayload) {
    this.saving.set(true);
    this.error.set(null);
    return this.api.associate(payload);
  }

  actualizarVinculo(
    id: number,
    payload: { tipoVinculo?: string; esPrincipal?: boolean; motivo: string },
  ) {
    this.saving.set(true);
    this.error.set(null);
    return this.api.updateLink(id, payload);
  }

  cesarVinculo(id: number, motivo: string) {
    this.saving.set(true);
    this.error.set(null);
    return this.api.ceaseLink(id, motivo);
  }

  cargarAuditoria(representativeId?: number) {
    return this.api.getAudit({ representativeId, limit: 50 });
  }
}
