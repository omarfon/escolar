import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { GradingConfigService } from '../../../core/grading/grading-config.service';
import { NotasRegistroService } from '../notas/notas-registro.service';
import { RegistryContextItem } from '../notas/notas-registro.model';
import { PromediosService } from './promedios.service';
import {
  AlumnoPromedio,
  BIMESTRES,
  calcPromedioNivel,
  ColumnaPromedio,
  CursoPromedio,
  NivelLogro,
  PromediosResumen,
} from './promedios.model';
import type { GradingConfig } from '../../../core/grading/grading-config.model';

@Component({
  selector: 'app-promedios',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-gray-800">{{ tituloModo() }}</h2>
          <p class="text-sm text-gray-400 mt-0.5">{{ descripcionModo() }}</p>
          <p class="text-xs text-indigo-600 mt-1 font-medium">
            Modo: {{ etiquetaModo() }}
          </p>
          <p class="text-xs text-gray-400 mt-1">
            Datos desde tabla <span class="font-mono">promedios</span> · API
            <span class="font-mono">/grades/averages</span>
          </p>
          @if (bimestreActual()) {
            <p class="text-xs text-amber-600 mt-1">
              Periodo actual: {{ bimestreActual() }}° bimestre — solo B1 a B{{ bimestreActual() }} con datos
            </p>
          }
        </div>
      </div>

      @if (error()) {
        <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{{ error() }}</div>
      }

      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
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

      <div class="card p-4 space-y-4">
        @if (notasSvc.loadingContexts()) {
          <p class="text-sm text-gray-400 text-center py-2">Cargando aulas...</p>
        } @else if (!contextos().length) {
          <p class="text-sm text-gray-500 text-center py-2">No hay aulas con alumnos matriculados.</p>
        } @else {
          <div class="flex flex-col lg:flex-row lg:items-end gap-4">
            <div class="flex-1 min-w-0">
              <label class="form-label mb-1 block">Aula</label>
              <select class="form-select" [ngModel]="contextoId()" (ngModelChange)="seleccionarContexto($event)">
                @for (ctx of contextos(); track ctx.id) {
                  <option [value]="ctx.id">
                    {{ ctx.label }} — {{ ctx.alumnosCount }} alumno{{ ctx.alumnosCount === 1 ? '' : 's' }}
                  </option>
                }
              </select>
            </div>
            <div>
              <label class="form-label mb-1 block">Bimestre</label>
              <div class="flex flex-wrap gap-1.5">
                @for (b of bimestresLista; track b) {
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                    [disabled]="!bimestrePermitido(b)"
                    [title]="bimestrePermitido(b) ? '' : 'Bimestre aún no habilitado'"
                    [ngClass]="!bimestrePermitido(b)
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                      : bimestreVista() === b
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                    (click)="seleccionarBimestre(b)">
                    B{{ b }}
                  </button>
                }
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <label class="form-label mb-1 block">Buscar alumno</label>
              <div class="relative">
                <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                <input class="form-input pl-10" placeholder="Nombre..."
                  [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event); cargar()">
              </div>
            </div>
          </div>

          @if (contextoActivo(); as ctx) {
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <label class="form-label mb-0">Vista</label>
                <span class="text-xs text-gray-400">
                  {{ esResumen() ? 'Todos los cursos · B' + bimestreVista() : filtroCurso() }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors"
                  [ngClass]="esResumen()
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-medium'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'"
                  (click)="seleccionarVista('', '')">
                  Resumen general
                </button>
                @for (opt of opcionesVista(); track opt.nombre + opt.tipo) {
                  <button type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors"
                    [ngClass]="filtroCurso() === opt.nombre && filtroTipo() === opt.tipo
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-medium'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'"
                    (click)="seleccionarVista(opt.nombre, opt.tipo)">
                    @if (opt.tipo === 'competencia') {
                      <span class="text-[10px] uppercase text-indigo-400">Comp.</span>
                    }
                    {{ opt.nombre }}
                  </button>
                }
              </div>
            </div>
          }
        }
      </div>

      @if (esResumen()) {
        <div class="card overflow-hidden">
          <div class="px-4 py-3 border-b bg-gray-50">
            <h3 class="font-semibold text-gray-800">
              @if (soloCompetencias()) {
                Nivel B{{ bimestreVista() }} por área
              } @else {
                Promedio B{{ bimestreVista() }} por curso
              }
            </h3>
            <p class="text-xs text-gray-500">
              @if (soloCompetencias()) {
                Promedio de competencias por área curricular (AD / A / B / C)
              } @else if (modoMixto()) {
                Numérico por curso y competencias por área
              } @else {
                Ponderado por componentes de la fórmula de evaluación
              }
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Estudiante</th>
                  @for (col of columnasResumen(); track col.key + col.tipo) {
                    <th class="text-center text-xs">
                      @if (col.tipo === 'competencia') {
                        <span class="block text-[10px] text-indigo-400 uppercase">Comp.</span>
                      }
                      {{ col.label }}
                    </th>
                  }
                  <th class="text-center">
                    @if (soloCompetencias()) { Nivel B{{ bimestreVista() }} }
                    @else { Prom. B{{ bimestreVista() }} }
                  </th>
                  @if (muestraColumnaNivel()) {
                    <th class="text-center">Nivel</th>
                  }
                </tr>
              </thead>
              <tbody>
                @if (svc.loading()) {
                  <tr><td [attr.colspan]="3 + columnasResumen().length + (muestraColumnaNivel() ? 1 : 0)" class="py-12 text-center text-gray-400">Calculando...</td></tr>
                } @else {
                  @for (a of alumnos(); track a.studentId; let i = $index) {
                    <tr>
                      <td class="text-xs text-gray-400">{{ i + 1 }}</td>
                      <td class="font-medium">{{ a.estudiante }}</td>
                      @for (col of columnasResumen(); track col.key + col.tipo) {
                        <td class="text-center text-sm">
                          @if (valorCelda(a, col, bimestreVista()); as val) {
                            @if (col.tipo === 'competencia') {
                              <span class="badge text-[11px]" [ngClass]="logroBadge($any(val))">{{ val }}</span>
                            } @else {
                              <span [ngClass]="notaColor($any(val))">{{ val }}</span>
                            }
                          } @else {
                            <span class="text-gray-300">—</span>
                          }
                        </td>
                      }
                      <td class="text-center font-bold">
                        @if (promedioResumenAlumno(a); as prom) {
                          @if (soloCompetencias()) {
                            <span class="badge text-[11px]" [ngClass]="logroBadge($any(prom))">{{ prom }}</span>
                          } @else {
                            <span [ngClass]="notaColor($any(prom))">{{ prom }}</span>
                          }
                        } @else {
                          <span class="text-gray-300">—</span>
                        }
                      </td>
                      @if (muestraColumnaNivel()) {
                        <td class="text-center">
                          @if (nivelResumenAlumno(a); as n) {
                            <span class="badge text-[11px]" [ngClass]="logroBadge(n)">{{ n }}</span>
                          } @else {
                            <span class="text-gray-300">—</span>
                          }
                        </td>
                      }
                    </tr>
                  } @empty {
                    <tr>
                      <td [attr.colspan]="3 + columnasResumen().length + (muestraColumnaNivel() ? 1 : 0)" class="py-12 text-center text-gray-400">
                        Sin datos para esta aula
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else if (filtroCurso()) {
        <div class="card overflow-hidden">
          <div class="px-4 py-3 border-b bg-gray-50">
            <h3 class="font-semibold text-gray-800">{{ filtroCurso() }}</h3>
            <p class="text-xs text-gray-500">
              Evolución por bimestre · Promedio parcial = media de B1 a B{{ bimestreActual() }}
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Estudiante</th>
                  @for (b of bimestres; track b.key) {
                    <th class="text-center" [class.text-gray-300]="!bimestrePermitido(b.num)">
                      {{ b.label }}
                    </th>
                  }
                  <th class="text-center">Prom. parcial</th>
                  @if (muestraColumnaNivel()) {
                    <th class="text-center">Nivel</th>
                  }
                </tr>
              </thead>
              <tbody>
                @if (svc.loading()) {
                  <tr><td colspan="9" class="py-12 text-center text-gray-400">Calculando...</td></tr>
                } @else {
                  @for (a of alumnos(); track a.studentId; let i = $index) {
                    @let curso = cursoData(a);
                    <tr>
                      <td class="text-xs text-gray-400">{{ i + 1 }}</td>
                      <td class="font-medium">{{ a.estudiante }}</td>
                      @for (b of bimestres; track b.key) {
                        <td class="text-center font-medium">
                          @if (!bimestrePermitido(b.num)) {
                            <span class="text-gray-200">—</span>
                          } @else if (filtroEsCompetencia()) {
                            @if (nivelCursoBimestre(curso, b.num); as nv) {
                              <span class="badge text-[11px]" [ngClass]="logroBadge(nv)">{{ nv }}</span>
                            } @else {
                              <span class="text-gray-300">—</span>
                            }
                          } @else {
                            <span [ngClass]="notaColor(curso?.[b.key] ?? null)">
                              {{ curso?.[b.key] ?? '—' }}
                            </span>
                          }
                        </td>
                      }
                      <td class="text-center font-bold">
                        @if (filtroEsCompetencia()) {
                          @if (curso?.nivel; as nv) {
                            <span class="badge text-[11px]" [ngClass]="logroBadge(nv)">{{ nv }}</span>
                          } @else {
                            <span class="text-gray-300">—</span>
                          }
                        } @else {
                          <span [ngClass]="notaColor(curso?.promedioAnual ?? null)">
                            {{ curso?.promedioAnual ?? '—' }}
                          </span>
                        }
                      </td>
                      @if (muestraColumnaNivel()) {
                        <td class="text-center">
                          @if (curso?.nivel; as nivelCurso) {
                            <span class="badge text-[11px]" [ngClass]="logroBadge(nivelCurso)">{{ nivelCurso }}</span>
                          } @else {
                            <span class="text-gray-300">—</span>
                          }
                        </td>
                      }
                    </tr>
                  } @empty {
                    <tr><td colspan="9" class="py-12 text-center text-gray-400">Sin datos para este curso</td></tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (soloCompetencias() || modoMixto()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
          @for (n of nivelesLogro(); track n.nivel) {
            <div class="flex items-center gap-2 text-xs text-gray-600">
              <span class="badge text-[10px]" [ngClass]="n.badge">{{ n.nivel }}</span>
              <span>{{ n.label }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PromediosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly grading = inject(GradingConfigService);
  readonly svc = inject(PromediosService);
  readonly notasSvc = inject(NotasRegistroService);

  readonly bimestres = BIMESTRES;
  readonly bimestresLista = [1, 2, 3, 4];

  readonly contextos = signal<RegistryContextItem[]>([]);
  readonly contextoId = signal('');
  readonly bimestreActual = signal(2);
  readonly bimestreVista = signal(2);
  readonly filtroCurso = signal('');
  readonly filtroTipo = signal<'numerico' | 'competencia' | ''>('');
  readonly busqueda = signal('');
  readonly error = signal('');

  private readonly _alumnos = signal<AlumnoPromedio[]>([]);
  private readonly _resumen = signal<PromediosResumen | null>(null);
  private readonly _gradingConfig = signal<GradingConfig | null>(null);
  readonly areasDisponibles = signal<string[]>([]);
  readonly columnasResumen = signal<ColumnaPromedio[]>([]);

  readonly alumnos = this._alumnos.asReadonly();

  readonly contextoActivo = computed(() =>
    this.contextos().find(c => c.id === this.contextoId()) ?? null,
  );

  readonly esResumen = computed(() => !this.filtroCurso());

  readonly cfgActiva = computed(() => this._gradingConfig() ?? this.grading.config());
  readonly soloCompetencias = computed(
    () => this.cfgActiva().usesCompetencias && !this.cfgActiva().usesNumeric,
  );
  readonly modoMixto = computed(
    () => this.cfgActiva().usesCompetencias && this.cfgActiva().usesNumeric,
  );
  readonly muestraColumnaNivel = computed(
    () => this.cfgActiva().usesNumeric || this.modoMixto(),
  );
  readonly filtroEsCompetencia = computed(
    () => this.filtroTipo() === 'competencia' || this.soloCompetencias(),
  );

  readonly opcionesVista = computed(() => {
    const cfg = this.cfgActiva();
    const ctx = this.contextoActivo();
    const opts: Array<{ nombre: string; tipo: ColumnaPromedio['tipo'] }> = [];
    if (cfg.usesNumeric && ctx?.cursos.length) {
      for (const c of ctx.cursos) opts.push({ nombre: c.nombre, tipo: 'numerico' });
    }
    if (cfg.usesCompetencias) {
      for (const a of this.areasDisponibles()) {
        opts.push({ nombre: a, tipo: 'competencia' });
      }
    }
    return opts;
  });

  tituloModo(): string {
    if (this.soloCompetencias()) return 'Promedios por Competencias';
    if (this.modoMixto()) return 'Promedios — Mixto';
    return 'Cálculo de Promedios';
  }

  descripcionModo(): string {
    if (this.soloCompetencias()) {
      return 'Niveles de logro por área curricular según la evaluación por competencias';
    }
    if (this.modoMixto()) {
      return 'Notas numéricas por curso y niveles AD/A/B/C por competencias';
    }
    return 'Promedios ponderados según la fórmula de evaluación';
  }

  etiquetaModo(): string {
    return this.grading.labelSistema();
  }

  readonly kpis = computed(() => {
    const r = this._resumen();
    const soloComp = this.soloCompetencias();
    const promAula = soloComp
      ? (r?.promedioAulaNivel ?? '—')
      : (r?.promedioAula != null ? r.promedioAula.toFixed(1) : '—');
    return [
      { label: 'Alumnos', value: r?.totalAlumnos ?? 0, icon: 'groups', bg: 'bg-indigo-100', color: 'text-indigo-600' },
      {
        label: soloComp ? 'Nivel del aula' : 'Promedio del aula',
        value: promAula,
        icon: soloComp ? 'stars' : 'calculate',
        bg: soloComp ? 'bg-purple-100' : 'bg-blue-100',
        color: soloComp ? 'text-purple-600' : 'text-blue-600',
        text: soloComp ? 'text-purple-700' : 'text-blue-700',
      },
      { label: 'Aprobados', value: r?.aprobados ?? 0, icon: 'check_circle', bg: 'bg-green-100', color: 'text-green-600', text: 'text-green-700', border: 'border-l-4 border-green-400' },
      { label: 'En riesgo', value: r?.enRiesgo ?? 0, icon: 'warning', bg: 'bg-red-100', color: 'text-red-600', text: 'text-red-700', border: 'border-l-4 border-red-400' },
      { label: 'Destacados', value: r?.destacados ?? 0, icon: 'star', bg: 'bg-purple-100', color: 'text-purple-600', text: 'text-purple-700' },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle('Cálculo de Promedios');
    this.cargarContextos(true);
  }

  bimestrePermitido(bimestre: number): boolean {
    return bimestre <= this.bimestreActual();
  }

  seleccionarContexto(id: string): void {
    const ctx = this.contextos().find(c => c.id === id);
    if (!ctx) return;
    this.contextoId.set(id);
    this.cargar();
  }

  seleccionarBimestre(bimestre: number): void {
    if (!this.bimestrePermitido(bimestre)) return;
    this.bimestreVista.set(bimestre);
    if (this.esResumen()) {
      this.cargar();
    }
  }

  seleccionarCurso(curso: string): void {
    this.seleccionarVista(curso, curso ? 'numerico' : '');
  }

  seleccionarVista(nombre: string, tipo: ColumnaPromedio['tipo'] | ''): void {
    this.filtroCurso.set(nombre);
    this.filtroTipo.set(tipo);
    this.cargar();
  }

  private actualizarColumnasResumen(res: {
    gradingConfig: GradingConfig;
    cursosDisponibles: string[];
    areasDisponibles?: string[];
    alumnos: AlumnoPromedio[];
  }): void {
    const cols: ColumnaPromedio[] = [];
    if (res.gradingConfig.usesNumeric) {
      const nombres = res.cursosDisponibles.length
        ? res.cursosDisponibles
        : [...new Set(res.alumnos.flatMap((a) => a.cursos.filter((c) => c.tipo !== 'competencia').map((c) => c.curso)))];
      for (const n of nombres) cols.push({ key: n, label: n, tipo: 'numerico' });
    }
    if (res.gradingConfig.usesCompetencias) {
      const areas = res.areasDisponibles?.length
        ? res.areasDisponibles
        : [...new Set(res.alumnos.flatMap((a) => a.cursos.filter((c) => c.tipo === 'competencia').map((c) => c.curso)))];
      for (const a of areas) cols.push({ key: a, label: a, tipo: 'competencia' });
    }
    this.columnasResumen.set(cols);
  }

  cargarContextos(inicial = false): void {
    this.notasSvc.loadContexts(this.bimestreVista()).subscribe({
      next: res => {
        this.bimestreActual.set(res.bimestreActual);
        this.contextos.set(res.contexts);
        if (!res.contexts.length) return;

        if (this.bimestreVista() > res.bimestreActual) {
          this.bimestreVista.set(res.bimestreActual);
        }

        const preferido =
          res.contexts.find(c => c.nivel === 'Primaria' && c.grado === '5°' && c.seccion === 'A') ??
          res.contexts[0];

        if (inicial || !this.contextoId()) {
          this.contextoId.set(preferido.id);
        }

        this.cargar();
      },
      error: err =>
        this.error.set(this.mensajeErrorApi(err, 'No se pudieron cargar las aulas')),
    });
  }

  cargar(): void {
    const ctx = this.contextoActivo();
    if (!ctx) return;

    this.error.set('');
    this.svc.load({
      nivel: ctx.nivel,
      grado: ctx.grado,
      seccion: ctx.seccion,
      curso: this.filtroCurso() || undefined,
      busqueda: this.busqueda() || undefined,
    }).subscribe({
      next: res => {
        this.bimestreActual.set(res.bimestreActual);
        this._alumnos.set(res.alumnos);
        this._resumen.set(res.resumen);
        this._gradingConfig.set(res.gradingConfig);
        this.areasDisponibles.set(res.areasDisponibles ?? []);
        this.actualizarColumnasResumen(res);
      },
      error: err => {
        this.error.set(this.mensajeErrorApi(err, 'No se pudieron calcular promedios'));
        this._alumnos.set([]);
        this._resumen.set(null);
      },
    });
  }

  /** Distingue caída del proxy/backend (ECONNREFUSED → 500 genérico) de errores reales de la API. */
  private mensajeErrorApi(err: unknown, fallback: string): string {
    const http = err as { status?: number; message?: string; error?: { message?: string } };
    const msg = http.error?.message ?? http.message;
    if (
      http.status === 0 ||
      (http.status === 500 &&
        (!msg || String(msg).startsWith('Http failure response')))
    ) {
      return 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución (puerto 3000).';
    }
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
  }

  private findCursoData(alumno: AlumnoPromedio, nombre: string, tipo?: ColumnaPromedio['tipo']): CursoPromedio | undefined {
    return alumno.cursos.find((c) => {
      if (c.curso !== nombre) return false;
      if (!tipo) return true;
      const t = c.tipo ?? 'numerico';
      return t === tipo;
    });
  }

  valorCelda(
    alumno: AlumnoPromedio,
    col: ColumnaPromedio,
    bimestre: number,
  ): number | NivelLogro | null {
    const data = this.findCursoData(alumno, col.key, col.tipo);
    if (!data) return null;
    if (col.tipo === 'competencia') {
      const key = `b${bimestre}Nivel` as keyof CursoPromedio;
      return (data[key] as NivelLogro | null | undefined) ?? null;
    }
    const key = `b${bimestre}` as keyof CursoPromedio;
    const val = data[key];
    return typeof val === 'number' ? val : null;
  }

  promedioResumenAlumno(alumno: AlumnoPromedio): number | NivelLogro | null {
    if (this.soloCompetencias()) {
      const niveles = this.columnasResumen()
        .map((col) => this.valorCelda(alumno, col, this.bimestreVista()))
        .filter(Boolean) as NivelLogro[];
      return calcPromedioNivel(niveles);
    }
    return this.promedioBimestreAlumno(alumno);
  }

  nivelResumenAlumno(alumno: AlumnoPromedio): NivelLogro | null {
    if (this.soloCompetencias()) {
      return alumno.nivelGeneral;
    }
    const p = this.promedioBimestreAlumno(alumno);
    if (p === null) return null;
    return this.grading.nivelDeNota(p) as NivelLogro;
  }

  cursoBimestre(alumno: AlumnoPromedio, curso: string, bimestre: number): number | null {
    const data = this.findCursoData(alumno, curso, 'numerico');
    if (!data) return null;
    const key = `b${bimestre}` as keyof CursoPromedio;
    const val = data[key];
    return typeof val === 'number' ? val : null;
  }

  promedioBimestreAlumno(alumno: AlumnoPromedio): number | null {
    const b = this.bimestreVista();
    const vals = this.columnasResumen()
      .filter((col) => col.tipo === 'numerico')
      .map((col) => this.valorCelda(alumno, col, b))
      .filter((v): v is number => typeof v === 'number');
    if (!vals.length) {
      const legacy = alumno.cursos
        .filter((c) => (c.tipo ?? 'numerico') === 'numerico')
        .map((c) => {
          const key = `b${b}` as keyof CursoPromedio;
          const val = c[key];
          return typeof val === 'number' ? val : null;
        })
        .filter((v): v is number => v !== null);
      if (!legacy.length) return null;
      return Math.round((legacy.reduce((s, v) => s + v, 0) / legacy.length) * 10) / 10;
    }
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
  }

  cursoData(alumno: AlumnoPromedio): CursoPromedio | undefined {
    const tipo = this.filtroTipo() || (this.soloCompetencias() ? 'competencia' : 'numerico');
    return this.findCursoData(alumno, this.filtroCurso(), tipo as ColumnaPromedio['tipo']);
  }

  nivelCursoBimestre(curso: CursoPromedio | undefined, bimestre: number): NivelLogro | null {
    if (!curso) return null;
    const key = `b${bimestre}Nivel` as keyof CursoPromedio;
    return (curso[key] as NivelLogro | null | undefined) ?? null;
  }

  notaColor(nota: number | null | undefined): string {
    if (nota == null) return 'text-gray-300';
    return this.grading.colorPromedio(nota);
  }

  readonly nivelesLogro = computed(() => {
    return [
      { nivel: 'AD' as NivelLogro, label: 'Logro Destacado', badge: 'badge-indigo' },
      { nivel: 'A' as NivelLogro, label: 'Logro Esperado', badge: 'badge-green' },
      { nivel: 'B' as NivelLogro, label: 'En Proceso', badge: 'badge-yellow' },
      { nivel: 'C' as NivelLogro, label: 'En Inicio', badge: 'badge-red' },
    ];
  });

  logroBadge(n: NivelLogro): string {
    return this.nivelesLogro().find(x => x.nivel === n)?.badge ?? 'badge-gray';
  }
}
