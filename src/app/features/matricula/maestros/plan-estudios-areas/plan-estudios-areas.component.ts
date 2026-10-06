import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { markTenantReloadReady, setupTenantReload } from '../../../../core/tenant/tenant-reload.util';
import { Area, Curricula, NivelCurricula } from '../../../academico/curricula/curricula.model';
import { PlanEstudiosAreasService } from './plan-estudios-areas.service';
import {
  AreaFormValues,
  ErroresCampoArea,
  areaFormularioMinimoListo,
  normalizeAreaNombre,
  primerErrorArea,
  validarAreaForm,
  validarCampoArea,
} from './area-form.validation';

const NIVELES: NivelCurricula[] = ['Inicial', 'Primaria', 'Secundaria'];

@Component({
  selector: 'app-plan-estudios-areas',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  template: `
<div class="space-y-4">

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h3 class="text-lg font-bold text-gray-900">Plan de estudios — Áreas</h3>
      <p class="text-sm text-gray-400 mt-0.5">
        Registro de áreas curriculares por nivel · A.E. {{ anioEscolar() }}
      </p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <a routerLink="/maestros/salones" class="btn btn-secondary btn-sm">
        <span class="icon icon-sm">meeting_room</span> Grados y secciones
      </a>
      <a routerLink="/academico/curricula" class="btn btn-secondary btn-sm">
        <span class="icon icon-sm">menu_book</span> Gestión curricular completa
      </a>
      @if (puedeGestionar()) {
        <button class="btn btn-primary btn-sm" (click)="abrirModal()" [disabled]="!curriculumActiva()">
          <span class="icon icon-sm">add</span> Nueva área
        </button>
      }
    </div>
  </div>

  <div class="card p-4 flex flex-wrap items-end gap-4">
    <div class="form-group w-36">
      <label class="form-label">Año escolar</label>
      <input class="form-input" type="number" min="2000" [(ngModel)]="anioInput" (change)="cargar()" />
    </div>
    <div class="form-group w-44">
      <label class="form-label">Nivel educativo</label>
      <select class="form-select" [(ngModel)]="nivelSeleccionado" (ngModelChange)="onNivelChange()">
        @for (n of NIVELES; track n) {
          <option [value]="n">{{ n }}</option>
        }
      </select>
    </div>
    @if (curriculumActiva(); as curr) {
      <div class="text-xs text-gray-500 pb-2">
        Currícula vigente: <span class="font-medium text-gray-700">{{ curr.nivel }} · {{ curr.anio }}</span>
        · estado <span class="badge badge-indigo text-[10px]">{{ curr.estado }}</span>
      </div>
    } @else if (!svc.loading()) {
      <p class="text-sm text-amber-700 pb-1">No hay currícula vigente para este nivel y año.</p>
    }
  </div>

  @if (svc.error()) {
    <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm" role="alert">
      {{ svc.error() }}
    </div>
  }

  @if (mensajeOk()) {
    <div class="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm" role="status">
      {{ mensajeOk() }}
    </div>
  }

  <div class="card overflow-hidden">
    @if (svc.loading()) {
      <div class="p-10 text-center text-gray-400 animate-pulse">Cargando áreas...</div>
    } @else if (!areas().length) {
      <div class="p-10 text-center text-gray-500">
        No hay áreas registradas para este nivel.
        @if (puedeGestionar() && curriculumActiva()) {
          <button class="btn btn-primary btn-sm mt-3" (click)="abrirModal()">Registrar primera área</button>
        }
      </div>
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left w-16">Orden</th>
              <th class="px-4 py-3 text-left">Área curricular</th>
              <th class="px-4 py-3 text-left">Nivel</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (a of areas(); track a.id) {
              <tr class="hover:bg-gray-50/80">
                <td class="px-4 py-3 font-semibold text-gray-600">{{ a.orden }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" [ngClass]="a.dotClass"></span>
                    <span class="font-medium text-gray-800">{{ a.nombre }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="badge badge-indigo text-[10px]">{{ a.nivel }}</span>
                </td>
                <td class="px-4 py-3 text-right">
                  @if (puedeGestionar() && curriculumEditable()) {
                    <button type="button" class="btn btn-secondary btn-sm mr-1" (click)="abrirModal(a)">Editar</button>
                    <button type="button" class="btn btn-ghost btn-sm text-red-500" (click)="abrirDesactivar(a)">Desactivar</button>
                  } @else {
                    <span class="text-xs text-gray-400">Solo lectura</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
        {{ areas().length }} área(s) activa(s)
      </div>
    }
  </div>
</div>

@if (modalAbierto()) {
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md" role="dialog" aria-modal="true">
      <div class="px-5 py-4 border-b border-gray-100">
        <h4 class="font-semibold text-gray-900">{{ editando() ? 'Editar área' : 'Nueva área curricular' }}</h4>
      </div>
      <div class="p-5 space-y-4">
        <div>
          <label class="form-label">Nombre del área *</label>
          <input class="form-input" [(ngModel)]="formNombre" (blur)="tocar('nombre')" placeholder="Ej. Matemática" />
          @if (fieldErrors().nombre) {
            <p class="form-error mt-1">{{ fieldErrors().nombre }}</p>
          }
        </div>
        <div>
          <label class="form-label">Orden *</label>
          <input class="form-input" type="number" min="1" [(ngModel)]="formOrden" (blur)="tocar('orden')" />
          @if (fieldErrors().orden) {
            <p class="form-error mt-1">{{ fieldErrors().orden }}</p>
          }
        </div>
        @if (errorForm()) {
          <p class="form-error" role="alert">{{ errorForm() }}</p>
        }
      </div>
      <div class="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="cerrarModal()">Cancelar</button>
        <button type="button" class="btn btn-primary" [disabled]="svc.saving() || !puedeGuardarForm()" (click)="guardar()">
          {{ svc.saving() ? 'Guardando…' : (editando() ? 'Guardar' : 'Registrar') }}
        </button>
      </div>
    </div>
  </div>
}

@if (desactivarArea()) {
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md" role="dialog" aria-modal="true">
      <div class="px-5 py-4 border-b border-gray-100">
        <h4 class="font-semibold text-gray-900">Desactivar área</h4>
        <p class="text-sm text-gray-500 mt-1">{{ desactivarArea()!.nombre }}</p>
      </div>
      <div class="p-5">
        <label class="form-label">Motivo *</label>
        <textarea class="form-input min-h-[4rem]" rows="2" [(ngModel)]="motivoCese" placeholder="Motivo del cese"></textarea>
        @if (fieldErrors().motivo) {
          <p class="form-error mt-1">{{ fieldErrors().motivo }}</p>
        }
      </div>
      <div class="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="cerrarDesactivar()">Cancelar</button>
        <button type="button" class="btn btn-primary bg-red-600 hover:bg-red-700"
          [disabled]="svc.saving()" (click)="confirmarDesactivar()">
          {{ svc.saving() ? 'Procesando…' : 'Confirmar cese' }}
        </button>
      </div>
    </div>
  </div>
}
  `,
})
export class PlanEstudiosAreasComponent implements OnInit {
  readonly svc = inject(PlanEstudiosAreasService);
  private readonly auth = inject(AuthService);
  private readonly _tenantReloadReady = setupTenantReload(() => this.cargar());

  readonly NIVELES = NIVELES;
  readonly anioEscolar = signal(new Date().getFullYear());
  anioInput = new Date().getFullYear();
  nivelSeleccionado: NivelCurricula = 'Primaria';

  readonly curriculas = signal<Curricula[]>([]);
  readonly areas = signal<Area[]>([]);
  readonly mensajeOk = signal('');
  readonly modalAbierto = signal(false);
  readonly editando = signal<Area | null>(null);
  readonly desactivarArea = signal<Area | null>(null);

  formNombre = '';
  formOrden = 1;
  motivoCese = '';
  errorForm = signal('');
  fieldErrors = signal<ErroresCampoArea>({});
  camposTocados = signal<Record<string, true>>({});
  private readonly formRevision = signal(0);

  readonly curriculumActiva = computed(() =>
    this.curriculas().find(
      (c) => c.nivel === this.nivelSeleccionado && c.estado === 'activo',
    ) ?? this.curriculas().find((c) => c.nivel === this.nivelSeleccionado) ?? null,
  );

  readonly curriculumEditable = computed(() => {
    const c = this.curriculumActiva();
    return !!c && c.estado !== 'inactivo';
  });

  readonly puedeGuardarForm = computed(() => {
    this.formRevision();
    return areaFormularioMinimoListo(this.valoresFormulario());
  });

  ngOnInit(): void {
    this.cargar();
    markTenantReloadReady(this._tenantReloadReady);
  }

  puedeGestionar(): boolean {
    return this.auth.hasAnyPermiso('curricula.gestionar', 'admin.institucional');
  }

  cargar(): void {
    this.anioEscolar.set(this.anioInput);
    this.mensajeOk.set('');
    this.svc.loadContext(this.anioEscolar()).subscribe({
      next: (ctx) => {
        this.curriculas.set(ctx.curriculas);
        this.syncAreasFromContext(ctx.areasPorCurricula);
      },
    });
  }

  onNivelChange(): void {
    const curr = this.curriculumActiva();
    if (curr) {
      this.svc.loadAreas(curr.id).subscribe({
        next: (items) => this.areas.set(items),
        error: () => this.areas.set([]),
      });
    } else {
      this.areas.set([]);
    }
  }

  private syncAreasFromContext(
    bloques: Array<{ curriculum: Curricula; areas: Area[] }>,
  ): void {
    const curr = this.curriculumActiva();
    if (!curr) {
      this.areas.set([]);
      return;
    }
    const match = bloques.find((b) => b.curriculum.id === curr.id);
    this.areas.set(match?.areas ?? []);
  }

  abrirModal(area?: Area): void {
    this.errorForm.set('');
    this.fieldErrors.set({});
    this.camposTocados.set({});
    if (area) {
      this.editando.set(area);
      this.formNombre = area.nombre;
      this.formOrden = area.orden;
    } else {
      this.editando.set(null);
      this.formNombre = '';
      this.formOrden = this.areas().length + 1;
    }
    this.modalAbierto.set(true);
    this.formRevision.update((v) => v + 1);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.editando.set(null);
  }

  abrirDesactivar(area: Area): void {
    this.desactivarArea.set(area);
    this.motivoCese = '';
    this.fieldErrors.set({});
  }

  cerrarDesactivar(): void {
    this.desactivarArea.set(null);
    this.motivoCese = '';
  }

  tocar(campo: keyof AreaFormValues): void {
    this.camposTocados.update((m) => ({ ...m, [campo]: true }));
    this.validarFormulario();
  }

  private valoresFormulario(): AreaFormValues {
    return {
      nombre: this.formNombre,
      orden: Number(this.formOrden),
    };
  }

  private validarFormulario(): void {
    const errors = validarAreaForm(this.valoresFormulario());
    const touched = this.camposTocados();
    const visibles: ErroresCampoArea = {};
    for (const [k, v] of Object.entries(errors) as [keyof ErroresCampoArea, string][]) {
      if (touched[k as string]) visibles[k] = v;
    }
    this.fieldErrors.set(visibles);
    this.formRevision.update((v) => v + 1);
  }

  guardar(): void {
    this.camposTocados.set({ nombre: true, orden: true });
    const errors = validarAreaForm(this.valoresFormulario());
    this.fieldErrors.set(errors);
    if (!areaFormularioMinimoListo(this.valoresFormulario())) {
      this.errorForm.set(primerErrorArea(errors));
      return;
    }
    this.errorForm.set('');
    const curr = this.curriculumActiva();
    if (!curr) {
      this.errorForm.set('No hay currícula vigente para registrar áreas.');
      return;
    }
    const nombre = normalizeAreaNombre(this.formNombre);
    const edit = this.editando();
    if (edit) {
      this.svc.updateArea(edit.id, { nombre, orden: this.formOrden }).subscribe({
        next: (updated) => {
          this.areas.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
          this.mensajeOk.set('Área actualizada correctamente.');
          this.cerrarModal();
        },
      });
      return;
    }
    this.svc.createArea({
      curriculumId: curr.id,
      nombre,
      nivel: this.nivelSeleccionado,
      orden: this.formOrden,
    }).subscribe({
      next: (created) => {
        this.areas.update((list) => [...list, created].sort((a, b) => a.orden - b.orden));
        this.mensajeOk.set('Área registrada correctamente.');
        this.cerrarModal();
      },
    });
  }

  confirmarDesactivar(): void {
    const area = this.desactivarArea();
    if (!area) return;
    const errors = validarAreaForm({
      nombre: area.nombre,
      orden: area.orden,
      desactivar: true,
      motivo: this.motivoCese,
    });
    if (errors.motivo) {
      this.fieldErrors.set({ motivo: errors.motivo });
      return;
    }
    this.svc.updateArea(area.id, { activo: false, motivo: this.motivoCese.trim() }).subscribe({
      next: () => {
        this.areas.update((list) => list.filter((a) => a.id !== area.id));
        this.mensajeOk.set('Área desactivada. El historial se conserva.');
        this.cerrarDesactivar();
      },
    });
  }
}
