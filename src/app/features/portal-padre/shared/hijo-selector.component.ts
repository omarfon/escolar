import { Component, inject, input, OnInit, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { HijoResumen, parentescoLabel } from '../seguimiento/seguimiento.model';
import { SeguimientoService } from '../seguimiento/seguimiento.service';

@Component({
  selector: 'app-hijo-selector',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="mt-4 mb-1">
      @if (svc.loadingHijos()) {
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-400">
          <span class="icon icon-sm animate-spin">progress_activity</span>
          Cargando…
        </div>
      } @else if (!svc.hijos().length) {
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
          <span class="icon icon-sm">info</span>
          Sin alumnos vinculados
        </div>
      } @else if (svc.hijos().length === 1) {
        @if (svc.hijoSeleccionado(); as h) {
          <div class="inline-flex items-center gap-2.5 max-w-full px-2.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100/80 shadow-sm">
            <div class="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
              {{ iniciales(h.nombreCompleto) }}
            </div>
            <div class="min-w-0 pr-1">
              <p class="text-sm font-semibold text-gray-900 truncate leading-tight">{{ h.nombreCompleto }}</p>
              <p class="text-[11px] text-indigo-600/80 truncate leading-tight">
                {{ h.aulaLabel }} · {{ parentescoLabel(h.parentesco) }}
              </p>
            </div>
          </div>
        }
      } @else {
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-indigo-500 shrink-0 hidden sm:inline">
            Hijo/a
          </span>
          @for (h of svc.hijos(); track h.studentId) {
            <button
              type="button"
              class="group relative flex items-center gap-2 max-w-full rounded-2xl border text-left transition-all duration-300 ease-out
                     px-2.5 py-1.5 hover:px-4 hover:py-2.5 hover:shadow-lg hover:-translate-y-0.5 hover:z-10
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              [ngClass]="svc.hijoSeleccionado()?.studentId === h.studentId
                ? 'border-indigo-400 bg-gradient-to-r from-indigo-50 to-violet-50 shadow-md ring-1 ring-indigo-200/80'
                : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'"
              (click)="seleccionar(h)">
              <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-110"
                [ngClass]="svc.hijoSeleccionado()?.studentId === h.studentId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 group-hover:bg-indigo-600 group-hover:text-white'">
                {{ iniciales(h.nombreCompleto) }}
              </div>
              <div class="min-w-0 pr-0.5">
                <p class="text-sm font-semibold text-gray-900 truncate leading-tight max-w-[9rem] sm:max-w-[11rem]
                          group-hover:max-w-none group-hover:whitespace-normal">
                  {{ h.nombreCompleto }}
                </p>
                <p class="text-[11px] text-gray-500 leading-tight truncate max-w-[9rem] sm:max-w-[11rem]
                          group-hover:max-w-none group-hover:text-indigo-600 group-hover:whitespace-normal">
                  {{ h.aulaLabel }}
                  <span class="opacity-70 group-hover:opacity-100"> · {{ parentescoLabel(h.parentesco) }}</span>
                </p>
              </div>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class HijoSelectorComponent implements OnInit {
  readonly svc = inject(SeguimientoService);
  readonly parentescoLabel = parentescoLabel;
  readonly autoLoad = input(true);
  readonly emitInitial = input(true);
  readonly hijoChange = output<HijoResumen>();

  ngOnInit(): void {
    if (!this.autoLoad()) return;
    this.svc.loadHijos().subscribe(() => this.emitSeleccionInicial());
  }

  iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    const a = partes[0]?.[0] ?? '';
    const b = partes.length > 1 ? (partes[partes.length - 1][0] ?? '') : '';
    return (a + b).toUpperCase() || '?';
  }

  seleccionar(h: HijoResumen): void {
    if (this.svc.hijoSeleccionado()?.studentId === h.studentId) return;
    this.svc.seleccionarHijo(h);
    this.hijoChange.emit(h);
  }

  emitSeleccionInicial(): void {
    const hijo = this.svc.hijoSeleccionado();
    if (hijo && this.emitInitial()) {
      this.hijoChange.emit(hijo);
    }
  }
}
