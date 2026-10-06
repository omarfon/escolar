import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import { TenantInstitutionPickerComponent } from '../../../core/tenant/tenant-institution-picker.component';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { InstitucionalService } from '../../administracion/institucional/institucional.service';
import { Nivel } from '../../administracion/institucional/institucional.model';
import { AlertasService } from './alertas.service';
import { mesActualIso } from '../control/control.service';
import {
  AlertaAusentismo,
  AlertSettings,
  AlertasResumen,
  NivelAlerta,
  RecurrentAlertEstado,
  RecurrentAlertItem,
  RecurrentAlertsContext,
} from './alertas.model';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, TenantInstitutionPickerComponent],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Alertas de Ausentismo</h2>
          <p class="text-sm text-gray-400 mt-0.5">
            Monitoreo de alumnos que superan el umbral de inasistencias
            @if (mesLabel()) {
              · <span class="text-gray-500">{{ mesLabel() }}</span>
            }
          </p>
          <p class="text-xs text-gray-400 mt-1">
            Indicadores observables de inasistencia (estado F). No constituyen un diagnóstico clínico.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-secondary btn-sm" (click)="cargar()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
          @if (context()?.permisos?.gestionar) {
            <button class="btn btn-primary btn-sm" (click)="escanearRecurrentes()"
              [disabled]="svc.scanning() || !puedeOperarInstitucion()">
              <span class="icon icon-sm">radar</span>
              {{ svc.scanning() ? 'Detectando...' : 'Detectar recurrentes' }}
            </button>
          }
        </div>
      </div>

      @if (tenant.canSelectInstitution()) {
        <div class="card p-4 border-l-4 border-violet-400">
          <app-tenant-institution-picker
            label="Institución para alertas recurrentes"
            placeholder="— Seleccione institución —"
            hint="Las alertas persistentes y la detección aplican a la IE seleccionada."
            [required]="true"
            (modoChange)="onConsultaModoChange($event)" />
        </div>
      }

      <!-- Maestro de configuración -->
      <div class="card p-5 border-l-4 border-indigo-400">
        <div class="flex flex-col lg:flex-row lg:items-end gap-4">
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 flex items-center gap-2">
              <span class="icon text-indigo-500">tune</span>
              Configuración de alertas (Maestro)
            </h3>
            <p class="text-xs text-gray-500 mt-1">
              Define cuántos días de ausencia injustificada (totales o consecutivos) activan una alerta.
            </p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:flex-1">
            <div>
              <label class="form-label mb-1 block">Días para alerta temprana</label>
              <input type="number" class="form-input" min="1" max="30"
                [(ngModel)]="settingsForm.diasAlertaAusentismo">
              <p class="text-[11px] text-gray-400 mt-1">Alerta si supera este valor (ej. 2 → desde el 3.er día)</p>
            </div>
            <div>
              <label class="form-label mb-1 block">Días para alerta crítica</label>
              <input type="number" class="form-input" min="2" max="60"
                [(ngModel)]="settingsForm.diasAlertaCritica">
              <p class="text-[11px] text-gray-400 mt-1">Nivel de riesgo alto</p>
            </div>
            <div>
              <label class="form-label mb-1 block">% inasistencia (periodo)</label>
              <input type="number" class="form-input" min="1" max="100"
                [(ngModel)]="settingsForm.porcentajeUmbral">
            </div>
            <div>
              <label class="form-label mb-1 block">Periodo de evaluación</label>
              <select class="form-select" [(ngModel)]="settingsForm.periodoTipo">
                <option value="mes">Mes calendario</option>
                <option value="bimestre">Bimestre</option>
                <option value="rolling30">Últimos 30 días</option>
              </select>
            </div>
            <div>
              <label class="form-label mb-1 block">Nivel educativo</label>
              <select class="form-select" [(ngModel)]="settingsForm.nivelEducativo">
                <option value="">Todos</option>
                @for (n of niveles(); track n.id) {
                  <option [value]="n.nombre">{{ n.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="form-label mb-1 block">Modalidad</label>
              <select class="form-select" [(ngModel)]="settingsForm.modalidad">
                <option value="todos">Todas</option>
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary btn-sm shrink-0" (click)="guardarSettings()"
            [disabled]="svc.saving()">
            {{ svc.saving() ? 'Guardando...' : 'Guardar configuración' }}
          </button>
        </div>
        @if (settings()) {
          <div class="mt-3 pt-3 border-t text-xs text-gray-500 flex flex-wrap gap-4">
            <span>Umbral actual: <strong class="text-amber-600">{{ settings()!.diasAlertaAusentismo }} días</strong></span>
            <span>Crítico: <strong class="text-red-600">{{ settings()!.diasAlertaCritica }} días</strong></span>
          </div>
        }
        @if (errorSettings()) {
          <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ errorSettings() }}
          </div>
        }
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        @for (kpi of kpis(); track kpi.label) {
          <div class="card p-4 flex items-center gap-3" [ngClass]="kpi.border ?? ''">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" [ngClass]="kpi.bg">
              <span class="icon" [ngClass]="kpi.color">{{ kpi.icon }}</span>
            </div>
            <div>
              <p class="text-xs text-gray-400">{{ kpi.label }}</p>
              <p class="text-xl font-bold" [ngClass]="kpi.text ?? 'text-gray-900'">{{ kpi.value }}</p>
            </div>
          </div>
        }
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
          <div>
            <label class="form-label mb-1 block">Vista</label>
            <select class="form-select" [ngModel]="filtro().severidad" (ngModelChange)="setFiltro('severidad', $event)">
              <option value="con_faltas">Con faltas en BD</option>
              <option value="todos">Solo alertas (umbral)</option>
              <option value="alerta">Alerta temprana</option>
              <option value="critico">Críticas</option>
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Buscar</label>
            <div class="relative">
              <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input class="form-input pl-10" placeholder="Nombre del alumno..."
                [ngModel]="filtro().busqueda" (ngModelChange)="setFiltro('busqueda', $event)">
            </div>
          </div>
        </div>
      </div>

      <div class="card p-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h3 class="font-semibold text-gray-900">Alertas recurrentes persistidas</h3>
            <p class="text-xs text-gray-500">Casos registrados con workflow: atender, derivar, cerrar o justificar.</p>
          </div>
          <select class="form-select sm:w-48" [ngModel]="filtroRecurrente().estado"
            (ngModelChange)="setFiltroRecurrente('estado', $event)">
            <option value="">Abiertas (activas)</option>
            <option value="abierta">Solo nuevas</option>
            <option value="atendida">Atendidas</option>
            <option value="derivada">Derivadas</option>
            <option value="cerrada">Cerradas</option>
            <option value="todas">Todas</option>
          </select>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Estudiante</th>
                <th>Periodo</th>
                <th class="text-center">Faltas</th>
                <th class="text-center">%</th>
                <th>Observación</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (svc.recurrentLoading()) {
                <tr><td colspan="7" class="py-8 text-center text-gray-400">Cargando alertas recurrentes...</td></tr>
              } @else {
                @for (r of recurrentes(); track r.id) {
                  <tr>
                    <td><span class="badge text-[11px]" [ngClass]="estadoBadge(r.estado)">{{ estadoLabel(r.estado) }}</span></td>
                    <td>
                      <div class="font-medium text-gray-900">{{ r.estudiante }}</div>
                      <div class="text-xs text-gray-400">{{ r.nivel }} · {{ r.grado }} {{ r.seccion }}</div>
                    </td>
                    <td class="text-sm text-gray-600">{{ r.periodoLabel || r.periodoKey }}</td>
                    <td class="text-center font-semibold text-red-600">{{ r.faltasInjustificadas }}</td>
                    <td class="text-center text-sm">{{ r.porcentajeInasistencia }}%</td>
                    <td class="text-xs text-gray-600 max-w-[200px]">{{ r.motivoObservacion }}</td>
                    <td>
                      @if (context()?.permisos?.gestionar && r.estado !== 'cerrada') {
                        <div class="flex items-center gap-1 justify-center flex-wrap">
                          <button type="button" class="btn btn-secondary btn-xs" (click)="accionRecurrente(r, 'atender')">Atender</button>
                          <button type="button" class="btn btn-secondary btn-xs" (click)="accionRecurrente(r, 'derivar')">Derivar</button>
                          <button type="button" class="btn btn-secondary btn-xs" (click)="accionRecurrente(r, 'cerrar')">Cerrar</button>
                          <a routerLink="/asistencia/justificaciones" class="btn btn-secondary btn-xs">Justificar</a>
                        </div>
                      } @else {
                        <span class="text-xs text-gray-400">—</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="py-8 text-center text-gray-400 text-sm">
                      No hay alertas recurrentes para los filtros seleccionados.
                      @if (context()?.permisos?.gestionar) {
                        Use «Detectar recurrentes» para generar casos a partir de las reglas configuradas.
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="px-4 pt-4 pb-2 border-b">
          <h3 class="font-semibold text-gray-900">Vista en tiempo real (mes actual)</h3>
          <p class="text-xs text-gray-500">Evaluación on-demand según umbrales; no reemplaza el registro persistido arriba.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Severidad</th>
                <th>Estudiante</th>
                <th>Nivel / Grado</th>
                <th class="text-center">Injustificadas</th>
                <th class="text-center">Consecutivas</th>
                <th>Última falta</th>
                <th>Motivo</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (svc.loading()) {
                <tr><td colspan="8" class="py-12 text-center text-gray-400">Cargando alertas...</td></tr>
              } @else {
                @for (a of alertasFiltradas(); track a.studentId) {
                  <tr [class.bg-red-50]="a.nivelAlerta === 'critico'">
                    <td>
                      <span class="badge text-[11px]" [ngClass]="severidadBadge(a.nivelAlerta)">
                        {{ severidadLabel(a.nivelAlerta) }}
                      </span>
                    </td>
                    <td>
                      <div class="font-medium text-gray-900">{{ a.estudiante }}</div>
                      <div class="text-xs text-gray-400">Sección {{ a.seccion }}</div>
                    </td>
                    <td>
                      <span class="badge text-[11px]" [ngClass]="nivelBadge(a.nivel)">{{ a.nivel }}</span>
                      <div class="text-sm text-gray-700 mt-1">{{ a.grado }}</div>
                    </td>
                    <td class="text-center">
                      <span class="font-bold text-red-600 text-lg">{{ a.faltasInjustificadas }}</span>
                      @if (a.fechasInasistencia?.length) {
                        <div class="text-[10px] text-gray-400 mt-0.5" [title]="fechasInasistenciaLabel(a)">
                          {{ a.fechasInasistencia!.length }} en BD
                        </div>
                      }
                    </td>
                    <td class="text-center">
                      <span class="font-bold" [ngClass]="a.diasConsecutivos > (settings()?.diasAlertaAusentismo ?? 2) ? 'text-amber-600' : 'text-gray-600'">
                        {{ a.diasConsecutivos }}
                      </span>
                    </td>
                    <td class="text-sm text-gray-500">{{ a.ultimaFalta ?? '—' }}</td>
                    <td class="text-xs text-gray-600 max-w-[180px]">{{ a.motivoAlerta }}</td>
                    <td>
                      <div class="flex items-center gap-1 justify-center">
                        <a routerLink="/asistencia/justificaciones" class="btn-icon text-blue-500 hover:bg-blue-50" title="Justificar">
                          <span class="icon icon-sm">fact_check</span>
                        </a>
                        <button type="button"
                          class="inline-flex items-center justify-center p-1.5 rounded-lg border-0 cursor-pointer transition-colors"
                          [ngClass]="a.apoderadoNotificado
                            ? 'bg-emerald-50 hover:bg-emerald-100 ring-1 ring-emerald-200/80'
                            : 'bg-transparent hover:bg-amber-50'"
                          [title]="notificarTitle(a)"
                          (click)="notificar(a)">
                          <span class="icon icon-sm transition-colors"
                            [ngClass]="a.apoderadoNotificado ? 'text-emerald-600' : 'text-amber-500'">
                            {{ a.apoderadoNotificado ? 'notifications_active' : 'notifications' }}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="py-12 text-center">
                      @if (resumen()?.totalRegistrosAsistencia === 0) {
                        <span class="icon icon-2xl text-gray-200 block mb-2">event_busy</span>
                        <p class="text-gray-500 text-sm font-medium">No hay registros de asistencia en este mes</p>
                        <p class="text-gray-400 text-xs mt-2 max-w-md mx-auto">
                          Registre faltas en el control diario o cargue datos demo con
                          <code class="text-[11px] bg-gray-100 px-1 rounded">npm run db:asistencia-data</code>
                        </p>
                      } @else if ((resumen()?.alumnosConFaltasInjustificadas ?? 0) === 0) {
                        <span class="icon icon-2xl text-green-200 block mb-2">verified</span>
                        <p class="text-gray-400 text-sm">No hay faltas injustificadas registradas en BD para este mes</p>
                      } @else {
                        <span class="icon icon-2xl text-amber-200 block mb-2">info</span>
                        <p class="text-gray-500 text-sm">Hay {{ resumen()?.alumnosConFaltasInjustificadas }} alumno(s) con faltas en BD</p>
                        <p class="text-gray-400 text-xs mt-1">Cambie la vista a «Con faltas en BD» o baje el umbral de alerta</p>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-900">
          <p class="font-bold mb-1 flex items-center gap-1">
            <span class="icon icon-sm">warning</span> Alerta temprana
          </p>
          <p>Se activa cuando un alumno supera {{ settings()?.diasAlertaAusentismo ?? 2 }} días de falta injustificada (total o consecutiva).</p>
        </div>
        <div class="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-900">
          <p class="font-bold mb-1 flex items-center gap-1">
            <span class="icon icon-sm">error</span> Alerta crítica
          </p>
          <p>Indica riesgo alto cuando supera {{ settings()?.diasAlertaCritica ?? 5 }} días. Requiere seguimiento inmediato.</p>
        </div>
      </div>
    </div>

    @if (accionModal(); as modal) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="cerrarAccionModal()">
        <div class="card p-5 w-full max-w-md" (click)="$event.stopPropagation()">
          <h3 class="font-semibold text-gray-900 mb-2">{{ modal.titulo }}</h3>
          <p class="text-xs text-gray-500 mb-3">{{ modal.alerta.estudiante }}</p>
          @if (modal.tipo === 'derivar') {
            <label class="form-label mb-1 block">Derivar a rol</label>
            <input class="form-input mb-2" [(ngModel)]="accionForm.derivadoARol" placeholder="Ej. Orientación">
            <label class="form-label mb-1 block">Usuario destino</label>
            <input class="form-input mb-2" [(ngModel)]="accionForm.derivadoAUsuario" placeholder="Opcional">
          }
          <label class="form-label mb-1 block">Motivo / observación</label>
          <textarea class="form-input min-h-[80px]" [(ngModel)]="accionForm.motivo"
            [placeholder]="modal.tipo === 'cerrar' ? 'Motivo obligatorio para cerrar' : 'Opcional'"></textarea>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" class="btn btn-secondary btn-sm" (click)="cerrarAccionModal()">Cancelar</button>
            <button type="button" class="btn btn-primary btn-sm" (click)="confirmarAccionRecurrente()">Confirmar</button>
          </div>
        </div>
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
export class AlertasComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  readonly svc = inject(AlertasService);
  readonly tenant = inject(TenantContextService);
  private readonly institucional = inject(InstitucionalService);
  private readonly _tenantReloadReady = setupTenantReload(() => {
    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => this._niveles.set(niveles),
    });
    this.cargar();
  }, {
    onBeforeReload: () => {
      this._alertas.set([]);
      this.resumen.set(null);
    },
  });

  readonly mesLabel = signal<string | null>(null);
  readonly resumen = signal<AlertasResumen | null>(null);
  readonly context = signal<RecurrentAlertsContext | null>(null);
  readonly consultaModo = signal<'pending' | 'global' | 'institution'>('institution');

  readonly settings = signal<AlertSettings | null>(null);
  readonly errorSettings = signal('');
  readonly notificacion = signal<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);

  private readonly _alertas = signal<AlertaAusentismo[]>([]);
  private readonly _recurrentes = signal<RecurrentAlertItem[]>([]);
  readonly recurrentes = this._recurrentes.asReadonly();
  private readonly _niveles = signal<Nivel[]>([]);
  readonly niveles = this._niveles.asReadonly();

  settingsForm: AlertSettings = {
    diasAlertaAusentismo: 2,
    diasAlertaCritica: 5,
    porcentajeUmbral: 15,
    periodoTipo: 'mes',
    nivelEducativo: '',
    modalidad: 'todos',
  };

  readonly filtroRecurrente = signal({ estado: '' });

  accionModal = signal<{
    tipo: 'atender' | 'derivar' | 'cerrar';
    titulo: string;
    alerta: RecurrentAlertItem;
  } | null>(null);
  accionForm = { motivo: '', derivadoARol: '', derivadoAUsuario: '' };

  readonly filtro = signal({
    nivel: '',
    grado: '',
    mes: mesActualIso(),
    busqueda: '',
    severidad: 'con_faltas',
  });

  readonly gradosDisponibles = computed(() => {
    const nivel = this._niveles().find((n) => n.nombre === this.filtro().nivel);
    return nivel?.grados.map((g) => g.nombre) ?? [];
  });

  readonly alertasFiltradas = computed(() => {
    let list = this._alertas();
    const sev = this.filtro().severidad;
    if (sev === 'con_faltas') {
      // ya viene conFaltas desde el backend
    } else if (sev === 'todos') {
      list = list.filter((a) => a.nivelAlerta === 'alerta' || a.nivelAlerta === 'critico');
    } else if (sev === 'alerta') {
      list = list.filter((a) => a.nivelAlerta === 'alerta');
    } else if (sev === 'critico') {
      list = list.filter((a) => a.nivelAlerta === 'critico');
    }

    const q = this.filtro().busqueda.toLowerCase().trim();
    if (q) {
      list = list.filter((a) =>
        `${a.estudiante} ${a.grado} ${a.nivel}`.toLowerCase().includes(q),
      );
    }
    return list;
  });

  readonly kpis = computed(() => {
    const res = this.resumen();
    const alertas = this._alertas().filter(
      (a) => a.nivelAlerta === 'alerta' || a.nivelAlerta === 'critico',
    );
    const criticos = alertas.filter((a) => a.nivelAlerta === 'critico');
    const tempranas = alertas.filter((a) => a.nivelAlerta === 'alerta');
    return [
      {
        label: 'Con faltas (BD)',
        value: res?.alumnosConFaltasInjustificadas ?? 0,
        icon: 'event_busy',
        bg: 'bg-gray-100',
        color: 'text-gray-600',
      },
      {
        label: 'Total alertas',
        value: alertas.length,
        icon: 'notifications_active',
        bg: 'bg-indigo-100',
        color: 'text-indigo-600',
      },
      {
        label: 'Alerta temprana',
        value: tempranas.length,
        icon: 'warning',
        bg: 'bg-amber-100',
        color: 'text-amber-600',
        text: 'text-amber-600',
        border: 'border-l-4 border-amber-400',
      },
      {
        label: 'Críticas',
        value: criticos.length,
        icon: 'error',
        bg: 'bg-red-100',
        color: 'text-red-600',
        text: 'text-red-600',
        border: 'border-l-4 border-red-400',
      },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle('Alertas de Ausentismo');
    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => this._niveles.set(niveles),
    });
    this.cargarContexto();
    this.cargar();
    markTenantReloadReady(this._tenantReloadReady);
  }

  onConsultaModoChange(modo: 'pending' | 'global' | 'institution'): void {
    this.consultaModo.set(modo);
    if (modo === 'institution') {
      this.cargarRecurrentes();
    } else {
      this._recurrentes.set([]);
    }
  }

  puedeOperarInstitucion(): boolean {
    if (!this.tenant.canSelectInstitution()) return true;
    return this.consultaModo() === 'institution';
  }

  cargarContexto(): void {
    this.svc.getRecurrentContext().subscribe({
      next: (ctx) => this.context.set(ctx),
    });
  }

  cargarRecurrentes(): void {
    if (!this.puedeOperarInstitucion()) return;
    const { mes } = this.filtro();
    this.svc
      .loadRecurrentAlerts({
        mes: mes || undefined,
        estado: this.filtroRecurrente().estado || undefined,
        nivel: this.filtro().nivel || undefined,
        grado: this.filtro().grado || undefined,
      })
      .subscribe({
        next: (res) => this._recurrentes.set(res.items),
        error: () => this.mostrarNotificacion('No se pudieron cargar alertas recurrentes', 'error'),
      });
  }

  escanearRecurrentes(): void {
    if (!this.puedeOperarInstitucion()) {
      this.mostrarNotificacion('Seleccione una institución educativa', 'error');
      return;
    }
    const { mes, nivel, grado } = this.filtro();
    this.svc.scanRecurrentAlerts({ mes, nivel: nivel || undefined, grado: grado || undefined }).subscribe({
      next: (res) => {
        this.cargarRecurrentes();
        this.mostrarNotificacion(
          `Detección completada: ${res.creadas} nuevas, ${res.actualizadas} actualizadas, ${res.omitidas} omitidas`,
        );
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.mostrarNotificacion(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo ejecutar la detección',
          'error',
        );
      },
    });
  }

  setFiltroRecurrente(campo: 'estado', valor: string): void {
    this.filtroRecurrente.update((f) => ({ ...f, [campo]: valor }));
    this.cargarRecurrentes();
  }

  accionRecurrente(alerta: RecurrentAlertItem, tipo: 'atender' | 'derivar' | 'cerrar'): void {
    const titulos = {
      atender: 'Atender alerta',
      derivar: 'Derivar alerta',
      cerrar: 'Cerrar alerta',
    };
    this.accionForm = { motivo: '', derivadoARol: '', derivadoAUsuario: '' };
    this.accionModal.set({ tipo, titulo: titulos[tipo], alerta });
  }

  cerrarAccionModal(): void {
    this.accionModal.set(null);
  }

  confirmarAccionRecurrente(): void {
    const modal = this.accionModal();
    if (!modal) return;
    if (modal.tipo === 'cerrar' && !this.accionForm.motivo.trim()) {
      this.mostrarNotificacion('Indique el motivo para cerrar la alerta', 'error');
      return;
    }

    const req =
      modal.tipo === 'atender'
        ? this.svc.atenderRecurrentAlert(modal.alerta.id, this.accionForm.motivo)
        : modal.tipo === 'derivar'
          ? this.svc.derivarRecurrentAlert(modal.alerta.id, this.accionForm)
          : this.svc.cerrarRecurrentAlert(modal.alerta.id, this.accionForm.motivo);

    req.subscribe({
      next: () => {
        this.cerrarAccionModal();
        this.cargarRecurrentes();
        this.mostrarNotificacion('Acción registrada correctamente');
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.mostrarNotificacion(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo completar la acción',
          'error',
        );
      },
    });
  }

  cargar(): void {
    const { nivel, grado, mes, busqueda } = this.filtro();
    this.svc
      .loadAlerts({
        nivel: nivel || undefined,
        grado: grado || undefined,
        mes: mes || undefined,
        busqueda: busqueda || undefined,
      })
      .subscribe({
        next: (res) => {
          this._alertas.set(res.conFaltas ?? res.alerts);
          this.settings.set(res.settings);
          this.settingsForm = { ...res.settings };
          this.mesLabel.set(res.mesLabel);
          this.resumen.set(res.resumen ?? null);
          this.cargarRecurrentes();
        },
        error: () => this.mostrarNotificacion('No se pudieron cargar las alertas', 'error'),
      });
  }

  setFiltro(
    campo: 'nivel' | 'grado' | 'mes' | 'busqueda' | 'severidad',
    valor: string,
  ): void {
    this.filtro.update((f) => {
      const next = { ...f, [campo]: valor };
      if (campo === 'nivel') next.grado = '';
      return next;
    });
    if (campo !== 'busqueda' && campo !== 'severidad') this.cargar();
  }

  guardarSettings(): void {
    this.errorSettings.set('');
    if (this.settingsForm.diasAlertaCritica <= this.settingsForm.diasAlertaAusentismo) {
      this.errorSettings.set('La alerta crítica debe ser mayor que la alerta temprana');
      return;
    }

    this.svc.updateSettings(this.settingsForm).subscribe({
      next: (res) => {
        this.settings.set(res);
        this.settingsForm = { ...res };
        this.cargar();
        this.mostrarNotificacion('Configuración de alertas actualizada');
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorSettings.set(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo guardar la configuración',
        );
      },
    });
  }

  notificar(alerta: AlertaAusentismo): void {
    const mes = this.filtro().mes;
    if (!mes) {
      this.mostrarNotificacion('Seleccione un mes para registrar la notificación', 'error');
      return;
    }

    this.svc
      .notifyApoderado({
        studentId: alerta.studentId,
        mes,
        notificadoPor: this.auth.nombreCompleto() || 'Administración',
      })
      .subscribe({
        next: (res) => {
          this._alertas.update((list) =>
            list.map((a) =>
              a.studentId === alerta.studentId
                ? {
                    ...a,
                    apoderadoNotificado: true,
                    notificadoAt: res.notificadoAt,
                    notificadoPor: res.notificadoPor,
                  }
                : a,
            ),
          );
          const nombre = alerta.estudiante.split(',')[0];
          if (res.correoEnviado && res.correoDestino) {
            this.mostrarNotificacion(
              `Apoderado notificado — ${nombre}. Correo enviado a ${res.correoDestino}`,
            );
          } else if (res.correoSimulado) {
            this.mostrarNotificacion(
              `Registro guardado — ${nombre}. Correo simulado (configure MAIL_PASS en .env)`,
              'error',
            );
          } else if (!res.correoDestino) {
            this.mostrarNotificacion(
              `Registro guardado — ${nombre}. Sin correo de apoderado en ficha del alumno`,
              'error',
            );
          } else {
            this.mostrarNotificacion(`Apoderado notificado — ${nombre}`);
          }
        },
        error: () =>
          this.mostrarNotificacion('No se pudo registrar la notificación', 'error'),
      });
  }

  notificarTitle(a: AlertaAusentismo): string {
    if (a.apoderadoNotificado) {
      const quien = a.notificadoPor ? ` por ${a.notificadoPor}` : '';
      const cuando = a.notificadoAt ? ` · ${a.notificadoAt}` : '';
      return `Apoderado notificado${quien}${cuando}`;
    }
    return 'Notificar apoderado';
  }

  severidadBadge(n: NivelAlerta): string {
    if (n === 'critico') return 'badge-red';
    if (n === 'alerta') return 'badge-yellow';
    return 'badge-gray';
  }

  severidadLabel(n: NivelAlerta): string {
    if (n === 'critico') return 'Crítica';
    if (n === 'alerta') return 'Alerta';
    return 'Con falta';
  }

  estadoBadge(e: RecurrentAlertEstado): string {
    return {
      abierta: 'badge-yellow',
      atendida: 'badge-blue',
      derivada: 'badge-indigo',
      cerrada: 'badge-gray',
    }[e];
  }

  estadoLabel(e: RecurrentAlertEstado): string {
    return {
      abierta: 'Abierta',
      atendida: 'Atendida',
      derivada: 'Derivada',
      cerrada: 'Cerrada',
    }[e];
  }

  nivelBadge(nivel: string): string {
    return {
      Inicial: 'badge-purple',
      Primaria: 'badge-blue',
      Secundaria: 'badge-indigo',
    }[nivel] ?? 'badge-gray';
  }

  fechasInasistenciaLabel(a: AlertaAusentismo): string {
    return (a.fechasInasistencia ?? [])
      .map((f) => {
        const [y, m, d] = f.split('-');
        return `${d}/${m}/${y}`;
      })
      .join(', ');
  }

  private mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' = 'success'): void {
    this.notificacion.set({ mensaje, tipo });
    setTimeout(() => this.notificacion.set(null), 3000);
  }
}
