import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../../core/layout/services/layout.service';
import { markTenantReloadReady, setupTenantReload } from '../../../../core/tenant/tenant-reload.util';
import { FaltasReconocimientosService } from './faltas-reconocimientos.service';
import {
  CATEGORIA_CFG,
  MaestroConductaCategoria,
  MaestroConductaDescripcionItem,
  MaestroConductaTipoItem,
} from './faltas-reconocimientos.model';
import {
  ErroresCampoConductaTipo,
  conductaTipoFormularioMinimoListo,
  primerErrorConductaTipo,
  validarCampoConductaTipo,
  validarConductaTipoForm,
} from './conducta-tipo-form.validation';

@Component({
  selector: 'app-maestros-faltas-reconocimientos',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
<div class="space-y-4">

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h3 class="text-lg font-bold text-gray-900">Faltas y Reconocimientos</h3>
      <p class="text-sm text-gray-400 mt-0.5">
        Administra tipos de falta/reconocimiento y sus descripciones
      </p>
    </div>
    <button class="btn btn-primary btn-sm" (click)="abrirModalTipo()">
      <span class="icon icon-sm">add</span> Nuevo tipo
    </button>
  </div>

  @if (error()) {
    <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{{ error() }}</div>
  }

  @if (toast()) {
    <div class="rounded-xl px-4 py-3 text-sm"
      [ngClass]="toast()!.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
      {{ toast()!.msg }}
    </div>
  }

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <!-- Tipos -->
    <div class="lg:col-span-5 card overflow-hidden">
      <div class="px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
        Tipos ({{ tipos().length }})
      </div>
      @if (svc.loading()) {
        <div class="p-8 text-center text-gray-400 text-sm">Cargando tipos...</div>
      } @else if (!tipos().length) {
        <div class="p-8 text-center text-gray-500 text-sm">No hay tipos registrados.</div>
      } @else {
        <div class="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
          @for (t of tipos(); track t.id) {
            <div class="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/80 cursor-pointer"
              [class.bg-indigo-50]="tipoSelId() === t.id"
              (click)="seleccionarTipo(t.id)">
              <span class="icon icon-sm text-indigo-500 mt-0.5 shrink-0">{{ t.icon || 'gavel' }}</span>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-900 text-sm">{{ t.nombre }}</div>
                <div class="text-xs text-gray-500 mt-0.5">{{ t.codigo }}</div>
                <span class="badge text-[10px] mt-1" [ngClass]="catCfg(t.categoria).badge">
                  {{ catCfg(t.categoria).label }}
                </span>
              </div>
              <div class="flex gap-1 shrink-0" (click)="$event.stopPropagation()">
                <button class="btn btn-ghost btn-sm" (click)="abrirModalTipo(t)" title="Editar">
                  <span class="icon icon-sm">edit</span>
                </button>
                <button class="btn btn-ghost btn-sm text-red-500" (click)="eliminarTipo(t)" title="Eliminar">
                  <span class="icon icon-sm">delete</span>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Descripciones -->
    <div class="lg:col-span-7 card overflow-hidden">
      <div class="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-gray-500 uppercase">
          Descripciones@if (tipoSel()) { — {{ tipoSel()!.nombre }} }
        </span>
        @if (tipoSel()) {
          <button class="btn btn-secondary btn-sm" (click)="abrirModalDesc()">
            <span class="icon icon-sm">add</span> Nueva descripción
          </button>
        }
      </div>

      @if (!tipoSel()) {
        <div class="p-10 text-center text-gray-400 text-sm">
          Selecciona un tipo para ver o editar sus descripciones
        </div>
      } @else if (!tipoSel()!.descripciones.length) {
        <div class="p-10 text-center text-gray-500 text-sm">
          Este tipo no tiene descripciones. Agrega la primera.
        </div>
      } @else {
        <div class="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
          @for (d of tipoSel()!.descripciones; track d.id) {
            <div class="px-4 py-3 flex items-start gap-3">
              <span class="icon icon-sm text-gray-300 mt-0.5 shrink-0">description</span>
              <p class="flex-1 text-sm text-gray-700">{{ d.texto }}</p>
              <div class="flex gap-1 shrink-0">
                <button class="btn btn-ghost btn-sm" (click)="abrirModalDesc(d)">
                  <span class="icon icon-sm">edit</span>
                </button>
                <button class="btn btn-ghost btn-sm text-red-500" (click)="eliminarDesc(d)">
                  <span class="icon icon-sm">delete</span>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  </div>
</div>

@if (modalTipo()) {
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="cerrarModalTipo()">
    <div class="card w-full max-w-md p-6 space-y-4" (click)="$event.stopPropagation()">
      <h2 class="text-lg font-bold text-gray-900">{{ editTipoId() ? 'Editar tipo' : 'Nuevo tipo' }}</h2>

      @if (errorFormTipo()) {
        <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span class="icon icon-sm text-red-500">error_outline</span> {{ errorFormTipo() }}
        </div>
      }

      <div>
        <label class="form-label">Nombre <span class="text-red-400">*</span></label>
        <input class="form-input w-full" placeholder="Ej. Falta Leve"
               [ngClass]="claseCampoTipo('nombre')"
               [(ngModel)]="formTipoNombre"
               (ngModelChange)="onCampoTipoChange('nombre')"
               (blur)="onCampoTipoBlur('nombre')" />
        @if (campoErrorTipo('nombre'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>
      <div>
        <label class="form-label">Categoría <span class="text-red-400">*</span></label>
        <select class="form-input w-full" [ngClass]="claseCampoTipo('categoria')"
                [(ngModel)]="formTipoCategoria"
                (ngModelChange)="onCampoTipoChange('categoria')"
                (blur)="onCampoTipoBlur('categoria')">
          <option value="falta">Falta</option>
          <option value="reconocimiento">Reconocimiento</option>
        </select>
        @if (campoErrorTipo('categoria'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>
      <div>
        <label class="form-label">Icono (Material) <span class="text-gray-400 font-normal">(opcional)</span></label>
        <input class="form-input w-full" placeholder="warning, gavel, emoji_events..."
               [ngClass]="claseCampoTipo('icon')"
               [(ngModel)]="formTipoIcon"
               (ngModelChange)="onCampoTipoChange('icon')"
               (blur)="onCampoTipoBlur('icon')" />
        @if (campoErrorTipo('icon'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>
      <div>
        <label class="form-label">Orden</label>
        <input type="number" min="0" step="1" class="form-input w-full"
               [ngClass]="claseCampoTipo('orden')"
               [(ngModel)]="formTipoOrden"
               (ngModelChange)="onCampoTipoChange('orden')"
               (blur)="onCampoTipoBlur('orden')" />
        @if (campoErrorTipo('orden'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>
      <div class="flex gap-2 justify-end">
        <button class="btn btn-ghost" (click)="cerrarModalTipo()">Cancelar</button>
        <button class="btn btn-primary"
                [disabled]="!puedeGuardarTipoForm() || svc.saving()"
                [title]="puedeGuardarTipoForm() ? '' : 'Completa nombre y categoría'"
                (click)="guardarTipo()">Guardar</button>
      </div>
    </div>
  </div>
}

@if (modalDesc()) {
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="cerrarModalDesc()">
    <div class="card w-full max-w-lg p-6 space-y-4" (click)="$event.stopPropagation()">
      <h2 class="text-lg font-bold text-gray-900">{{ editDescId() ? 'Editar descripción' : 'Nueva descripción' }}</h2>
      <div>
        <label class="form-label">Texto</label>
        <textarea class="form-input w-full h-28 resize-none" [(ngModel)]="formDescTexto"
          placeholder="Describe el incidente o reconocimiento..."></textarea>
      </div>
      <div class="flex gap-2 justify-end">
        <button class="btn btn-ghost" (click)="cerrarModalDesc()">Cancelar</button>
        <button class="btn btn-primary" [disabled]="svc.saving()" (click)="guardarDesc()">Guardar</button>
      </div>
    </div>
  </div>
}
  `,
})
export class MaestrosFaltasReconocimientosComponent implements OnInit {
  private readonly _tenantReloadReady = setupTenantReload(() => this.cargar());
  private readonly layout = inject(LayoutService);
  readonly svc = inject(FaltasReconocimientosService);

  readonly tipos = signal<MaestroConductaTipoItem[]>([]);
  readonly tipoSelId = signal<number | null>(null);
  readonly error = signal('');
  readonly toast = signal<{ msg: string; type: 'ok' | 'error' } | null>(null);

  readonly modalTipo = signal(false);
  readonly editTipoId = signal<number | null>(null);
  errorFormTipo = signal('');
  fieldErrorsTipo = signal<ErroresCampoConductaTipo>({});
  camposTocadosTipo = signal<Record<string, true>>({});
  intentoGuardarTipo = signal(false);
  private readonly formTipoRevision = signal(0);

  readonly puedeGuardarTipoForm = computed(() => {
    this.formTipoRevision();
    return conductaTipoFormularioMinimoListo(this.valoresFormularioTipo());
  });

  formTipoNombre = '';
  formTipoCategoria: MaestroConductaCategoria = 'falta';
  formTipoIcon = 'warning';
  formTipoOrden = 0;

  readonly modalDesc = signal(false);
  readonly editDescId = signal<number | null>(null);
  formDescTexto = '';

  readonly tipoSel = computed(() =>
    this.tipos().find((t) => t.id === this.tipoSelId()) ?? null,
  );

  readonly catCfg = (c: MaestroConductaCategoria) => CATEGORIA_CFG[c];

  ngOnInit(): void {
    this.layout.setTitle('Maestros · Faltas y Reconocimientos');
    this.cargar();
    markTenantReloadReady(this._tenantReloadReady);
  }

  cargar(): void {
    this.error.set('');
    this.svc.list(true).subscribe({
      next: (rows) => {
        this.tipos.set(rows);
        const sel = this.tipoSelId();
        if (sel && !rows.some((t) => t.id === sel)) {
          this.tipoSelId.set(rows[0]?.id ?? null);
        } else if (!sel && rows.length) {
          this.tipoSelId.set(rows[0].id);
        }
      },
      error: (err) => this.error.set(err.message),
    });
  }

  seleccionarTipo(id: number): void {
    this.tipoSelId.set(id);
  }

  abrirModalTipo(tipo?: MaestroConductaTipoItem): void {
    this.editTipoId.set(tipo?.id ?? null);
    this.formTipoNombre = tipo?.nombre ?? '';
    this.formTipoCategoria = tipo?.categoria ?? 'falta';
    this.formTipoIcon = tipo?.icon ?? 'warning';
    this.formTipoOrden = tipo?.orden ?? 0;
    this.resetValidacionFormTipo();
    this.modalTipo.set(true);
  }

  cerrarModalTipo(): void {
    this.modalTipo.set(false);
    this.editTipoId.set(null);
    this.resetValidacionFormTipo();
  }

  private resetValidacionFormTipo(): void {
    this.fieldErrorsTipo.set({});
    this.camposTocadosTipo.set({});
    this.intentoGuardarTipo.set(false);
    this.errorFormTipo.set('');
  }

  private valoresFormularioTipo() {
    return {
      nombre: this.formTipoNombre,
      categoria: this.formTipoCategoria,
      icon: this.formTipoIcon,
      orden: Number(this.formTipoOrden),
    };
  }

  onCampoTipoBlur(key: string): void {
    this.camposTocadosTipo.update((t) => ({ ...t, [key]: true }));
    this.validarCampoTipoEnVivo(key);
  }

  onCampoTipoChange(key: string): void {
    this.formTipoRevision.update((n) => n + 1);

    if (key === 'orden') {
      const n = Number(this.formTipoOrden);
      this.formTipoOrden = Number.isFinite(n) ? n : 0;
    }

    if (this.camposTocadosTipo()[key] || this.intentoGuardarTipo() || this.fieldErrorsTipo()[key]) {
      this.validarCampoTipoEnVivo(key);
    } else {
      this.quitarErrorCampoTipo(key);
    }
  }

  private validarCamposMinimosTipoEnVivo(): void {
    for (const key of ['nombre', 'categoria']) {
      this.camposTocadosTipo.update((t) => ({ ...t, [key]: true }));
      this.validarCampoTipoEnVivo(key);
    }
  }

  private validarCampoTipoEnVivo(key: string): void {
    const err = validarCampoConductaTipo(this.valoresFormularioTipo(), key);
    if (err) {
      this.fieldErrorsTipo.update((errors) => ({ ...errors, [key]: err }));
    } else {
      this.quitarErrorCampoTipo(key);
    }
  }

  private quitarErrorCampoTipo(key: string): void {
    if (!this.fieldErrorsTipo()[key]) return;
    this.fieldErrorsTipo.update((errors) => {
      const next = { ...errors };
      delete next[key];
      return next;
    });
    if (!Object.keys(this.fieldErrorsTipo()).length) this.errorFormTipo.set('');
  }

  campoErrorTipo(key: string): string | null {
    if (!this.camposTocadosTipo()[key] && !this.intentoGuardarTipo()) return null;
    return this.fieldErrorsTipo()[key] ?? null;
  }

  claseCampoTipo(key: string): string {
    return this.campoErrorTipo(key) ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : '';
  }

  guardarTipo(): void {
    this.intentoGuardarTipo.set(true);
    if (!this.puedeGuardarTipoForm()) {
      this.validarCamposMinimosTipoEnVivo();
      this.errorFormTipo.set('Completa los campos obligatorios del tipo.');
      return;
    }

    const errors = validarConductaTipoForm(this.valoresFormularioTipo());
    this.fieldErrorsTipo.set(errors);
    if (Object.keys(errors).length) {
      this.errorFormTipo.set(primerErrorConductaTipo(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    this.errorFormTipo.set('');

    const editId = this.editTipoId();
    const req = editId
      ? this.svc.updateTipo(editId, {
          nombre: this.formTipoNombre.trim(),
          categoria: this.formTipoCategoria,
          icon: this.formTipoIcon.trim() || 'description',
          orden: this.formTipoOrden,
        })
      : this.svc.createTipo({
          nombre: this.formTipoNombre.trim(),
          categoria: this.formTipoCategoria,
          icon: this.formTipoIcon.trim() || 'description',
          orden: this.formTipoOrden,
        });

    req.subscribe({
      next: (saved) => {
        this.cerrarModalTipo();
        this.tipoSelId.set(saved.id);
        this.mostrarToast(editId ? 'Tipo actualizado' : 'Tipo creado', 'ok');
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  eliminarTipo(tipo: MaestroConductaTipoItem): void {
    if (!confirm(`¿Eliminar el tipo "${tipo.nombre}" y sus descripciones del catálogo?`)) return;
    this.svc.removeTipo(tipo.id).subscribe({
      next: () => {
        if (this.tipoSelId() === tipo.id) this.tipoSelId.set(null);
        this.mostrarToast('Tipo eliminado', 'ok');
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  abrirModalDesc(desc?: MaestroConductaDescripcionItem): void {
    this.editDescId.set(desc?.id ?? null);
    this.formDescTexto = desc?.texto ?? '';
    this.modalDesc.set(true);
  }

  cerrarModalDesc(): void {
    this.modalDesc.set(false);
    this.editDescId.set(null);
  }

  guardarDesc(): void {
    const texto = this.formDescTexto.trim();
    const tipoId = this.tipoSelId();
    if (!texto || !tipoId) return;

    const editId = this.editDescId();
    const req = editId
      ? this.svc.updateDescripcion(editId, { texto })
      : this.svc.createDescripcion(tipoId, { texto });

    req.subscribe({
      next: () => {
        this.cerrarModalDesc();
        this.mostrarToast(editId ? 'Descripción actualizada' : 'Descripción creada', 'ok');
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  eliminarDesc(desc: MaestroConductaDescripcionItem): void {
    if (!confirm('¿Eliminar esta descripción del catálogo?')) return;
    this.svc.removeDescripcion(desc.id).subscribe({
      next: () => {
        this.mostrarToast('Descripción eliminada', 'ok');
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  private mostrarToast(msg: string, type: 'ok' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
