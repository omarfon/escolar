import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { GradingConfigService } from '../../../core/grading/grading-config.service';
import { PortalDocenteCursoCard } from '../../portal-docente/portal-docente.model';
import { InstitucionalService } from '../../administracion/institucional/institucional.service';
import { MaestrosPeriodosAcademicosService } from '../../matricula/maestros/periodos-academicos/periodos-academicos.service';
import {
  AlumnoCompetencia,
  AreaCompetencia,
  buildGradoOptions,
  calcPromedio,
  CompetencyMatrixValidation,
  CompetencyRegistryContextItem,
  eKey,
  GradoFiltroOption,
  NCFG,
  NIVELES,
  NivelLogro,
  SaveCompetencyEntry,
} from './competencias.model';
import { CompetenciasService } from './competencias.service';

type EvalMap = Map<string, NivelLogro>;
type IdMap = Map<string, number>;

@Component({
  selector: 'app-competencias',
  standalone: true,
  imports: [NgClass, FormsModule, RouterLink],
  template: `
@if (!grading.usesCompetencias()) {
  <div class="card p-8 text-center space-y-3 animate-fade-in">
    <span class="icon text-4xl text-gray-300">stars</span>
    <h2 class="text-lg font-semibold text-gray-800">Evaluación por competencias deshabilitada</h2>
    <p class="text-sm text-gray-500 max-w-md mx-auto">
      La institución usa calificación {{ grading.labelSistema() }}.
      @if (grading.usesNumeric()) {
        Utilice <strong>Registro de Notas</strong> para ingresar calificaciones numéricas.
      }
    </p>
  </div>
} @else {
@if (!periodoResuelto()) {
  <div class="card p-10 text-center text-gray-500 animate-fade-in">
    Consultando periodo académico…
  </div>
} @else {
<div class="animate-fade-in space-y-5" (click)="closePicker()">

  @if (toast()) {
    <div class="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border animate-slide-in-r"
      [ngClass]="toast()!.tipo==='ok' ? 'bg-white border-emerald-300' : 'bg-white border-red-300'">
      <span>{{ toast()!.tipo==='ok' ? '✓' : '✕' }}</span>
      <p class="text-sm text-gray-700 font-medium">{{ toast()!.msg }}</p>
      <button (click)="toast.set(null)" class="text-gray-400 ml-2 text-lg leading-none">✕</button>
    </div>
  }

  @if (!modoEmbeddido()) {
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Evaluación por Competencias</h2>
      <p class="text-sm text-gray-500 mt-0.5">
        Registro de niveles de logro · {{ selNivel() }} {{ selGrado() }} {{ selSeccion() }} · Bimestre {{ selBimestre() }}
        @if (anioEscolar()) { · {{ anioEscolar() }} }
      </p>
      @if (bimestreActual()) {
        <p class="text-xs text-amber-600 mt-1">
          Periodo actual: {{ bimestreActual() }}° bimestre — solo B1 a B{{ bimestreActual() }} habilitados
        </p>
      }
    </div>
    <div class="flex gap-2">
      @if (puedeVerAuditoria()) {
        <a class="btn btn-secondary text-sm gap-1.5"
           [routerLink]="['/evaluacion/auditoria-competencias']"
           [queryParams]="{ bimestre: selBimestre() }">
          <span class="icon icon-sm">history_edu</span> Ver historial
        </a>
      }
      <button class="btn btn-secondary text-sm gap-1.5" (click)="cargar()" [disabled]="loading()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Actualizar
      </button>
      <button class="btn btn-primary text-sm gap-2" (click)="guardar()"
        [disabled]="!hasChanges() || saving() || loading() || !edicionPermitida()"
        [ngClass]="!hasChanges() || saving() || !edicionPermitida() ? 'opacity-50 cursor-not-allowed' : ''">
        @if (hasChanges()) {
          <span class="w-2 h-2 rounded-full bg-amber-300 shrink-0"></span>
        }
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </div>
  </div>
  } @else {
  <div class="flex justify-end gap-2 shrink-0">
    <button class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="loading()">Actualizar</button>
    <button class="btn btn-primary btn-sm" (click)="guardar()"
      [disabled]="!hasChanges() || saving() || loading() || !edicionPermitida()">
      {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
    </button>
  </div>
  }

  @if (error()) {
    <div class="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">{{ error() }}</div>
  }

  @if (validacion()?.actaCerrada) {
    <div class="card p-4 border-amber-200 bg-amber-50 text-amber-900 text-sm">
      El acta de este salón y bimestre está cerrada. Puede consultar las calificaciones pero no modificarlas.
    </div>
  }

  <!-- Filtros -->
  <div class="card p-3 flex flex-wrap gap-4 items-center">
    @if (modoEmbeddido()) {
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="badge badge-indigo">{{ selNivel() }}</span>
        <span class="font-semibold text-gray-800">{{ selGrado() }} — Sección {{ selSeccion() }}</span>
      </div>
    } @else if (service.loadingContexts()) {
      <p class="text-sm text-gray-400">Cargando aulas disponibles…</p>
    } @else if (contextos().length) {
      <div class="flex items-center gap-2 flex-1 min-w-[200px]">
        <label class="text-xs text-gray-500 font-medium uppercase tracking-wide">Aula</label>
        <select class="form-input text-sm flex-1 min-w-[220px]" [ngModel]="contextoId()"
          (ngModelChange)="seleccionarContexto($event)">
          @for (ctx of contextos(); track ctx.id) {
            <option [value]="ctx.id">
              {{ ctx.nivel }} {{ ctx.grado }} {{ ctx.seccion }} — {{ ctx.totalAlumnos }} alumno(s)
            </option>
          }
        </select>
      </div>
      @if (contextoActivo(); as ctx) {
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-xs text-gray-500 font-medium uppercase tracking-wide">Curso</span>
          @for (c of ctx.cursos; track c.cursoId) {
            <button type="button"
              class="px-3 py-1 rounded-full text-sm border transition-colors"
              [ngClass]="selCursoId() === c.cursoId
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-medium'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'"
              (click)="seleccionarCurso(c.cursoId)">
              {{ c.nombre }}
            </button>
          }
        </div>
      }
    } @else {
    <div class="flex items-center gap-2">
      <label class="text-xs text-gray-500 font-medium uppercase tracking-wide">Nivel académico</label>
      <select class="form-input text-sm w-40" [ngModel]="selNivel()" (ngModelChange)="onNivelChange($event)">
        @for (n of nivelesInst(); track n) {
          <option [value]="n">{{ n }}</option>
        }
      </select>
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs text-gray-500 font-medium uppercase tracking-wide">Grado</label>
      <select class="form-input text-sm w-32" [ngModel]="selGrado()" (ngModelChange)="onGradoChange($event)"
        [disabled]="!gradosDisponibles().length">
        @for (g of gradosDisponibles(); track g.valor) {
          <option [value]="g.valor">{{ g.etiqueta }}</option>
        }
      </select>
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs text-gray-500 font-medium uppercase tracking-wide">Sección</label>
      <select class="form-input text-sm w-20" [ngModel]="selSeccion()" (ngModelChange)="onSeccionChange($event)"
        [disabled]="!seccionesDisponibles().length">
        @for (s of seccionesDisponibles(); track s) {
          <option [value]="s">{{ s }}</option>
        }
      </select>
    </div>
    }
    <div class="flex items-center gap-2 ml-auto">
      <label class="text-xs text-gray-500 font-medium uppercase tracking-wide">Bimestre</label>
      <div class="flex rounded-xl overflow-hidden border border-gray-200 divide-x divide-gray-200">
        @for (b of bimestres; track b) {
          <button type="button" class="px-3.5 py-1.5 text-sm font-medium transition-all"
            [disabled]="!bimestrePermitido(b)"
            [title]="bimestrePermitido(b) ? '' : 'Bimestre aún no habilitado'"
            [ngClass]="!bimestrePermitido(b)
              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
              : selBimestre()===b ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'"
            (click)="onBimestreChange(b)">
            B{{ b }}
          </button>
        }
      </div>
    </div>
  </div>

  @if (loading()) {
    <div class="card p-8 text-center text-gray-500">Cargando evaluaciones…</div>
  } @else if (validacion()?.codigo !== 'ok' && validacion()?.codigo !== 'acta_cerrada' && validacion()?.mensaje) {
    <div class="card p-8 text-center space-y-3">
      <div class="text-4xl">📋</div>
      <p class="text-sm text-gray-700 font-medium">{{ validacion()!.mensaje }}</p>
      <p class="text-xs text-gray-400">
        Periodo en curso: {{ validacion()!.bimestreActual }}° bimestre · A.E. {{ validacion()!.anioEscolar }}
        @if (validacion()!.periodosConfigurados) {
          · {{ validacion()!.periodosConfigurados }} bimestre(s) configurados
        }
      </p>
      @if (validacion()!.codigo === 'sin_competencias') {
        <p class="text-xs text-indigo-600">
          @if (validacion()!.enMallaPorAsignacion) {
            La malla confirma el curso ({{ validacion()!.mallaHoras }}h · {{ validacion()!.mallaDocente }}).
            Falta cargar las competencias en Currículas → Competencias.
          } @else {
            Vaya a Currículas → Competencias y cargue las competencias del curso.
          }
        </p>
      } @else if (validacion()!.codigo === 'grado_no_malla' || validacion()!.codigo === 'curso_no_malla') {
        <p class="text-xs text-indigo-600">Revise Currículas → Malla curricular y confirme que el curso figure en el grado {{ selGrado() }}.</p>
      }
    </div>
  } @else if (!areas().length) {
    <div class="card p-8 text-center text-gray-500">
      @if (modoEmbeddido() && cursoInicial()?.cursoNombre) {
        No hay competencias disponibles para <strong>{{ cursoInicial()!.cursoNombre }}</strong>
        en el {{ selBimestre() }}° bimestre ({{ selNivel() }} {{ selGrado() }} {{ selSeccion() }}).
      } @else {
        No hay competencias disponibles para el {{ selBimestre() }}° bimestre en {{ selNivel() }} {{ selGrado() }} {{ selSeccion() }}.
      }
      <p class="text-xs mt-2 text-gray-400">Verifique la malla curricular del curso asignado.</p>
    </div>
  } @else {

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    @for (n of niveles; track n) {
      @let cnt = stats()[n];
      @let tot = stats().total;
      @let pct = tot > 0 ? +(cnt / tot * 100).toFixed(0) : 0;
      <div class="card p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs px-2 py-0.5 rounded-lg font-bold border" [ngClass]="NCFG[n].badge">{{ n }}</span>
          <span class="text-xs text-gray-400">{{ pct }}%</span>
        </div>
        <p class="text-2xl font-bold text-gray-800">{{ cnt }}</p>
        <p class="text-xs text-gray-400">{{ NCFG[n].label }}</p>
        <div class="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-700" [ngClass]="NCFG[n].bar" [style.width.%]="pct"></div>
        </div>
      </div>
    }
  </div>

  <div class="tabs">
    @for (a of areas(); track a.id) {
      <button class="tab flex items-center gap-1.5" [class.tab-active]="selAreaId()===a.id"
        (click)="selAreaId.set(a.id); closePicker()">
        {{ a.emoji }} {{ a.nombre }}
        <span class="text-[10px] text-current opacity-60">({{ a.competencias.length }})</span>
      </button>
    }
  </div>

  <div class="flex gap-4 items-start">
    <div class="flex-1 min-w-0 card overflow-x-auto">
      @let area = areaActual();
      @if (area) {
      <table class="w-full text-sm min-w-max">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="sticky left-0 bg-gray-50 z-10 text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase min-w-[220px]">
              Alumno
            </th>
            @for (c of area.competencias; track c.id) {
              <th class="text-center px-2 py-3 text-xs font-semibold text-gray-600 w-28 cursor-help" [title]="c.nombre">
                <div class="flex flex-col items-center gap-0.5">
                  <span class="text-indigo-400 text-[10px] font-mono font-bold">{{ c.codigo }}</span>
                  <span>{{ c.short }}</span>
                </div>
              </th>
            }
            <th class="text-center px-2 py-3 text-xs font-semibold text-gray-600 uppercase w-28">Promedio</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (al of alumnos(); track al.id) {
            <tr class="hover:bg-gray-50 transition-colors"
              [ngClass]="selAlumno()?.id === al.id ? 'bg-indigo-50/60' : ''">
              <td class="sticky left-0 bg-inherit z-10 px-4 py-3 border-r border-gray-100">
                <button class="flex items-center gap-2.5 w-full text-left group"
                  (click)="$event.stopPropagation(); toggleDrawer(al)">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-indigo-200 transition-colors">
                    {{ al.nombre.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-800 text-sm group-hover:text-indigo-700 transition-colors">{{ al.nombre }}</p>
                    <p class="text-xs text-gray-400">{{ al.grado }} {{ al.seccion }}</p>
                  </div>
                </button>
              </td>
              @for (c of area.competencias; track c.id) {
                @let nivel = getNivel(al.id, c.id);
                <td class="px-2 py-3 text-center">
                  <div class="relative inline-flex justify-center">
                    <button type="button"
                      class="w-14 h-8 rounded-lg border text-xs font-bold transition-all"
                      [disabled]="!bimestreHabilitado()"
                      [ngClass]="!bimestreHabilitado()
                        ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                        : nivel ? NCFG[nivel].badge : 'bg-gray-50 border-gray-200 text-gray-300 hover:border-indigo-200 hover:text-indigo-300 hover:shadow-sm hover:scale-105'"
                      (click)="$event.stopPropagation(); togglePicker(al.id, c.id)">
                      {{ nivel ?? '–' }}
                    </button>
                    @if (isPicker(al.id, c.id)) {
                      <div class="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex gap-1.5"
                        (click)="$event.stopPropagation()">
                        @for (n of niveles; track n) {
                          <button (click)="setNivel(al.id, c.id, n)"
                            class="w-10 h-10 rounded-xl text-xs font-bold transition-all"
                            [ngClass]="nivel===n ? NCFG[n].btn + ' ring-2 ring-offset-1' : NCFG[n].btn">
                            {{ n }}
                          </button>
                        }
                        <button (click)="clearNivel(al.id, c.id)"
                          class="w-10 h-10 rounded-xl text-sm bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold">
                          ×
                        </button>
                      </div>
                    }
                  </div>
                </td>
              }
              <td class="px-2 py-3 text-center">
                @let prom = promedioAlumno(al.id);
                @if (prom) {
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border"
                    [ngClass]="NCFG[prom].badge">{{ prom }}</span>
                } @else {
                  <span class="text-gray-300 text-sm">–</span>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="area.competencias.length + 2" class="px-4 py-8 text-center text-gray-400">
                No hay alumnos matriculados en esta sección.
              </td>
            </tr>
          }
        </tbody>
      </table>
      }
    </div>

    @if (selAlumno()) {
      @let al = selAlumno()!;
      <div class="w-72 shrink-0 card overflow-hidden animate-slide-in-r flex flex-col">
        <div class="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              {{ al.nombre.charAt(0) }}
            </div>
            <div>
              <p class="font-bold text-gray-800 text-sm leading-tight">{{ al.nombre }}</p>
              <p class="text-xs text-gray-500">{{ al.grado }} {{ al.seccion }} · Bim. {{ selBimestre() }}</p>
            </div>
          </div>
          <button (click)="selAlumno.set(null)" class="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div class="flex border-b border-gray-100 divide-x divide-gray-100">
          @for (b of bimestres; track b) {
            <button type="button" class="flex-1 py-2 text-xs font-semibold transition-colors"
              [disabled]="!bimestrePermitido(b)"
              [title]="bimestrePermitido(b) ? '' : 'Bimestre aún no habilitado'"
              [ngClass]="!bimestrePermitido(b)
                ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                : selBimestre()===b ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'"
              (click)="onBimestreChange(b)">
              B{{ b }}
            </button>
          }
        </div>
        <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-h-[calc(100vh-320px)]">
          @for (area of areas(); track area.id) {
            @let prom = promedioArea(al.id, area.id);
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-gray-700">{{ area.emoji }} {{ area.nombre }}</span>
                @if (prom) {
                  <span class="text-xs font-bold px-2 py-0.5 rounded-lg border" [ngClass]="NCFG[prom].badge">{{ prom }}</span>
                }
              </div>
              <div class="space-y-1.5">
                @for (c of area.competencias; track c.id) {
                  @let n = getNivel(al.id, c.id);
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs text-gray-500 flex-1 truncate" [title]="c.nombre">{{ c.short }}</span>
                    @if (n) {
                      <span class="text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0" [ngClass]="NCFG[n].badge">{{ n }}</span>
                    } @else {
                      <span class="text-xs text-gray-300 w-8 text-center">–</span>
                    }
                  </div>
                }
              </div>
            </div>
            @if (!$last) { <hr class="border-gray-100"> }
          }
        </div>
        <div class="px-4 py-3 border-t border-gray-100 bg-gray-50">
          @let global = promedioGlobal(al.id);
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-600 font-medium">Promedio global Bim. {{ selBimestre() }}</span>
            @if (global) {
              <span class="text-sm font-bold px-3 py-1 rounded-xl border" [ngClass]="NCFG[global].badge">
                {{ global }} — {{ NCFG[global].label }}
              </span>
            }
          </div>
        </div>
      </div>
    }
  </div>

  <div class="flex flex-wrap gap-4 items-center text-xs text-gray-500 px-1">
    <span class="font-semibold text-gray-600">Leyenda:</span>
    @for (n of niveles; track n) {
      <span class="flex items-center gap-1.5">
        <span class="px-1.5 py-0.5 rounded text-[11px] font-bold border" [ngClass]="NCFG[n].badge">{{ n }}</span>
        {{ NCFG[n].label }}
      </span>
    }
    <span class="text-gray-400 ml-2">· Haz clic en una celda para cambiar el nivel</span>
  </div>

  }
</div>
}
}
  `,
})
export class CompetenciasComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly service = inject(CompetenciasService);
  private readonly auth = inject(AuthService);
  private readonly institucional = inject(InstitucionalService);
  private readonly periodosSvc = inject(MaestrosPeriodosAcademicosService);
  readonly grading = inject(GradingConfigService);

  readonly cursoInicial = input<PortalDocenteCursoCard | null>(null);

  readonly modoEmbeddido = computed(() => {
    const c = this.cursoInicial();
    return !!(c?.nivel && c?.grado && c?.seccion);
  });

  readonly niveles = NIVELES;
  readonly NCFG = NCFG;
  readonly bimestres = [1, 2, 3, 4];

  areas = signal<AreaCompetencia[]>([]);
  alumnos = signal<AlumnoCompetencia[]>([]);
  evalMap = signal<EvalMap>(new Map());
  evalIds = signal<IdMap>(new Map());
  pendingKeys = signal<Set<string>>(new Set());

  selAreaId = signal<number | null>(null);
  selNivel = signal('Primaria');
  selGrado = signal('4°');
  selSeccion = signal('A');
  selBimestre = signal(1);
  selAlumno = signal<AlumnoCompetencia | null>(null);
  activePicker = signal<string | null>(null);
  hasChanges = signal(false);
  bimestreActual = signal(1);
  bimestreHabilitado = signal(true);
  validacion = signal<CompetencyMatrixValidation | null>(null);
  private anioEscolarConsulta: number | null = null;
  periodoResuelto = signal(false);
  toast = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  error = signal<string | null>(null);
  anioEscolar = signal<number | null>(null);
  curriculumId = signal<number | null>(null);

  loading = this.service.loading;
  saving = this.service.saving;

  nivelesInst = signal<string[]>(['Inicial', 'Primaria', 'Secundaria']);
  gradosPorNivel = signal<Record<string, GradoFiltroOption[]>>({});
  seccionesPorGrado = signal<Record<string, string[]>>({});
  contextos = signal<CompetencyRegistryContextItem[]>([]);
  contextoId = signal('');
  selCursoId = signal<number | null>(null);
  permisos = signal({ consultar: true, registrar: false });

  private toastTimer?: ReturnType<typeof setTimeout>;

  areaActual = computed(() => {
    const id = this.selAreaId();
    return this.areas().find((a) => a.id === id) ?? this.areas()[0] ?? null;
  });

  gradosDisponibles = computed(() => this.gradosPorNivel()[this.selNivel()] ?? []);
  seccionesDisponibles = computed(() => {
    const key = `${this.selNivel()}|${this.selGrado()}`;
    return this.seccionesPorGrado()[key] ?? ['A', 'B', 'C'];
  });

  contextoActivo = computed(() =>
    this.contextos().find((c) => c.id === this.contextoId()) ?? null,
  );

  edicionPermitida = computed(
    () => this.bimestreHabilitado() && !this.validacion()?.edicionBloqueada,
  );

  stats = computed((): Record<NivelLogro, number> & { total: number } => {
    const area = this.areaActual();
    if (!area) return { AD: 0, A: 0, B: 0, C: 0, total: 0 };
    const alumnos = this.alumnos();
    const bim = this.selBimestre();
    const cnt: Record<NivelLogro, number> & { total: number } = {
      AD: 0,
      A: 0,
      B: 0,
      C: 0,
      total: 0,
    };
    for (const al of alumnos) {
      for (const c of area.competencias) {
        const n = this.evalMap().get(eKey(al.id, c.id, bim));
        if (n) {
          cnt[n]++;
          cnt.total++;
        }
      }
    }
    return cnt;
  });

  ngOnInit(): void {
    this.layout.setTitle(
      this.modoEmbeddido() ? 'Competencias — Curso asignado' : 'Evaluación por Competencias',
    );
    this.aplicarFiltroCursoInicial();
    this.periodosSvc.resolveContext().subscribe({
      next: (ctx) => {
        const bimestre = ctx.periodoActual?.numero ?? 1;
        this.anioEscolarConsulta = ctx.anioEscolar;
        this.aplicarPeriodoActual(bimestre, true);
        this.periodoResuelto.set(true);
        this.iniciarDatos();
      },
      error: () => {
        this.service.loadPeriodMeta().subscribe({
          next: (meta) => {
            this.aplicarPeriodoActual(meta.bimestreActual, true);
            this.periodoResuelto.set(true);
            this.iniciarDatos();
          },
          error: () => {
            this.periodoResuelto.set(true);
            this.iniciarDatos();
          },
        });
      },
    });
  }

  bimestrePermitido(bimestre: number): boolean {
    return bimestre <= this.bimestreActual();
  }

  puedeVerAuditoria(): boolean {
    return this.auth.hasAnyPermiso('evaluacion.reportes', 'admin.reportes');
  }

  private aplicarPeriodoActual(actual: number, forzarSeleccion = false): void {
    this.bimestreActual.set(actual);
    if (forzarSeleccion || this.selBimestre() > actual) {
      this.selBimestre.set(actual);
    }
    this.bimestreHabilitado.set(this.selBimestre() <= actual);
  }

  private iniciarDatos(): void {
    if (this.modoEmbeddido()) {
      this.cargar();
      return;
    }

    this.service.loadRegistryContext(this.selBimestre()).subscribe({
      next: (res) => {
        this.bimestreActual.set(res.bimestreActual);
        this.anioEscolarConsulta = res.anioEscolar;
        this.permisos.set(res.permisos);
        this.contextos.set(res.contexts);
        if (res.contexts.length) {
          const first = res.contexts[0];
          this.contextoId.set(first.id);
          this.aplicarContexto(first);
          this.cargar();
          return;
        }
        this.cargarDesdeInstitucional();
      },
      error: () => this.cargarDesdeInstitucional(),
    });
  }

  private cargarDesdeInstitucional(): void {
    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => {
        const activos = niveles.filter((n) => n.activo !== false);
        this.nivelesInst.set(activos.map((n) => n.nombre));
        const { gradosPorNivel, seccionesPorGrado } = buildGradoOptions(activos);
        this.gradosPorNivel.set(gradosPorNivel);
        this.seccionesPorGrado.set(seccionesPorGrado);
        this.syncFiltrosConInstitucion();
        this.aplicarFiltroCursoInicial();
        this.cargar();
      },
      error: () => this.cargar(),
    });
  }

  seleccionarContexto(id: string): void {
    const ctx = this.contextos().find((c) => c.id === id);
    if (!ctx) return;
    this.contextoId.set(id);
    this.aplicarContexto(ctx);
    this.cargar();
  }

  seleccionarCurso(cursoId: number): void {
    if (this.selCursoId() === cursoId) return;
    this.selCursoId.set(cursoId);
    const ctx = this.contextoActivo();
    const curso = ctx?.cursos.find((c) => c.cursoId === cursoId);
    if (curso && ctx?.curriculumId) {
      this.curriculumId.set(ctx.curriculumId);
    }
    this.cargar();
  }

  private aplicarContexto(ctx: CompetencyRegistryContextItem): void {
    this.selNivel.set(ctx.nivel);
    this.selGrado.set(ctx.grado);
    this.selSeccion.set(ctx.seccion);
    if (ctx.curriculumId) this.curriculumId.set(ctx.curriculumId);
    const curso = ctx.cursos[0];
    this.selCursoId.set(curso?.cursoId ?? null);
  }

  private aplicarFiltroCursoInicial(): void {
    const c = this.cursoInicial();
    if (!c?.nivel || !c.grado || !c.seccion) return;
    this.selNivel.set(c.nivel);
    this.selGrado.set(c.grado);
    this.selSeccion.set(c.seccion.toUpperCase());
  }

  private syncFiltrosConInstitucion(): void {
    const niveles = this.nivelesInst();
    if (niveles.length && !niveles.includes(this.selNivel())) {
      this.selNivel.set(niveles[0]);
    }
    const grados = this.gradosDisponibles();
    if (grados.length && !grados.some((g) => g.valor === this.selGrado())) {
      this.selGrado.set(grados[0].valor);
    }
    const secciones = this.seccionesDisponibles();
    if (secciones.length && !secciones.includes(this.selSeccion())) {
      this.selSeccion.set(secciones[0]);
    }
  }

  cargar(): void {
    if (!this.selNivel() || !this.selGrado() || !this.selSeccion()) return;
    const curso = this.cursoInicial();
    if (this.modoEmbeddido() && !curso?.cursoId) {
      this.error.set('No se pudo identificar el curso asignado.');
      return;
    }
    this.error.set(null);
    this.service
      .loadMatrix({
        nivel: this.selNivel(),
        grado: this.selGrado(),
        seccion: this.selSeccion(),
        bimestre: this.selBimestre(),
        anio: this.anioEscolarConsulta ?? undefined,
        curriculumId: this.modoEmbeddido()
          ? (curso!.curriculumId ?? this.curriculumId() ?? undefined)
          : (this.curriculumId() ?? undefined),
        cursoId: this.modoEmbeddido()
          ? curso!.cursoId
          : (this.selCursoId() ?? undefined),
        areaId: undefined,
      })
      .subscribe({
        next: (data) => {
          this.validacion.set(data.validacion);
          this.bimestreActual.set(data.bimestreActual);
          this.bimestreHabilitado.set(data.bimestreHabilitado);
          if (this.selBimestre() > data.bimestreActual) {
            this.selBimestre.set(data.bimestreActual);
            this.bimestreHabilitado.set(true);
            this.cargar();
            return;
          }

          if (data.validacion.codigo !== 'ok' && data.validacion.codigo !== 'acta_cerrada') {
            this.areas.set([]);
            this.alumnos.set([]);
            this.selAreaId.set(null);
            return;
          }

          this.areas.set(data.areas);
          this.alumnos.set(data.alumnos);
          this.anioEscolar.set(data.curriculum.anio);
          this.curriculumId.set(data.curriculum.id);

          const map: EvalMap = new Map();
          const ids: IdMap = new Map();
          for (const ev of data.evaluaciones) {
            const key = eKey(ev.studentId, ev.competenciaId, ev.bimestre);
            map.set(key, ev.nivelLogro);
            ids.set(key, ev.id);
          }
          this.evalMap.set(map);
          this.evalIds.set(ids);
          this.pendingKeys.set(new Set());
          this.hasChanges.set(false);

          if (data.areas.length) {
            if (!data.areas.some((a) => a.id === this.selAreaId())) {
              this.selAreaId.set(data.areas[0].id);
            }
          } else {
            this.selAreaId.set(null);
          }
        },
        error: (err) => {
          this.error.set(this.extractError(err));
        },
      });
  }

  onNivelChange(nivel: string): void {
    this.selNivel.set(nivel);
    this.curriculumId.set(null);
    this.anioEscolar.set(null);
    const grados = this.gradosPorNivel()[nivel] ?? [];
    this.selGrado.set(grados[0]?.valor ?? '');
    const secciones = this.seccionesPorGrado()[`${nivel}|${this.selGrado()}`] ?? [];
    this.selSeccion.set(secciones[0] ?? 'A');
    this.selAlumno.set(null);
    this.cargar();
  }

  onGradoChange(grado: string): void {
    this.selGrado.set(grado);
    this.curriculumId.set(null);
    this.anioEscolar.set(null);
    const secciones = this.seccionesPorGrado()[`${this.selNivel()}|${grado}`] ?? [];
    this.selSeccion.set(secciones[0] ?? 'A');
    this.selAlumno.set(null);
    this.cargar();
  }

  onSeccionChange(seccion: string): void {
    this.selSeccion.set(seccion);
    this.selAlumno.set(null);
    this.cargar();
  }

  onBimestreChange(bim: number): void {
    if (!this.bimestrePermitido(bim)) return;
    if (this.selBimestre() === bim) return;
    this.selBimestre.set(bim);
    this.bimestreHabilitado.set(bim <= this.bimestreActual());
    this.selAlumno.set(null);
    this.closePicker();
    if (!this.modoEmbeddido() && this.contextos().length) {
      this.service.loadRegistryContext(bim).subscribe({
        next: (res) => {
          this.contextos.set(res.contexts);
          this.bimestreActual.set(res.bimestreActual);
          if (res.contexts.length && !res.contexts.some((c) => c.id === this.contextoId())) {
            this.contextoId.set(res.contexts[0].id);
            this.aplicarContexto(res.contexts[0]);
          }
          this.cargar();
        },
        error: () => this.cargar(),
      });
      return;
    }
    this.cargar();
  }

  getNivel(alumnoId: number, compId: number): NivelLogro | null {
    return this.evalMap().get(eKey(alumnoId, compId, this.selBimestre())) ?? null;
  }

  isPicker(alumnoId: number, compId: number): boolean {
    return this.activePicker() === `${alumnoId}-${compId}`;
  }

  promedioAlumno(alumnoId: number): NivelLogro | null {
    const area = this.areaActual();
    if (!area) return null;
    const bim = this.selBimestre();
    return calcPromedio(
      area.competencias
        .map((c) => this.evalMap().get(eKey(alumnoId, c.id, bim)))
        .filter(Boolean) as NivelLogro[],
    );
  }

  promedioArea(alumnoId: number, areaId: number): NivelLogro | null {
    const area = this.areas().find((a) => a.id === areaId);
    if (!area) return null;
    const bim = this.selBimestre();
    return calcPromedio(
      area.competencias
        .map((c) => this.evalMap().get(eKey(alumnoId, c.id, bim)))
        .filter(Boolean) as NivelLogro[],
    );
  }

  promedioGlobal(alumnoId: number): NivelLogro | null {
    const bim = this.selBimestre();
    const vals: NivelLogro[] = [];
    for (const area of this.areas()) {
      for (const c of area.competencias) {
        const n = this.evalMap().get(eKey(alumnoId, c.id, bim));
        if (n) vals.push(n);
      }
    }
    return calcPromedio(vals);
  }

  setNivel(alumnoId: number, compId: number, nivel: NivelLogro): void {
    if (!this.edicionPermitida()) return;
    const key = eKey(alumnoId, compId, this.selBimestre());
    this.evalMap.update((m) => {
      const nm = new Map(m);
      nm.set(key, nivel);
      return nm;
    });
    this.pendingKeys.update((s) => new Set(s).add(key));
    this.hasChanges.set(true);
    this.activePicker.set(null);
  }

  clearNivel(alumnoId: number, compId: number): void {
    if (!this.edicionPermitida()) return;
    const key = eKey(alumnoId, compId, this.selBimestre());
    this.evalMap.update((m) => {
      const nm = new Map(m);
      nm.delete(key);
      return nm;
    });
    this.pendingKeys.update((s) => new Set(s).add(key));
    this.hasChanges.set(true);
    this.activePicker.set(null);
  }

  togglePicker(alumnoId: number, compId: number): void {
    if (!this.edicionPermitida()) return;
    const k = `${alumnoId}-${compId}`;
    this.activePicker.set(this.activePicker() === k ? null : k);
  }

  closePicker(): void {
    this.activePicker.set(null);
  }

  toggleDrawer(al: AlumnoCompetencia): void {
    this.selAlumno.set(this.selAlumno()?.id === al.id ? null : al);
  }

  guardar(): void {
    if (!this.edicionPermitida()) return;
    const entries: SaveCompetencyEntry[] = [];
    const bim = this.selBimestre();
    for (const key of this.pendingKeys()) {
      const [studentId, competenciaId] = key.split('-').map(Number);
      entries.push({
        studentId,
        competenciaId,
        evaluationId: this.evalIds().get(key),
        nivelLogro: this.evalMap().get(key) ?? null,
      });
    }

    this.service
      .saveBulk({
        nivel: this.selNivel(),
        grado: this.selGrado(),
        seccion: this.selSeccion(),
        bimestre: bim,
        anio: this.anioEscolar() ?? undefined,
        cursoId: this.modoEmbeddido()
          ? this.cursoInicial()?.cursoId
          : (this.selCursoId() ?? undefined),
        motivo: 'Registro desde módulo de competencias',
        entries,
      })
      .subscribe({
        next: (res) => {
          this.hasChanges.set(false);
          this.pendingKeys.set(new Set());
          this.mostrarToast(
            `Evaluaciones guardadas (${res.saved} registros) — Bimestre ${bim}`,
            'ok',
          );
          this.cargar();
        },
        error: (err) => {
          this.mostrarToast(this.extractError(err), 'err');
        },
      });
  }

  mostrarToast(msg: string, tipo: 'ok' | 'err'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ msg, tipo });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string | string[] }; message?: string };
    const msg = e?.error?.message ?? e?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    return msg ?? 'Error al procesar la solicitud';
  }
}
