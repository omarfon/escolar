import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LayoutService } from '../../../../core/layout/services/layout.service';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { markTenantReloadReady, setupTenantReload } from '../../../../core/tenant/tenant-reload.util';
import { isoToDisplay } from '../../../../core/api/date.util';
import { CalendarioEscolarService } from './calendario-escolar.service';
import {
  CalendarioContext,
  CalendarioDiaItem,
  CalendarioVisualizacion,
  DIA_TIPO_CFG,
  MESES_CALENDARIO,
} from './calendario-escolar.model';
import {
  buildCeldasCalendarioMes,
  mesActualIso,
  mesAnterior,
  mesSiguiente,
} from './calendario-mes.util';

export type CalendarioEscolarVariant = 'maestros' | 'docente' | 'padre' | 'alumno';

@Component({
  selector: 'app-maestros-calendario-escolar',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  template: `
<div class="space-y-4" [class.animate-fade-in]="variant() !== 'maestros'">

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h2 [class]="variant() === 'maestros' ? 'text-lg font-bold text-gray-900' : 'text-xl font-bold text-gray-800'">
        Calendario escolar
      </h2>
      <p class="text-sm text-gray-400 mt-0.5">{{ subtitulo() }}</p>
      @if (context(); as ctx) {
        <p class="text-xs text-gray-500 mt-1">
          {{ ctx.institucion.nombre }} · vista
          <span class="badge badge-indigo text-[10px] ml-1">{{ ctx.rolVistaLabel }}</span>
        </p>
      }
    </div>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="svc.loading()">
        <span class="icon icon-sm">refresh</span> Actualizar
      </button>
      @if (variant() === 'maestros' && context()?.puedeGestionar) {
        <a routerLink="../anios-escolares" class="btn btn-primary btn-sm">
          <span class="icon icon-sm">settings</span> Gestionar
        </a>
      }
    </div>
  </div>

  @if (institucionActiva(); as ie) {
    <div class="card p-3 border-indigo-100 bg-indigo-50/60 flex items-center gap-3">
      <span class="icon text-indigo-600">school</span>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-indigo-900 truncate">{{ ie.nombre }}</p>
        <p class="text-xs text-indigo-700">{{ ie.siglas }} · Año lectivo {{ ie.anioEscolarActivo }}</p>
      </div>
    </div>
  }

  @if (tenant.requiresSelection()) {
    <div class="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
      Seleccione una institución educativa en la barra superior para ver su calendario.
    </div>
  }

  @if (context()?.anioVigente; as vigente) {
    <div class="card p-4 bg-indigo-50 border border-indigo-100 flex flex-wrap items-center gap-3">
      <span class="icon text-indigo-600">calendar_month</span>
      <p class="text-sm text-indigo-900">
        Año {{ vigente.anio }} · {{ vigente.fechaInicio }} – {{ vigente.fechaFin }}
        @if (vigente.publicado) {
          <span class="badge badge-green text-[10px] ml-1">Publicado v{{ vigente.version }}</span>
        } @else {
          <span class="badge badge-yellow text-[10px] ml-1">Borrador</span>
        }
      </p>
    </div>
  }

  <div class="card p-4 flex flex-wrap items-end gap-4">
    <div class="form-group w-28">
      <label class="form-label">Año</label>
      <select class="form-select" [ngModel]="anioFiltro()" (ngModelChange)="onAnioChange($event)">
        @if (context()?.aniosDisponibles?.length) {
          @for (a of context()!.aniosDisponibles; track a.anio) {
            <option [ngValue]="a.anio">
              {{ a.anio }}@if (a.vigente) { ★ }
            </option>
          }
        } @else if (context()?.institucion; as inst) {
          <option [ngValue]="inst.anioEscolarActivo">{{ inst.anioEscolarActivo }}</option>
        }
      </select>
    </div>
    <div class="form-group w-36">
      <label class="form-label">Mes</label>
      <select class="form-select" [ngModel]="mesNumero()" (ngModelChange)="onMesNumeroChange($event)">
        @for (m of meses; track m.value) {
          <option [value]="m.value">{{ m.label }}</option>
        }
      </select>
    </div>
    <div class="flex items-center gap-1 pb-0.5">
      <button type="button" class="btn btn-ghost btn-icon" title="Mes anterior" (click)="irMesAnterior()">
        <span class="icon icon-sm">chevron_left</span>
      </button>
      <button type="button" class="btn btn-ghost btn-sm" (click)="irMesActual()">Hoy</button>
      <button type="button" class="btn btn-ghost btn-icon" title="Mes siguiente" (click)="irMesSiguiente()">
        <span class="icon icon-sm">chevron_right</span>
      </button>
    </div>
    @if (data(); as d) {
      <p class="text-xs text-gray-400 ml-auto pb-2">
        {{ d.resumen.diasLectivos }} días lectivos · {{ d.resumen.feriados }} feriados · {{ d.resumen.eventos }} eventos
      </p>
    }
  </div>

  @if (error()) {
    <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm" role="alert">
      {{ error() }}
    </div>
  }

  <div class="flex flex-wrap gap-2 text-xs">
    @for (tipo of tiposLeyenda; track tipo) {
      <span class="badge text-[10px]" [ngClass]="diaCfg(tipo).badge">{{ diaCfg(tipo).label }}</span>
    }
    <span class="badge badge-purple text-[10px]">Actividad / evento</span>
  </div>

  @if (svc.loading()) {
    <div class="card p-12 text-center text-gray-400 animate-pulse">Cargando calendario…</div>
  } @else if (data()) {
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div class="xl:col-span-2 card p-4">
        <div class="grid grid-cols-7 gap-1 mb-2">
          @for (d of diasSemana; track d) {
            <div class="text-center text-xs font-medium text-gray-400 py-1">{{ d }}</div>
          }
        </div>
        <div class="grid grid-cols-7 gap-1">
          @for (celda of celdas(); track celda.key) {
            <button type="button"
              class="min-h-[4.5rem] p-1.5 rounded-lg border text-left transition-colors"
              [ngClass]="claseCelda(celda)"
              [disabled]="!celda.dia"
              (click)="celda.dia && seleccionarDia(celda.iso, celda.diaData)">
              @if (celda.dia) {
                <span class="text-xs font-semibold" [class.text-indigo-600]="celda.hoy">{{ celda.dia }}</span>
                @if (celda.diaData?.feriado; as f) {
                  <span class="block mt-0.5 text-[9px] font-medium text-red-600 truncate" [title]="f.nombre">{{ f.nombre }}</span>
                }
                @if (celda.diaData?.eventos?.length) {
                  <span class="block mt-0.5 text-[9px] font-bold text-purple-600">{{ celda.diaData!.eventos.length }} act.</span>
                }
                @if (celda.diaData?.periodo; as p) {
                  <span class="block mt-0.5 text-[9px] text-blue-500 truncate">P{{ p.numero }}</span>
                }
              }
            </button>
          }
        </div>
      </div>

      <div class="space-y-4">
        @if (periodosMes().length) {
          <div class="card p-4">
            <h4 class="text-sm font-bold text-gray-800 mb-2">Periodos académicos</h4>
            <ul class="space-y-2 text-xs">
              @for (p of periodosMes(); track p.id) {
                <li class="flex items-start gap-2">
                  <span class="badge badge-blue text-[10px] shrink-0">P{{ p.numero }}</span>
                  <div>
                    <p class="font-medium text-gray-800">{{ p.nombre }}</p>
                    <p class="text-gray-500">{{ p.inicio }} – {{ p.fin }}</p>
                  </div>
                </li>
              }
            </ul>
          </div>
        }

        <div class="card p-4 min-h-[12rem]">
          <h4 class="text-sm font-bold text-gray-800 mb-2">
            @if (diaSeleccionado()) {
              {{ isoToDisplay(diaSeleccionado()!) }}
            } @else {
              Seleccione un día
            }
          </h4>
          @if (detalleDia(); as dia) {
            <p class="text-xs mb-3">
              <span class="badge text-[10px]" [ngClass]="diaCfg(dia.tipo).badge">{{ diaCfg(dia.tipo).label }}</span>
              @if (dia.periodo) {
                <span class="text-gray-500 ml-2">{{ dia.periodo.nombre }}</span>
              }
            </p>
            @if (dia.feriado) {
              <div class="p-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-800 mb-2">
                <span class="font-semibold">{{ dia.feriado.nombre }}</span>
                <span class="text-red-600 ml-1 capitalize">({{ dia.feriado.tipo }})</span>
              </div>
            }
            @if (dia.eventos.length) {
              <ul class="space-y-2">
                @for (e of dia.eventos; track e.id) {
                  <li class="p-2 rounded-lg bg-purple-50 border border-purple-100 text-xs">
                    <p class="font-semibold text-purple-900">{{ e.titulo }}</p>
                    <p class="text-purple-700">{{ e.horario }} · {{ e.destinatarios }}</p>
                  </li>
                }
              </ul>
            } @else if (!dia.feriado) {
              <p class="text-xs text-gray-400">Sin actividades programadas.</p>
            }
          } @else {
            <p class="text-xs text-gray-400">Haga clic en un día del calendario para ver el detalle.</p>
          }
        </div>
      </div>
    </div>
  }
</div>
  `,
})
export class MaestrosCalendarioEscolarComponent implements OnInit {
  readonly svc = inject(CalendarioEscolarService);
  readonly tenant = inject(TenantContextService);
  private readonly layout = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);

  readonly variant = signal<CalendarioEscolarVariant>('maestros');
  private readonly _tenantReloadReady = setupTenantReload(() => {
    if (!this.tenant.requiresSelection()) this.inicializarDesdeApi();
  });

  readonly context = signal<CalendarioContext | null>(null);
  readonly data = signal<CalendarioVisualizacion | null>(null);
  readonly error = signal('');
  readonly mes = signal(mesActualIso());
  readonly anioFiltro = signal(0);
  readonly diaSeleccionado = signal<string | null>(null);
  readonly detalleDia = signal<CalendarioDiaItem | null>(null);

  readonly meses = MESES_CALENDARIO;
  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly tiposLeyenda = ['lectivo', 'feriado', 'fin_semana', 'no_lectivo'] as const;
  readonly isoToDisplay = isoToDisplay;

  readonly mesNumero = computed(() => this.mes().slice(5, 7));

  readonly celdas = computed(() => {
    const d = this.data();
    if (!d) return [];
    return buildCeldasCalendarioMes(d.contexto.mes, d.dias);
  });

  readonly periodosMes = computed(() => this.data()?.periodos ?? []);

  readonly institucionActiva = computed(() => {
    const ctx = this.context();
    const dataInst = this.data()?.contexto?.institucion;
    return dataInst ?? ctx?.institucion ?? null;
  });

  readonly subtitulo = computed(() => {
    switch (this.variant()) {
      case 'docente':
        return 'Feriados, periodos y actividades publicadas para docentes';
      case 'padre':
        return 'Feriados, periodos y actividades visibles para apoderados';
      case 'alumno':
        return 'Feriados, periodos y actividades publicadas para tu aula';
      default:
        return 'Visualización unificada por rol: periodos, feriados y actividades';
    }
  });

  ngOnInit(): void {
    const v = this.route.snapshot.data['calendarioVariant'] as CalendarioEscolarVariant | undefined;
    if (v) this.variant.set(v);
    this.layout.setTitle('Calendario escolar');
    if (!this.tenant.requiresSelection()) {
      this.inicializarDesdeApi();
    } else {
      markTenantReloadReady(this._tenantReloadReady);
    }
  }

  private inicializarDesdeApi(): void {
    this.error.set('');
    this.context.set(null);
    this.data.set(null);
    this.diaSeleccionado.set(null);
    this.detalleDia.set(null);
    this.svc.getContext().subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        const anio = ctx.anioVigente?.anio ?? ctx.institucion.anioEscolarActivo;
        this.anioFiltro.set(anio);
        this.cargar();
        markTenantReloadReady(this._tenantReloadReady);
      },
      error: () => this.error.set('No se pudo cargar el contexto institucional.'),
    });
  }

  cargar(): void {
    this.error.set('');
    this.svc.getVisualizacion({ anioEscolar: this.anioFiltro(), mes: this.mes() }).subscribe({
      next: (res) => {
        this.data.set(res);
        this.diaSeleccionado.set(null);
        this.detalleDia.set(null);
      },
      error: (err) => {
        this.error.set(
          err?.error?.message ?? 'No se pudo cargar el calendario escolar.',
        );
      },
    });
  }

  onAnioChange(anio: number): void {
    this.anioFiltro.set(anio);
    this.cargar();
  }

  onMesNumeroChange(num: string): void {
    const anio = this.anioFiltro() || Number(this.mes().slice(0, 4));
    this.mes.set(`${anio}-${num}`);
    this.cargar();
  }

  irMesAnterior(): void {
    this.mes.set(mesAnterior(this.mes()));
    this.cargar();
  }

  irMesSiguiente(): void {
    this.mes.set(mesSiguiente(this.mes()));
    this.cargar();
  }

  irMesActual(): void {
    this.mes.set(mesActualIso());
    this.cargar();
  }

  seleccionarDia(iso: string, dia?: CalendarioDiaItem): void {
    this.diaSeleccionado.set(iso);
    this.detalleDia.set(dia ?? this.data()?.dias.find((d) => d.fecha === iso) ?? null);
  }

  diaCfg(tipo: keyof typeof DIA_TIPO_CFG) {
    return DIA_TIPO_CFG[tipo];
  }

  claseCelda(celda: ReturnType<typeof buildCeldasCalendarioMes>[number]): string {
    if (!celda.dia) return 'border-transparent';
    const tipo = celda.diaData?.tipo ?? 'lectivo';
    const base = DIA_TIPO_CFG[tipo].cell;
    const sel = this.diaSeleccionado() === celda.iso ? 'ring-2 ring-indigo-400 ring-offset-1' : '';
    return `${base} ${sel}`;
  }
}
