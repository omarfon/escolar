import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import {
  MatriculaHistorialContext,
  MatriculaHistorialDetalle,
  MatriculaHistorialEvento,
} from '../../../core/api/enrollment-history-api.service';
import { HistorialAcademicoListItem } from '../../academico/historial-academico/historial-academico.model';
import { estadoMatriculaLabel, notaColorClass } from '../../academico/historial-academico/historial-academico.model';
import { HistorialMatriculaService, httpErrorMessage } from './historial-matricula.service';
import { rutaTrasladoDesdeEvento, transferIdDesdeEvento } from './historial-traslado.util';

const EVENTO_ICON: Record<string, string> = {
  matricula: 'school',
  retiro: 'person_off',
  reingreso: 'person_add',
  cambio_seccion: 'compare_arrows',
  continuidad: 'autorenew',
  evaluacion: 'fact_check',
  retroalimentacion: 'forum',
  traslado: 'swap_horiz',
};

const EVENTO_COLOR: Record<string, string> = {
  matricula: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  retiro: 'bg-red-100 text-red-700 border-red-200',
  reingreso: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cambio_seccion: 'bg-amber-100 text-amber-800 border-amber-200',
  continuidad: 'bg-sky-100 text-sky-700 border-sky-200',
  evaluacion: 'bg-violet-100 text-violet-700 border-violet-200',
  retroalimentacion: 'bg-teal-100 text-teal-700 border-teal-200',
  traslado: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

@Component({
  selector: 'app-historial-matricula',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  template: `
<div class="min-h-screen bg-gray-50 animate-fade-in">
  <div class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <span>Gestión de Matrícula</span><span>›</span>
          <span class="text-gray-700 font-medium">Historial de matrícula</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Historial de matrícula</h1>
        @if (context(); as ctx) {
          <p class="text-sm text-gray-500 mt-0.5">
            Trayectoria de matrícula consolidada — {{ ctx.institucion.nombre }} · A.E. {{ ctx.institucion.anioEscolar }}
          </p>
        }
      </div>
      <div class="flex items-center gap-2">
        <a routerLink="/academico/historial-academico" class="btn btn-secondary text-sm">
          <span class="icon icon-sm">timeline</span> Historial académico
        </a>
        <button class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="svc.loading() || svc.loadingDetalle()">
          <span class="icon icon-sm">refresh</span> Actualizar
        </button>
        <span class="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100">
          {{ alumnos().length }} alumno(s)
        </span>
      </div>
    </div>
  </div>

  <div class="p-6 max-w-[1600px] mx-auto">
    @if (errorMsg()) {
      <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
        {{ errorMsg() }}
        <button class="ml-3 underline font-medium" (click)="cargar()">Reintentar</button>
      </div>
    }

    @if (svc.loading() && !alumnos().length) {
      <div class="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
        Cargando alumnos…
      </div>
    }

    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div class="xl:col-span-5 space-y-4">
        <div class="card p-4">
          <div class="relative">
            <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">search</span>
            <input
              type="search"
              class="form-input pl-10 bg-gray-50 w-full"
              placeholder="Buscar por nombre, DNI o código…"
              [ngModel]="busqueda()"
              (ngModelChange)="onBusquedaChange($event)"
            />
          </div>
        </div>

        <div class="card overflow-hidden">
          @if (!alumnos().length && !svc.loading()) {
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
                  @for (a of alumnos(); track a.id) {
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

      <div class="xl:col-span-7">
        @if (!selId()) {
          <div class="card p-12 text-center text-gray-400">
            <div class="text-4xl mb-3 opacity-40">📋</div>
            <p class="text-sm">Selecciona un alumno para ver su historial de matrícula</p>
          </div>
        } @else if (svc.loadingDetalle()) {
          <div class="card p-8 text-center text-sm text-indigo-700 bg-indigo-50">
            Cargando historial de matrícula…
          </div>
        } @else if (detalle(); as d) {
          <div class="space-y-4">
            <div class="card p-5">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 class="text-xl font-bold text-gray-900">{{ d.estudiante.apellidos }}, {{ d.estudiante.nombres }}</h2>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ d.estudiante.codigo }} · DNI {{ d.estudiante.dni || '—' }} · Ingreso {{ d.estudiante.anioIngreso }}
                  </p>
                  <p class="text-sm text-gray-600 mt-1">
                    {{ d.estudiante.nivel }} {{ d.estudiante.gradoActual }} · Sección {{ d.estudiante.seccionActual }}
                  </p>
                  <span class="inline-flex mt-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {{ estadoLabel(d.estudiante.estadoMatricula) }}
                  </span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                  <div class="text-center px-3 py-2 bg-gray-50 rounded-lg">
                    <div class="text-lg font-bold text-indigo-600">{{ d.resumen.eventosTotal }}</div>
                    <div class="text-[10px] text-gray-400 uppercase">Eventos</div>
                  </div>
                  <div class="text-center px-3 py-2 bg-gray-50 rounded-lg">
                    <div class="text-lg font-bold text-gray-800">{{ d.resumen.aniosRegistrados }}</div>
                    <div class="text-[10px] text-gray-400 uppercase">Años</div>
                  </div>
                  <div class="text-center px-3 py-2 bg-gray-50 rounded-lg">
                    <div class="text-lg font-bold text-emerald-600">{{ d.resumen.asistenciaPct }}%</div>
                    <div class="text-[10px] text-gray-400 uppercase">Asistencia</div>
                  </div>
                  <div class="text-center px-3 py-2 bg-gray-50 rounded-lg">
                    @if (d.resumen.promedioGeneral !== null) {
                      <div class="text-lg font-bold" [ngClass]="notaColor(d.resumen.promedioGeneral)">{{ d.resumen.promedioGeneral }}</div>
                    } @else {
                      <div class="text-lg font-bold text-gray-300">—</div>
                    }
                    <div class="text-[10px] text-gray-400 uppercase">Promedio</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card p-5">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 class="font-semibold text-gray-900">Línea de tiempo de matrícula</h3>
                @if (context(); as ctx) {
                  <label class="flex items-center gap-2 text-sm text-gray-600">
                    <span class="sr-only">Filtrar por tipo de evento</span>
                    <select
                      class="form-input text-sm py-1.5 min-w-[220px]"
                      [ngModel]="filtroTipo()"
                      (ngModelChange)="filtroTipo.set($event)"
                    >
                      <option value="">Todos los eventos ({{ d.eventosMatricula.length }})</option>
                      @for (t of ctx.tiposEvento; track t.codigo) {
                        <option [value]="t.codigo">{{ t.label }}</option>
                      }
                    </select>
                  </label>
                }
              </div>
              @if (!d.eventosMatricula.length) {
                <p class="text-sm text-gray-400 text-center py-6">Sin eventos de matrícula registrados</p>
              } @else if (!eventosFiltrados().length) {
                <p class="text-sm text-gray-400 text-center py-6">No hay eventos del tipo seleccionado</p>
              } @else {
                <ol class="relative border-l border-gray-200 ml-3 space-y-6">
                  @for (ev of eventosFiltrados(); track ev.id) {
                    <li class="ml-6">
                      <span
                        class="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full border"
                        [ngClass]="eventoColor(ev.tipo)"
                      >
                        <span class="icon text-[14px]">{{ eventoIcon(ev.tipo) }}</span>
                      </span>
                      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                        <div>
                          <p class="text-sm font-semibold text-gray-900">{{ ev.titulo }}</p>
                          <p class="text-sm text-gray-600 mt-0.5">{{ ev.descripcion }}</p>
                          @if (ev.actorNombre) {
                            <p class="text-xs text-gray-400 mt-1">
                              Registrado por {{ ev.actorNombre }}@if (ev.actorRol) { ({{ ev.actorRol }})}
                            </p>
                          }
                          @if (ev.tipo === 'traslado' && transferIdDesdeEvento(ev); as tid) {
                            <a
                              class="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline mt-2"
                              [routerLink]="rutaTraslado(ev)"
                              [queryParams]="{ transferId: tid }"
                            >
                              <span class="icon text-[14px]">open_in_new</span>
                              Ver solicitud de traslado
                            </a>
                          }
                        </div>
                        <time class="text-xs text-gray-400 shrink-0">{{ ev.fecha }}</time>
                      </div>
                    </li>
                  }
                </ol>
              }
            </div>

            @if (d.trayectoriaAcademica.length) {
              <div class="card overflow-hidden">
                <div class="px-5 py-3 border-b border-gray-100">
                  <h3 class="font-semibold text-gray-900">Trayectoria académica por año</h3>
                </div>
                <table class="w-full text-sm">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Año</th>
                      <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Grado</th>
                      <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Sección</th>
                      <th class="text-right px-4 py-2 text-xs font-semibold text-gray-500">Promedio</th>
                      <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (t of d.trayectoriaAcademica; track t.anio) {
                      <tr class="border-t border-gray-100">
                        <td class="px-4 py-2 font-medium text-gray-800">{{ t.anio }}</td>
                        <td class="px-4 py-2 text-gray-600">{{ t.grado }}</td>
                        <td class="px-4 py-2 text-gray-600">{{ t.seccion }}</td>
                        <td class="px-4 py-2 text-right">
                          <span class="font-semibold" [ngClass]="notaColor(t.promedio)">{{ t.promedio }}</span>
                        </td>
                        <td class="px-4 py-2 text-gray-600">{{ t.estado }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
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
export class HistorialMatriculaComponent implements OnInit {
  readonly svc = inject(HistorialMatriculaService);
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly tenant = inject(TenantContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly _tenantReloadReady = setupTenantReload(
    () => this.cargar(),
    {
      onBeforeReload: () => {
        this.detalle.set(null);
        this.selId.set(null);
        this.alumnos.set([]);
        this.context.set(null);
      },
    },
  );

  readonly context = signal<MatriculaHistorialContext | null>(null);
  readonly alumnos = signal<HistorialAcademicoListItem[]>([]);
  readonly detalle = signal<MatriculaHistorialDetalle | null>(null);
  readonly selId = signal<number | null>(null);
  readonly busqueda = signal('');
  readonly errorMsg = signal('');

  private busquedaTimer: ReturnType<typeof setTimeout> | null = null;

  readonly anioEscolar = computed(() => this.context()?.institucion.anioEscolar ?? new Date().getFullYear());
  readonly filtroTipo = signal('');
  readonly eventosFiltrados = computed(() => {
    const d = this.detalle();
    if (!d) return [];
    const tipo = this.filtroTipo();
    if (!tipo) return d.eventosMatricula;
    return d.eventosMatricula.filter((ev) => ev.tipo === tipo);
  });

  ngOnInit(): void {
    this.layout.setTitle('Historial de matrícula');
    if (!this.tenant.requiresSelection()) {
      this.cargar();
      const studentId = Number(this.route.snapshot.queryParamMap.get('studentId'));
      if (studentId > 0) {
        this.seleccionar(studentId);
      }
    }
    markTenantReloadReady(this._tenantReloadReady);
  }

  cargar(): void {
    this.errorMsg.set('');
    this.svc.loadContext().subscribe({
      next: (ctx) => this.context.set(ctx),
      error: (err) => this.errorMsg.set(httpErrorMessage(err, 'No se pudo cargar el contexto')),
    });
    this.svc.loadList(this.busqueda(), 1, 50).subscribe({
      next: (items) => {
        this.alumnos.set(items);
        const id = this.selId();
        if (id && !items.some((a) => a.id === id)) {
          this.seleccionar(id);
        }
      },
      error: (err) => this.errorMsg.set(httpErrorMessage(err, 'No se pudo cargar el listado')),
    });
  }

  onBusquedaChange(value: string): void {
    this.busqueda.set(value);
    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
    this.busquedaTimer = setTimeout(() => {
      this.svc.loadList(value, 1, 50).subscribe({
        next: (items) => this.alumnos.set(items),
        error: (err) => this.errorMsg.set(httpErrorMessage(err, 'Error en búsqueda')),
      });
    }, 300);
  }

  seleccionar(id: number): void {
    this.selId.set(id);
    this.detalle.set(null);
    this.filtroTipo.set('');
    this.errorMsg.set('');
    this.svc.loadDetalle(id).subscribe({
      next: (d) => this.detalle.set(d),
      error: (err) => this.errorMsg.set(httpErrorMessage(err, 'No se pudo cargar el detalle')),
    });
  }

  notaColor(nota: number): string {
    return notaColorClass(nota);
  }

  estadoLabel(estado: string): string {
    return estadoMatriculaLabel(estado);
  }

  eventoIcon(tipo: string): string {
    return EVENTO_ICON[tipo] ?? 'circle';
  }

  eventoColor(tipo: string): string {
    return EVENTO_COLOR[tipo] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  }

  readonly transferIdDesdeEvento = transferIdDesdeEvento;

  rutaTraslado(ev: MatriculaHistorialEvento): string {
    return rutaTrasladoDesdeEvento(ev, {
      puedeAprobarDestino: this.auth.hasAnyPermiso('traslados.aprobar_destino'),
      codigoModular: this.context()?.institucion.codigoModular,
    });
  }

  trackAlumno(_index: number, alumno: HistorialAcademicoListItem): number {
    return alumno.id;
  }
}
