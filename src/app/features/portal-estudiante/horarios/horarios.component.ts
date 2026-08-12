import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { addMonths, addWeeks, subMonths, subWeeks } from 'date-fns';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { HorariosService } from '../../academico/horarios/services/horarios.service';
import { DIAS, DIAS_SEMANA_CAB, CALENDARIO_MES_GRID, esFinDeSemanaCalendario } from '../../academico/horarios/data/horario.constants';
import { CeldaCalendario } from '../../academico/horarios/models/horario.model';

type VistaHorario = 'mes' | 'semana';

@Component({
  standalone: true,
  imports: [NgClass],
  template: `
<div class="space-y-5 animate-fade-in">

  <!-- Header -->
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-bold text-gray-800">Mis Horarios</h2>
      <p class="text-sm text-gray-500 mt-0.5">
        {{ auth.nombreCompleto() }} · {{ perfil().aulaLabel }} · A.E. 2026
      </p>
    </div>
    <div class="flex items-center gap-2">
      <div class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
        <button
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5"
          [ngClass]="vista() === 'mes' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'"
          (click)="vista.set('mes')">
          <span class="icon text-base">calendar_month</span>
          Mes
        </button>
        <button
          class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5"
          [ngClass]="vista() === 'semana' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'"
          (click)="irAVistaSemanal()">
          <span class="icon text-base">view_week</span>
          Semana
        </button>
      </div>
    </div>
  </div>

  <!-- Info aula -->
  <div class="card p-4 flex flex-wrap items-center gap-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
        <span class="icon text-indigo-600">school</span>
      </div>
      <div>
        <div class="text-sm font-semibold text-gray-800">{{ perfil().aulaLabel }}</div>
        <div class="text-xs text-gray-500">Salida estimada: {{ svc.horaSalida(perfil().nivel) }}</div>
      </div>
    </div>
    <div class="h-8 w-px bg-gray-200 hidden sm:block"></div>
    <div class="flex gap-6 text-sm">
      <div>
        <div class="text-xs text-gray-400">Clases / semana</div>
        <div class="font-bold text-indigo-700">{{ entradas().length }}</div>
      </div>
      <div>
        <div class="text-xs text-gray-400">Áreas</div>
        <div class="font-bold text-gray-700">{{ legenda().length }}</div>
      </div>
    </div>
  </div>

  @if (vista() === 'mes') {
    <!-- Navegación mensual -->
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <button class="btn btn-ghost btn-icon" (click)="mesAnterior()" title="Mes anterior">
          <span class="icon">chevron_left</span>
        </button>
        <div class="text-center">
          <h3 class="text-base font-bold text-gray-800 capitalize">{{ tituloMes() }}</h3>
          <p class="text-xs text-gray-500">Haz clic en un día lectivo para ver el detalle</p>
        </div>
        <button class="btn btn-ghost btn-icon" (click)="mesSiguiente()" title="Mes siguiente">
          <span class="icon">chevron_right</span>
        </button>
      </div>

      <!-- Calendario -->
      <div class="p-4">
        <div [class]="CALENDARIO_MES_GRID">
          @for (d of DIAS_SEMANA_CAB; track d; let i = $index) {
            <div class="bg-gray-50 text-center font-semibold text-gray-500 uppercase"
              [ngClass]="esFinDeSemanaCalendario(i) ? 'py-1.5 text-[10px] text-gray-400' : 'py-2 text-xs'">
              {{ d }}
            </div>
          }
          @for (semana of calendario(); track $index) {
            @for (celda of semana; track celda.fecha.getTime(); let i = $index) {
              <button
                type="button"
                class="bg-white text-left transition-colors relative"
                [ngClass]="{
                  'min-h-[100px] p-1.5': !esFinDeSemanaCalendario(i),
                  'min-h-[64px] p-1 bg-gray-50/80': esFinDeSemanaCalendario(i),
                  'opacity-40': !celda.enMes,
                  'ring-2 ring-inset ring-indigo-500 z-10': diaSeleccionado() && svc.esMismaFecha(celda.fecha, diaSeleccionado()!),
                  'bg-indigo-50/60': celda.esHoy && !esFinDeSemanaCalendario(i),
                  'hover:bg-gray-50 cursor-pointer': celda.esEscolar && celda.enMes,
                  'cursor-default': !celda.esEscolar || !celda.enMes
                }"
                [disabled]="!celda.esEscolar || !celda.enMes"
                (click)="seleccionarDia(celda)">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-semibold flex items-center justify-center rounded-full"
                    [ngClass]="esFinDeSemanaCalendario(i)
                      ? (celda.esHoy ? 'w-5 h-5 text-[10px] bg-indigo-600 text-white' : 'w-5 h-5 text-[10px] text-gray-500')
                      : (celda.esHoy ? 'w-6 h-6 text-xs bg-indigo-600 text-white' : 'w-6 h-6 text-xs text-gray-700')">
                    {{ celda.fecha.getDate() }}
                  </span>
                  @if (!esFinDeSemanaCalendario(i) && celda.esEscolar && celda.enMes && celda.clases.length) {
                    <span class="text-[10px] text-gray-400">{{ celda.clases.length }} cls</span>
                  }
                </div>
                @if (!esFinDeSemanaCalendario(i) && celda.esEscolar && celda.enMes) {
                  <div class="space-y-0.5">
                    @for (cl of celda.clases.slice(0, 3); track cl.periodo.id) {
                      <div class="text-[10px] leading-tight px-1 py-0.5 rounded truncate border"
                        [ngClass]="cl.curso.colorClass">
                        {{ cl.curso.nombre }}
                      </div>
                    }
                    @if (celda.clases.length > 3) {
                      <div class="text-[10px] text-indigo-500 font-medium px-1">
                        +{{ celda.clases.length - 3 }} más
                      </div>
                    }
                  </div>
                }
              </button>
            }
          }
        </div>
      </div>
    </div>

    <!-- Detalle del día seleccionado -->
    @if (detalleDia(); as detalle) {
      <div class="card p-5 border-l-4 border-l-indigo-500 animate-fade-in">
        <div class="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 class="font-bold text-gray-800 capitalize">
              {{ svc.nombreDia(detalle.diaHorario!) }} {{ svc.formatFecha(detalle.fecha, 'd MMMM') }}
            </h3>
            <p class="text-sm text-gray-500">{{ detalle.clases.length }} clases programadas</p>
          </div>
          <button class="btn btn-ghost text-xs text-indigo-600" (click)="verSemanaDeDia(detalle.fecha)">
            Ver en vista semanal
          </button>
        </div>
        <div class="space-y-2">
          @for (cl of detalle.clases; track cl.periodo.id) {
            <div class="flex items-center gap-3 p-3 rounded-xl border" [ngClass]="cl.curso.colorClass">
              <div class="text-center shrink-0 w-16">
                <div class="text-xs font-bold">{{ cl.periodo.horaInicio }}</div>
                <div class="text-[10px] opacity-60">{{ cl.periodo.horaFin }}</div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm">{{ cl.curso.nombre }}</div>
                <div class="text-xs opacity-70">{{ cl.docente.abrev }} · {{ cl.periodo.nombre }}</div>
              </div>
            </div>
          }
        </div>
      </div>
    }
  }

  @if (vista() === 'semana') {
    <!-- Navegación semanal -->
    <div class="card p-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-icon" (click)="semanaAnterior()">
          <span class="icon">chevron_left</span>
        </button>
        <button class="btn btn-secondary text-sm" (click)="irAHoy()">Hoy</button>
        <button class="btn btn-ghost btn-icon" (click)="semanaSiguiente()">
          <span class="icon">chevron_right</span>
        </button>
      </div>
      <div class="text-sm font-semibold text-gray-700 capitalize">
        Semana del {{ svc.formatFecha(fechasSemana()[0], 'd MMM') }}
        al {{ svc.formatFecha(fechasSemana()[4], 'd MMM yyyy') }}
      </div>
    </div>

    <!-- Grid semanal -->
    <div class="card overflow-x-auto">
      <table class="w-full border-collapse text-sm" style="min-width: 720px">
        <thead>
          <tr class="bg-gray-50">
            <th class="text-left px-4 py-3 font-semibold text-gray-500 border-b border-r border-gray-200 w-28">
              Período
            </th>
            @for (fecha of fechasSemana(); track fecha.getTime(); let di = $index) {
              <th class="px-3 py-3 font-semibold text-gray-700 border-b border-r border-gray-200 text-center"
                [ngClass]="svc.esMismaFecha(fecha, hoy) ? 'bg-indigo-50' : ''">
                <div>{{ DIAS[di] }}</div>
                <div class="text-xs font-normal text-gray-400 mt-0.5 capitalize">
                  {{ svc.formatFecha(fecha, 'd MMM') }}
                </div>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (periodo of periodos(); track periodo.id) {
            @if (periodo.isReceso) {
              <tr class="bg-amber-50">
                <td class="px-4 py-2 border-b border-r border-amber-100">
                  <div class="font-medium text-amber-700 text-xs">{{ periodo.nombre }}</div>
                  <div class="text-xs text-amber-500">{{ periodo.horaInicio }}–{{ periodo.horaFin }}</div>
                </td>
                <td colspan="5" class="px-4 py-2 border-b border-amber-100 text-center text-amber-600 font-medium text-sm">
                  Recreo — {{ periodo.horaInicio }} a {{ periodo.horaFin }}
                </td>
              </tr>
            } @else {
              <tr class="hover:bg-gray-50/50">
                <td class="px-4 py-2 border-b border-r border-gray-100 align-top">
                  <div class="font-medium text-gray-700 text-xs">{{ periodo.nombre }}</div>
                  <div class="text-xs text-gray-400">{{ periodo.horaInicio }}</div>
                  <div class="text-xs text-gray-300">{{ periodo.horaFin }}</div>
                </td>
                @for (di of [0, 1, 2, 3, 4]; track di) {
                  @let entrada = getEntrada(di, periodo.id);
                  @let esHoy = svc.diaHorarioDesdeFecha(fechasSemana()[di]) !== null && svc.esMismaFecha(fechasSemana()[di], hoy);
                  <td class="px-2 py-2 border-b border-r border-gray-100 align-top"
                    [ngClass]="esHoy ? 'bg-indigo-50/40' : ''">
                    @if (entrada) {
                      @let curso = svc.curById(entrada.cursoId);
                      @let doc = svc.docById(entrada.docenteId);
                      <div class="rounded-lg p-2 border select-none"
                        [ngClass]="curso?.colorClass ?? 'bg-gray-100 text-gray-700 border-gray-200'">
                        <div class="font-semibold text-xs leading-tight">{{ curso?.nombre }}</div>
                        <div class="text-xs opacity-60 mt-0.5 truncate">{{ doc?.abrev }}</div>
                      </div>
                    } @else {
                      <div class="min-h-[52px] rounded-lg border border-dashed border-gray-100 bg-gray-50"></div>
                    }
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  }

  <!-- Leyenda -->
  <div class="card p-3">
    <div class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Mis áreas curriculares</div>
    <div class="flex flex-wrap gap-2">
      @for (c of legenda(); track c.id) {
        <div class="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border" [ngClass]="c.colorClass">
          <span class="w-1.5 h-1.5 rounded-full" [ngClass]="c.dotClass"></span>
          {{ c.nombre }}
        </div>
      }
    </div>
  </div>

</div>
  `,
})
export class HorariosEstudianteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly svc = inject(HorariosService);

  readonly DIAS = DIAS;
  readonly DIAS_SEMANA_CAB = DIAS_SEMANA_CAB;
  readonly CALENDARIO_MES_GRID = CALENDARIO_MES_GRID;
  readonly esFinDeSemanaCalendario = esFinDeSemanaCalendario;
  readonly hoy = new Date();

  vista = signal<VistaHorario>('mes');
  mesRef = signal(new Date());
  semanaRef = signal(new Date());
  diaSeleccionado = signal<Date | null>(new Date());

  perfil = computed(() => this.svc.perfil() ?? this.svc.getPerfilEstudiante());
  entradas = computed(() => {
    this.svc.entradas();
    const p = this.perfil();
    return this.svc.getEntradas(p);
  });
  periodos = computed(() => this.svc.getPeriodos(this.perfil().nivel));
  legenda = computed(() => this.svc.legendaCursos(this.entradas()));

  tituloMes = computed(() => this.svc.formatMesAnio(this.mesRef()));

  calendario = computed(() =>
    this.svc.construirCalendarioMensual(this.mesRef(), this.entradas(), this.perfil().nivel),
  );

  fechasSemana = computed(() => this.svc.fechasSemanaLaboral(this.semanaRef()));

  detalleDia = computed(() => {
    const fecha = this.diaSeleccionado();
    if (!fecha) return null;
    const diaHorario = this.svc.diaHorarioDesdeFecha(fecha);
    if (diaHorario === null) return null;
    const clases = this.svc.clasesDelDia(this.entradas(), diaHorario, this.perfil().nivel);
    return { fecha, diaHorario, clases };
  });

  ngOnInit(): void {
    this.layout.setTitle('Mis Horarios');
  }

  mesAnterior(): void {
    this.mesRef.update((m) => subMonths(m, 1));
  }

  mesSiguiente(): void {
    this.mesRef.update((m) => addMonths(m, 1));
  }

  semanaAnterior(): void {
    this.semanaRef.update((s) => subWeeks(s, 1));
  }

  semanaSiguiente(): void {
    this.semanaRef.update((s) => addWeeks(s, 1));
  }

  irAHoy(): void {
    const now = new Date();
    this.semanaRef.set(now);
    this.diaSeleccionado.set(now);
  }

  seleccionarDia(celda: CeldaCalendario): void {
    if (!celda.esEscolar || !celda.enMes) return;
    this.diaSeleccionado.set(celda.fecha);
  }

  irAVistaSemanal(): void {
    const ref = this.diaSeleccionado() ?? new Date();
    this.semanaRef.set(ref);
    this.vista.set('semana');
  }

  verSemanaDeDia(fecha: Date): void {
    this.semanaRef.set(fecha);
    this.vista.set('semana');
  }

  getEntrada(dia: number, periodoId: number) {
    return this.svc.getEntrada(this.entradas(), dia, periodoId);
  }
}
