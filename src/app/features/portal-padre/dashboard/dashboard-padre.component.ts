import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ComunicadosService, TipoCom } from '../../comunicaciones/comunicados/comunicados.service';
import { HorariosService } from '../../academico/horarios/services/horarios.service';
import { SeguimientoService } from '../seguimiento/seguimiento.service';
import { FinanzasPadreService } from '../finanzas/finanzas-padre.service';
import { HorariosPadreService } from '../horarios/horarios-padre.service';
import { JustificacionesPadreService } from '../justificaciones/justificaciones-padre.service';
import { PendienteJustificacion } from '../../asistencia/justificaciones/justificaciones.model';
import {
  notaColor,
  parentescoLabel,
  SeguimientoAcademico,
  tareaEstadoBadge,
  tareaEstadoLabel,
} from '../seguimiento/seguimiento.model';
import { EstadoCuentaHijo } from '../finanzas/finanzas.model';

const TIPO_COM_CFG: Record<TipoCom, { badge: string; label: string }> = {
  general: { badge: 'badge-blue', label: 'General' },
  academico: { badge: 'badge-indigo', label: 'Académico' },
  administrativo: { badge: 'badge-gray', label: 'Administrativo' },
  urgente: { badge: 'badge-red', label: 'Urgente' },
  evento: { badge: 'badge-purple', label: 'Evento' },
};

@Component({
  standalone: true,
  imports: [RouterLink, NgClass, DecimalPipe],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Hola, {{ primerNombre() }} 👋</h1>
          <p class="text-sm text-gray-500 mt-1">Resumen de tus hijos · matrícula, clases, tareas y pagos</p>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="loading()">
          <span class="icon icon-sm">refresh</span> Actualizar
        </button>
      </div>

      @if (comunicadosUrgentes().length) {
        <div class="card p-4 border-red-100 bg-red-50/60">
          <div class="flex items-start gap-3">
            <span class="icon text-red-600 shrink-0">campaign</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-red-800">Comunicados urgentes</p>
              <div class="mt-2 space-y-1.5">
                @for (c of comunicadosUrgentes(); track c.id) {
                  <a routerLink="/portal-padre/comunicacion"
                    class="block text-sm text-red-900 hover:underline truncate">{{ c.titulo }}</a>
                }
              </div>
            </div>
            <a routerLink="/portal-padre/comunicacion" class="text-xs text-red-700 font-medium shrink-0 hover:underline">
              Ver todos
            </a>
          </div>
        </div>
      }

      @if (segSvc.loadingHijos()) {
        <div class="card p-12 flex flex-col items-center text-gray-400">
          <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
          <p class="text-sm">Cargando hijos vinculados…</p>
        </div>
      } @else if (!segSvc.hijos().length) {
        <div class="card p-16 text-center">
          <span class="text-4xl mb-4 block">👨‍👩‍👧</span>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">Sin hijos vinculados</h3>
          <p class="text-gray-500 text-sm">Contacta con la institución para vincular a tus hijos a tu cuenta.</p>
        </div>
      } @else {
        @if (segSvc.hijos().length > 1) {
          <div class="card p-4">
            <label class="form-label mb-2 block">Seleccionar hijo/a</label>
            <div class="flex flex-wrap gap-2">
              @for (h of segSvc.hijos(); track h.studentId) {
                <button type="button"
                  class="px-4 py-2.5 rounded-xl border text-sm font-medium transition-all"
                  [ngClass]="hijoId() === h.studentId
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-200'"
                  (click)="seleccionarHijo(h.studentId)">
                  {{ h.nombreCompleto }}
                  <span class="text-xs text-gray-400 ml-1">· {{ h.aulaLabel }}</span>
                </button>
              }
            </div>
          </div>
        }

        @if (loading()) {
          <div class="card p-12 flex flex-col items-center text-gray-400">
            <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
            <p class="text-sm">Cargando resumen…</p>
          </div>
        } @else if (seguimiento(); as d) {
          <div class="card p-4 bg-gradient-to-r from-indigo-50 to-white border-indigo-100">
            <div class="flex flex-wrap items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl shrink-0">🎓</div>
              <div class="flex-1 min-w-0">
                <h2 class="text-lg font-bold text-gray-900">{{ d.estudiante.nombreCompleto }}</h2>
                <p class="text-sm text-gray-500">{{ d.estudiante.aulaLabel }} · {{ parentescoLabel(d.estudiante.parentesco) }}</p>
              </div>
              @if (d.promedioGeneral !== null) {
                <div class="text-right">
                  <p class="text-xs text-gray-400">Promedio general</p>
                  <p class="text-3xl font-bold" [ngClass]="notaColor(d.promedioGeneral)">
                    {{ d.promedioGeneral | number:'1.1-1' }}
                  </p>
                </div>
              }
            </div>
          </div>

          @if (alertasNoLeidas().length) {
            <div class="card p-4 border-red-200 bg-red-50/70 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-start gap-3">
                <span class="icon text-red-600 shrink-0">notifications_active</span>
                <div>
                  <p class="text-sm font-semibold text-red-900">
                    {{ alertasNoLeidas().length }} alerta(s) de ausentismo de la institución
                  </p>
                  <p class="text-xs text-red-800 mt-1">
                    La escuela le ha notificado sobre inasistencias de {{ seguimiento()?.estudiante?.nombreCompleto }}.
                    Revise el detalle en Seguimiento.
                  </p>
                </div>
              </div>
              <a routerLink="/portal-padre/seguimiento" class="btn btn-primary btn-sm shrink-0">Ver alertas</a>
            </div>
          }

          @if (faltasPendientes().length) {
            <div class="card p-4 border-amber-200 bg-amber-50 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="icon text-amber-600">warning</span>
                <p class="text-sm text-amber-900">
                  <strong>{{ totalFaltasSinJustificar() }}</strong> falta(s) sin justificar en
                  {{ faltasPendientes().length }} periodo(s)
                </p>
              </div>
              <a routerLink="/portal-padre/justificaciones" class="btn btn-secondary btn-sm">Justificar</a>
            </div>
          }

          <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            @for (kpi of kpis(); track kpi.label) {
              <a [routerLink]="kpi.route" class="card p-4 hover:shadow-md transition-shadow block">
                <p class="text-xs text-gray-500">{{ kpi.label }}</p>
                <p class="text-xl font-bold mt-1" [ngClass]="kpi.color">{{ kpi.value }}</p>
                @if (kpi.hint) {
                  <p class="text-[11px] text-gray-400 mt-0.5">{{ kpi.hint }}</p>
                }
              </a>
            }
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="card p-5 lg:col-span-2">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                  <span class="icon text-indigo-600">schedule</span> Clases de hoy
                </h3>
                <a routerLink="/portal-padre/horarios" class="text-xs text-indigo-600 hover:underline">Ver horario</a>
              </div>
              @if (clasesHoy() === 0) {
                <p class="text-sm text-gray-400 py-6 text-center">Hoy no hay clases programadas.</p>
              } @else {
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Completadas</span>
                    <span class="font-semibold text-emerald-600">{{ clasesCompletadasHoy() }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Pendientes</span>
                    <span class="font-semibold text-amber-600">{{ clasesPendientesHoy() }}</span>
                  </div>
                  <div class="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                    <div class="h-full rounded-full bg-indigo-500 transition-all" [style.width.%]="progresoClasesHoy()"></div>
                  </div>
                </div>
                @if (proximaClase(); as prox) {
                  <div class="mt-4 p-3 rounded-xl border border-indigo-100 bg-indigo-50/40">
                    <p class="text-xs text-indigo-600 uppercase font-semibold">Próxima clase</p>
                    <p class="text-sm font-semibold text-indigo-800 mt-0.5">{{ prox.curso }}</p>
                    <p class="text-xs text-indigo-700">{{ prox.hora }} · {{ prox.docente }}</p>
                  </div>
                }
              }
            </div>

            <div class="card p-5">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                  <span class="icon text-emerald-600">account_balance_wallet</span> Pagos
                </h3>
                <a routerLink="/portal-padre/finanzas" class="text-xs text-indigo-600 hover:underline">Estado de cuenta</a>
              </div>
              @if (cuenta(); as c) {
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Pendiente</span>
                    <span class="font-semibold text-amber-600">S/ {{ c.resumen.pendiente | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Vencido</span>
                    <span class="font-semibold" [ngClass]="c.resumen.vencido > 0 ? 'text-red-600' : 'text-gray-400'">
                      S/ {{ c.resumen.vencido | number:'1.2-2' }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Pagado</span>
                    <span class="font-semibold text-emerald-600">S/ {{ c.resumen.totalPagado | number:'1.2-2' }}</span>
                  </div>
                  @if (c.resumen.proximoVencimiento) {
                    <div class="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <p class="text-xs text-amber-700">Próximo vencimiento</p>
                      <p class="text-sm font-semibold text-amber-900">{{ formatFechaLarga(c.resumen.proximoVencimiento) }}</p>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-sm text-gray-400 py-4 text-center">Sin datos de pagos.</p>
              }
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card p-5">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-800">Tareas pendientes</h3>
                <a routerLink="/portal-padre/tareas" class="text-xs text-indigo-600 hover:underline">Ver todas</a>
              </div>
              @if (!tareasPendientes().length) {
                <p class="text-sm text-gray-400 py-6 text-center">No hay tareas pendientes.</p>
              } @else {
                <div class="space-y-2">
                  @for (t of tareasPendientes(); track t.id) {
                    <div class="p-3 rounded-lg border border-gray-100">
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-gray-800 truncate">{{ t.titulo }}</p>
                          <p class="text-xs text-gray-500">{{ t.curso }} · Entrega {{ t.fechaEntrega }}</p>
                        </div>
                        <span class="badge text-[10px] shrink-0" [ngClass]="tareaEstadoBadge(t.estado)">
                          {{ tareaEstadoLabel(t.estado) }}
                        </span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="card p-5">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-800">Comunicados</h3>
                <a routerLink="/portal-padre/comunicacion" class="text-xs text-indigo-600 hover:underline">Ver todos</a>
              </div>
              @if (!comunicadosPreview().length) {
                <p class="text-sm text-gray-400 py-6 text-center">No hay comunicados activos.</p>
              } @else {
                <div class="space-y-2">
                  @for (c of comunicadosPreview(); track c.id) {
                    <a routerLink="/portal-padre/comunicacion"
                      class="block p-3 rounded-lg border border-gray-100 hover:bg-indigo-50/40 transition-colors">
                      <div class="flex items-center gap-2 mb-1">
                        <p class="text-sm font-medium text-gray-800 truncate">{{ c.titulo }}</p>
                        <span class="badge text-[10px] shrink-0" [ngClass]="tipoComCfg(c.tipo).badge">
                          {{ tipoComCfg(c.tipo).label }}
                        </span>
                      </div>
                      <p class="text-xs text-gray-500 line-clamp-2">{{ c.cuerpo }}</p>
                    </a>
                  }
                </div>
              }
            </div>
          </div>

          <div class="card p-5">
            <h3 class="font-semibold text-gray-800 mb-4">Accesos rápidos</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              @for (link of accesosRapidos; track link.route) {
                <a [routerLink]="link.route"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors text-center">
                  <span class="icon text-indigo-600">{{ link.icon }}</span>
                  <span class="text-xs font-medium text-gray-700">{{ link.label }}</span>
                </a>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class DashboardPadreComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly segSvc = inject(SeguimientoService);
  readonly finSvc = inject(FinanzasPadreService);
  readonly horSvc = inject(HorariosPadreService);
  readonly horariosSvc = inject(HorariosService);
  readonly justSvc = inject(JustificacionesPadreService);
  readonly comunicadosSvc = inject(ComunicadosService);

  readonly parentescoLabel = parentescoLabel;
  readonly notaColor = notaColor;
  readonly tareaEstadoBadge = tareaEstadoBadge;
  readonly tareaEstadoLabel = tareaEstadoLabel;

  readonly loading = signal(false);
  readonly hijoId = signal<number | null>(null);
  readonly seguimiento = signal<SeguimientoAcademico | null>(null);
  readonly cuenta = signal<EstadoCuentaHijo | null>(null);
  readonly faltasPendientes = signal<PendienteJustificacion[]>([]);

  readonly alertasNoLeidas = computed(() =>
    (this.seguimiento()?.alertasAusentismo ?? []).filter((a) => !a.leidoEnPortal),
  );

  readonly accesosRapidos = [
    { label: 'Seguimiento', icon: 'insights', route: '/portal-padre/seguimiento' },
    { label: 'Tareas', icon: 'assignment', route: '/portal-padre/tareas' },
    { label: 'Clases', icon: 'menu_book', route: '/portal-padre/clases' },
    { label: 'Horarios', icon: 'schedule', route: '/portal-padre/horarios' },
    { label: 'Finanzas', icon: 'account_balance_wallet', route: '/portal-padre/finanzas' },
    { label: 'Comunicados', icon: 'campaign', route: '/portal-padre/comunicacion' },
    { label: 'Correo', icon: 'mail', route: '/portal-padre/correo-docentes' },
    { label: 'Ficha', icon: 'badge', route: '/portal-padre/ficha' },
  ];

  readonly perfil = computed(() => this.horariosSvc.getPerfilEstudiante());
  readonly entradas = computed(() => this.horariosSvc.getEntradas(this.perfil()));
  readonly periodos = computed(() =>
    this.horariosSvc.getPeriodos(this.perfil().nivel).filter(p => !p.isReceso),
  );

  readonly hoyDia = computed(() => {
    const d = new Date().getDay();
    return d >= 1 && d <= 5 ? d - 1 : -1;
  });

  readonly clasesHoy = computed(() => {
    if (this.hoyDia() < 0) return 0;
    return this.entradas().filter(e => e.dia === this.hoyDia()).length;
  });

  readonly clasesCompletadasHoy = computed(() => {
    if (this.hoyDia() < 0) return 0;
    const minsNow = new Date().getHours() * 60 + new Date().getMinutes();
    return this.entradas().filter(e => {
      if (e.dia !== this.hoyDia()) return false;
      const p = this.periodos().find(x => x.id === e.periodoId);
      if (!p) return false;
      const [h, m] = p.horaInicio.split(':').map(n => +n);
      return h * 60 + m <= minsNow;
    }).length;
  });

  readonly clasesPendientesHoy = computed(() =>
    Math.max(this.clasesHoy() - this.clasesCompletadasHoy(), 0),
  );

  readonly progresoClasesHoy = computed(() => {
    const total = this.clasesHoy();
    return total ? Math.round((this.clasesCompletadasHoy() / total) * 100) : 0;
  });

  readonly proximaClase = computed(() => {
    if (this.hoyDia() < 0) return null;
    const minsNow = new Date().getHours() * 60 + new Date().getMinutes();
    const candidatas = this.entradas()
      .filter(e => e.dia === this.hoyDia())
      .map(e => {
        const periodo = this.periodos().find(p => p.id === e.periodoId);
        if (!periodo) return null;
        const [h, m] = periodo.horaInicio.split(':').map(n => +n);
        const inicio = h * 60 + m;
        if (inicio <= minsNow) return null;
        const curso = this.horariosSvc.curById(e.cursoId);
        const docente = this.horariosSvc.docById(e.docenteId);
        return {
          inicio,
          hora: `${periodo.horaInicio} - ${periodo.horaFin}`,
          curso: curso?.nombre ?? 'Curso',
          docente: docente?.abrev ?? 'Docente',
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.inicio - b.inicio);
    return candidatas[0] ?? null;
  });

  readonly comunicadosUrgentes = computed(() =>
    this.comunicadosSvc.urgentesNoLeidosPadre().slice(0, 3),
  );

  readonly comunicadosPreview = computed(() => this.comunicadosSvc.paraPadres().slice(0, 3));

  readonly tareasPendientes = computed(() => {
    const tareas = this.seguimiento()?.tareas ?? [];
    return tareas
      .filter(t => t.estado === 'PENDING' || t.estado === 'OVERDUE')
      .slice(0, 4);
  });

  readonly totalFaltasSinJustificar = computed(() =>
    this.faltasPendientes().reduce((s, p) => s + p.faltasSinJustificar, 0),
  );

  readonly kpis = computed(() => {
    const d = this.seguimiento();
    const c = this.cuenta();
    if (!d) return [];
    return [
      {
        label: 'Promedio',
        value: d.promedioGeneral !== null ? d.promedioGeneral.toFixed(1) : '—',
        color: notaColor(d.promedioGeneral),
        route: '/portal-padre/seguimiento',
        hint: d.nivelGeneral ?? '',
      },
      {
        label: 'Asistencia',
        value: `${d.asistencia.asistenciaPct}%`,
        color: d.asistencia.asistenciaPct >= 90 ? 'text-emerald-600' : d.asistencia.asistenciaPct >= 75 ? 'text-amber-600' : 'text-red-600',
        route: '/portal-padre/seguimiento',
        hint: `${d.asistencia.presentes} presentes`,
      },
      {
        label: 'Tareas',
        value: String(d.tareasPendientes + d.tareasVencidas),
        color: d.tareasVencidas > 0 ? 'text-red-600' : 'text-amber-600',
        route: '/portal-padre/tareas',
        hint: d.tareasVencidas > 0 ? `${d.tareasVencidas} vencidas` : 'pendientes',
      },
      {
        label: 'Clases hoy',
        value: String(this.clasesHoy()),
        color: 'text-indigo-700',
        route: '/portal-padre/horarios',
        hint: `${this.clasesPendientesHoy()} pendientes`,
      },
      {
        label: 'Por pagar',
        value: c ? `S/ ${c.resumen.pendiente.toFixed(0)}` : '—',
        color: (c?.resumen.vencido ?? 0) > 0 ? 'text-red-600' : 'text-amber-600',
        route: '/portal-padre/finanzas',
        hint: c && c.resumen.vencido > 0 ? `S/ ${c.resumen.vencido.toFixed(0)} vencido` : '',
      },
      {
        label: 'Comunicados',
        value: String(this.comunicadosSvc.paraPadres().length),
        color: 'text-blue-700',
        route: '/portal-padre/comunicacion',
        hint: `${this.comunicadosSvc.urgentesNoLeidosPadre().length} urgentes`,
      },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle('Inicio');
    this.comunicadosSvc.load();
    this.cargar();
  }

  primerNombre(): string {
    return this.auth.nombreCompleto()?.split(' ')[0] ?? 'Apoderado';
  }

  tipoComCfg(tipo: TipoCom) {
    return TIPO_COM_CFG[tipo] ?? TIPO_COM_CFG.general;
  }

  formatFechaLarga(iso: string): string {
    return format(parseISO(iso), "d 'de' MMMM yyyy", { locale: es });
  }

  cargar(): void {
    this.segSvc.loadHijos().subscribe({
      next: hijos => {
        const current = this.hijoId();
        const target = hijos.find(h => h.studentId === current)?.studentId ?? hijos[0]?.studentId ?? null;
        if (target) this.seleccionarHijo(target);
      },
    });
  }

  seleccionarHijo(studentId: number): void {
    this.hijoId.set(studentId);
    this.loading.set(true);
    this.seguimiento.set(null);
    this.cuenta.set(null);

    forkJoin({
      tracking: this.segSvc.loadSeguimiento(studentId),
      cuenta: this.finSvc.loadEstadoCuenta(studentId),
      horario: this.horSvc.loadHorario(studentId),
      faltas: this.justSvc.loadPending(studentId),
    }).subscribe({
      next: ({ tracking, cuenta, faltas }) => {
        this.seguimiento.set(tracking);
        this.segSvc.seguimiento.set(tracking);
        this.segSvc.seleccionarHijo(tracking.estudiante);
        this.cuenta.set(cuenta);
        this.faltasPendientes.set(faltas);
      },
      error: () => {
        this.seguimiento.set(null);
        this.cuenta.set(null);
        this.faltasPendientes.set([]);
      },
      complete: () => this.loading.set(false),
    });
  }
}
