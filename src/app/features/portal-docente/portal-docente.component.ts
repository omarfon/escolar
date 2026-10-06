import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LayoutService } from '../../core/layout/services/layout.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { PortalDocenteService } from './portal-docente.service';
import { PortalDocenteCursoCard, PortalDocenteMiAulaResponse } from './portal-docente.model';

interface CursoCardView extends PortalDocenteCursoCard {
  emoji: string;
  iconBg: string;
  borderColor: string;
}

@Component({
  selector: 'app-portal-docente',
  standalone: true,
  imports: [NgClass, RouterLink],
  template: `
    <div class="animate-fade-in space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Mis Aulas</h2>
          <p class="text-sm text-gray-500 mt-0.5">
            Cursos y salones asignados
            @if (data(); as d) {
              · {{ d.docente.especialidad }} · {{ d.docente.sede }}
            }
          </p>
        </div>
        @if (data(); as d) {
          <span class="badge badge-indigo">A.E. {{ d.anioEscolar }}</span>
        }
      </div>

      @if (error()) {
        <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm space-y-1">
          <p>{{ error() }}</p>
          <p class="text-xs text-red-600/90">
            El portal docente solo muestra datos del docente vinculado a tu sesión.
            Inicia sesión con un usuario docente que tenga perfil en la BD (p. ej. <strong>docente / admin123</strong>).
          </p>
        </div>
      }

      @if (svc.loading()) {
        <div class="card p-10 text-center text-gray-400 text-sm">Cargando tus cursos y salones...</div>
      } @else {
        @if (data(); as d) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          @for (kpi of kpis(); track kpi.label) {
            <div class="card px-3 py-2.5">
              <p class="text-[11px] text-gray-400">{{ kpi.label }}</p>
              <p class="text-xl font-bold text-gray-900 mt-0.5">{{ kpi.value }}</p>
            </div>
          }
        </div>

        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
              <span class="icon text-indigo-600">school</span> Mis Aulas
            </h3>
            <p class="text-xs text-gray-400">{{ d.cursos.length }} curso(s) asignado(s)</p>
          </div>

          @if (!d.cursos.length) {
            <div class="card p-10 text-center">
              <span class="icon icon-2xl text-gray-200 block mb-2">menu_book</span>
              <p class="text-gray-500 text-sm">No tienes cursos asignados para este año escolar.</p>
              <p class="text-xs text-gray-400 mt-2">Un administrador debe asignarte en Académico → Asignación docente.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (c of cursosView(); track c.id) {
                <div class="card px-3 py-3 hover:shadow-md transition-shadow border-l-4" [ngClass]="c.borderColor">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-indigo-600 truncate">{{ c.aulaLabel }}</p>
                      <h3 class="font-bold text-gray-800 text-sm mt-0.5 leading-snug">{{ c.cursoNombre }}</h3>
                      <p class="text-xs text-gray-500 mt-0.5">{{ c.gradoLabel }} · {{ c.alumnosCount }} alumno{{ c.alumnosCount === 1 ? '' : 's' }}</p>
                      <p class="text-[11px] text-gray-400 mt-0.5">{{ c.horario }} · {{ c.horasSemanales }} h/sem</p>
                    </div>
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-base shrink-0" [ngClass]="c.iconBg">
                      {{ c.emoji }}
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-1.5">
                    <button type="button" (click)="irAsistencia(c)"
                      class="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border border-transparent bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 text-gray-600 hover:text-emerald-700 transition-all">
                      <span class="icon icon-sm">fact_check</span>
                      <span class="text-[10px] font-medium leading-tight">Asistencia</span>
                    </button>
                    <button type="button" (click)="irNotas(c)"
                      class="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border border-transparent bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 text-gray-600 hover:text-indigo-700 transition-all">
                      <span class="icon icon-sm">grade</span>
                      <span class="text-[10px] font-medium leading-tight">Notas</span>
                    </button>
                    <button type="button" (click)="irRecursos(c)"
                      class="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border border-transparent bg-gray-50 hover:bg-violet-50 hover:border-violet-200 text-gray-600 hover:text-violet-700 transition-all">
                      <span class="icon icon-sm">attach_file</span>
                      <span class="text-[10px] font-medium leading-tight">Material</span>
                    </button>
                    <button type="button" (click)="irTemario(c)"
                      class="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border border-transparent bg-gray-50 hover:bg-teal-50 hover:border-teal-200 text-gray-600 hover:text-teal-700 transition-all col-span-3">
                      <span class="icon icon-sm">calendar_month</span>
                      <span class="text-[10px] font-medium leading-tight">Temario</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="card p-4 flex flex-wrap gap-3">
          <a routerLink="/portal-docente/asistencia" class="btn btn-secondary btn-sm">
            <span class="icon icon-sm">fact_check</span> Registro de asistencia
          </a>
          <a routerLink="/portal-docente/notas" class="btn btn-secondary btn-sm">
            <span class="icon icon-sm">grade</span> Registro de notas
          </a>
          <a routerLink="/portal-docente/recursos" class="btn btn-secondary btn-sm">
            <span class="icon icon-sm">folder_open</span> Mis recursos
          </a>
          <a routerLink="/portal-docente/temario" class="btn btn-secondary btn-sm">
            <span class="icon icon-sm">calendar_month</span> Temario
          </a>
        </div>
        }
      }
    </div>
  `,
})
export class PortalDocenteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly svc = inject(PortalDocenteService);

  private readonly _data = signal<PortalDocenteMiAulaResponse | null>(null);
  readonly data = this._data.asReadonly();
  readonly error = signal('');

  readonly cursosView = computed(() =>
    (this._data()?.cursos ?? []).map((c) => this.toCardView(c)),
  );

  readonly kpis = computed(() => {
    const r = this._data()?.resumen;
    return [
      { label: 'Cursos asignados', value: r?.totalCursos ?? 0 },
      { label: 'Salones', value: r?.totalSalones ?? 0 },
      { label: 'Alumnos a cargo', value: r?.totalAlumnos ?? 0 },
      { label: 'Horas semanales', value: r?.horasSemanales ?? 0 },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle('Mis Aulas');
    this.cargar();
  }

  cargar(): void {
    this.error.set('');
    this.svc.loadMiAula(2026).subscribe({
      next: (res) => this._data.set(res),
      error: (err) => {
        const msg = err?.error?.message;
        this.error.set(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo cargar tu aula',
        );
        this._data.set(null);
      },
    });
  }

  irNotas(curso: PortalDocenteCursoCard): void {
    this.router.navigate(['/portal-docente/notas'], {
      queryParams: {
        nivel: curso.nivel,
        grado: curso.grado,
        seccion: curso.seccion,
        curso: curso.cursoNombre,
      },
    });
  }

  irAsistencia(curso: PortalDocenteCursoCard): void {
    this.router.navigate(['/portal-docente/asistencia'], {
      queryParams: {
        nivel: curso.nivel,
        grado: curso.grado,
        seccion: curso.seccion,
      },
    });
  }

  irRecursos(curso: PortalDocenteCursoCard): void {
    this.router.navigate(['/portal-docente/recursos'], {
      queryParams: {
        nivel: curso.nivel,
        grado: curso.grado,
        seccion: curso.seccion,
        curso: curso.cursoNombre,
      },
    });
  }

  irTemario(curso: PortalDocenteCursoCard): void {
    this.router.navigate(['/portal-docente/temario'], {
      queryParams: {
        nivel: curso.nivel,
        grado: curso.grado,
        seccion: curso.seccion,
        curso: curso.cursoNombre,
      },
    });
  }

  private toCardView(curso: PortalDocenteCursoCard): CursoCardView {
    const style = this.estiloCurso(curso.cursoNombre);
    return { ...curso, ...style };
  }

  private estiloCurso(nombre: string): Pick<CursoCardView, 'emoji' | 'iconBg' | 'borderColor'> {
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
}
