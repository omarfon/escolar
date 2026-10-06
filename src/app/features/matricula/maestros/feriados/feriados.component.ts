import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, DatePipe } from '@angular/common';
import { MaestrosFeriadosService } from './feriados.service';
import {
  CreateMaestroFeriadoPayload,
  MaestroFeriadoItem,
  MaestroFeriadoTipo,
  TIPO_FERIADO_CFG,
} from './feriados.model';
import {
  ErroresCampoFeriado,
  feriadoFormularioMinimoListo,
  primerErrorFeriado,
  validarCampoFeriado,
  validarFeriadoForm,
} from './feriado-form.validation';
import { markTenantReloadReady, setupTenantReload } from '../../../../core/tenant/tenant-reload.util';

@Component({
  selector: 'app-maestros-feriados',
  standalone: true,
  imports: [FormsModule, NgClass, DatePipe],
  template: `
<div class="space-y-4">

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h3 class="text-lg font-bold text-gray-900">Feriados</h3>
      <p class="text-sm text-gray-400 mt-0.5">
        Días no lectivos que se restan del calendario de clases y asistencia
      </p>
    </div>
    <button class="btn btn-primary btn-sm" (click)="abrirModal()">
      <span class="icon icon-sm">add</span> Nuevo feriado
    </button>
  </div>

  <div class="card p-4 flex flex-wrap items-end gap-4">
    <div class="form-group w-36">
      <label class="form-label">Año escolar</label>
      <select class="form-select" [(ngModel)]="filtroAnio" (ngModelChange)="cargar()">
        @for (a of aniosDisponibles; track a) {
          <option [ngValue]="a">{{ a }}</option>
        }
      </select>
    </div>
    <div class="form-group w-40">
      <label class="form-label">Tipo</label>
      <select class="form-select" [(ngModel)]="filtroTipo" (ngModelChange)="cargar()">
        <option value="">Todos</option>
        <option value="nacional">Nacional</option>
        <option value="local">Local</option>
        <option value="institucional">Institucional</option>
      </select>
    </div>
    <p class="text-xs text-gray-400 ml-auto pb-2">{{ feriadosFiltrados().length }} feriado(s)</p>
  </div>

  @if (resumenMes()) {
    <div class="card p-4 bg-indigo-50 border border-indigo-100">
      <p class="text-sm text-indigo-900">
        <span class="font-semibold">{{ resumenMes()!.diasClase }}</span> días de clase en el mes
        ({{ resumenMes()!.diasLaborables }} laborables − {{ resumenMes()!.feriadosEnRango.length }} feriados)
      </p>
    </div>
  }

  @if (error()) {
    <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{{ error() }}</div>
  }

  <div class="card overflow-hidden">
    @if (svc.loading()) {
      <div class="p-10 text-center text-gray-400 animate-pulse">Cargando feriados...</div>
    } @else if (!feriadosFiltrados().length) {
      <div class="p-10 text-center text-gray-500">No hay feriados registrados para este año.</div>
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">Fecha</th>
              <th class="px-4 py-3 text-left">Nombre</th>
              <th class="px-4 py-3 text-left">Tipo</th>
              <th class="px-4 py-3 text-left">Descripción</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (f of feriadosFiltrados(); track f.id) {
              <tr class="hover:bg-gray-50/80">
                <td class="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                  {{ f.fecha | date:'dd/MM/yyyy':'UTC' }}
                </td>
                <td class="px-4 py-3 text-gray-800">{{ f.nombre }}</td>
                <td class="px-4 py-3">
                  <span class="badge text-[10px]" [ngClass]="tipoCfg(f.tipo).badge">
                    {{ tipoCfg(f.tipo).label }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-500 max-w-[240px] truncate" [title]="f.descripcion">
                  {{ f.descripcion || '—' }}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <button type="button" class="btn btn-secondary btn-sm mr-1"
                    (click)="$event.stopPropagation(); abrirModal(f)">Editar</button>
                  <button type="button" class="btn btn-ghost btn-sm text-red-500" (click)="desactivar(f)">
                    Desactivar
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  @if (modalOpen()) {
    <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" (click)="cerrarModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()">
        <h2 class="text-lg font-bold text-gray-900">{{ editId() ? 'Editar feriado' : 'Nuevo feriado' }}</h2>

        @if (errorForm()) {
          <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span class="icon icon-sm text-red-500">error_outline</span> {{ errorForm() }}
          </div>
        }

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Año escolar <span class="text-red-400">*</span></label>
            <input type="number" class="form-input w-full" min="2000" step="1"
                   [ngClass]="claseCampo('anioEscolar')"
                   [(ngModel)]="formAnio"
                   (ngModelChange)="onCampoFormChange('anioEscolar')"
                   (blur)="onCampoBlur('anioEscolar')" />
            @if (campoError('anioEscolar'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label">Fecha <span class="text-red-400">*</span></label>
            <input type="date" class="form-input w-full"
                   [ngClass]="claseCampo('fecha')"
                   [(ngModel)]="formFecha"
                   (ngModelChange)="onCampoFormChange('fecha')"
                   (blur)="onCampoBlur('fecha')" />
            @if (campoError('fecha'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
        </div>
        <div>
          <label class="form-label">Nombre <span class="text-red-400">*</span></label>
          <input class="form-input w-full" placeholder="Ej. Fiestas Patrias"
                 [ngClass]="claseCampo('nombre')"
                 [(ngModel)]="formNombre"
                 (ngModelChange)="onCampoFormChange('nombre')"
                 (blur)="onCampoBlur('nombre')" />
          @if (campoError('nombre'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div>
          <label class="form-label">Tipo <span class="text-red-400">*</span></label>
          <select class="form-input w-full" [ngClass]="claseCampo('tipo')"
                  [(ngModel)]="formTipo"
                  (ngModelChange)="onCampoFormChange('tipo')"
                  (blur)="onCampoBlur('tipo')">
            <option value="nacional">Nacional</option>
            <option value="local">Local</option>
            <option value="institucional">Institucional</option>
          </select>
          @if (campoError('tipo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div>
          <label class="form-label">Descripción <span class="text-gray-400 font-normal">(opcional)</span></label>
          <textarea class="form-input w-full" rows="2"
                    [ngClass]="claseCampo('descripcion')"
                    [(ngModel)]="formDescripcion"
                    (ngModelChange)="onCampoFormChange('descripcion')"
                    (blur)="onCampoBlur('descripcion')"></textarea>
          @if (campoError('descripcion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>

        <div class="flex gap-2 pt-2">
          <button class="btn btn-secondary flex-1" (click)="cerrarModal()">Cancelar</button>
          <button class="btn btn-primary flex-1" (click)="guardar()"
            [disabled]="!puedeGuardarForm() || svc.saving()"
            [title]="puedeGuardarForm() ? '' : 'Completa año escolar, fecha, nombre y tipo'">
            {{ editId() ? 'Guardar' : 'Crear' }}
          </button>
        </div>
      </div>
    </div>
  }

  @if (toast()) {
    <div class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-white text-sm"
      [ngClass]="toast()!.type === 'success' ? 'bg-green-600' : 'bg-red-600'">
      {{ toast()!.msg }}
    </div>
  }
</div>
  `,
})
export class MaestrosFeriadosComponent implements OnInit {
  private readonly _tenantReloadReady = setupTenantReload(() => this.cargar());
  readonly svc = inject(MaestrosFeriadosService);

  readonly feriados = signal<MaestroFeriadoItem[]>([]);
  readonly modalOpen = signal(false);
  readonly editId = signal<number | null>(null);
  readonly error = signal('');
  errorForm = signal('');
  fieldErrors = signal<ErroresCampoFeriado>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);
  private readonly formRevision = signal(0);

  readonly puedeGuardarForm = computed(() => {
    this.formRevision();
    return feriadoFormularioMinimoListo(this.valoresFormulario());
  });

  readonly toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);
  readonly resumenMes = signal<{ diasClase: number; diasLaborables: number; feriadosEnRango: unknown[] } | null>(null);

  readonly aniosDisponibles = [2025, 2026, 2027];
  filtroAnio = new Date().getFullYear();
  filtroTipo = '';

  formAnio = new Date().getFullYear();
  formFecha = '';
  formNombre = '';
  formTipo: MaestroFeriadoTipo = 'institucional';
  formDescripcion = '';

  ngOnInit(): void {
    this.cargar();
    markTenantReloadReady(this._tenantReloadReady);
  }

  feriadosFiltrados(): MaestroFeriadoItem[] {
    if (!this.filtroTipo) return this.feriados();
    return this.feriados().filter((f) => f.tipo === this.filtroTipo);
  }

  cargar(): void {
    this.error.set('');
    this.svc.list({ anioEscolar: this.filtroAnio, activo: true }).subscribe({
      next: (rows) => {
        this.feriados.set(rows);
        this.cargarResumenMes();
      },
      error: (err) => this.error.set(err.message),
    });
  }

  private cargarResumenMes(): void {
    const now = new Date();
    const y = this.filtroAnio;
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const desde = `${y}-${m}-01`;
    const ultimo = new Date(y, now.getMonth() + 1, 0).getDate();
    const hasta = `${y}-${m}-${String(ultimo).padStart(2, '0')}`;
    this.svc.calcularDiasClase(desde, hasta, y).subscribe({
      next: (r) => this.resumenMes.set(r),
      error: () => this.resumenMes.set(null),
    });
  }

  abrirModal(feriado?: MaestroFeriadoItem): void {
    if (feriado) {
      this.editId.set(feriado.id);
      this.formAnio = feriado.anioEscolar;
      this.formFecha = feriado.fecha.slice(0, 10);
      this.formNombre = feriado.nombre;
      this.formTipo = feriado.tipo;
      this.formDescripcion = feriado.descripcion;
    } else {
      this.editId.set(null);
      this.formAnio = this.filtroAnio;
      this.formFecha = '';
      this.formNombre = '';
      this.formTipo = 'institucional';
      this.formDescripcion = '';
    }
    this.resetValidacionForm();
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.editId.set(null);
    this.resetValidacionForm();
  }

  private resetValidacionForm(): void {
    this.fieldErrors.set({});
    this.camposTocados.set({});
    this.intentoGuardar.set(false);
    this.errorForm.set('');
  }

  private valoresFormulario() {
    return {
      anioEscolar: Number(this.formAnio),
      fecha: this.formFecha,
      nombre: this.formNombre,
      tipo: this.formTipo,
      descripcion: this.formDescripcion,
    };
  }

  onCampoBlur(key: string): void {
    this.camposTocados.update((t) => ({ ...t, [key]: true }));
    this.validarCampoEnVivo(key);
  }

  onCampoFormChange(key: string): void {
    this.formRevision.update((n) => n + 1);

    if (key === 'anioEscolar') {
      const n = Number(this.formAnio);
      this.formAnio = Number.isFinite(n) ? n : 0;
    }

    if (this.camposTocados()[key] || this.intentoGuardar() || this.fieldErrors()[key]) {
      this.validarCampoEnVivo(key);
    } else {
      this.quitarErrorCampo(key);
    }

    if (key === 'anioEscolar' && this.camposTocados()['fecha']) {
      this.validarCampoEnVivo('fecha');
    }
    if (key === 'fecha' && this.camposTocados()['anioEscolar']) {
      this.validarCampoEnVivo('fecha');
    }
  }

  private validarCamposMinimosEnVivo(): void {
    for (const key of ['anioEscolar', 'fecha', 'nombre', 'tipo']) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoFeriado(this.valoresFormulario(), key);
    if (err) {
      this.fieldErrors.update((errors) => ({ ...errors, [key]: err }));
    } else {
      this.quitarErrorCampo(key);
    }
  }

  private quitarErrorCampo(key: string): void {
    if (!this.fieldErrors()[key]) return;
    this.fieldErrors.update((errors) => {
      const next = { ...errors };
      delete next[key];
      return next;
    });
    if (!Object.keys(this.fieldErrors()).length) this.errorForm.set('');
  }

  campoError(key: string): string | null {
    if (!this.camposTocados()[key] && !this.intentoGuardar()) return null;
    return this.fieldErrors()[key] ?? null;
  }

  claseCampo(key: string): string {
    return this.campoError(key) ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : '';
  }

  guardar(): void {
    this.intentoGuardar.set(true);
    if (!this.puedeGuardarForm()) {
      this.validarCamposMinimosEnVivo();
      this.errorForm.set('Completa los campos obligatorios del feriado.');
      return;
    }

    const errors = validarFeriadoForm(this.valoresFormulario());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm.set(primerErrorFeriado(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    this.errorForm.set('');

    const payload: CreateMaestroFeriadoPayload = {
      anioEscolar: this.formAnio,
      fecha: this.formFecha,
      nombre: this.formNombre.trim(),
      tipo: this.formTipo,
      descripcion: this.formDescripcion.trim(),
    };
    const id = this.editId();
    const req = id ? this.svc.update(id, payload) : this.svc.create(payload);
    req.subscribe({
      next: () => {
        this.mostrarToast(id ? 'Feriado actualizado' : 'Feriado creado', 'success');
        this.cerrarModal();
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  desactivar(feriado: MaestroFeriadoItem): void {
    if (!confirm(`¿Desactivar "${feriado.nombre}" (${feriado.fecha})?`)) return;
    this.svc.deactivate(feriado.id).subscribe({
      next: () => {
        this.feriados.update((list) => list.filter((f) => f.id !== feriado.id));
        this.mostrarToast('Feriado desactivado', 'success');
        this.cargarResumenMes();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  tipoCfg(tipo: MaestroFeriadoTipo) {
    return TIPO_FERIADO_CFG[tipo];
  }

  private mostrarToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
