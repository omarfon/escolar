import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { normalizeGradoMatriculaKey } from '../../../../core/academico/grado-display.util';
import { InstitucionalService } from '../../../administracion/institucional/institucional.service';
import { Nivel } from '../../../administracion/institucional/institucional.model';
import { markTenantReloadReady, setupTenantReload } from '../../../../core/tenant/tenant-reload.util';
import { SalonesService } from './salones.service';
import { SalonItem } from './salones.model';
import {
  defaultAforoSalon,
  ErroresCampoSalon,
  primerErrorSalon,
  salonFormularioMinimoListo,
  validarCampoSalon,
  validarSalonForm,
} from './salon-form.validation';

@Component({
  selector: 'app-salones',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  template: `
<div class="space-y-4">

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h3 class="text-lg font-bold text-gray-900">Salones</h3>
      <p class="text-sm text-gray-400 mt-0.5">
        Tabla maestra de aforo · A.E. {{ anioEscolar() }}
      </p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <a routerLink="/matricula/vacantes" class="btn btn-secondary btn-sm">
        <span class="icon icon-sm">event_seat</span> Ver vacantes
      </a>
      <a routerLink="/maestros/plan-estudios-areas" class="btn btn-secondary btn-sm">
        <span class="icon icon-sm">category</span> Plan de estudios
      </a>
      <button type="button" class="btn btn-primary btn-sm" (click)="abrirModal()">
        <span class="icon icon-sm">add</span> Nuevo salón
      </button>
      <button class="btn btn-secondary btn-sm" (click)="sincronizar()" [disabled]="svc.saving()">
        <span class="icon icon-sm">sync</span> Sincronizar estructura
      </button>
    </div>
  </div>

  <div class="card p-4 flex flex-wrap items-end gap-4">
    <div>
      <label class="form-label">Año escolar</label>
      <div class="relative mt-1">
        <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">calendar_today</span>
        <input
          type="number"
          class="form-input pl-10 bg-gray-50 w-36"
          min="2000"
          max="2100"
          [(ngModel)]="anioInput"
          (ngModelChange)="cargar()"
        />
      </div>
    </div>
    <div>
      <label class="form-label">Nivel</label>
      <div class="relative mt-1">
        <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">school</span>
        <select class="form-select pl-10 bg-gray-50 w-40" [(ngModel)]="filtroNivel" (ngModelChange)="cargar()">
          <option value="">Todos</option>
          <option value="Inicial">Inicial</option>
          <option value="Primaria">Primaria</option>
          <option value="Secundaria">Secundaria</option>
        </select>
      </div>
    </div>
    <p class="text-xs text-gray-400 ml-auto pb-2">
      Los grados ingresantes (1° Primaria, 1° Secundaria) usan el aforo total del salón.
    </p>
  </div>

  @if (error()) {
    <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{{ error() }}</div>
  }

  <div class="card overflow-hidden">
    @if (svc.loading()) {
      <div class="p-10 text-center text-gray-400">
        <span class="icon animate-spin text-indigo-500">refresh</span>
        <p class="mt-2 text-sm">Cargando salones...</p>
      </div>
    } @else if (!salones().length) {
      <div class="p-10 text-center">
        <p class="text-gray-500 mb-3">No hay registros en la tabla salones para este año.</p>
        <div class="flex flex-wrap justify-center gap-2">
          <button type="button" class="btn btn-primary btn-sm" (click)="abrirModal()">Agregar salón</button>
          <button type="button" class="btn btn-secondary btn-sm" (click)="sincronizar()">Sincronizar desde estructura institucional</button>
        </div>
      </div>
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">Nivel</th>
              <th class="px-4 py-3 text-left">Grado</th>
              <th class="px-4 py-3 text-center">Sección</th>
              <th class="px-4 py-3 text-center">Aforo</th>
              <th class="px-4 py-3 text-center">Tipo</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (s of salones(); track s.id) {
              <tr class="hover:bg-gray-50/80">
                <td class="px-4 py-3 font-medium text-gray-800">{{ s.nivel }}</td>
                <td class="px-4 py-3 text-gray-700">{{ s.grado }}</td>
                <td class="px-4 py-3 text-center font-semibold">{{ s.seccion }}</td>
                <td class="px-4 py-3 text-center">
                  @if (editandoId() === s.id) {
                    <input type="number" min="1" max="999" class="form-input w-20 mx-auto text-center py-1"
                      [(ngModel)]="editAforo" (keydown.enter)="guardarAforo(s)" />
                  } @else {
                    <span class="font-bold text-indigo-700">{{ s.aforo }}</span>
                  }
                </td>
                <td class="px-4 py-3 text-center">
                  @if (s.esIngresante) {
                    <span class="badge bg-amber-100 text-amber-700 text-[10px]">Ingresante</span>
                  } @else {
                    <span class="badge bg-blue-100 text-blue-700 text-[10px]">Continuidad</span>
                  }
                </td>
                <td class="px-4 py-3 text-right">
                  @if (editandoId() === s.id) {
                    <button class="btn btn-primary btn-sm mr-1" (click)="guardarAforo(s)" [disabled]="svc.saving()">Guardar</button>
                    <button class="btn btn-secondary btn-sm" (click)="editandoId.set(null)">Cancelar</button>
                  } @else {
                    <button class="btn btn-secondary btn-sm" (click)="iniciarEdicion(s)">
                      <span class="icon icon-sm">edit</span> Aforo
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div class="card p-4">
      <p class="text-xs text-gray-400">Salones</p>
      <p class="text-2xl font-bold text-gray-900">{{ salones().length }}</p>
    </div>
    <div class="card p-4">
      <p class="text-xs text-gray-400">Aforo total</p>
      <p class="text-2xl font-bold text-indigo-700">{{ totalAforo() }}</p>
    </div>
    <div class="card p-4">
      <p class="text-xs text-gray-400">Ingresantes</p>
      <p class="text-2xl font-bold text-amber-600">{{ countIngresantes() }}</p>
    </div>
    <div class="card p-4">
      <p class="text-xs text-gray-400">Continuidad</p>
      <p class="text-2xl font-bold text-blue-600">{{ salones().length - countIngresantes() }}</p>
    </div>
  </div>

  @if (toast()) {
    <div class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-white text-sm"
      [ngClass]="toast()!.type === 'success' ? 'bg-green-600' : 'bg-red-600'">
      {{ toast()!.msg }}
    </div>
  }
</div>

@if (modalOpen()) {
  <div class="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" (click)="cerrarModal()"></div>
  <div class="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-[90] flex flex-col animate-slide-in-r">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <div>
          <h2 class="text-lg font-bold text-gray-900">Nuevo salón</h2>
          <p class="text-xs text-gray-500 mt-0.5">Año escolar {{ anioEscolar() }}</p>
        </div>
        <button type="button" class="btn btn-ghost btn-icon" title="Cerrar" (click)="cerrarModal()">
          <span class="icon icon-sm">close</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        @if (errorForm()) {
          <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span class="icon icon-sm text-red-500">error_outline</span> {{ errorForm() }}
          </div>
        }

        <div>
          <label class="form-label">Nivel <span class="text-red-400">*</span></label>
          <select class="form-input w-full" [ngClass]="claseCampo('nivel')"
                  [(ngModel)]="formNivel"
                  (ngModelChange)="onNivelChange()"
                  (blur)="onCampoBlur('nivel')">
            <option value="">Seleccionar nivel</option>
            @for (n of niveles(); track n.id) {
              <option [value]="n.nombre">{{ n.nombre }}</option>
            }
          </select>
          @if (campoError('nivel'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>

        <div>
          <label class="form-label">Grado <span class="text-red-400">*</span></label>
          <select class="form-input w-full" [ngClass]="claseCampo('grado')"
                  [(ngModel)]="formGradoNombre"
                  (ngModelChange)="onCampoFormChange('grado')"
                  (blur)="onCampoBlur('grado')"
                  [disabled]="!formNivel">
            <option value="">Seleccionar grado</option>
            @for (g of gradosDisponibles(); track g.id) {
              <option [value]="g.nombre">{{ g.nombre }}</option>
            }
          </select>
          @if (campoError('grado'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>

        <div>
          <label class="form-label">Sección <span class="text-red-400">*</span></label>
          <input class="form-input w-full uppercase" maxlength="10" placeholder="Ej. A, B, C"
                 [ngClass]="claseCampo('seccion')"
                 [(ngModel)]="formSeccion"
                 (ngModelChange)="onCampoFormChange('seccion')"
                 (blur)="onCampoBlur('seccion')" />
          @if (campoError('seccion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          @if (seccionesExistentes().length) {
            <p class="text-xs text-gray-400 mt-1">
              Secciones ya registradas: {{ seccionesExistentes().join(', ') }}
            </p>
          }
        </div>

        <div>
          <label class="form-label">Aforo <span class="text-red-400">*</span></label>
          <input type="number" class="form-input w-full" min="1" max="999" step="1"
                 [ngClass]="claseCampo('aforo')"
                 [(ngModel)]="formAforo"
                 (ngModelChange)="onCampoFormChange('aforo')"
                 (blur)="onCampoBlur('aforo')" />
          @if (campoError('aforo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0 bg-gray-50">
        <button type="button" class="btn btn-secondary flex-1" (click)="cerrarModal()">Cancelar</button>
        <button type="button" class="btn btn-primary flex-1" (click)="guardarSalon()"
          [disabled]="!puedeGuardarForm() || svc.saving()"
          [title]="puedeGuardarForm() ? '' : 'Completa nivel, grado, sección y aforo'">
          {{ svc.saving() ? 'Guardando…' : 'Crear salón' }}
        </button>
      </div>
    </div>
}
  `,
})
export class SalonesComponent implements OnInit {
  private readonly _tenantReloadReady = setupTenantReload(() => this.cargar());
  readonly svc = inject(SalonesService);
  private readonly institucional = inject(InstitucionalService);

  readonly salones = signal<SalonItem[]>([]);
  readonly niveles = signal<Nivel[]>([]);
  readonly anioEscolar = signal(2026);
  anioInput = 2026;
  filtroNivel = '';
  readonly editandoId = signal<number | null>(null);
  editAforo = 30;
  readonly error = signal('');
  readonly toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);
  readonly modalOpen = signal(false);
  errorForm = signal('');
  fieldErrors = signal<ErroresCampoSalon>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);
  private readonly formRevision = signal(0);

  formNivel = '';
  formGradoNombre = '';
  formSeccion = '';
  formAforo = 30;

  readonly puedeGuardarForm = computed(() => {
    this.formRevision();
    return salonFormularioMinimoListo(this.valoresFormulario());
  });

  readonly gradosDisponibles = computed(() => {
    const nivel = this.niveles().find((n) => n.nombre === this.formNivel);
    return nivel?.grados ?? [];
  });

  readonly seccionesExistentes = computed(() => {
    if (!this.formNivel || !this.formGradoNombre) return [];
    const gradoNorm = normalizeGradoMatriculaKey(this.formGradoNombre);
    return this.salones()
      .filter((s) => s.nivel === this.formNivel && s.grado === gradoNorm)
      .map((s) => s.seccion)
      .sort();
  });

  readonly totalAforo = computed(() => this.salones().reduce((s, r) => s + r.aforo, 0));
  readonly countIngresantes = computed(() => this.salones().filter((s) => s.esIngresante).length);

  ngOnInit(): void {
    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => this.niveles.set(niveles.filter((n) => n.activo)),
    });
    this.cargar();
    markTenantReloadReady(this._tenantReloadReady);
  }

  cargar(): void {
    this.anioEscolar.set(this.anioInput);
    this.error.set('');
    this.svc.list({
      anioEscolar: this.anioEscolar(),
      nivel: this.filtroNivel || undefined,
      activo: true,
    }).subscribe({
      next: (rows) => this.salones.set(rows),
      error: (err) => this.error.set(err.message),
    });
  }

  abrirModal(): void {
    this.formNivel = this.filtroNivel || '';
    this.formGradoNombre = '';
    this.formSeccion = '';
    this.formAforo = this.formNivel ? defaultAforoSalon(this.formNivel) : 30;
    this.resetValidacionForm();
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.resetValidacionForm();
  }

  onNivelChange(): void {
    this.formGradoNombre = '';
    this.formAforo = this.formNivel ? defaultAforoSalon(this.formNivel) : 30;
    this.onCampoFormChange('nivel');
  }

  private resetValidacionForm(): void {
    this.fieldErrors.set({});
    this.camposTocados.set({});
    this.intentoGuardar.set(false);
    this.errorForm.set('');
  }

  private valoresFormulario() {
    return {
      anioEscolar: this.anioEscolar(),
      nivel: this.formNivel,
      grado: this.formGradoNombre ? normalizeGradoMatriculaKey(this.formGradoNombre) : '',
      seccion: this.formSeccion,
      aforo: Number(this.formAforo),
    };
  }

  onCampoBlur(key: string): void {
    this.camposTocados.update((t) => ({ ...t, [key]: true }));
    this.validarCampoEnVivo(key);
  }

  onCampoFormChange(key: string): void {
    this.formRevision.update((n) => n + 1);

    if (key === 'aforo') {
      const n = Number(this.formAforo);
      this.formAforo = Number.isFinite(n) ? n : 0;
    }

    if (this.camposTocados()[key] || this.intentoGuardar() || this.fieldErrors()[key]) {
      this.validarCampoEnVivo(key);
    } else {
      this.quitarErrorCampo(key);
    }
  }

  private validarCamposMinimosEnVivo(): void {
    for (const key of ['nivel', 'grado', 'seccion', 'aforo']) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoSalon(this.valoresFormulario(), key);
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

  guardarSalon(): void {
    this.intentoGuardar.set(true);
    if (!this.puedeGuardarForm()) {
      this.validarCamposMinimosEnVivo();
      this.errorForm.set('Completa los campos obligatorios del salón.');
      return;
    }

    const errors = validarSalonForm(this.valoresFormulario());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm.set(primerErrorSalon(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    const values = this.valoresFormulario();
    const seccionNorm = values.seccion.trim().toUpperCase();
    const duplicado = this.salones().some(
      (s) =>
        s.nivel === values.nivel.trim() &&
        s.grado === values.grado &&
        s.seccion === seccionNorm,
    );
    if (duplicado) {
      this.errorForm.set('Ya existe un salón con ese nivel, grado y sección para este año.');
      this.fieldErrors.update((e) => ({ ...e, seccion: 'Esta sección ya está registrada.' }));
      return;
    }

    this.errorForm.set('');

    this.svc.create({
      anioEscolar: values.anioEscolar,
      nivel: values.nivel.trim(),
      grado: values.grado,
      seccion: seccionNorm,
      aforo: values.aforo,
      activo: true,
    }).subscribe({
      next: () => {
        this.cerrarModal();
        this.mostrarToast('Salón creado', 'success');
        this.cargar();
      },
      error: (err) => this.errorForm.set(err.message),
    });
  }

  iniciarEdicion(s: SalonItem): void {
    this.editandoId.set(s.id);
    this.editAforo = s.aforo;
  }

  guardarAforo(s: SalonItem): void {
    if (this.editAforo < 1) return;
    this.svc.updateAforo(s.id, this.editAforo).subscribe({
      next: (updated) => {
        this.salones.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
        this.editandoId.set(null);
        this.mostrarToast('Aforo actualizado', 'success');
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  sincronizar(): void {
    this.svc.sync(this.anioEscolar()).subscribe({
      next: (res) => {
        this.mostrarToast(`Sincronizado: ${res.created} creados, ${res.skipped} existentes`, 'success');
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  private mostrarToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
