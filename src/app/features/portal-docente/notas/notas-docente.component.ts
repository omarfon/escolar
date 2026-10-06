import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { GradingConfigService } from '../../../core/grading/grading-config.service';
import { EvaluacionNotasComponent } from '../../evaluacion/notas/evaluacion-notas.component';
import { PortalDocenteService } from '../portal-docente.service';
import { MaestrosPeriodosAcademicosService } from '../../matricula/maestros/periodos-academicos/periodos-academicos.service';
import { PeriodoAcademicoItem } from '../../matricula/maestros/periodos-academicos/periodos-academicos.model';
import { PortalDocenteCursoCard } from '../portal-docente.model';

@Component({
  standalone: true,
  imports: [NgClass, EvaluacionNotasComponent],
  template: `
<div class="space-y-5 animate-fade-in">

  @if (!cursoSeleccionado()) {
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold text-gray-800">
          @if (modoCompetencias()) {
            Registro por competencias
          } @else {
            Registro de notas
          }
        </h2>
        <p class="text-sm text-gray-500">
          @if (modoCompetencias()) {
            Selecciona un curso asignado para registrar niveles de logro por bimestre
          } @else {
            Selecciona un curso asignado para registrar calificaciones por bimestre
          }
          @if (anioEscolar()) {
            · A.E. {{ anioEscolar() }}
            @if (periodoActual()) { · {{ periodoActual()!.nombre }} }
          }
        </p>
      </div>
    </div>

    @if (error()) {
      <div class="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">{{ error() }}</div>
    }

    @if (svc.loading()) {
      <div class="card p-10 text-center text-gray-500">Cargando cursos asignados…</div>
    } @else if (!cursos().length) {
      <div class="card p-10 text-center text-gray-500">
        <div class="text-4xl mb-3">📚</div>
        <p class="font-medium text-gray-700">No tienes cursos asignados</p>
        <p class="text-sm mt-1">Contacta a coordinación académica para revisar tu asignación.</p>
      </div>
    } @else {
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        @for (c of cursos(); track cursoKey(c)) {
          <button type="button"
                  class="card px-3 py-3 text-left hover:shadow-md hover:border-indigo-200 border border-transparent transition-all border-l-4"
                  [ngClass]="estiloCurso(c.cursoNombre).borderColor"
                  (click)="seleccionarCurso(c)">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">{{ c.aulaLabel }}</div>
                <h3 class="font-bold text-gray-800 text-base leading-snug mt-0.5">{{ c.cursoNombre }}</h3>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ c.gradoLabel }} · {{ c.alumnosCount }} alumno{{ c.alumnosCount === 1 ? '' : 's' }}
                </p>
                @if (c.horario) {
                  <p class="text-[11px] text-gray-400 mt-0.5">{{ c.horario }}</p>
                }
              </div>
              <div class="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 text-white"
                   [ngClass]="estiloCurso(c.cursoNombre).iconBg">
                {{ estiloCurso(c.cursoNombre).emoji }}
              </div>
            </div>
            <div class="mt-2 text-xs font-medium text-indigo-600 flex items-center gap-1">
              @if (modoCompetencias()) {
                Registrar competencias
              } @else {
                Registrar notas
              }
              <span class="icon icon-sm">arrow_forward</span>
            </div>
          </button>
        }
      </div>
    }
  } @else {
    <div class="flex items-center gap-3">
      <button type="button" class="btn btn-secondary btn-sm" (click)="volverACursos()">
        <span class="icon icon-sm">arrow_back</span> Mis cursos
      </button>
      <div>
        <h2 class="text-lg font-bold text-gray-800">{{ cursoSeleccionado()!.cursoNombre }}</h2>
        <p class="text-sm text-gray-500">
          {{ cursoSeleccionado()!.aulaLabel }} · {{ cursoSeleccionado()!.alumnosCount }} alumnos
        </p>
      </div>
    </div>

    <app-evaluacion-notas
      [modoDocente]="true"
      [cursoInicial]="cursoSeleccionado()!"
    />
  }
</div>
  `,
})
export class NotasDocenteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly svc = inject(PortalDocenteService);
  readonly grading = inject(GradingConfigService);
  private readonly periodosSvc = inject(MaestrosPeriodosAcademicosService);

  readonly modoCompetencias = computed(
    () => this.grading.usesCompetencias() && !this.grading.usesNumeric(),
  );

  cursos = signal<PortalDocenteCursoCard[]>([]);
  cursoSeleccionado = signal<PortalDocenteCursoCard | null>(null);
  anioEscolar = signal<number | null>(null);
  periodoActual = signal<PeriodoAcademicoItem | null>(null);
  error = signal('');

  ngOnInit(): void {
    this.layout.setTitle(this.modoCompetencias() ? 'Competencias docente' : 'Notas docente');
    this.cargarCursos();

    this.route.queryParamMap.subscribe((params) => {
      const nivel = params.get('nivel');
      const grado = params.get('grado');
      const seccion = params.get('seccion');
      const curso = params.get('curso');
      if (!nivel || !grado || !seccion) return;

      const found = this.cursos().find(
        (c) =>
          c.nivel === nivel &&
          c.grado === grado &&
          c.seccion.toUpperCase() === seccion.toUpperCase() &&
          (!curso || c.cursoNombre === curso),
      );
      if (found) this.cursoSeleccionado.set(found);
    });
  }

  cargarCursos(): void {
    this.error.set('');
    this.periodosSvc.resolveContext().subscribe({
      next: (ctx) => {
        this.periodoActual.set(ctx.periodoActual);
        this.anioEscolar.set(ctx.anioEscolar);
      },
    });
    this.svc.loadMiAula().subscribe({
      next: (res) => {
        const vistos = new Set<string>();
        const unicos = res.cursos.filter((c) => {
          const key = `${c.nivel}|${c.grado}|${c.seccion}|${c.cursoNombre}`;
          if (vistos.has(key)) return false;
          vistos.add(key);
          return true;
        });
        this.cursos.set(unicos);
        this.anioEscolar.set(res.anioEscolar);
        this.aplicarQueryCurso();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.error.set(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudieron cargar tus cursos asignados',
        );
        this.cursos.set([]);
      },
    });
  }

  seleccionarCurso(curso: PortalDocenteCursoCard): void {
    this.cursoSeleccionado.set(curso);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        nivel: curso.nivel,
        grado: curso.grado,
        seccion: curso.seccion,
        curso: curso.cursoNombre,
      },
      queryParamsHandling: 'merge',
    });
  }

  volverACursos(): void {
    this.cursoSeleccionado.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { nivel: null, grado: null, seccion: null, curso: null },
      queryParamsHandling: 'merge',
    });
  }

  cursoKey(c: PortalDocenteCursoCard): string {
    return c.id;
  }

  estiloCurso(nombre: string): { emoji: string; iconBg: string; borderColor: string } {
    const n = nombre.toLowerCase();
    if (n.includes('matem') || n.includes('álgebra') || n.includes('algebra') || n.includes('geometr')) {
      return { emoji: '🔢', iconBg: 'bg-blue-500', borderColor: 'border-blue-400' };
    }
    if (n.includes('comunic') || n.includes('lect') || n.includes('texto')) {
      return { emoji: '📖', iconBg: 'bg-sky-500', borderColor: 'border-sky-400' };
    }
    if (n.includes('ciencia') || n.includes('biolog') || n.includes('fís') || n.includes('quím')) {
      return { emoji: '🔬', iconBg: 'bg-emerald-500', borderColor: 'border-emerald-400' };
    }
    if (n.includes('ingl')) {
      return { emoji: '🌐', iconBg: 'bg-indigo-500', borderColor: 'border-indigo-400' };
    }
    if (n.includes('histor') || n.includes('geograf')) {
      return { emoji: '🌍', iconBg: 'bg-amber-500', borderColor: 'border-amber-400' };
    }
    return { emoji: '📚', iconBg: 'bg-purple-500', borderColor: 'border-purple-400' };
  }

  private aplicarQueryCurso(): void {
    const params = this.route.snapshot.queryParamMap;
    const nivel = params.get('nivel');
    const grado = params.get('grado');
    const seccion = params.get('seccion');
    const curso = params.get('curso');
    if (!nivel || !grado || !seccion) return;

    const found = this.cursos().find(
      (c) =>
        c.nivel === nivel &&
        c.grado === grado &&
        c.seccion.toUpperCase() === seccion.toUpperCase() &&
        (!curso || c.cursoNombre === curso),
    );
    if (found) this.cursoSeleccionado.set(found);
  }
}
