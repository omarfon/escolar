import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import { AuthService } from '../../../core/auth/services/auth.service';
import { InstitucionalService } from '../../administracion/institucional/institucional.service';
import { Nivel } from '../../administracion/institucional/institucional.model';
import { JustificacionesService } from './justificaciones.service';
import { OverlayPortalDirective } from '../../../core/overlay/overlay-portal.directive';
import { mesActualIso } from '../control/control.service';
import {
  JustificacionItem,
  MOTIVOS_JUSTIFICACION,
  PendienteJustificacion,
  DIAS_PLAZO_JUSTIFICACION,
  justificacionAdjuntoUrl,
} from './justificaciones.model';

@Component({
  selector: 'app-justificaciones',
  standalone: true,
  imports: [FormsModule, NgClass, OverlayPortalDirective],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Justificación de Faltas</h2>
          <p class="text-sm text-gray-400 mt-0.5">
            Registro y seguimiento de inasistencias justificadas
          </p>
          <p class="text-xs text-gray-400 mt-1">
            Solo se pueden justificar faltas injustificadas (estado F) dentro del plazo de {{ diasPlazo }} días desde la fecha de la falta.
          </p>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="cargar()">
          <span class="icon icon-sm">refresh</span> Actualizar
        </button>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        @for (kpi of kpis(); track kpi.label) {
          <div class="card p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" [ngClass]="kpi.bg">
              <span class="icon" [ngClass]="kpi.color">{{ kpi.icon }}</span>
            </div>
            <div>
              <p class="text-xs text-gray-400">{{ kpi.label }}</p>
              <p class="text-xl font-bold text-gray-900">{{ kpi.value }}</p>
            </div>
          </div>
        }
      </div>

      <div class="tabs">
        <button class="tab" [class.tab-active]="tab() === 'pendientes'" (click)="tab.set('pendientes')">
          <span class="icon icon-sm">pending_actions</span> Pendientes
          @if (pendientes().length) {
            <span class="badge badge-red text-[10px] ml-1">{{ pendientes().length }}</span>
          }
        </button>
        <button class="tab" [class.tab-active]="tab() === 'historial'" (click)="tab.set('historial')">
          <span class="icon icon-sm">history</span> Historial
        </button>
      </div>

      <div class="card p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label class="form-label mb-1 block">Nivel</label>
            <select class="form-select" [ngModel]="filtro().nivel" (ngModelChange)="setFiltro('nivel', $event)">
              <option value="">Todos</option>
              @for (n of niveles(); track n.id) {
                <option [value]="n.nombre">{{ n.nombre }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Grado</label>
            <select class="form-select" [ngModel]="filtro().grado" (ngModelChange)="setFiltro('grado', $event)" [disabled]="!filtro().nivel">
              <option value="">Todos</option>
              @for (g of gradosDisponibles(); track g) {
                <option [value]="g">{{ g }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Mes</label>
            <input type="month" class="form-input"
              [ngModel]="filtro().mes" (ngModelChange)="setFiltro('mes', $event)">
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block">Buscar</label>
            <div class="relative">
              <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input class="form-input pl-10" placeholder="Nombre o motivo..."
                [ngModel]="filtro().busqueda" (ngModelChange)="setFiltro('busqueda', $event)">
            </div>
          </div>
        </div>
      </div>

      @if (tab() === 'pendientes') {
        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Nivel / Grado</th>
                  <th class="text-center">Sin justificar</th>
                  <th class="text-center">Justificadas</th>
                  <th>Última falta</th>
                  <th>Fechas en BD</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @if (svc.loading()) {
                  <tr><td colspan="7" class="py-12 text-center text-gray-400">Cargando pendientes...</td></tr>
                } @else {
                  @for (p of pendientesFiltrados(); track p.studentId) {
                    <tr>
                      <td>
                        <div class="font-medium text-gray-900">{{ p.estudiante }}</div>
                        <div class="text-xs text-gray-400">Sección {{ p.seccion }}</div>
                      </td>
                      <td>
                        <span class="badge text-[11px]" [ngClass]="nivelBadge(p.nivel)">{{ p.nivel }}</span>
                        <div class="text-sm text-gray-700 mt-1">{{ p.grado }}</div>
                      </td>
                      <td class="text-center">
                        <span class="font-bold text-red-600 text-lg">{{ p.faltasSinJustificar }}</span>
                      </td>
                      <td class="text-center">
                        <span class="text-green-600 font-medium">{{ p.faltasJustificadas }}</span>
                      </td>
                      <td class="text-sm text-gray-500">{{ p.ultimaFalta ?? '—' }}</td>
                      <td class="text-xs text-gray-500 max-w-[160px]">
                        {{ fechasPendientesLabel(p) }}
                      </td>
                      <td>
                        <div class="flex justify-center">
                          <button class="btn btn-primary btn-sm" (click)="abrirModal(p)">
                            <span class="icon icon-sm">fact_check</span> Justificar
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="py-12 text-center">
                        <span class="icon icon-2xl text-gray-200 block mb-2">check_circle</span>
                        <p class="text-gray-400 text-sm">No hay faltas injustificadas en BD para este mes</p>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha registro</th>
                  <th>Estudiante</th>
                  <th>Nivel / Grado</th>
                  <th class="text-center">Cantidad</th>
                  <th>Motivo</th>
                  <th>Fechas justificadas</th>
                  <th>Documentos</th>
                  <th>Registrado por</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @if (svc.loading()) {
                  <tr><td colspan="9" class="py-12 text-center text-gray-400">Cargando historial...</td></tr>
                } @else {
                  @for (j of historialFiltrado(); track j.id) {
                    <tr>
                      <td class="text-xs text-gray-500 whitespace-nowrap">{{ j.fechaRegistro }}</td>
                      <td>
                        <div class="font-medium text-gray-900">{{ j.estudiante }}</div>
                        <div class="text-xs text-gray-400">Sección {{ j.seccion }}</div>
                      </td>
                      <td>
                        <span class="badge text-[11px]" [ngClass]="nivelBadge(j.nivel)">{{ j.nivel }}</span>
                        <div class="text-sm text-gray-700 mt-1">{{ j.grado }}</div>
                      </td>
                      <td class="text-center font-bold text-indigo-600">{{ j.cantidad }}</td>
                      <td>
                        <div class="text-sm text-gray-800">{{ j.motivo }}</div>
                        @if (j.observacion) {
                          <div class="text-xs text-gray-400 mt-0.5">{{ j.observacion }}</div>
                        }
                      </td>
                      <td class="text-xs text-gray-500">{{ j.fechas.join(', ') }}</td>
                      <td class="text-xs">
                        @if (j.adjuntos?.length) {
                          <div class="flex flex-col gap-1">
                            @for (a of j.adjuntos; track a.url) {
                              <a [href]="adjuntoUrl(a.url)" target="_blank" rel="noopener"
                                class="text-indigo-600 hover:underline truncate max-w-[140px]"
                                [title]="a.nombreArchivo">
                                <span class="icon icon-sm align-middle">attach_file</span>
                                {{ a.nombreArchivo }}
                              </a>
                            }
                          </div>
                        } @else {
                          <span class="text-gray-400">—</span>
                        }
                      </td>
                      <td class="text-xs text-gray-500">{{ j.registradoPor }}</td>
                      <td>
                        <div class="flex justify-center">
                          <button class="btn-icon text-rose-500 hover:bg-rose-50" title="Anular justificación"
                            (click)="anular(j.id)">
                            <span class="icon icon-sm">undo</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="9" class="py-12 text-center">
                        <span class="icon icon-2xl text-gray-200 block mb-2">description</span>
                        <p class="text-gray-400 text-sm">No hay justificaciones registradas</p>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <div class="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
        <p class="font-bold mb-1 flex items-center gap-1">
          <span class="icon icon-sm">info</span> RN-006 · Justificación de faltas
        </p>
        <p>Las faltas justificadas no se computan como inasistencias injustificadas para alertas y reportes de riesgo.</p>
      </div>
    </div>

    @if (modalAbierto()) {
      <div appOverlayPortal class="fixed inset-0 z-[80]">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
          (click)="cerrarModal()"></div>

        <aside class="absolute inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl border-l border-gray-200
          flex flex-col animate-slide-in-r"
          (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="shrink-0 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 text-white px-5 py-5">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 min-w-0">
                <div class="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 border border-white/20">
                  <span class="icon text-2xl">fact_check</span>
                </div>
                <div class="min-w-0">
                  <p class="text-[11px] uppercase tracking-wider text-indigo-100 font-semibold">Justificar inasistencias</p>
                  <h3 class="font-bold text-lg leading-tight truncate">{{ seleccionado()?.estudiante }}</h3>
                  <div class="flex flex-wrap items-center gap-2 mt-2">
                    <span class="text-[11px] px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
                      {{ seleccionado()?.nivel }}
                    </span>
                    <span class="text-[11px] px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
                      {{ seleccionado()?.grado }} · Sec. {{ seleccionado()?.seccion }}
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" class="btn-icon text-white/80 hover:text-white hover:bg-white/10 shrink-0"
                (click)="cerrarModal()">
                <span class="icon">close</span>
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-4">
              <div class="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5">
                <p class="text-[10px] uppercase tracking-wide text-indigo-100">Sin justificar</p>
                <p class="text-2xl font-bold">{{ seleccionado()?.faltasSinJustificar ?? 0 }}</p>
              </div>
              <div class="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5">
                <p class="text-[10px] uppercase tracking-wide text-indigo-100">Seleccionadas</p>
                <p class="text-2xl font-bold">{{ faltasSeleccionadas().length }}</p>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0">

            <!-- Fechas BD -->
            <section>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <span class="icon icon-sm text-red-500">event_busy</span>
                  Faltas en base de datos
                </h4>
                @if ((seleccionado()?.faltasPendientes?.length ?? 0) > 1) {
                  <button type="button" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    (click)="toggleTodasFaltas()">
                    {{ todasFaltasSeleccionadas() ? 'Quitar todas' : 'Seleccionar todas' }}
                  </button>
                }
              </div>
              <div class="space-y-2">
                @for (f of seleccionado()?.faltasPendientes ?? []; track f.id) {
                  <label class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                    [ngClass]="faltasSeleccionadas().includes(f.id)
                      ? 'border-indigo-300 bg-indigo-50/80 ring-1 ring-indigo-200'
                      : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-white'">
                    <input type="checkbox" class="mt-1 accent-indigo-600"
                      [checked]="faltasSeleccionadas().includes(f.id)"
                      (change)="toggleFalta(f.id)">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-gray-900">{{ f.fechaLabel }}</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">F</span>
                      </div>
                      @if (f.observacion) {
                        <p class="text-xs text-gray-500 mt-1">{{ f.observacion }}</p>
                      }
                      @if (f.diasRestantes !== undefined) {
                        <p class="text-[11px] mt-1"
                          [ngClass]="f.diasRestantes === 0 ? 'text-amber-600 font-medium' : 'text-gray-400'">
                          @if (f.diasRestantes === 0) { Último día de plazo }
                          @else { {{ f.diasRestantes }} día(s) restante(s) }
                        </p>
                      }
                    </div>
                  </label>
                } @empty {
                  <div class="text-center py-8 rounded-xl border border-dashed border-gray-200 bg-gray-50">
                    <span class="icon text-3xl text-gray-300">event_available</span>
                    <p class="text-sm text-gray-400 mt-2">No hay registros F en BD</p>
                  </div>
                }
              </div>
            </section>

            <!-- Motivo -->
            <section>
              <h4 class="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <span class="icon icon-sm text-indigo-500">label</span>
                Motivo <span class="text-red-500">*</span>
              </h4>
              <div class="flex flex-wrap gap-2 mb-3">
                @for (m of motivos; track m) {
                  <button type="button"
                    class="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                    [ngClass]="form.motivo === m
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700'"
                    (click)="seleccionarMotivo(m)">
                    {{ m }}
                  </button>
                }
              </div>
              @if (form.motivo === 'Otro') {
                <input class="form-input" placeholder="Describe el motivo..." [(ngModel)]="form.motivoOtro">
              }
            </section>

            <!-- Adjuntos -->
            <section>
              <h4 class="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <span class="icon icon-sm text-indigo-500">attach_file</span>
                Documentos de sustento
                <span class="text-xs font-normal text-gray-400">(opcional)</span>
              </h4>
              <label class="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed
                border-gray-200 bg-gray-50/80 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-colors">
                <span class="icon text-3xl text-indigo-400">cloud_upload</span>
                <span class="text-sm font-medium text-gray-700">Arrastra o haz clic para adjuntar</span>
                <span class="text-[11px] text-gray-400">PDF, imágenes u Office · máx. 5 archivos · 10 MB c/u</span>
                <input type="file" class="hidden" multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt,.zip"
                  (change)="onAdjuntosChange($event)">
              </label>
              @if (adjuntosSeleccionados().length) {
                <ul class="mt-3 space-y-2">
                  @for (f of adjuntosSeleccionados(); track f.name + f.size) {
                    <li class="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-gray-200 text-sm">
                      <span class="icon icon-sm text-indigo-500 shrink-0">description</span>
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-800 truncate">{{ f.name }}</p>
                        <p class="text-[11px] text-gray-400">{{ formatTamano(f.size) }}</p>
                      </div>
                      <button type="button" class="btn-icon text-red-500 hover:bg-red-50 shrink-0"
                        (click)="quitarAdjunto(f)">
                        <span class="icon icon-sm">close</span>
                      </button>
                    </li>
                  }
                </ul>
              }
            </section>

            <!-- Observaciones -->
            <section>
              <h4 class="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <span class="icon icon-sm text-indigo-500">notes</span>
                Observaciones
              </h4>
              <textarea class="form-input min-h-[88px] resize-none" rows="3"
                placeholder="Ej. certificado médico del 12/06, reposo 2 días..."
                [(ngModel)]="form.observacion"></textarea>
            </section>

            @if (errorForm()) {
              <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <span class="icon icon-sm shrink-0 mt-0.5">error</span>
                {{ errorForm() }}
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="shrink-0 px-5 py-4 border-t border-gray-100 bg-gray-50/90 backdrop-blur flex items-center gap-3">
            <button type="button" class="btn btn-secondary flex-1" (click)="cerrarModal()">Cancelar</button>
            <button type="button" class="btn btn-primary flex-1 flex items-center justify-center gap-2"
              (click)="confirmar()"
              [disabled]="svc.saving() || !motivoValido() || faltasSeleccionadas().length === 0">
              @if (svc.saving()) {
                <span class="icon icon-sm animate-spin">progress_activity</span>
                Guardando...
              } @else {
                <span class="icon icon-sm">check_circle</span>
                Confirmar justificación
              }
            </button>
          </div>
        </aside>
      </div>
    }

    @if (notificacion(); as n) {
      <div class="fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 text-white"
        [ngClass]="n.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'">
        <span class="icon">{{ n.tipo === 'success' ? 'check_circle' : 'error' }}</span>
        {{ n.mensaje }}
      </div>
    }
  `,
})
export class JustificacionesComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  readonly svc = inject(JustificacionesService);
  private readonly institucional = inject(InstitucionalService);
  private readonly _tenantReloadReady = setupTenantReload(() => {
    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => this._niveles.set(niveles),
    });
    this.cargar();
  }, {
    onBeforeReload: () => {
      this._pendientes.set([]);
      this._historial.set([]);
      this.modalAbierto.set(false);
      this.seleccionado.set(null);
    },
  });

  readonly motivos = MOTIVOS_JUSTIFICACION;
  readonly diasPlazo = DIAS_PLAZO_JUSTIFICACION;

  readonly tab = signal<'pendientes' | 'historial'>('pendientes');
  readonly modalAbierto = signal(false);
  readonly seleccionado = signal<PendienteJustificacion | null>(null);
  readonly faltasSeleccionadas = signal<number[]>([]);
  readonly adjuntosSeleccionados = signal<File[]>([]);
  readonly errorForm = signal('');
  readonly notificacion = signal<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);

  private readonly _pendientes = signal<PendienteJustificacion[]>([]);
  private readonly _historial = signal<JustificacionItem[]>([]);
  private readonly _niveles = signal<Nivel[]>([]);
  readonly niveles = this._niveles.asReadonly();
  readonly pendientes = this._pendientes.asReadonly();

  readonly filtro = signal({
    nivel: '',
    grado: '',
    mes: mesActualIso(),
    busqueda: '',
  });

  form = { motivo: '', motivoOtro: '', observacion: '' };

  readonly gradosDisponibles = computed(() => {
    const nivel = this._niveles().find((n) => n.nombre === this.filtro().nivel);
    return nivel?.grados.map((g) => g.nombre) ?? [];
  });

  readonly pendientesFiltrados = computed(() => {
    const q = this.filtro().busqueda.toLowerCase().trim();
    if (!q) return this._pendientes();
    return this._pendientes().filter((p) =>
      `${p.estudiante} ${p.grado} ${p.nivel}`.toLowerCase().includes(q),
    );
  });

  readonly historialFiltrado = computed(() => {
    const q = this.filtro().busqueda.toLowerCase().trim();
    if (!q) return this._historial();
    return this._historial().filter((j) =>
      `${j.estudiante} ${j.motivo} ${j.grado}`.toLowerCase().includes(q),
    );
  });

  readonly kpis = computed(() => {
    const pendientes = this._pendientes();
    const historial = this._historial();
    return [
      {
        label: 'Pendientes',
        value: pendientes.length,
        icon: 'pending_actions',
        bg: 'bg-red-100',
        color: 'text-red-600',
      },
      {
        label: 'Faltas por justificar',
        value: pendientes.reduce((s, p) => s + p.faltasSinJustificar, 0),
        icon: 'event_busy',
        bg: 'bg-amber-100',
        color: 'text-amber-600',
      },
      {
        label: 'Justificaciones',
        value: historial.length,
        icon: 'fact_check',
        bg: 'bg-green-100',
        color: 'text-green-600',
      },
      {
        label: 'Faltas justificadas',
        value: historial.reduce((s, j) => s + j.cantidad, 0),
        icon: 'check_circle',
        bg: 'bg-indigo-100',
        color: 'text-indigo-600',
      },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle('Justificaciones');
    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => this._niveles.set(niveles),
    });
    this.cargar();
    markTenantReloadReady(this._tenantReloadReady);
  }

  cargar(): void {
    const filters = this.buildFilters();
    this.svc.loadPending(filters).subscribe({
      next: (items) => this._pendientes.set(items),
      error: () => this.mostrarNotificacion('No se pudieron cargar los pendientes', 'error'),
    });
    this.svc.loadHistorial(filters).subscribe({
      next: (items) => this._historial.set(items),
      error: () => this.mostrarNotificacion('No se pudo cargar el historial', 'error'),
    });
  }

  setFiltro(campo: 'nivel' | 'grado' | 'mes' | 'busqueda', valor: string): void {
    this.filtro.update((f) => {
      const next = { ...f, [campo]: valor };
      if (campo === 'nivel') next.grado = '';
      return next;
    });
    if (campo !== 'busqueda') this.cargar();
  }

  abrirModal(item: PendienteJustificacion): void {
    this.seleccionado.set(item);
    this.faltasSeleccionadas.set(item.faltasPendientes?.map((f) => f.id) ?? []);
    this.adjuntosSeleccionados.set([]);
    this.form = { motivo: '', motivoOtro: '', observacion: '' };
    this.errorForm.set('');
    this.modalAbierto.set(true);
  }

  toggleFalta(id: number): void {
    this.faltasSeleccionadas.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  seleccionarMotivo(motivo: string): void {
    this.form.motivo = this.form.motivo === motivo ? '' : motivo;
    if (motivo !== 'Otro') this.form.motivoOtro = '';
  }

  readonly todasFaltasSeleccionadas = computed(() => {
    const pendientes = this.seleccionado()?.faltasPendientes ?? [];
    if (!pendientes.length) return false;
    const ids = this.faltasSeleccionadas();
    return pendientes.every((f) => ids.includes(f.id));
  });

  toggleTodasFaltas(): void {
    const pendientes = this.seleccionado()?.faltasPendientes ?? [];
    if (this.todasFaltasSeleccionadas()) {
      this.faltasSeleccionadas.set([]);
    } else {
      this.faltasSeleccionadas.set(pendientes.map((f) => f.id));
    }
  }

  formatTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  fechasPendientesLabel(p: PendienteJustificacion): string {
    return (p.faltasPendientes ?? []).map((f) => f.fechaLabel).join(', ') || '—';
  }

  adjuntoUrl(url: string): string {
    return justificacionAdjuntoUrl(url);
  }

  onAdjuntosChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const nuevos = Array.from(input.files ?? []);
    const merged = [...this.adjuntosSeleccionados(), ...nuevos].slice(0, 5);
    this.adjuntosSeleccionados.set(merged);
    input.value = '';
  }

  quitarAdjunto(file: File): void {
    this.adjuntosSeleccionados.update((list) => list.filter((f) => f !== file));
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.seleccionado.set(null);
  }

  motivoValido(): boolean {
    if (!this.form.motivo) return false;
    if (this.form.motivo === 'Otro') return this.form.motivoOtro.trim().length >= 2;
    return true;
  }

  confirmar(): void {
    const item = this.seleccionado();
    const attendanceIds = this.faltasSeleccionadas();
    if (!item || !this.motivoValido() || !attendanceIds.length) return;

    const cantidad = attendanceIds.length;
    const motivo =
      this.form.motivo === 'Otro' ? this.form.motivoOtro.trim() : this.form.motivo;

    this.errorForm.set('');
    this.svc
      .create({
        studentId: item.studentId,
        cantidad,
        motivo,
        observacion: this.form.observacion.trim() || undefined,
        registradoPor: this.auth.nombreCompleto() || 'Administración',
        mes: this.filtro().mes || undefined,
        attendanceIds,
        adjuntos: this.adjuntosSeleccionados(),
      })
      .subscribe({
        next: () => {
          this.cerrarModal();
          this.cargar();
          this.mostrarNotificacion(
            `${cantidad} falta(s) justificada(s) — ${item.estudiante.split(',')[0]}`,
          );
        },
        error: (err) => {
          this.errorForm.set(err.message ?? 'No se pudo registrar la justificación');
        },
      });
  }

  anular(id: number): void {
    if (!confirm('Anular esta justificación? Las faltas volverán a estado sin justificar.')) return;
    this.svc.delete(id).subscribe({
      next: () => {
        this.cargar();
        this.mostrarNotificacion('Justificación anulada');
      },
      error: () => this.mostrarNotificacion('No se pudo anular la justificación', 'error'),
    });
  }

  nivelBadge(nivel: string): string {
    return {
      Inicial: 'badge-purple',
      Primaria: 'badge-blue',
      Secundaria: 'badge-indigo',
    }[nivel] ?? 'badge-gray';
  }

  private buildFilters() {
    const { nivel, grado, mes, busqueda } = this.filtro();
    return {
      nivel: nivel || undefined,
      grado: grado || undefined,
      mes: mes || undefined,
      busqueda: busqueda || undefined,
    };
  }

  private mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' = 'success'): void {
    this.notificacion.set({ mensaje, tipo });
    setTimeout(() => this.notificacion.set(null), 3000);
  }
}
