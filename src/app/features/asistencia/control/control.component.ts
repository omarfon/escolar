import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import { InstitucionalService } from '../../administracion/institucional/institucional.service';
import { Nivel } from '../../administracion/institucional/institucional.model';

function gradoKey(value: string): string {
  const t = value.toLowerCase().replace(/[°º]/g, '').replace(/\s*(grado|año|ano|anos)\b/g, '').trim();
  const num = t.match(/^(\d+)/);
  return num ? num[1] : t;
}
import { JustificacionesService } from '../justificaciones/justificaciones.service';
import { MOTIVOS_JUSTIFICACION } from '../justificaciones/justificaciones.model';
import {
  AsistenciaControlService,
  mesActualIso,
  semanasCalendario,
  triggerCsvDownload,
} from './control.service';
import {
  ControlEventoDia,
  ControlReportAlumno,
  ControlReportResponse,
  NivelAlertaControl,
} from './control.model';

@Component({
  selector: 'app-asistencia-control',
  standalone: true,
  imports: [NgClass, FormsModule],
  styles: [`
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      .print-area { box-shadow: none !important; border: none !important; }
    }
    .print-only { display: none; }
  `],
  template: `
<div class="animate-fade-in space-y-5">

  @if (toast()) {
    <div class="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border animate-slide-in-r no-print"
      [ngClass]="toast()!.tipo==='ok' ? 'bg-white border-emerald-300' : 'bg-white border-red-300'">
      <span class="text-lg">{{ toast()!.tipo==='ok' ? '✓' : '✕' }}</span>
      <p class="text-sm text-gray-700 font-medium">{{ toast()!.msg }}</p>
      <button (click)="toast.set(null)" class="text-gray-400 hover:text-gray-600 ml-2 text-lg leading-none">✕</button>
    </div>
  }

  <!-- Encabezado impresión -->
  <div class="print-only mb-4">
    <h1 class="text-xl font-bold text-gray-900">Control de Faltas y Tardanzas</h1>
    <p class="text-sm text-gray-600">{{ report()?.mesLabel }} · {{ subtitulo() }}</p>
    <p class="text-xs text-gray-500">Generado: {{ fechaImpresion }}</p>
  </div>

  <div class="flex items-center justify-between no-print">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Control de Faltas</h2>
      <p class="text-sm text-gray-500 mt-0.5">
        {{ report()?.mesLabel ?? '—' }} · {{ subtitulo() }}
      </p>
    </div>
    <div class="flex gap-2">
      <button class="btn btn-secondary text-sm gap-1.5" (click)="exportarCsv()" [disabled]="!report() || svc.loading()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Exportar CSV
      </button>
      <button class="btn btn-secondary text-sm gap-1.5" (click)="imprimir()" [disabled]="!report()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
        </svg>
        Imprimir
      </button>
    </div>
  </div>

  <!-- Filtros -->
  <div class="card p-4 no-print">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="form-group min-w-0">
        <label class="form-label text-xs">Mes</label>
        <input type="month" class="form-input text-sm w-full"
          [ngModel]="mes()" (ngModelChange)="mes.set($event); cargar()">
      </div>
      <div class="form-group min-w-0">
        <label class="form-label text-xs">Nivel</label>
        <select class="form-input text-sm w-full" [ngModel]="filtroNivel()" (ngModelChange)="onNivelChange($event)">
          <option value="">Todos</option>
          @for (n of niveles(); track n.id) {
            <option [value]="n.nombre">{{ n.nombre }}</option>
          }
        </select>
      </div>
      <div class="form-group min-w-0">
        <label class="form-label text-xs">Grado</label>
        <select class="form-input text-sm w-full" [ngModel]="filtroGrado()" (ngModelChange)="filtroGrado.set($event); cargar()" [disabled]="!filtroNivel()">
          <option value="">Todos</option>
          @for (g of grados(); track g) {
            <option [value]="g">{{ g }}</option>
          }
        </select>
      </div>
      <div class="form-group min-w-0">
        <label class="form-label text-xs">Sección</label>
        <select class="form-input text-sm w-full" [ngModel]="filtroSeccion()" (ngModelChange)="filtroSeccion.set($event); cargar()" [disabled]="!filtroGrado()">
          <option value="">Todas</option>
          @for (s of secciones(); track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>
      </div>
      <div class="form-group min-w-0">
        <label class="form-label text-xs">Buscar alumno</label>
        <input class="form-input text-sm w-full" placeholder="Nombre, DNI…"
          [ngModel]="busqueda()" (ngModelChange)="onBusquedaChange($event)">
      </div>
      @if (viewMode() === 'alumno') {
        <div class="form-group min-w-0">
          <label class="form-label text-xs">Estado</label>
          <select class="form-input text-sm w-full" [ngModel]="filtroEstado()" (ngModelChange)="filtroEstado.set($event)">
            <option value="Todos">Todos</option>
            <option value="normal">Normal</option>
            <option value="alerta">En alerta</option>
            <option value="critico">En riesgo</option>
          </select>
        </div>
      }
      @if (svc.loading()) {
        <div class="flex items-end pb-2">
          <span class="text-sm text-gray-400">Cargando…</span>
        </div>
      }
    </div>
  </div>

  @if (error()) {
    <div class="card p-4 border-red-200 bg-red-50 text-red-700 text-sm no-print">{{ error() }}</div>
  }

  @if (report(); as r) {
  <div class="print-area space-y-5">
    <!-- KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div class="card p-4">
        <p class="text-xs text-gray-500">Con faltas</p>
        <p class="text-2xl font-bold text-gray-800 mt-1">{{ r.kpis.conFaltas }}</p>
        <p class="text-xs text-gray-400 mt-0.5">alumnos</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500">Total faltas</p>
        <p class="text-2xl font-bold text-orange-600 mt-1">{{ r.kpis.totalFaltas }}</p>
        <p class="text-xs text-gray-400 mt-0.5">en el mes</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500">Tardanzas</p>
        <p class="text-2xl font-bold text-amber-500 mt-1">{{ r.kpis.totalTardanzas }}</p>
        <p class="text-xs text-gray-400 mt-0.5">en el mes</p>
      </div>
      <div class="card p-4 border-l-4 border-amber-400">
        <p class="text-xs text-amber-600 font-medium">En alerta</p>
        <p class="text-2xl font-bold text-amber-600 mt-1">{{ r.kpis.alerta }}</p>
        <p class="text-xs text-gray-400 mt-0.5">&gt; {{ r.alertSettings.diasAlertaAusentismo }} faltas</p>
      </div>
      <div class="card p-4 border-l-4 border-red-400">
        <p class="text-xs text-red-600 font-medium">En riesgo</p>
        <p class="text-2xl font-bold text-red-600 mt-1">{{ r.kpis.critico }}</p>
        <p class="text-xs text-gray-400 mt-0.5">&gt; {{ r.alertSettings.diasAlertaCritica }} faltas</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs no-print">
      <button class="tab" [class.tab-active]="viewMode()==='alumno'" (click)="viewMode.set('alumno')">Por Alumno</button>
      <button class="tab" [class.tab-active]="viewMode()==='dia'" (click)="viewMode.set('dia'); selAlumno.set(null)">Por Día</button>
    </div>

    @if (viewMode() === 'alumno') {
      <div class="flex gap-4 items-start">
        <div class="flex-1 min-w-0 card overflow-x-auto">
          <table class="data-table w-full text-sm">
            <thead>
              <tr>
                <th class="text-left px-4 py-3 text-xs uppercase">#</th>
                <th class="text-left px-4 py-3 text-xs uppercase">Alumno</th>
                <th class="text-left px-4 py-3 text-xs uppercase">Nivel / Grado</th>
                <th class="text-center px-4 py-3 text-xs uppercase">Faltas</th>
                <th class="text-center px-4 py-3 text-xs uppercase">Tard.</th>
                <th class="text-center px-4 py-3 text-xs uppercase">Justif.</th>
                <th class="text-center px-4 py-3 text-xs uppercase">% Asist.</th>
                <th class="text-center px-4 py-3 text-xs uppercase">Estado</th>
                <th class="text-right px-4 py-3 text-xs uppercase no-print">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (a of alumnosFiltrados(); track a.studentId; let i = $index) {
                <tr class="hover:bg-gray-50 cursor-pointer" [ngClass]="selAlumno()?.studentId === a.studentId ? 'bg-indigo-50' : ''"
                  (click)="abrirDetalle(a)">
                  <td class="px-4 py-3 text-gray-400 text-xs">{{ i + 1 }}</td>
                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-800 text-sm">{{ a.nombreCompleto }}</p>
                    <p class="text-xs text-gray-400">Última falta: {{ a.ultimaFalta ?? '—' }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <p class="text-sm text-gray-700">{{ a.nivel }}</p>
                    <p class="text-xs text-gray-400">{{ a.gradoLabel }}</p>
                  </td>
                  <td class="px-4 py-3 text-center font-bold" [ngClass]="a.nivelAlerta==='critico' ? 'text-red-600' : a.nivelAlerta==='alerta' ? 'text-amber-600' : 'text-gray-700'">{{ a.faltas }}</td>
                  <td class="px-4 py-3 text-center text-amber-600 font-semibold">{{ a.tardanzas }}</td>
                  <td class="px-4 py-3 text-center text-blue-600 font-semibold">{{ a.justificadas }}</td>
                  <td class="px-4 py-3 text-center font-bold" [ngClass]="a.asistenciaPct >= 90 ? 'text-emerald-600' : a.asistenciaPct >= 75 ? 'text-amber-600' : 'text-red-600'">{{ a.asistenciaPct }}%</td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge text-xs" [ngClass]="badgeEstado(a.nivelAlerta)">{{ labelEstado(a.nivelAlerta) }}</span>
                  </td>
                  <td class="px-4 py-3 text-right no-print">
                    <button class="btn btn-icon text-blue-500" title="Justificar" (click)="$event.stopPropagation(); abrirJustificar(a)"
                      [disabled]="a.faltasInjustificadas === 0">✓</button>
                  </td>
                </tr>
              }
              @if (!alumnosFiltrados().length) {
                <tr><td colspan="9" class="py-12 text-center text-gray-400">Sin registros para los filtros seleccionados</td></tr>
              }
            </tbody>
          </table>
        </div>

        @if (selAlumno(); as a) {
          <div class="w-80 shrink-0 card flex flex-col overflow-hidden no-print">
            <div class="px-4 py-3 border-b flex justify-between items-center">
              <div>
                <p class="font-bold text-sm">{{ a.nombreCompleto }}</p>
                <p class="text-xs text-gray-500">{{ a.nivel }} · {{ a.gradoLabel }}</p>
              </div>
              <button (click)="selAlumno.set(null)" class="text-gray-400">✕</button>
            </div>
            <div class="p-4 space-y-4 overflow-y-auto">
              <div class="grid grid-cols-4 gap-1 text-center text-xs">
                <div class="bg-emerald-50 rounded p-2"><p class="text-gray-400">P</p><p class="font-bold text-emerald-600">{{ a.presentes }}</p></div>
                <div class="bg-red-50 rounded p-2"><p class="text-gray-400">F</p><p class="font-bold text-red-600">{{ a.faltasInjustificadas }}</p></div>
                <div class="bg-amber-50 rounded p-2"><p class="text-gray-400">T</p><p class="font-bold text-amber-600">{{ a.tardanzas }}</p></div>
                <div class="bg-blue-50 rounded p-2"><p class="text-gray-400">J</p><p class="font-bold text-blue-600">{{ a.justificadas }}</p></div>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-600 mb-2">Calendario · {{ r.mesLabel }}</p>
                @for (sem of calMes(a); track $index) {
                  <div class="grid grid-cols-5 gap-1 mb-1">
                    @for (cel of sem; track cel.fecha) {
                      <div class="h-9 flex flex-col items-center justify-center rounded text-xs font-semibold"
                        [ngClass]="celClass(cel.estado)">
                        <span>{{ cel.dia }}</span>
                        <span class="text-[9px]">{{ cel.estado }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }

    @if (viewMode() === 'dia') {
      <div class="flex flex-wrap gap-2 no-print">
        @for (d of r.diasEscolares; track d.fecha) {
          @let cnt = r.resumenPorDia[d.fecha];
          @let total = cnt.F + cnt.T + cnt.J;
          <button (click)="toggleDia(d.fecha)"
            class="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm"
            [ngClass]="diaSeleccionado()===d.fecha ? 'bg-indigo-600 text-white border-indigo-600' : total > 0 ? 'bg-white border-gray-200' : 'bg-gray-50 text-gray-400'">
            <span>{{ d.diaSemana }}</span>
            <span class="text-xs">{{ d.label }}</span>
            @if (total > 0) { <span class="text-xs font-bold">{{ total }}</span> }
          </button>
        }
      </div>

      @if (diaSeleccionado()) {
        @let evs = eventosDelDia();
        <div class="card overflow-hidden">
          <div class="px-5 py-3 border-b flex justify-between items-center">
            <h3 class="font-bold">{{ diaLabel() }}</h3>
            <button class="no-print" (click)="diaSeleccionado.set('')">✕</button>
          </div>
          @if (!evs.length) {
            <div class="p-10 text-center text-gray-400">Sin ausencias ni tardanzas este día</div>
          } @else {
            <table class="data-table w-full text-sm">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs uppercase">Alumno</th>
                  <th class="px-4 py-3 text-left text-xs uppercase">Grado</th>
                  <th class="px-4 py-3 text-center text-xs uppercase">Tipo</th>
                  <th class="px-4 py-3 text-center text-xs uppercase">Faltas mes</th>
                </tr>
              </thead>
              <tbody>
                @for (ev of evs; track ev.studentId) {
                  @let al = getAlumno(ev.studentId);
                  <tr>
                    <td class="px-4 py-3">{{ ev.nombre }}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">{{ ev.gradoLabel }} · {{ ev.nivel }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="badge text-xs" [ngClass]="ev.tipo==='F' ? 'badge-red' : ev.tipo==='T' ? 'badge-yellow' : 'badge-blue'">
                        {{ ev.tipo==='F' ? 'Falta' : ev.tipo==='T' ? 'Tardanza' : 'Justificado' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">{{ al?.faltas ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      } @else {
        <div class="card p-12 text-center text-gray-400 no-print">Selecciona un día para ver el detalle</div>
      }
    }
  </div>
  } @else if (!svc.loading() && !error()) {
    <div class="card p-12 text-center text-gray-400 no-print">Selecciona filtros y carga el reporte</div>
  }

</div>

@if (justModalOpen()) {
  <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print" (click)="justModalOpen.set(false)">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" (click)="$event.stopPropagation()">
      <div class="px-6 py-4 border-b">
        <h3 class="font-bold">Justificar Falta</h3>
        <p class="text-xs text-gray-500">{{ justAlumno()?.nombreCompleto }}</p>
      </div>
      <div class="px-6 py-5 space-y-4">
        <div>
          <label class="form-label">Cantidad</label>
          <input type="number" class="form-input text-sm" min="1"
            [max]="justAlumno()?.faltasInjustificadas ?? 1"
            [ngModel]="justCantidad()" (ngModelChange)="justCantidad.set(+$event || 1)">
        </div>
        <div>
          <label class="form-label">Motivo</label>
          <select class="form-input text-sm" [ngModel]="justMotivo()" (ngModelChange)="justMotivo.set($event)">
            <option value="">— Seleccionar —</option>
            @for (m of motivos; track m) { <option [value]="m">{{ m }}</option> }
          </select>
        </div>
        <div>
          <label class="form-label">Observaciones</label>
          <textarea class="form-input text-sm" rows="2" [ngModel]="justObs()" (ngModelChange)="justObs.set($event)"></textarea>
        </div>
      </div>
      <div class="px-6 py-4 border-t flex justify-end gap-2">
        <button class="btn btn-secondary" (click)="justModalOpen.set(false)">Cancelar</button>
        <button class="btn btn-primary" (click)="confirmarJustificar()" [disabled]="!justMotivo() || justSvc.saving()">
          {{ justSvc.saving() ? 'Guardando…' : 'Confirmar' }}
        </button>
      </div>
    </div>
  </div>
}
  `,
})
export class AsistenciaControlComponent implements OnInit {
  readonly svc = inject(AsistenciaControlService);
  readonly justSvc = inject(JustificacionesService);
  private readonly layout = inject(LayoutService);
  private readonly institucional = inject(InstitucionalService);
  private readonly _tenantReloadReady = setupTenantReload(() => {
    this.institucional.loadEducationLevels().subscribe({
      next: (n) => this._niveles.set(n),
    });
    this.cargar();
  }, {
    onBeforeReload: () => {
      this.report.set(null);
      this.selAlumno.set(null);
      this.error.set(null);
    },
  });

  readonly motivos = MOTIVOS_JUSTIFICACION;
  readonly fechaImpresion = new Date().toLocaleString('es-PE');

  mes = signal(mesActualIso());
  busqueda = signal('');
  filtroNivel = signal('');
  filtroGrado = signal('');
  filtroSeccion = signal('');
  filtroEstado = signal('Todos');
  viewMode = signal<'alumno' | 'dia'>('alumno');
  diaSeleccionado = signal('');
  report = signal<ControlReportResponse | null>(null);
  error = signal<string | null>(null);
  selAlumno = signal<ControlReportAlumno | null>(null);

  justModalOpen = signal(false);
  justAlumno = signal<ControlReportAlumno | null>(null);
  justMotivo = signal('');
  justCantidad = signal(1);
  justObs = signal('');
  toast = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

  private busquedaTimer?: ReturnType<typeof setTimeout>;
  private readonly _niveles = signal<Nivel[]>([]);

  niveles = computed(() => this._niveles());
  grados = computed(() => {
    const nivel = this._niveles().find((n) => n.nombre === this.filtroNivel());
    return nivel?.grados.map((g) => g.nombre) ?? [];
  });
  secciones = computed(() => {
    const n = this.filtroNivel();
    const g = this.filtroGrado();
    const nivelData = this._niveles().find((x) => x.nombre === n);
    const gradoData = nivelData?.grados.find((x) => gradoKey(x.nombre) === gradoKey(g));
    return gradoData?.secciones.map((s) => s.nombre) ?? [];
  });

  alumnosFiltrados = computed(() => {
    const r = this.report();
    if (!r) return [];
    let list = r.alumnos;
    const est = this.filtroEstado();
    if (est !== 'Todos') list = list.filter((a) => a.nivelAlerta === est);
    return list;
  });

  eventosDelDia = computed((): ControlEventoDia[] => {
    const r = this.report();
    const dia = this.diaSeleccionado();
    if (!r || !dia) return [];
    const meta = r.diasEscolares.find((d) => d.fecha === dia);
    const evs: ControlEventoDia[] = [];
    for (const a of r.alumnos) {
      const tipo = a.calendario[dia];
      if (tipo === 'F' || tipo === 'T' || tipo === 'J') {
        evs.push({
          studentId: a.studentId,
          nombre: a.nombreCompleto,
          gradoLabel: a.gradoLabel,
          nivel: a.nivel,
          fecha: dia,
          fechaLabel: meta?.label ?? dia,
          tipo,
        });
      }
    }
    return evs.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));
  });

  ngOnInit(): void {
    this.layout.setTitle('Control de Faltas');
    this.institucional.loadEducationLevels().subscribe({
      next: (n) => this._niveles.set(n),
    });
    this.cargar();
    markTenantReloadReady(this._tenantReloadReady);
  }

  subtitulo(): string {
    const parts: string[] = [];
    if (this.filtroNivel()) parts.push(this.filtroNivel());
    if (this.filtroGrado()) parts.push(this.filtroGrado());
    if (this.filtroSeccion()) parts.push(`Sec. ${this.filtroSeccion()}`);
    const n = this.report()?.kpis.totalAlumnos ?? this.alumnosFiltrados().length;
    return parts.length ? `${parts.join(' · ')} · ${n} alumnos` : `${n} alumnos`;
  }

  cargar(): void {
    this.error.set(null);
    this.selAlumno.set(null);
    this.svc.loadReport(this.buildFilters()).subscribe({
      next: (data) => this.report.set(data),
      error: () => {
        this.report.set(null);
        this.error.set('No se pudo cargar el control de faltas. Verifica que el backend esté activo.');
      },
    });
  }

  onNivelChange(nivel: string): void {
    this.filtroNivel.set(nivel);
    this.filtroGrado.set('');
    this.filtroSeccion.set('');
    this.cargar();
  }

  onBusquedaChange(q: string): void {
    this.busqueda.set(q);
    clearTimeout(this.busquedaTimer);
    this.busquedaTimer = setTimeout(() => this.cargar(), 350);
  }

  abrirDetalle(a: ControlReportAlumno): void {
    this.selAlumno.set(this.selAlumno()?.studentId === a.studentId ? null : a);
  }

  abrirJustificar(a: ControlReportAlumno): void {
    if (a.faltasInjustificadas === 0) return;
    this.justAlumno.set(a);
    this.justMotivo.set('');
    this.justCantidad.set(1);
    this.justObs.set('');
    this.justModalOpen.set(true);
  }

  confirmarJustificar(): void {
    const al = this.justAlumno();
    if (!al || !this.justMotivo()) return;
    const cantidad = Math.min(this.justCantidad(), al.faltasInjustificadas);
    this.justSvc.create({
      studentId: al.studentId,
      cantidad,
      motivo: this.justMotivo(),
      observacion: this.justObs() || undefined,
    }).subscribe({
      next: () => {
        this.justModalOpen.set(false);
        this.mostrarToast(`${cantidad} falta(s) justificada(s)`, 'ok');
        this.cargar();
      },
      error: () => this.mostrarToast('No se pudo registrar la justificación', 'err'),
    });
  }

  exportarCsv(): void {
    this.svc.downloadCsv(this.buildFilters()).subscribe({
      next: (blob) => triggerCsvDownload(blob, `control-faltas-${this.mes()}.csv`),
      error: () => this.mostrarToast('Error al exportar CSV', 'err'),
    });
  }

  imprimir(): void {
    window.print();
  }

  toggleDia(fecha: string): void {
    this.diaSeleccionado.set(this.diaSeleccionado() === fecha ? '' : fecha);
  }

  diaLabel(): string {
    const d = this.report()?.diasEscolares.find((x) => x.fecha === this.diaSeleccionado());
    return d ? `${d.diaSemana} ${d.label}` : '';
  }

  getAlumno(id: number): ControlReportAlumno | undefined {
    return this.report()?.alumnos.find((a) => a.studentId === id);
  }

  calMes(a: ControlReportAlumno) {
    return semanasCalendario(this.report()?.diasEscolares ?? [], a.calendario);
  }

  celClass(estado: string): string {
    if (estado === 'P') return 'bg-emerald-100 text-emerald-700';
    if (estado === 'T') return 'bg-amber-100 text-amber-700';
    if (estado === 'F') return 'bg-red-100 text-red-700';
    if (estado === 'J') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-50 text-gray-300';
  }

  badgeEstado(e: NivelAlertaControl): string {
    if (e === 'critico') return 'badge-red';
    if (e === 'alerta') return 'badge-yellow';
    return 'badge-green';
  }

  labelEstado(e: NivelAlertaControl): string {
    if (e === 'critico') return 'Crítico';
    if (e === 'alerta') return 'Alerta';
    return 'Normal';
  }

  private buildFilters() {
    return {
      mes: this.mes(),
      nivel: this.filtroNivel() || undefined,
      grado: this.filtroGrado() || undefined,
      seccion: this.filtroSeccion() || undefined,
      busqueda: this.busqueda().trim() || undefined,
    };
  }

  private mostrarToast(msg: string, tipo: 'ok' | 'err'): void {
    this.toast.set({ msg, tipo });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
