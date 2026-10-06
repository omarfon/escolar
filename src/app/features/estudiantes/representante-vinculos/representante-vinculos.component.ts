import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import {
  RepresentativeLinksContext,
  RepresentativeLinkLog,
  RepresentativeLinkResponse,
  RepresentativeResponse,
} from '../../../core/api/representative-links-api.service';
import { ExpedientesService } from '../services/expedientes.service';
import { RepresentanteVinculosService } from './representante-vinculos.service';

@Component({
  selector: 'app-representante-vinculos',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Vínculos representante — estudiantes</h2>
          @if (context(); as ctx) {
            <p class="text-sm text-gray-500 mt-0.5">
              {{ ctx.institucion.nombre }} · {{ ctx.institucion.anioEscolar }}
            </p>
          }
        </div>
        <button class="btn btn-secondary btn-sm" (click)="recargar()" [disabled]="svc.loading() || svc.saving()">
          <span class="icon icon-sm">refresh</span> Actualizar
        </button>
      </div>

      <!-- Búsqueda por documento -->
      <div class="card p-4">
        <h3 class="font-semibold text-gray-900 mb-3">1. Buscar representante por documento</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="form-label mb-1 block">Tipo documento</label>
            <select class="form-select" [(ngModel)]="tipoDocumento">
              <option value="DNI">DNI</option>
              <option value="CE">CE</option>
              <option value="PAS">Pasaporte</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block">Número de documento</label>
            <div class="flex gap-2">
              <input class="form-input flex-1" [(ngModel)]="numeroDocumento" placeholder="Ej: 12345678"
                (keyup.enter)="buscarRepresentante()" />
              <button class="btn btn-primary" (click)="buscarRepresentante()" [disabled]="svc.loading()">
                <span class="icon icon-sm">search</span> Buscar
              </button>
            </div>
          </div>
        </div>
        @if (busquedaError()) {
          <p class="text-sm text-red-600 mt-3" role="alert">{{ busquedaError() }}</p>
        }
        @if (sugeridoExpediente()) {
          <p class="text-sm text-amber-700 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Datos sugeridos desde expedientes existentes. Confirme y complete antes de asociar.
          </p>
        }
      </div>

      @if (representante(); as rep) {
        <!-- Datos representante -->
        <div class="card p-4">
          <h3 class="font-semibold text-gray-900 mb-3">2. Datos del representante</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label class="form-label mb-1 block">Nombres *</label>
              <input class="form-input" [(ngModel)]="formRep.nombres" />
            </div>
            <div>
              <label class="form-label mb-1 block">Apellidos</label>
              <input class="form-input" [(ngModel)]="formRep.apellidos" />
            </div>
            <div>
              <label class="form-label mb-1 block">Email</label>
              <input class="form-input" type="email" [(ngModel)]="formRep.email" />
            </div>
            <div>
              <label class="form-label mb-1 block">Teléfono</label>
              <input class="form-input" [(ngModel)]="formRep.telefono" />
            </div>
            <div>
              <label class="form-label mb-1 block">Documento</label>
              <input class="form-input bg-gray-50" [value]="rep.tipoDocumento + ' ' + rep.numeroDocumento" readonly />
            </div>
          </div>
        </div>

        <!-- Asociar estudiantes -->
        @if (puedeGestionar()) {
          <div class="card p-4">
            <h3 class="font-semibold text-gray-900 mb-3">3. Asociar estudiantes</h3>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
              <div>
                <label class="form-label mb-1 block">Tipo de vínculo</label>
                <select class="form-select" [(ngModel)]="tipoVinculo">
                  @for (t of tiposVinculo(); track t) {
                    <option [value]="t">{{ vinculoLabel(t) }}</option>
                  }
                </select>
              </div>
              <div class="flex items-end">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 pb-2">
                  <input type="checkbox" class="form-checkbox" [(ngModel)]="esPrincipal" />
                  Responsable principal
                </label>
              </div>
              <div>
                <label class="form-label mb-1 block">Motivo *</label>
                <input class="form-input" [(ngModel)]="motivoAsociacion" placeholder="Motivo de la asociación" />
              </div>
            </div>

            <div class="relative mb-3">
              <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">search</span>
              <input class="form-input pl-10" placeholder="Filtrar estudiantes por nombre, código o DNI..."
                [(ngModel)]="filtroEstudiantes" />
            </div>

            <div class="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              @for (e of estudiantesFiltrados(); track e.id) {
                <label class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" class="form-checkbox"
                    [checked]="seleccionados().has(e.id)"
                    (change)="toggleEstudiante(e.id)" />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">{{ e.apellidos }}, {{ e.nombres }}</div>
                    <div class="text-xs text-gray-500">{{ e.codigo }} · {{ e.grado }} {{ e.seccion }}</div>
                  </div>
                  @if (yaVinculado(e.id)) {
                    <span class="badge badge-amber text-[10px]">Ya vinculado</span>
                  }
                </label>
              } @empty {
                <p class="text-sm text-gray-500 p-4 text-center">No hay estudiantes para mostrar.</p>
              }
            </div>

            <div class="flex flex-wrap gap-2 mt-4">
              <button class="btn btn-primary" (click)="asociarEstudiantes()"
                [disabled]="svc.saving() || !puedeAsociar()">
                <span class="icon icon-sm">link</span>
                {{ svc.saving() ? 'Guardando…' : 'Asociar seleccionados (' + seleccionados().size + ')' }}
              </button>
            </div>
            @if (mensajeOk()) {
              <p class="text-sm text-green-700 mt-3" role="status">{{ mensajeOk() }}</p>
            }
            @if (mensajeError()) {
              <p class="text-sm text-red-600 mt-3" role="alert">{{ mensajeError() }}</p>
            }
          </div>
        } @else {
          <div class="card p-4 text-sm text-gray-600">
            Su rol puede consultar vínculos pero no registrarlos ni modificarlos.
          </div>
        }

        <!-- Vínculos activos -->
        <div class="card overflow-hidden">
          <div class="px-4 py-3 border-b bg-gray-50 font-semibold text-gray-900">Vínculos activos</div>
          @if (!vinculosActivos().length) {
            <p class="p-6 text-sm text-gray-500 text-center">Sin vínculos activos para este representante.</p>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Vínculo</th>
                  <th class="text-center">Principal</th>
                  <th>Vigencia</th>
                  @if (puedeGestionar()) { <th class="text-center">Acciones</th> }
                </tr>
              </thead>
              <tbody>
                @for (v of vinculosActivos(); track v.id) {
                  <tr>
                    <td>
                      <div class="font-medium text-sm">{{ v.student?.apellidos }}, {{ v.student?.nombres }}</div>
                      <div class="text-xs text-gray-500">{{ v.student?.codigo }} · {{ v.student?.gradoLabel }}</div>
                    </td>
                    <td><span class="badge badge-blue text-[10px]">{{ vinculoLabel(v.tipoVinculo) }}</span></td>
                    <td class="text-center">
                      @if (v.esPrincipal) { <span class="badge badge-green text-[10px]">Sí</span> }
                      @else { <span class="text-gray-400 text-xs">—</span> }
                    </td>
                    <td class="text-xs text-gray-600">Desde {{ formatFecha(v.vigenciaDesde) }}</td>
                    @if (puedeGestionar()) {
                      <td class="text-center">
                        <div class="flex items-center justify-center gap-1">
                          <button class="btn btn-ghost btn-xs text-indigo-600" (click)="iniciarEdicion(v)">
                            Editar
                          </button>
                          <button class="btn btn-ghost btn-xs text-red-600" (click)="iniciarCese(v.id)">
                            Cesar
                          </button>
                        </div>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        @if (vinculosHistoricos().length) {
          <div class="card overflow-hidden">
            <div class="px-4 py-3 border-b bg-gray-50 font-semibold text-gray-900">Historial de vínculos</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Vínculo</th>
                  <th>Vigencia</th>
                  <th>Motivo cese</th>
                </tr>
              </thead>
              <tbody>
                @for (v of vinculosHistoricos(); track v.id) {
                  <tr class="text-gray-600">
                    <td>{{ v.student?.apellidos }}, {{ v.student?.nombres }}</td>
                    <td>{{ v.tipoVinculo }}</td>
                    <td class="text-xs">{{ formatFecha(v.vigenciaDesde) }} — {{ formatFecha(v.vigenciaHasta) }}</td>
                    <td class="text-xs">{{ v.motivoCese || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Auditoría -->
        <div class="card overflow-hidden">
          <div class="px-4 py-3 border-b bg-gray-50 font-semibold text-gray-900">Auditoría de vínculos</div>
          @if (!auditoria().length) {
            <p class="p-6 text-sm text-gray-500 text-center">Sin registros de auditoría.</p>
          } @else {
            <div class="divide-y divide-gray-100">
              @for (a of auditoria(); track a.id) {
                <div class="px-4 py-3 text-sm">
                  <div class="flex flex-wrap gap-2 mb-1">
                    <span class="font-medium">{{ accionLabel(a.accion) }}</span>
                    <span class="badge text-[10px]" [ngClass]="a.resultado === 'success' ? 'badge-green' : 'badge-red'">
                      {{ a.resultado }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-600">{{ a.actorNombre }} · {{ a.motivo }}</p>
                  <p class="text-xs text-gray-400">{{ formatFechaHora(a.createdAt) }}</p>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (editarVinculo(); as v) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="card w-full max-w-md p-5 space-y-4" role="dialog" aria-modal="true"
            aria-labelledby="editar-vinculo-title">
            <h3 id="editar-vinculo-title" class="font-semibold text-gray-900">Editar vínculo</h3>
            <p class="text-sm text-gray-600">
              {{ v.student?.apellidos }}, {{ v.student?.nombres }}
              · {{ v.student?.codigo }}
            </p>
            <div>
              <label class="form-label mb-1 block">Tipo de vínculo</label>
              <select class="form-select" [(ngModel)]="editForm.tipoVinculo">
                @for (t of tiposVinculo(); track t) {
                  <option [value]="t">{{ vinculoLabel(t) }}</option>
                }
              </select>
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" class="form-checkbox" [(ngModel)]="editForm.esPrincipal" />
              Responsable principal
            </label>
            <div>
              <label class="form-label mb-1 block">Motivo del cambio *</label>
              <textarea class="form-input min-h-[4rem]" rows="2" [(ngModel)]="editForm.motivo"
                placeholder="Ej: Cambio de apoderado principal por solicitud familiar"></textarea>
              @if (editForm.motivo.trim().length > 0 && editForm.motivo.trim().length < 3) {
                <p class="form-error mt-1">El motivo debe tener al menos 3 caracteres.</p>
              }
            </div>
            @if (!hayCambiosEdicion()) {
              <p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Modifique el tipo de vínculo o la condición de principal para guardar.
              </p>
            }
            <div class="flex gap-2 justify-end">
              <button class="btn btn-secondary" (click)="cancelarEdicion()">Cancelar</button>
              <button class="btn btn-primary"
                [disabled]="!puedeGuardarEdicion() || svc.saving()"
                (click)="confirmarEdicion()">
                {{ svc.saving() ? 'Guardando…' : 'Guardar cambios' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (cesarLinkId()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="card w-full max-w-md p-5 space-y-4" role="dialog" aria-modal="true">
            <h3 class="font-semibold text-gray-900">Cesar vínculo</h3>
            <p class="text-sm text-gray-600">El historial se conservará. Indique el motivo del cese.</p>
            <textarea class="form-input min-h-[4rem]" rows="2" [(ngModel)]="motivoCese"></textarea>
            <div class="flex gap-2 justify-end">
              <button class="btn btn-secondary" (click)="cancelarCese()">Cancelar</button>
              <button class="btn btn-primary bg-red-600 hover:bg-red-700"
                [disabled]="motivoCese.trim().length < 3 || svc.saving()"
                (click)="confirmarCese()">Confirmar cese</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class RepresentanteVinculosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly expedientes = inject(ExpedientesService);
  readonly svc = inject(RepresentanteVinculosService);
  private readonly _tenantReloadReady = setupTenantReload(() => this.recargarContexto(), {
    onBeforeReload: () => this.limpiarUiInstitucion(),
  });

  readonly context = signal<RepresentativeLinksContext | null>(null);
  readonly representante = signal<RepresentativeResponse | null>(null);
  readonly vinculosActivos = signal<RepresentativeLinkResponse[]>([]);
  readonly vinculosHistoricos = signal<RepresentativeLinkResponse[]>([]);
  readonly auditoria = signal<RepresentativeLinkLog[]>([]);
  readonly seleccionados = signal<Set<number>>(new Set());
  readonly busquedaError = signal<string | null>(null);
  readonly mensajeOk = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);
  readonly cesarLinkId = signal<number | null>(null);
  readonly editarVinculo = signal<RepresentativeLinkResponse | null>(null);

  tipoDocumento = 'DNI';
  numeroDocumento = '';
  filtroEstudiantes = '';
  tipoVinculo = 'apoderado';
  esPrincipal = true;
  motivoAsociacion = '';
  motivoCese = '';
  editForm = { tipoVinculo: 'apoderado', esPrincipal: false, motivo: '' };
  formRep = { nombres: '', apellidos: '', email: '', telefono: '' };

  readonly tiposVinculo = computed(
    () => this.context()?.tiposVinculo ?? ['padre', 'madre', 'apoderado', 'otro'],
  );
  readonly sugeridoExpediente = computed(() => this.svc.lookup()?.sugeridoDesdeExpediente ?? false);
  readonly estudiantesFiltrados = computed(() => {
    const q = this.filtroEstudiantes.trim().toLowerCase();
    return this.expedientes.estudiantes().filter((e) => {
      if (!q) return true;
      const hay = `${e.nombres} ${e.apellidos} ${e.codigo} ${e.dni}`.toLowerCase();
      return hay.includes(q);
    });
  });

  ngOnInit(): void {
    this.layout.setTitle('Vínculos representante');
    this.recargarContexto();
    markTenantReloadReady(this._tenantReloadReady);
  }

  private recargarContexto(): void {
    this.expedientes.load({ page: 1, pageSize: 500, immediate: true });
    this.svc.loadContext().subscribe({
      next: (ctx) => this.context.set(ctx),
    });
  }

  private limpiarUiInstitucion(): void {
    this.representante.set(null);
    this.vinculosActivos.set([]);
    this.vinculosHistoricos.set([]);
    this.auditoria.set([]);
    this.seleccionados.set(new Set());
    this.busquedaError.set(null);
    this.mensajeOk.set(null);
    this.mensajeError.set(null);
    this.numeroDocumento = '';
    this.svc.setLookup(null);
  }

  puedeGestionar(): boolean {
    return this.auth.hasAnyPermiso(
      'estudiantes.representantes',
      'estudiantes.editar',
      'matricula.editar',
    );
  }

  recargar(): void {
    if (this.numeroDocumento.trim()) {
      this.buscarRepresentante();
    }
    this.expedientes.load({ page: 1, pageSize: 500, immediate: true });
    this.svc.loadContext().subscribe({
      next: (ctx) => this.context.set(ctx),
    });
  }

  buscarRepresentante(): void {
    const doc = this.numeroDocumento.trim();
    if (!doc) {
      this.busquedaError.set('Ingrese el número de documento');
      return;
    }
    this.busquedaError.set(null);
    this.mensajeOk.set(null);
    this.mensajeError.set(null);
    this.svc.buscarPorDocumento(this.tipoDocumento, doc).subscribe({
      next: (res) => {
        this.svc.setLookup(res);
        this.svc.loading.set(false);
        if (!res.representante) {
          this.representante.set({
            id: null,
            tipoDocumento: this.tipoDocumento,
            numeroDocumento: doc,
            nombres: '',
            apellidos: '',
            apellidoPaterno: '',
            apellidoMaterno: '',
            email: '',
            telefono: '',
            pendienteRegistro: true,
          });
          this.formRep = { nombres: '', apellidos: '', email: '', telefono: '' };
          this.vinculosActivos.set([]);
          this.vinculosHistoricos.set([]);
          this.auditoria.set([]);
          return;
        }
        this.representante.set(res.representante);
        this.formRep = {
          nombres: res.representante.nombres,
          apellidos: res.representante.apellidos,
          email: res.representante.email,
          telefono: res.representante.telefono,
        };
        this.vinculosActivos.set(res.vinculosActivos);
        this.vinculosHistoricos.set(res.vinculosHistoricos);
        this.cargarAuditoria(res.representante.id ?? undefined);
      },
      error: (err) => {
        this.svc.loading.set(false);
        this.busquedaError.set(err?.error?.message ?? 'No se pudo buscar el representante');
      },
    });
  }

  yaVinculado(studentId: number): boolean {
    return this.vinculosActivos().some((v) => v.studentId === studentId);
  }

  toggleEstudiante(id: number): void {
    const next = new Set(this.seleccionados());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.seleccionados.set(next);
  }

  puedeAsociar(): boolean {
    return (
      this.seleccionados().size > 0
      && this.formRep.nombres.trim().length > 0
      && this.motivoAsociacion.trim().length >= 3
    );
  }

  asociarEstudiantes(): void {
    if (!this.puedeAsociar()) return;
    this.mensajeOk.set(null);
    this.mensajeError.set(null);
    this.svc
      .asociar({
        tipoDocumento: this.tipoDocumento,
        numeroDocumento: this.numeroDocumento.trim(),
        representante: { ...this.formRep },
        studentIds: [...this.seleccionados()],
        tipoVinculo: this.tipoVinculo,
        esPrincipal: this.esPrincipal,
        motivo: this.motivoAsociacion.trim(),
      })
      .subscribe({
        next: (res) => {
          this.svc.saving.set(false);
          const omitidos = res.omitidos.length
            ? ` · ${res.omitidos.length} omitido(s)`
            : '';
          this.mensajeOk.set(`Se crearon ${res.creados.length} vínculo(s)${omitidos}.`);
          this.seleccionados.set(new Set());
          this.motivoAsociacion = '';
          this.buscarRepresentante();
        },
        error: (err) => {
          this.svc.saving.set(false);
          this.mensajeError.set(err?.error?.message ?? 'No se pudo completar la asociación');
        },
      });
  }

  iniciarEdicion(v: RepresentativeLinkResponse): void {
    this.cesarLinkId.set(null);
    this.editarVinculo.set(v);
    this.editForm = {
      tipoVinculo: v.tipoVinculo,
      esPrincipal: v.esPrincipal,
      motivo: '',
    };
  }

  cancelarEdicion(): void {
    this.editarVinculo.set(null);
  }

  hayCambiosEdicion(): boolean {
    const v = this.editarVinculo();
    if (!v) return false;
    return (
      this.editForm.tipoVinculo !== v.tipoVinculo
      || this.editForm.esPrincipal !== v.esPrincipal
    );
  }

  puedeGuardarEdicion(): boolean {
    return this.hayCambiosEdicion() && this.editForm.motivo.trim().length >= 3;
  }

  confirmarEdicion(): void {
    const v = this.editarVinculo();
    if (!v || !this.puedeGuardarEdicion()) return;
    this.mensajeOk.set(null);
    this.mensajeError.set(null);
    this.svc
      .actualizarVinculo(v.id, {
        tipoVinculo: this.editForm.tipoVinculo,
        esPrincipal: this.editForm.esPrincipal,
        motivo: this.editForm.motivo.trim(),
      })
      .subscribe({
        next: () => {
          this.svc.saving.set(false);
          this.editarVinculo.set(null);
          this.mensajeOk.set('Vínculo actualizado correctamente.');
          this.buscarRepresentante();
        },
        error: (err) => {
          this.svc.saving.set(false);
          this.mensajeError.set(err?.error?.message ?? 'No se pudo actualizar el vínculo');
        },
      });
  }

  iniciarCese(linkId: number): void {
    this.editarVinculo.set(null);
    this.cesarLinkId.set(linkId);
    this.motivoCese = '';
  }

  cancelarCese(): void {
    this.cesarLinkId.set(null);
  }

  confirmarCese(): void {
    const id = this.cesarLinkId();
    if (!id || this.motivoCese.trim().length < 3) return;
    this.svc.cesarVinculo(id, this.motivoCese.trim()).subscribe({
      next: () => {
        this.svc.saving.set(false);
        this.cesarLinkId.set(null);
        this.mensajeOk.set('Vínculo cesado correctamente.');
        this.buscarRepresentante();
      },
      error: (err) => {
        this.svc.saving.set(false);
        this.mensajeError.set(err?.error?.message ?? 'No se pudo cesar el vínculo');
      },
    });
  }

  cargarAuditoria(representativeId?: number): void {
    if (!representativeId) return;
    this.svc.cargarAuditoria(representativeId).subscribe({
      next: (res) => this.auditoria.set(res.items),
    });
  }

  vinculoLabel(tipo: string): string {
    return tipo.charAt(0).toUpperCase() + tipo.slice(1);
  }

  accionLabel(accion: string): string {
    const map: Record<string, string> = {
      crear: 'Creación de vínculo',
      actualizar: 'Actualización',
      cesar: 'Cese de vínculo',
    };
    return map[accion] ?? accion;
  }

  formatFecha(f: string | null | undefined): string {
    if (!f) return '—';
    const [y, m, d] = f.split('-');
    return `${d}/${m}/${y}`;
  }

  formatFechaHora(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('es-PE');
  }
}
