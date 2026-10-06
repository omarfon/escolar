import { Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { Estudiante } from '../services/expedientes.service';

@Component({
  selector: 'app-estudiantes-list-table',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="card overflow-hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th class="text-left">Estudiante</th>
            <th class="text-left hidden md:table-cell">DNI</th>
            <th class="text-left hidden sm:table-cell">Grado</th>
            <th class="text-center">Estado</th>
            <th class="text-left hidden lg:table-cell">Asistencia</th>
            <th class="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (e of estudiantes(); track e.id) {
            <tr class="hover:bg-gray-50">
              <td>
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    [ngClass]="e.sexo === 'F' ? 'bg-pink-500' : 'bg-indigo-500'"
                  >
                    {{ iniciales(e.nombres, e.apellidos) }}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900 text-sm">{{ e.apellidos }}, {{ e.nombres }}</div>
                    <div class="text-xs text-gray-400 flex flex-wrap gap-1 items-center">
                      {{ e.codigo }}
                      @if (e.estadoDocumento === 'pendiente_regularizacion') {
                        <span class="badge badge-amber text-[10px]">Sin DNI</span>
                      }
                    </div>
                  </div>
                </div>
              </td>
              <td class="hidden md:table-cell text-sm text-gray-600">
                {{ e.dni || (e.estadoDocumento === 'pendiente_regularizacion' ? 'Pendiente' : '—') }}
              </td>
              <td class="hidden sm:table-cell text-sm text-gray-600">{{ e.grado }} – {{ e.seccion }}</td>
              <td class="text-center">
                <span
                  class="badge text-xs"
                  [ngClass]="e.estado === 'activo' ? 'badge-green' : e.estado === 'retirado' ? 'badge-red' : 'badge-gray'"
                >
                  {{ e.estado }}
                </span>
              </td>
              <td class="hidden lg:table-cell">
                <div class="flex items-center gap-2">
                  <div class="flex-1 progress h-1.5">
                    <div
                      class="progress-bar h-1.5"
                      [ngClass]="e.asistenciaPct >= 90 ? 'bg-green-500' : e.asistenciaPct >= 75 ? 'bg-yellow-400' : 'bg-red-400'"
                      [style.width]="e.asistenciaPct + '%'"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500 w-8 text-right">{{ e.asistenciaPct }}%</span>
                </div>
              </td>
              <td class="text-center">
                <div class="flex items-center justify-center gap-1">
                  <button class="btn-icon text-blue-500" title="Ver expediente" (click)="verExpediente.emit(e)">
                    <span class="icon icon-sm">folder_open</span>
                  </button>
                  <button class="btn-icon text-indigo-500" title="Editar" (click)="editar.emit(e)">
                    <span class="icon icon-sm">edit</span>
                  </button>
                  <button class="btn-icon text-red-400" title="Eliminar" (click)="eliminar.emit(e.id)">
                    <span class="icon icon-sm">delete_outline</span>
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="py-16 text-center">
                <div class="flex flex-col items-center gap-2 text-gray-300">
                  <span class="icon icon-2xl">search_off</span>
                  <p class="text-sm text-gray-400">Sin resultados para los filtros aplicados</p>
                  <button class="btn btn-ghost text-xs" (click)="limpiarFiltros.emit()">Limpiar filtros</button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
      <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        <span class="text-xs text-gray-500">{{ inicio() + 1 }}–{{ fin() }} de {{ totalFiltrados() }}</span>
        <div class="flex items-center gap-1">
          <button class="btn-icon" [disabled]="paginaActual() === 1" (click)="irPagina.emit(paginaActual() - 1)">
            <span class="icon icon-sm">chevron_left</span>
          </button>
          @for (p of paginas(); track p) {
            <button
              class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
              [ngClass]="p === paginaActual() ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
              (click)="irPagina.emit(p)"
            >
              {{ p }}
            </button>
          }
          <button
            class="btn-icon"
            [disabled]="paginaActual() === totalPaginas()"
            (click)="irPagina.emit(paginaActual() + 1)"
          >
            <span class="icon icon-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class EstudiantesListTableComponent {
  readonly estudiantes = input.required<Estudiante[]>();
  readonly paginaActual = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly totalFiltrados = input.required<number>();
  readonly inicio = input.required<number>();
  readonly fin = input.required<number>();
  readonly paginas = input.required<number[]>();

  readonly verExpediente = output<Estudiante>();
  readonly editar = output<Estudiante>();
  readonly eliminar = output<number>();
  readonly irPagina = output<number>();
  readonly limpiarFiltros = output<void>();

  iniciales(n: string, a: string): string {
    return ((n?.[0] ?? '') + (a?.[0] ?? '')).toUpperCase();
  }
}
