import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { HistorialAcademicoService } from './historial-academico.service';
import {
  HistorialAcademicoDetalle,
  HistorialAcademicoListItem,
  conductaColorClass,
  estadoMatriculaLabel,
  notaColorClass,
} from './historial-academico.model';

@Component({
  selector: 'app-historial-academico',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  template: `
<div class="min-h-screen bg-gray-50 animate-fade-in">

  <div class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <span>Gestión Académica</span><span>›</span>
          <span class="text-gray-700 font-medium">Historial Académico</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Historial Académico</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          Trayectoria escolar, notas y asistencia por alumno — A.E. {{ anioEscolar }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <a routerLink="/matricula/historial-academico" class="btn btn-secondary text-sm">
          <span class="icon icon-sm">upload_file</span> Carga masiva
        </a>
        <span class="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100">
          {{ alumnosFiltrados().length }} alumno(s)
        </span>
      </div>
    </div>
  </div>

  <div class="p-6 max-w-[1600px] mx-auto">
    @if (errorMsg()) {
      <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {{ errorMsg() }}
        <button class="ml-3 underline font-medium" (click)="cargarLista()">Reintentar</button>
      </div>
    }

    @if (svc.loading()) {
      <div class="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
        Cargando alumnos desde el servidor…
      </div>
    }

    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <!-- Lista de alumnos -->
      <div class="xl:col-span-5 space-y-4">
        <div class="card p-4">
          <div class="relative">
            <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">search</span>
            <input
              type="search"
              class="form-input pl-10 bg-gray-50 w-full"
              placeholder="Buscar por nombre, DNI o código…"
              [(ngModel)]="busqueda"
              (ngModelChange)="onBusquedaChange()"
            />
          </div>
        </div>

        <div class="card overflow-hidden">
          @if (!alumnosFiltrados().length && !svc.loading()) {
            <div class="p-8 text-center text-sm text-gray-400">No se encontraron alumnos</div>
          } @else {
            <table class="w-full text-sm table-fixed">
              <thead class="bg-gray-50">
                <tr>
                  <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Alumno</th>
                  <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Grado</th>
                  <th class="text-right px-4 py-2 text-xs font-semibold text-gray-500">Prom.</th>
                </tr>
              </thead>
            </table>
            <div class="max-h-[calc(100vh-280px)] overflow-y-auto">
              <table class="w-full text-sm table-fixed">
                <tbody>
                  @for (a of alumnosFiltrados(); track a.id) {
                  <tr
                    class="border-t border-gray-100 cursor-pointer transition-colors h-[72px]"
                    [ngClass]="selId() === a.id ? 'bg-indigo-50' : 'hover:bg-gray-50'"
                    (click)="seleccionar(a.id)"
                  >
                    <td class="px-4 py-3">
                      <div class="font-medium text-gray-900">{{ a.apellidos }}, {{ a.nombres }}</div>
                      <div class="text-xs text-gray-400 mt-0.5">{{ a.codigo || '—' }} · DNI {{ a.dni || '—' }}</div>
                    </td>
                    <td class="px-4 py-3 text-gray-600">
                      <div>{{ a.nivel }} {{ a.gradoActual }}</div>
                      <div class="text-xs text-gray-400">Secc. {{ a.seccionActual }}</div>
                    </td>
                    <td class="px-4 py-3 text-right">
                      @if (a.promedioUltimo !== null) {
                        <span class="font-bold" [ngClass]="notaColor(a.promedioUltimo)">{{ a.promedioUltimo }}</span>
                      } @else {
                        <span class="text-gray-300">—</span>
                      }
                      <div class="text-xs text-gray-400 mt-0.5">{{ a.aniosRegistrados }} año(s)</div>
                    </td>
                  </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      <!-- Detalle -->
      <div class="xl:col-span-7">
        @if (!selId()) {
          <div class="card p-12 text-center text-gray-400">
            <div class="text-4xl mb-3 opacity-40">📚</div>
            <p class="text-sm">Selecciona un alumno para ver su historial académico completo</p>
          </div>
        } @else if (svc.loadingDetalle()) {
          <div class="card p-8 text-center text-sm text-indigo-700 bg-indigo-50">
            Cargando historial del alumno…
          </div>
        } @else if (detalle()) {
          <div class="space-y-4">
            <!-- Cabecera alumno -->
            <div class="card p-5">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 class="text-xl font-bold text-gray-900">
                    {{ detalle()!.apellidos }}, {{ detalle()!.nombres }}
                  </h2>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ detalle()!.codigo }} · DNI {{ detalle()!.dni || '—' }} · Ingreso {{ detalle()!.anioIngreso }}
                  </p>
                  <p class="text-sm text-gray-600 mt-1">
                    {{ detalle()!.nivel }} {{ detalle()!.gradoActual }} · Sección {{ detalle()!.seccionActual }}
                  </p>
                </div>
                <div class="grid grid-cols-3 gap-3 shrink-0">
                  <div class="text-center px-3 py-2 bg-gray-50 rounded-lg">
                    <div class="text-lg font-bold text-indigo-600">{{ detalle()!.asistenciaPct }}%</div>
                    <div class="text-[10px] text-gray-400 uppercase">Asistencia</div>
                  </div>
                  <div class="text-center px-3 py-2 bg-gray-50 rounded-lg">
                    <div class="text-lg font-bold" [ngClass]="conductaColor(detalle()!.conductaNota)">
                      {{ detalle()!.conductaNota }}
                    </div>
                    <div class="text-[10px] text-gray-400 uppercase">Conducta</div>
                  </div>
                  <div class="text-center px-3 py-2 bg-gray-50 rounded-lg">
                    <div class="text-lg font-bold text-gray-700">{{ detalle()!.trayectoria.length }}</div>
                    <div class="text-[10px] text-gray-400 uppercase">Años</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tabs -->
            <div class="flex border-b border-gray-200">
              @for (t of TABS; track t.id) {
                <button
                  class="px-4 py-2.5 text-sm font-medium border-b-2 transition-all"
                  [ngClass]="tab() === t.id
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'"
                  (click)="tab.set(t.id)"
                >
                  {{ t.label }}
                </button>
              }
            </div>

            @if (tab() === 'trayectoria') {
              <div class="card overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Trayectoria desde el primer grado registrado
                  </p>
                  <p class="text-xs text-gray-400">Haz clic en un año para ver notas y asistencia</p>
                </div>
                @if (!detalle()!.trayectoria.length) {
                  <div class="p-8 text-center text-sm text-gray-400">Sin trayectoria registrada</div>
                } @else {
                  <div class="divide-y divide-gray-100">
                    @for (t of detalle()!.trayectoria; track t.anio) {
                      <div [ngClass]="t.esActual ? 'bg-indigo-50/40' : ''">
                        <button
                          type="button"
                          class="w-full p-4 text-left hover:bg-gray-50/80 transition-colors"
                          [attr.aria-expanded]="anioExpandido(t.anio)"
                          (click)="toggleAnio(t.anio)"
                        >
                          <div class="flex flex-wrap items-start justify-between gap-3">
                            <div class="flex items-start gap-3 min-w-0">
                              <span
                                class="icon text-gray-400 mt-0.5 shrink-0 transition-transform duration-200"
                                [ngClass]="anioExpandido(t.anio) ? 'rotate-90' : ''"
                              >chevron_right</span>
                              <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                  <span class="text-lg font-bold text-gray-900">{{ t.anio }}</span>
                                  @if (t.esActual) {
                                    <span class="badge badge-indigo text-xs">Año actual</span>
                                  }
                                </div>
                                <p class="text-sm text-gray-600 mt-1">
                                  {{ t.grado }} · Sección {{ t.seccion }}
                                </p>
                                @if (!anioExpandido(t.anio)) {
                                  <p class="text-xs text-gray-400 mt-1">
                                    {{ t.notas.length }} nota(s)
                                    @if (t.asistencia.total > 0) {
                                      · {{ t.asistencia.total }} registro(s) de asistencia
                                    }
                                  </p>
                                }
                              </div>
                            </div>
                            <div class="flex items-center gap-4 text-sm shrink-0">
                              <div class="text-right">
                                <div class="text-xs text-gray-400">Promedio</div>
                                <div class="font-bold" [ngClass]="notaColor(t.promedio)">{{ t.promedio }}</div>
                              </div>
                              <div class="text-right">
                                <div class="text-xs text-gray-400">Asistencia</div>
                                <div class="font-semibold text-indigo-600">{{ t.asistencia.porcentaje }}%</div>
                              </div>
                              <div>
                                <span class="badge badge-green text-xs">{{ t.estado }}</span>
                              </div>
                            </div>
                          </div>
                        </button>

                        @if (anioExpandido(t.anio)) {
                          <div class="px-4 pb-4 pt-0 ml-9 space-y-3 border-t border-gray-100/80">
                            @if (t.asistencia.total > 0) {
                              <div>
                                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Asistencia</p>
                                <div class="flex flex-wrap gap-3 text-xs text-gray-500">
                                  <span>Registros: {{ t.asistencia.total }}</span>
                                  <span class="text-green-600">Presentes: {{ t.asistencia.presentes }}</span>
                                  <span class="text-red-600">Faltas: {{ t.asistencia.faltas }}</span>
                                  <span class="text-yellow-600">Tardanzas: {{ t.asistencia.tardanzas }}</span>
                                  <span class="text-blue-600">Justificadas: {{ t.asistencia.justificadas }}</span>
                                </div>
                              </div>
                            } @else {
                              <p class="text-xs text-gray-400">Sin registros de asistencia para este año.</p>
                            }

                            @if (t.notas.length) {
                              <div>
                                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notas del año</p>
                                <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                  <table class="w-full text-xs">
                                    <thead class="bg-gray-50">
                                      <tr>
                                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Curso</th>
                                        <th class="text-center px-3 py-2 font-semibold text-gray-500">Bim.</th>
                                        <th class="text-center px-3 py-2 font-semibold text-gray-500">Tipo</th>
                                        <th class="text-right px-3 py-2 font-semibold text-gray-500">Nota</th>
                                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Fecha</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      @for (n of t.notas; track $index) {
                                        <tr class="border-t border-gray-100">
                                          <td class="px-3 py-2">{{ n.curso }}</td>
                                          <td class="px-3 py-2 text-center">{{ n.bimestre }}</td>
                                          <td class="px-3 py-2 text-center capitalize">{{ n.tipo }}</td>
                                          <td class="px-3 py-2 text-right font-bold" [ngClass]="notaColor(n.nota)">{{ n.nota }}</td>
                                          <td class="px-3 py-2 text-gray-500">{{ n.fechaEvaluacion }}</td>
                                        </tr>
                                      }
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            } @else {
                              <p class="text-xs text-gray-400">Sin notas registradas para este año.</p>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }

            @if (tab() === 'notas') {
              <div class="card overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Notas del año en curso ({{ anioEscolar }})
                  </p>
                  @if (detalle()!.resumenNotas.promedioGeneral !== null) {
                    <span class="text-sm">
                      Promedio general:
                      <strong [ngClass]="notaColor(detalle()!.resumenNotas.promedioGeneral!)">
                        {{ detalle()!.resumenNotas.promedioGeneral }}
                      </strong>
                      · {{ detalle()!.resumenNotas.totalRegistros }} registro(s)
                    </span>
                  }
                </div>

                @if (detalle()!.resumenNotas.porBimestre.length) {
                  <div class="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3">
                    @for (b of detalle()!.resumenNotas.porBimestre; track b.bimestre) {
                      <div class="px-3 py-2 bg-gray-50 rounded-lg text-xs">
                        <span class="text-gray-500">Bimestre {{ b.bimestre }}:</span>
                        <span class="font-bold ml-1" [ngClass]="notaColor(b.promedio)">{{ b.promedio }}</span>
                        <span class="text-gray-400 ml-1">({{ b.cantidad }})</span>
                      </div>
                    }
                  </div>
                }

                @if (!detalle()!.notasActuales.length) {
                  <div class="p-8 text-center text-sm text-gray-400">Sin notas registradas para el año actual</div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Curso</th>
                          <th class="text-center px-4 py-2 text-xs font-semibold text-gray-500">Bimestre</th>
                          <th class="text-center px-4 py-2 text-xs font-semibold text-gray-500">Tipo</th>
                          <th class="text-right px-4 py-2 text-xs font-semibold text-gray-500">Nota</th>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Fecha eval.</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (n of detalle()!.notasActuales; track $index) {
                          <tr class="border-t border-gray-100">
                            <td class="px-4 py-2 font-medium">{{ n.curso }}</td>
                            <td class="px-4 py-2 text-center">{{ n.bimestre }}</td>
                            <td class="px-4 py-2 text-center capitalize">{{ n.tipo }}</td>
                            <td class="px-4 py-2 text-right font-bold" [ngClass]="notaColor(n.nota)">{{ n.nota }}</td>
                            <td class="px-4 py-2 text-gray-500">{{ n.fechaEvaluacion }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            }

            @if (tab() === 'asistencia') {
              <div class="card overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Resumen de asistencia por año lectivo
                  </p>
                </div>
                @if (!detalle()!.trayectoria.some(t => t.asistencia.total > 0)) {
                  <div class="p-8 text-center text-sm text-gray-400">Sin registros de asistencia</div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Año</th>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Grado</th>
                          <th class="text-right px-4 py-2 text-xs font-semibold text-gray-500">Total</th>
                          <th class="text-right px-4 py-2 text-xs font-semibold text-gray-500">Presentes</th>
                          <th class="text-right px-4 py-2 text-xs font-semibold text-gray-500">Faltas</th>
                          <th class="text-right px-4 py-2 text-xs font-semibold text-gray-500">Tardanzas</th>
                          <th class="text-right px-4 py-2 text-xs font-semibold text-gray-500">Justif.</th>
                          <th class="text-right px-4 py-2 text-xs font-semibold text-gray-500">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (t of detalle()!.trayectoria; track t.anio) {
                          @if (t.asistencia.total > 0) {
                            <tr class="border-t border-gray-100" [ngClass]="t.esActual ? 'bg-indigo-50/40' : ''">
                              <td class="px-4 py-2 font-medium">{{ t.anio }}</td>
                              <td class="px-4 py-2 text-gray-600">{{ t.grado }}</td>
                              <td class="px-4 py-2 text-right">{{ t.asistencia.total }}</td>
                              <td class="px-4 py-2 text-right text-green-600">{{ t.asistencia.presentes }}</td>
                              <td class="px-4 py-2 text-right text-red-600">{{ t.asistencia.faltas }}</td>
                              <td class="px-4 py-2 text-right text-yellow-600">{{ t.asistencia.tardanzas }}</td>
                              <td class="px-4 py-2 text-right text-blue-600">{{ t.asistencia.justificadas }}</td>
                              <td class="px-4 py-2 text-right font-bold text-indigo-600">{{ t.asistencia.porcentaje }}%</td>
                            </tr>
                          }
                        }
                      </tbody>
                    </table>
                  </div>
                  <div class="px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm text-gray-600">
                    Asistencia global acumulada: <strong class="text-indigo-700">{{ detalle()!.asistenciaPct }}%</strong>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  </div>
</div>
  `,
})
export class HistorialAcademicoComponent implements OnInit {
  readonly svc = inject(HistorialAcademicoService);
  private readonly layout = inject(LayoutService);

  readonly anioEscolar = new Date().getFullYear();
  readonly TABS = [
    { id: 'trayectoria' as const, label: 'Trayectoria' },
    { id: 'notas' as const, label: 'Notas actuales' },
    { id: 'asistencia' as const, label: 'Asistencia' },
  ];

  busqueda = '';
  private busquedaTimer?: ReturnType<typeof setTimeout>;

  readonly tab = signal<'trayectoria' | 'notas' | 'asistencia'>('trayectoria');
  readonly selId = signal<number | null>(null);
  readonly errorMsg = signal('');
  private readonly aniosExpandidos = signal<Set<string>>(new Set());
  private readonly _alumnos = signal<HistorialAcademicoListItem[]>([]);
  readonly detalle = signal<HistorialAcademicoDetalle | null>(null);

  readonly alumnosFiltrados = computed(() => this._alumnos());

  ngOnInit(): void {
    this.layout.setTitle('Historial Académico');
    this.cargarLista();
  }

  notaColor = notaColorClass;
  conductaColor = conductaColorClass;
  estadoLabel = estadoMatriculaLabel;

  onBusquedaChange(): void {
    clearTimeout(this.busquedaTimer);
    this.busquedaTimer = setTimeout(() => this.cargarLista(), 300);
  }

  cargarLista(): void {
    this.errorMsg.set('');
    this.svc.loadList(this.busqueda, 1, 50).subscribe({
      next: (res) => {
        this._alumnos.set(res.items);
        const id = this.selId();
        if (id && !res.items.some((r) => r.id === id)) {
          this.seleccionar(id);
        }
      },
      error: (err: Error) => this.errorMsg.set(err.message),
    });
  }

  seleccionar(id: number): void {
    if (this.selId() === id) return;
    this.selId.set(id);
    this.tab.set('trayectoria');
    this.detalle.set(null);
    this.aniosExpandidos.set(new Set());
    this.errorMsg.set('');
    this.svc.loadDetalle(id).subscribe({
      next: (d) => {
        this.detalle.set(d);
        const actual = d.trayectoria.find((t) => t.esActual);
        if (actual) {
          this.aniosExpandidos.set(new Set([actual.anio]));
        }
      },
      error: (err: Error) => this.errorMsg.set(err.message),
    });
  }

  anioExpandido(anio: string): boolean {
    return this.aniosExpandidos().has(anio);
  }

  toggleAnio(anio: string): void {
    const next = new Set(this.aniosExpandidos());
    if (next.has(anio)) next.delete(anio);
    else next.add(anio);
    this.aniosExpandidos.set(next);
  }

  trackAlumno(_index: number, alumno: HistorialAcademicoListItem): number {
    return alumno.id;
  }
}
