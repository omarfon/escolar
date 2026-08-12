import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Nivel } from '../../../administracion/institucional/institucional.model';
import {
  CreateMaestroFormulaPayload,
  FormulaComponenteItem,
} from './formulas-evaluacion.model';

@Component({
  selector: 'app-formula-evaluacion-drawer',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    @if (abierto) {
      <div
        class="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        (click)="cerrar.emit()"
        aria-hidden="true"
      ></div>

      <aside
        class="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="editId ? 'Editar fórmula' : 'Nueva fórmula'"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 class="font-semibold text-gray-900">
              {{ editId ? 'Editar fórmula' : 'Nueva fórmula' }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Define la estructura ponderada de calificación
            </p>
          </div>
          <button type="button" class="btn btn-ghost btn-icon text-gray-400" (click)="cerrar.emit()">
            <span class="icon">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="form-label">Nombre</label>
              <input
                class="form-input mt-1"
                [(ngModel)]="form.nombre"
                (ngModelChange)="nombreChange.emit()"
              >
            </div>
            <div>
              <label class="form-label">Código</label>
              <input class="form-input mt-1 font-mono text-sm" [(ngModel)]="form.codigo">
            </div>
            <div>
              <label class="form-label">Nivel (opcional)</label>
              <select
                class="form-select mt-1"
                [(ngModel)]="form.nivel"
                (ngModelChange)="nivelChange.emit()"
              >
                <option value="">Todos</option>
                @for (n of niveles; track n.id) {
                  <option [value]="n.nombre">{{ n.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="form-label">Grado (opcional)</label>
              <select class="form-select mt-1" [(ngModel)]="form.grado" [disabled]="!form.nivel">
                <option value="">Todos</option>
                @for (g of grados; track g) {
                  <option [value]="g">{{ g }}</option>
                }
              </select>
            </div>
            <div>
              <label class="form-label">Curso (opcional)</label>
              <input class="form-input mt-1" [(ngModel)]="form.curso" placeholder="Ej. Matemática">
            </div>
            <div>
              <label class="form-label">Bimestre (opcional)</label>
              <select class="form-select mt-1" [(ngModel)]="form.bimestre">
                <option [ngValue]="null">Todos</option>
                @for (b of [1, 2, 3, 4]; track b) {
                  <option [ngValue]="b">Bimestre {{ b }}</option>
                }
              </select>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="form-label mb-0">Componentes de evaluación</label>
              <button type="button" class="btn btn-secondary btn-xs" (click)="agregarComponente.emit()">
                <span class="icon icon-sm">add</span> Agregar
              </button>
            </div>
            <div class="rounded-xl border border-gray-200 overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th class="px-3 py-2 text-left">Nombre</th>
                    <th class="px-3 py-2 text-left">Código</th>
                    <th class="px-3 py-2 text-center">Peso %</th>
                    <th class="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of form.componentes; track $index; let i = $index) {
                    <tr class="border-t border-gray-100">
                      <td class="px-3 py-2">
                        <input
                          class="form-input py-1"
                          [(ngModel)]="c.nombre"
                          (ngModelChange)="componenteNombreChange.emit(c)"
                        >
                      </td>
                      <td class="px-3 py-2">
                        <input class="form-input py-1 font-mono text-xs" [(ngModel)]="c.codigo">
                      </td>
                      <td class="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          class="form-input py-1 w-20 mx-auto text-center"
                          [(ngModel)]="c.peso"
                        >
                      </td>
                      <td class="px-3 py-2 text-right">
                        @if (form.componentes.length > 1) {
                          <button
                            type="button"
                            class="btn btn-ghost btn-icon text-red-500"
                            title="Quitar componente"
                            (click)="quitarComponente.emit(i)"
                          >
                            <span class="icon icon-sm">delete</span>
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="text-xs mt-2" [ngClass]="sumaPesos === 100 ? 'text-green-600' : 'text-red-600'">
              Suma de pesos: {{ sumaPesos }}% (debe ser 100%)
            </p>
          </div>

          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" [(ngModel)]="form.esDefault">
            Usar como fórmula predeterminada
          </label>
        </div>

        <div class="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button type="button" class="btn btn-primary flex-1" [disabled]="saving || sumaPesos !== 100" (click)="guardar.emit()">
            <span class="icon icon-sm">{{ editId ? 'save' : 'add' }}</span>
            {{ saving ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Guardar fórmula') }}
          </button>
          <button type="button" class="btn btn-secondary" (click)="cerrar.emit()" [disabled]="saving">
            Cancelar
          </button>
        </div>
      </aside>
    }
  `,
})
export class FormulaEvaluacionDrawerComponent {
  @Input({ required: true }) form!: CreateMaestroFormulaPayload;
  @Input() abierto = false;
  @Input() editId: number | null = null;
  @Input() niveles: Nivel[] = [];
  @Input() grados: string[] = [];
  @Input() saving = false;
  @Input() sumaPesos = 0;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<void>();
  @Output() nombreChange = new EventEmitter<void>();
  @Output() nivelChange = new EventEmitter<void>();
  @Output() agregarComponente = new EventEmitter<void>();
  @Output() quitarComponente = new EventEmitter<number>();
  @Output() componenteNombreChange = new EventEmitter<FormulaComponenteItem>();
}
