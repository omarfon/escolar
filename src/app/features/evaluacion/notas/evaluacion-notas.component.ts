import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { PortalDocenteCursoCard } from '../../portal-docente/portal-docente.model';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mensajeErrorHttp } from '../../../core/api/api-error.util';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { GradingConfigService } from '../../../core/grading/grading-config.service';
import {
  cellKey,
  isNotaEnRango,
  validateNotaInRange,
} from '../../../core/grading/grading-range.validation';
import { CompetenciasComponent } from '../competencias/competencias.component';
import { NotasRegistroService } from './notas-registro.service';
import { PortalDocenteService } from '../../portal-docente/portal-docente.service';
import { MaestrosPeriodosAcademicosService } from '../../matricula/maestros/periodos-academicos/periodos-academicos.service';
import {
  GradeRegistryResponse,
  NotasRegistroFilters,
  RegistryAlumnoRow,
  RegistryContextItem,
  RectifyNotasRegistroPayload,
  RectifyRegistryContextResponse,
  RegistryContextsResponse,
  SaveNotasRegistroPayload,
  ValidacionRangos,
} from './notas-registro.model';

interface ConfirmGuardadoResumen {
  curso: string;
  nivel: string;
  grado: string;
  seccion: string;
  bimestre: number;
  alumnosCount: number;
  calificacionesCount: number;
}

function normalizeGradoFiltro(value: string): string {
  let t = (value ?? '').trim();
  const withNivel = t.match(/^(.+?)\s+(Inicial|Primaria|Secundaria)$/i);
  if (withNivel) t = withNivel[1].trim();
  if (/^\d+\s*°?$/.test(t)) {
    return `${t.replace(/[^\d]/g, '')}°`;
  }
  const num = t.match(/^(\d+)/);
  if (num) return `${num[1]}°`;
  return t;
}

function gradosCoincidenFiltro(a: string, b: string): boolean {
  return normalizeGradoFiltro(a) === normalizeGradoFiltro(b);
}

@Component({
  selector: 'app-evaluacion-notas',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, CompetenciasComponent],
  template: `
    @if (modoSoloCompetencias()) {
      <app-competencias [cursoInicial]="cursoInicial()" />
    } @else if (!grading.usesNumeric()) {
      <div class="card p-8 text-center space-y-3">
        <span class="icon text-4xl text-gray-300">grading</span>
        <h2 class="text-lg font-semibold text-gray-800">Registro de calificaciones no disponible</h2>
        <p class="text-sm text-gray-500 max-w-md mx-auto">
          La institución usa calificación {{ grading.labelSistema() }}.
        </p>
      </div>
    } @else {
    <div class="space-y-5">
      @if (modoMixto()) {
        <div class="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          <button type="button" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            [ngClass]="tabActivo() === 'notas'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'"
            (click)="tabActivo.set('notas')">
            Notas numéricas
          </button>
          <button type="button" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            [ngClass]="tabActivo() === 'competencias'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'"
            (click)="tabActivo.set('competencias')">
            Competencias
          </button>
        </div>
      }

      @if (modoMixto() && tabActivo() === 'competencias') {
        <app-competencias />
      } @else {
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        @if (!modoEmbeddido()) {
        <div>
          <h2 class="text-xl font-bold text-gray-800">
            @if (modoRectificacion()) {
              Rectificación de Notas
            } @else if (modoDocente()) {
              Registro de Notas — Mis cursos
            } @else {
              Registro de Notas
            }
          </h2>
          <p class="text-sm text-gray-400 mt-0.5">
            @if (modoRectificacion()) {
              Corrección oficial con motivo obligatorio y registro en auditoría
            } @else if (modoDocente()) {
              Solo salones y cursos asignados a tu perfil docente
            } @else {
              Elija el aula y el curso; la lista se carga automáticamente
            }
          </p>
          <p class="text-xs text-gray-400 mt-1">
            Datos desde tabla <span class="font-mono">grades</span> · API
            <span class="font-mono">/grades/registry</span>
          </p>
          @if (formula()) {
            <p class="text-xs text-indigo-600 mt-1">
              Fórmula: {{ formula()!.nombre }}
              @for (c of formula()!.componentes; track c.codigo) {
                · {{ c.nombre }} {{ c.peso }}%
              }
            </p>
          }
        </div>
        } @else {
        <div class="flex-1">
          @if (formula()) {
            <p class="text-sm text-indigo-700 mt-1">
              Fórmula: <span class="font-medium">{{ formula()!.nombre }}</span>
              @for (c of formula()!.componentes; track c.codigo) {
                · {{ c.nombre }} {{ c.peso }}%
              }
            </p>
          }
        </div>
        }
        <div class="flex flex-wrap gap-2 shrink-0">
          @if (puedeVerAuditoria() && filtro().curso) {
            <a class="btn btn-secondary"
               [routerLink]="['/evaluacion/auditoria-cambios']"
               [queryParams]="{ curso: filtro().curso, bimestre: filtro().bimestre }">
              <span class="icon icon-sm">history_edu</span> Ver historial
            </a>
          }
          <button class="btn btn-primary" [disabled]="!puedeGuardar() || svc.saving()" (click)="guardar()">
            <span class="icon">{{ modoRectificacion() ? 'edit_note' : 'save' }}</span>
            {{ svc.saving()
              ? 'Guardando...'
              : modoRectificacion() ? 'Rectificar notas' : 'Guardar notas' }}
          </button>
        </div>
      </div>

      @if (modoRectificacion()) {
        <div class="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm">
          Proceso de rectificación oficial: solo puede modificar calificaciones ya registradas.
          Cada cambio requiere motivo y queda en auditoría con valores anterior y nuevo.
        </div>
      }
      @if (!modoRectificacion() && actaCerrada()) {
        <div class="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm flex flex-wrap items-center gap-2">
          <span>El acta de este salón y bimestre está cerrada. No puede modificar notas desde el registro habitual.</span>
          @if (auth.hasAnyPermiso('evaluacion.rectificar', 'evaluacion.aprobar')) {
            <a class="text-indigo-700 font-medium underline" routerLink="/evaluacion/rectificacion-notas"
              [queryParams]="{ nivel: filtro().nivel, grado: filtro().grado, seccion: filtro().seccion, curso: filtro().curso, bimestre: filtro().bimestre }">
              Ir a rectificación autorizada
            </a>
          }
        </div>
      }
      @if (validacionRangos(); as vr) {
        <div class="rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 px-4 py-2 text-sm">
          {{ vr.mensaje }} {{ vr.mensajeAprobacion }}
        </div>
      }
      @if (hayNotasInvalidas()) {
        <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm" role="alert">
          Hay calificaciones fuera del rango permitido. Corrija las celdas resaltadas antes de guardar.
        </div>
      }
      @if (error()) {
        <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{{ error() }}</div>
      }
      @if (toast()) {
        <div class="rounded-xl px-4 py-3 text-sm bg-green-50 text-green-700 border border-green-200">{{ toast() }}</div>
      }

      <div class="card p-4 space-y-4">
        @if (modoEmbeddido()) {
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="badge badge-indigo">{{ cursoInicial()!.nivel }}</span>
              <span class="font-semibold text-gray-800">{{ cursoInicial()!.gradoLabel }} — Sección {{ cursoInicial()!.seccion }}</span>
              <span class="text-gray-400">·</span>
              <span class="font-medium text-indigo-700">{{ cursoInicial()!.cursoNombre }}</span>
            </div>
            <div>
              <label class="form-label mb-1 block sm:text-right">Bimestre</label>
              <div class="flex flex-wrap gap-1.5 sm:justify-end">
                @for (b of bimestres; track b) {
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                    [disabled]="!bimestrePermitido(b)"
                    [title]="bimestrePermitido(b) ? '' : 'Bimestre aún no habilitado'"
                    [ngClass]="!bimestrePermitido(b)
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                      : filtro().bimestre === b
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                    (click)="seleccionarBimestre(b)">
                    B{{ b }}
                  </button>
                }
              </div>
            </div>
          </div>
        } @else if (svc.loadingContexts() || cargandoAsignaciones()) {
          <p class="text-sm text-gray-400 text-center py-2">Cargando aulas disponibles...</p>
        } @else if (!contextos().length) {
          <p class="text-sm text-gray-500 text-center py-2">
            @if (modoDocente()) {
              No tienes cursos asignados para registrar notas en este bimestre.
            } @else {
              No hay aulas con alumnos matriculados.
            }
          </p>
        } @else {
          <div class="flex flex-col lg:flex-row lg:items-end gap-4">
            <div class="flex-1 min-w-0">
              <label class="form-label mb-1 block">Aula</label>
              <select
                class="form-select"
                [ngModel]="contextoId()"
                (ngModelChange)="seleccionarContexto($event)">
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
                @for (b of bimestres; track b) {
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                    [disabled]="!bimestrePermitido(b)"
                    [title]="bimestrePermitido(b) ? '' : 'Bimestre aún no habilitado'"
                    [ngClass]="!bimestrePermitido(b)
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                      : filtro().bimestre === b
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                    (click)="seleccionarBimestre(b)">
                    B{{ b }}
                  </button>
                }
              </div>
            </div>
          </div>

          @if (contextoActivo(); as ctx) {
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <label class="form-label mb-0">Curso</label>
                <span class="text-xs text-gray-400">{{ ctx.alumnosCount }} alumnos en esta aula</span>
              </div>
              @if (!ctx.cursos.length) {
                <p class="text-sm text-amber-600">Sin cursos configurados para este grado.</p>
              } @else {
                <div class="flex flex-wrap gap-2">
                  @for (c of ctx.cursos; track c.nombre) {
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors"
                      [ngClass]="filtro().curso === c.nombre
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-medium'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'"
                      (click)="seleccionarCurso(c.nombre)">
                      {{ c.nombre }}
                      @if (c.conNotas) {
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Con notas registradas"></span>
                      }
                    </button>
                  }
                </div>
              }
            </div>
          }
        }
      </div>

      <div class="card overflow-hidden">
        @if (svc.loading()) {
          <div class="p-10 text-center text-gray-400 text-sm">Cargando alumnos y notas...</div>
        } @else if (!filtrosCompletos()) {
          <div class="p-10 text-center text-gray-500 text-sm">
            Seleccione un aula y un curso para ver el registro.
          </div>
        } @else if (!alumnos().length) {
          <div class="p-10 text-center text-gray-500 text-sm">
            No hay alumnos matriculados en {{ contextoActivo()?.label }}.
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Apellidos y Nombres</th>
                  @for (c of formula()?.componentes ?? []; track c.codigo) {
                    <th class="text-center text-xs whitespace-nowrap">
                      {{ c.nombre }}<br><span class="text-gray-400 font-normal">{{ c.peso }}%</span>
                    </th>
                  }
                  <th class="text-center">Promedio</th>
                  @if (grading.usesCompetencias()) {
                    <th class="text-center">Nivel</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (a of alumnos(); track a.studentId; let i = $index) {
                  <tr>
                    <td class="text-gray-400 text-xs">{{ i + 1 }}</td>
                    <td class="font-medium">{{ a.apellido }}, {{ a.nombre }}</td>
                    @for (c of formula()?.componentes ?? []; track c.codigo) {
                      <td class="text-center">
                        <input type="number" min="0" [max]="notaMaxima()" step="0.1"
                          [ngModel]="a.componentes[c.codigo]?.nota"
                          (ngModelChange)="setNota(a, c.codigo, $event)"
                          [disabled]="!edicionPermitida() || celdaRectificacionBloqueada(a, c.codigo)"
                          class="w-16 text-center form-input px-1 py-1 text-sm"
                          [class.bg-gray-50]="!edicionPermitida() || celdaRectificacionBloqueada(a, c.codigo)"
                          [class.border-red-500]="celdaInvalida(a.studentId, c.codigo)"
                          [title]="celdaInvalida(a.studentId, c.codigo) ? mensajeRangoInvalido(a.componentes[c.codigo]?.nota) : ''">
                      </td>
                    }
                    <td class="text-center font-bold" [ngClass]="colorPromedio(promedioAlumno(a))">
                      {{ promedioAlumno(a) ?? '—' }}
                    </td>
                    @if (grading.usesCompetencias()) {
                      <td class="text-center">
                        <span class="badge" [ngClass]="badgeNivel(nivelAlumno(a))">{{ nivelAlumno(a) ?? '—' }}</span>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

    @if (confirmModalAbierto()) {
      <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        (click)="cerrarConfirmModal()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in"
          (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between px-6 py-4 border-b">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <span class="icon">save</span>
              </div>
              <div>
                <h3 class="font-bold text-gray-900">
                  {{ modoRectificacion() ? 'Confirmar rectificación' : 'Actualizar notas' }}
                </h3>
                <p class="text-xs text-gray-500">
                  {{ modoRectificacion()
                    ? 'Indique el motivo oficial del cambio'
                    : 'Confirma antes de registrar en el sistema' }}
                </p>
              </div>
            </div>
            <button type="button" class="btn-icon text-gray-400" (click)="cerrarConfirmModal()">
              <span class="icon">close</span>
            </button>
          </div>

          @if (confirmResumen(); as r) {
            <div class="px-6 py-5 space-y-4">
              <div class="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-900">
                <p class="font-semibold text-base">{{ r.curso }}</p>
                <p class="mt-1">{{ r.nivel }} · {{ r.grado }} — Sección {{ r.seccion }}</p>
                <p class="text-indigo-700 mt-1">{{ r.bimestre }}° bimestre</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <p class="text-xs text-gray-500">Alumnos</p>
                  <p class="text-xl font-bold text-gray-900 mt-0.5">{{ r.alumnosCount }}</p>
                </div>
                <div class="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <p class="text-xs text-gray-500">Calificaciones</p>
                  <p class="text-xl font-bold text-indigo-600 mt-0.5">{{ r.calificacionesCount }}</p>
                </div>
              </div>

              @if (modoRectificacion()) {
                <div>
                  <label class="form-label" for="motivo-rectificacion">Motivo de rectificación</label>
                  <textarea id="motivo-rectificacion" rows="3" class="form-input w-full text-sm"
                    [ngModel]="motivoRectificacion()"
                    (ngModelChange)="motivoRectificacion.set($event)"
                    placeholder="Describa el motivo oficial (mínimo 10 caracteres)"></textarea>
                  @if (motivoRectificacion().trim().length > 0 && motivoRectificacion().trim().length < 10) {
                    <p class="text-xs text-red-600 mt-1">El motivo debe tener al menos 10 caracteres.</p>
                  }
                </div>
              } @else {
                <p class="text-sm text-gray-600">
                  Se actualizarán las notas ingresadas para este curso y bimestre. Esta acción reemplazará los valores previos de los componentes registrados.
                </p>
              }
            </div>
          }

          <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
            <button type="button" class="btn btn-secondary" (click)="cerrarConfirmModal()" [disabled]="svc.saving()">
              Cancelar
            </button>
            <button type="button" class="btn btn-primary" (click)="confirmarGuardado()"
              [disabled]="svc.saving() || (modoRectificacion() && motivoRectificacion().trim().length < 10)">
              <span class="icon icon-sm">check</span>
              {{ svc.saving()
                ? 'Guardando...'
                : modoRectificacion() ? 'Confirmar rectificación' : 'Confirmar actualización' }}
            </button>
          </div>
        </div>
      </div>
    }
      }
    </div>
    }
  `,
})
export class EvaluacionNotasComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);
  private readonly portalDocente = inject(PortalDocenteService);
  private readonly periodosSvc = inject(MaestrosPeriodosAcademicosService);
  readonly grading = inject(GradingConfigService);
  readonly svc = inject(NotasRegistroService);

  readonly modoDocente = input(false);
  readonly modoRectificacion = input(false);
  readonly cursoInicial = input<PortalDocenteCursoCard | null>(null);

  readonly modoEmbeddido = computed(() => {
    const c = this.cursoInicial();
    return !!(c?.nivel && c?.grado && c?.seccion && c?.cursoNombre);
  });

  readonly modoSoloCompetencias = computed(
    () => this.grading.usesCompetencias() && !this.grading.usesNumeric(),
  );

  readonly modoMixto = computed(
    () => this.grading.usesCompetencias() && this.grading.usesNumeric() && !this.modoEmbeddido(),
  );

  readonly tabActivo = signal<'notas' | 'competencias'>('notas');

  readonly bimestres = [1, 2, 3, 4];
  readonly bimestreActual = signal(1);
  readonly bimestreHabilitado = signal(true);
  readonly actaCerrada = signal(false);
  readonly puedeRectificar = signal(false);
  readonly motivoRectificacion = signal('');
  readonly contextos = signal<RegistryContextItem[]>([]);
  readonly contextoId = signal('');
  readonly formula = signal<GradeRegistryResponse['formula'] | null>(null);
  readonly alumnos = signal<RegistryAlumnoRow[]>([]);
  readonly cargandoAsignaciones = signal(false);
  private readonly asignacionesDocente = signal<PortalDocenteCursoCard[]>([]);
  private queryPreferida: { nivel: string; grado: string; seccion: string; curso: string } | null = null;
  readonly filtro = signal<NotasRegistroFilters>({
    nivel: '',
    grado: '',
    seccion: '',
    curso: '',
    bimestre: 1,
  });
  private anioEscolarActual: number | null = null;
  readonly error = signal('');
  readonly toast = signal('');
  readonly confirmModalAbierto = signal(false);
  readonly confirmResumen = signal<ConfirmGuardadoResumen | null>(null);
  readonly validacionRangos = signal<ValidacionRangos | null>(null);
  readonly celdasInvalidas = signal<Set<string>>(new Set());
  private pendingPayload: SaveNotasRegistroPayload | null = null;
  private readonly originalNotas = new Map<string, number | null>();

  readonly contextoActivo = computed(() =>
    this.contextos().find(c => c.id === this.contextoId()) ?? null,
  );

  colorPromedio = (nota: number | null) => this.grading.colorPromedio(nota);
  badgeNivel = (nivel: string | null) => this.grading.badgeNivel(nivel);

  readonly auth = inject(AuthService);

  puedeVerAuditoria(): boolean {
    return this.auth.hasAnyPermiso('evaluacion.reportes', 'admin.reportes');
  }

  edicionPermitida(): boolean {
    if (!this.bimestreHabilitado()) return false;
    if (this.modoRectificacion()) {
      return this.puedeRectificar();
    }
    return !this.actaCerrada();
  }

  celdaRectificacionBloqueada(alumno: RegistryAlumnoRow, codigo: string): boolean {
    if (!this.modoRectificacion()) return false;
    return !alumno.componentes[codigo]?.gradeId;
  }

  ngOnInit(): void {
    const soloCompetencias = this.modoSoloCompetencias();
    this.layout.setTitle(
      this.modoRectificacion()
        ? 'Rectificación de Notas'
        : this.modoEmbeddido()
          ? soloCompetencias ? 'Competencias — Curso asignado' : 'Notas — Curso asignado'
          : this.modoDocente()
            ? soloCompetencias ? 'Competencias — Mis cursos' : 'Notas — Mis cursos'
            : soloCompetencias ? 'Calificaciones por competencias' : 'Registro de Notas',
    );

    this.route.queryParamMap.subscribe((params) => {
      if (this.modoEmbeddido()) return;
      const nivel = params.get('nivel');
      const grado = params.get('grado');
      const seccion = params.get('seccion');
      const curso = params.get('curso');
      if (nivel && grado && seccion) {
        this.queryPreferida = {
          nivel,
          grado,
          seccion,
          curso: curso ?? '',
        };
        if (this.asignacionesDocente().length) {
          this.aplicarContextoPreferido(this.contextos());
        }
      }
    });

    this.iniciarConPeriodoAcademico(() => {
      if (this.modoEmbeddido()) {
        this.inicializarCursoEmbeddido(true);
      } else if (this.modoDocente()) {
        this.cargarAsignacionesDocente(true);
      } else {
        this.cargarContextos(true);
      }
    });
  }

  /** Resuelve bimestre y año escolar desde maestros / configuración institucional. */
  private iniciarConPeriodoAcademico(fn: () => void): void {
    this.periodosSvc.resolveContext().subscribe({
      next: (ctx) => {
        const bimestre = ctx.periodoActual?.numero ?? 1;
        this.anioEscolarActual = ctx.anioEscolar;
        this.bimestreActual.set(bimestre);
        this.filtro.update((f) => ({ ...f, bimestre }));
        fn();
      },
      error: () => fn(),
    });
  }

  filtrosCompletos(): boolean {
    const f = this.filtro();
    return !!(f.nivel && f.grado && f.seccion && f.curso && f.bimestre);
  }

  hayNotasInvalidas(): boolean {
    return this.celdasInvalidas().size > 0;
  }

  notaMaxima(): number {
    return this.validacionRangos()?.max ?? this.grading.notaMaxima();
  }

  notaMinimaRango(): number {
    return this.validacionRangos()?.min ?? 0;
  }

  celdaInvalida(studentId: number, codigo: string): boolean {
    return this.celdasInvalidas().has(cellKey(studentId, codigo));
  }

  mensajeRangoInvalido(nota: number | null | undefined): string {
    if (nota === null || nota === undefined) return '';
    return validateNotaInRange(nota, this.notaMinimaRango(), this.notaMaxima()).message ?? '';
  }

  puedeGuardar(): boolean {
    if (
      !this.filtrosCompletos() ||
      !this.alumnos().length ||
      !this.edicionPermitida() ||
      this.hayNotasInvalidas()
    ) {
      return false;
    }
    if (this.modoRectificacion()) {
      return this.tieneCambiosRectificacion();
    }
    return true;
  }

  private notaKey(studentId: number, codigo: string): string {
    return `${studentId}:${codigo}`;
  }

  private tieneCambiosRectificacion(): boolean {
    for (const alumno of this.alumnos()) {
      for (const [codigo, cell] of Object.entries(alumno.componentes)) {
        if (!cell?.gradeId) continue;
        const original = this.originalNotas.get(this.notaKey(alumno.studentId, codigo));
        if (cell.nota !== null && cell.nota !== undefined && cell.nota !== original) {
          return true;
        }
      }
    }
    return false;
  }

  private snapshotOriginalNotas(): void {
    this.originalNotas.clear();
    for (const alumno of this.alumnos()) {
      for (const [codigo, cell] of Object.entries(alumno.componentes)) {
        this.originalNotas.set(
          this.notaKey(alumno.studentId, codigo),
          cell?.nota ?? null,
        );
      }
    }
  }

  bimestrePermitido(bimestre: number): boolean {
    return bimestre <= this.bimestreActual();
  }

  seleccionarContexto(id: string): void {
    const ctx = this.contextos().find(c => c.id === id);
    if (!ctx) return;

    this.contextoId.set(id);
    const curso =
      ctx.cursos.find(c => c.nombre === this.filtro().curso)?.nombre ??
      ctx.cursoSugerido ??
      ctx.cursos[0]?.nombre ??
      '';

    this.filtro.update(f => ({
      ...f,
      nivel: ctx.nivel,
      grado: ctx.grado,
      seccion: ctx.seccion,
      curso,
    }));
    this.cargar();
  }

  seleccionarCurso(curso: string): void {
    if (this.filtro().curso === curso) return;
    this.filtro.update(f => ({ ...f, curso }));
    this.cargar();
  }

  seleccionarBimestre(bimestre: number): void {
    if (!this.bimestrePermitido(bimestre)) return;
    if (this.filtro().bimestre === bimestre) return;
    this.filtro.update(f => ({ ...f, bimestre }));
    if (this.modoEmbeddido()) {
      this.cargar();
      return;
    }
    this.cargarContextos(false);
  }

  private inicializarCursoEmbeddido(inicial = false): void {
    const curso = this.cursoInicial();
    if (!curso) return;

    this.filtro.set({
      nivel: curso.nivel,
      grado: curso.grado,
      seccion: curso.seccion,
      curso: curso.cursoNombre,
      bimestre: this.filtro().bimestre,
    });

    this.svc.loadContexts(this.filtro().bimestre).subscribe({
      next: (res) => {
        this.bimestreActual.set(res.bimestreActual);
        if (inicial) {
          this.filtro.update((f) => ({ ...f, bimestre: res.bimestreActual }));
        } else if (this.filtro().bimestre > res.bimestreActual) {
          this.filtro.update((f) => ({ ...f, bimestre: res.bimestreActual }));
        }
        if (inicial || this.filtrosCompletos()) {
          this.cargar();
        }
      },
      error: (err) =>
        this.error.set(mensajeErrorHttp(err, 'No se pudo cargar el periodo')),
    });
  }

  cargarContextos(inicial = false): void {
    let bimestre = this.filtro().bimestre;
    const loader = this.modoRectificacion()
      ? this.svc.loadRectifyContext(bimestre)
      : this.svc.loadContexts(bimestre);

    loader.subscribe({
      next: (res: RegistryContextsResponse | RectifyRegistryContextResponse) => {
        if (this.modoRectificacion()) {
          this.puedeRectificar.set(
            (res as RectifyRegistryContextResponse).permisos?.rectificar ?? false,
          );
        }
        this.bimestreActual.set(res.bimestreActual);
        if (inicial) {
          bimestre = res.bimestreActual;
        } else if (bimestre > res.bimestreActual) {
          bimestre = res.bimestreActual;
        }

        const contextos = this.modoDocente()
          ? this.filtrarContextosDocente(res.contexts)
          : res.contexts;

        this.contextos.set(contextos);
        if (!contextos.length) {
          this.contextoId.set('');
          this.alumnos.set([]);
          return;
        }

        if (this.queryPreferida && this.aplicarContextoPreferido(contextos)) {
          if (inicial || this.filtro().curso) this.cargar();
          return;
        }

        const preferido = this.modoDocente()
          ? contextos[0]
          : contextos.find(c => c.nivel === 'Primaria' && c.grado === '5°' && c.seccion === 'A') ??
            contextos[0];

        const actual = contextos.find(c => c.id === this.contextoId()) ?? preferido;
        this.contextoId.set(actual.id);

        const cursoActual = this.filtro().curso;
        const curso =
          actual.cursos.find(c => c.nombre === cursoActual)?.nombre ??
          actual.cursoSugerido ??
          actual.cursos[0]?.nombre ??
          '';

        this.filtro.update(f => ({
          ...f,
          nivel: actual.nivel,
          grado: actual.grado,
          seccion: actual.seccion,
          curso,
          bimestre,
        }));

        if (inicial || curso) {
          this.cargar();
        }
      },
      error: err =>
        this.error.set(mensajeErrorHttp(err, 'No se pudieron cargar las aulas')),
    });
  }

  private cargarAsignacionesDocente(inicial = false): void {
    this.cargandoAsignaciones.set(true);
    this.error.set('');
    this.portalDocente.loadMiAula(this.anioEscolarActual ?? undefined).subscribe({
      next: (res) => {
        this.asignacionesDocente.set(res.cursos);
        this.cargandoAsignaciones.set(false);
        this.cargarContextos(inicial);
      },
      error: (err) => {
        this.cargandoAsignaciones.set(false);
        const msg = err?.error?.message;
        this.error.set(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudieron cargar tus asignaciones',
        );
        this.contextos.set([]);
      },
    });
  }

  private filtrarContextosDocente(contexts: RegistryContextItem[]): RegistryContextItem[] {
    const asignaciones = this.asignacionesDocente();
    if (!asignaciones.length) return [];

    return contexts
      .map((ctx) => {
        const cursosAsignados = asignaciones.filter(
          (a) =>
            a.nivel === ctx.nivel &&
            gradosCoincidenFiltro(a.grado, ctx.grado) &&
            a.seccion.toUpperCase() === ctx.seccion.toUpperCase(),
        );
        if (!cursosAsignados.length) return null;

        const nombres = new Set(cursosAsignados.map((a) => a.cursoNombre));
        const cursos = ctx.cursos.filter((c) => nombres.has(c.nombre));
        if (!cursos.length) return null;

        const cursoSugerido =
          cursos.find((c) => c.conNotas)?.nombre ??
          cursos.find((c) => c.nombre === cursosAsignados[0]?.cursoNombre)?.nombre ??
          cursos[0]?.nombre ??
          '';

        return {
          ...ctx,
          cursos,
          cursoSugerido,
        };
      })
      .filter((ctx): ctx is RegistryContextItem => ctx !== null);
  }

  private aplicarContextoPreferido(contextos: RegistryContextItem[]): boolean {
    const q = this.queryPreferida;
    if (!q) return false;

    const actual = contextos.find(
      (c) =>
        c.nivel === q.nivel &&
        gradosCoincidenFiltro(c.grado, q.grado) &&
        c.seccion.toUpperCase() === q.seccion.toUpperCase(),
    );
    if (!actual) return false;

    this.contextoId.set(actual.id);
    const curso =
      (q.curso && actual.cursos.find((c) => c.nombre === q.curso)?.nombre) ??
      actual.cursoSugerido ??
      actual.cursos[0]?.nombre ??
      '';

    this.filtro.update((f) => ({
      ...f,
      nivel: actual.nivel,
      grado: actual.grado,
      seccion: actual.seccion,
      curso,
    }));
    return !!curso;
  }

  cargar(): void {
    if (!this.filtrosCompletos()) return;
    this.error.set('');
    this.toast.set('');
    this.svc.loadRegistry(this.filtro()).subscribe({
      next: (res: GradeRegistryResponse) => {
        this.bimestreActual.set(res.bimestreActual);
        this.bimestreHabilitado.set(res.bimestreHabilitado);
        this.actaCerrada.set(!!res.actaCerrada);
        this.formula.set(res.formula);
        if (res.validacionRangos) {
          this.validacionRangos.set(res.validacionRangos);
        }
        this.alumnos.set(res.alumnos.map(a => ({
          ...a,
          componentes: Object.fromEntries(
            Object.entries(a.componentes).map(([k, v]) => [k, { ...v }]),
          ),
        })));
        this.snapshotOriginalNotas();
        this.revalidarTodasLasCeldas();
      },
      error: err => this.error.set(mensajeErrorHttp(err, 'No se pudo cargar el registro')),
    });
  }

  setNota(alumno: RegistryAlumnoRow, codigo: string, value: string | number | null): void {
    if (!this.edicionPermitida()) return;
    if (this.celdaRectificacionBloqueada(alumno, codigo)) return;
    const nota = value === '' || value === null ? null : Number(value);
    if (!alumno.componentes[codigo]) {
      alumno.componentes[codigo] = { nota: null };
    }
    alumno.componentes[codigo].nota = Number.isFinite(nota as number) ? nota : null;
    this.actualizarValidezCelda(alumno.studentId, codigo, alumno.componentes[codigo].nota);
    this.recalcularAlumno(alumno);
    this.alumnos.set([...this.alumnos()]);
  }

  private actualizarValidezCelda(
    studentId: number,
    codigo: string,
    nota: number | null,
  ): void {
    const key = cellKey(studentId, codigo);
    const invalidas = new Set(this.celdasInvalidas());
    if (isNotaEnRango(nota, this.notaMinimaRango(), this.notaMaxima())) {
      invalidas.delete(key);
    } else if (nota !== null) {
      invalidas.add(key);
    } else {
      invalidas.delete(key);
    }
    this.celdasInvalidas.set(invalidas);
  }

  private revalidarTodasLasCeldas(): void {
    const invalidas = new Set<string>();
    const min = this.notaMinimaRango();
    const max = this.notaMaxima();
    for (const alumno of this.alumnos()) {
      for (const [codigo, cell] of Object.entries(alumno.componentes)) {
        if (cell?.nota != null && !isNotaEnRango(cell.nota, min, max)) {
          invalidas.add(cellKey(alumno.studentId, codigo));
        }
      }
    }
    this.celdasInvalidas.set(invalidas);
  }

  recalcularAlumno(alumno: RegistryAlumnoRow): void {
    const f = this.formula();
    if (!f) return;
    const notas: Record<string, number | null> = {};
    for (const c of f.componentes) {
      notas[c.codigo] = alumno.componentes[c.codigo]?.nota ?? null;
    }
    let weighted = 0;
    let completo = true;
    for (const c of f.componentes) {
      const n = notas[c.codigo];
      if (n === null || n === undefined) {
        completo = false;
        break;
      }
      weighted += n * (c.peso / 100);
    }
    alumno.promedioBimestre = completo ? Math.round(weighted * 10) / 10 : null;
    alumno.nivel = alumno.promedioBimestre !== null
      ? this.grading.nivelDeNota(alumno.promedioBimestre)
      : null;
  }

  promedioAlumno(a: RegistryAlumnoRow): number | null {
    return a.promedioBimestre;
  }

  nivelAlumno(a: RegistryAlumnoRow): string | null {
    return a.nivel;
  }

  guardar(): void {
    const f = this.filtro();
    const formula = this.formula();
    if (!formula) return;

    const entries: SaveNotasRegistroPayload['entries'] = [];
    for (const alumno of this.alumnos()) {
      for (const comp of formula.componentes) {
        const cell = alumno.componentes[comp.codigo];
        if (cell?.nota === null || cell?.nota === undefined) continue;
        if (this.modoRectificacion()) {
          if (!cell.gradeId) continue;
          const original = this.originalNotas.get(this.notaKey(alumno.studentId, comp.codigo));
          if (cell.nota === original) continue;
        }
        entries.push({
          studentId: alumno.studentId,
          componenteCodigo: comp.codigo,
          gradeId: cell.gradeId,
          nota: cell.nota,
        });
      }
    }

    if (!entries.length) {
      this.error.set(
        this.modoRectificacion()
          ? 'Modifique al menos una calificación existente antes de rectificar.'
          : 'Ingrese al menos una nota antes de guardar.',
      );
      return;
    }

    if (this.hayNotasInvalidas()) {
      this.error.set('Corrija las calificaciones fuera del rango permitido antes de guardar.');
      return;
    }

    const alumnosConNota = new Set(entries.map((e) => e.studentId)).size;
    const payload: SaveNotasRegistroPayload = {
      curso: f.curso,
      bimestre: f.bimestre,
      fechaEvaluacion: new Date().toISOString().slice(0, 10),
      nivel: f.nivel,
      grado: f.grado,
      seccion: f.seccion,
      entries,
    };

    this.pendingPayload = payload;
    if (this.modoRectificacion()) {
      this.motivoRectificacion.set('');
    }
    this.confirmResumen.set({
      curso: f.curso,
      nivel: f.nivel,
      grado: f.grado,
      seccion: f.seccion,
      bimestre: f.bimestre,
      alumnosCount: alumnosConNota,
      calificacionesCount: entries.length,
    });
    this.confirmModalAbierto.set(true);
  }

  cerrarConfirmModal(): void {
    if (this.svc.saving()) return;
    this.confirmModalAbierto.set(false);
    this.confirmResumen.set(null);
    this.pendingPayload = null;
    this.motivoRectificacion.set('');
  }

  confirmarGuardado(): void {
    const payload = this.pendingPayload;
    if (!payload) return;

    if (this.modoRectificacion()) {
      const motivo = this.motivoRectificacion().trim();
      if (motivo.length < 10) {
        this.error.set('El motivo de rectificación debe tener al menos 10 caracteres.');
        return;
      }
      const rectifyPayload: RectifyNotasRegistroPayload = { ...payload, motivo };
      this.svc.saveRectify(rectifyPayload).subscribe({
        next: res => {
          this.confirmModalAbierto.set(false);
          this.confirmResumen.set(null);
          this.pendingPayload = null;
          this.motivoRectificacion.set('');
          this.formula.set(res.registry.formula);
          this.alumnos.set(res.registry.alumnos);
          this.actaCerrada.set(!!res.registry.actaCerrada);
          this.snapshotOriginalNotas();
          this.toast.set(`Se rectificaron ${res.saved} calificaciones.`);
          this.cargarContextos(false);
        },
        error: err =>
          this.error.set(err?.error?.message ?? err?.message ?? 'Error al rectificar'),
      });
      return;
    }

    this.svc.saveBulk(payload).subscribe({
      next: res => {
        this.confirmModalAbierto.set(false);
        this.confirmResumen.set(null);
        this.pendingPayload = null;
        this.formula.set(res.registry.formula);
        this.alumnos.set(res.registry.alumnos);
        this.actaCerrada.set(!!res.registry.actaCerrada);
        this.snapshotOriginalNotas();
        this.toast.set(`Se guardaron ${res.saved} calificaciones.`);
        if (this.modoEmbeddido()) {
          this.cargar();
        } else {
          this.cargarContextos(false);
        }
      },
      error: err => this.error.set(err?.error?.message ?? err?.message ?? 'Error al guardar'),
    });
  }
}
