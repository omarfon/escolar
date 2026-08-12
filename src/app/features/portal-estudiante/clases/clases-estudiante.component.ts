import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { forkJoin } from 'rxjs';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { OverlayPortalDirective } from '../../../core/overlay/overlay-portal.directive';
import { HorariosService } from '../../academico/horarios/services/horarios.service';
import { PortalEstudianteService } from '../services/portal-estudiante.service';
import { ClasesTemarioService } from './clases-temario.service';
import {
  estadoTemarioBadge,
  estadoTemarioLabel,
  materialTemarioLabel,
  TemarioClaseItem,
  temarioImagenUrl,
  temarioMaterialUrl,
  tieneContenidoClase,
} from '../../portal-docente/temario/temario.model';
import {
  formatBytes,
  resourceFileUrl,
  tipoRecursoBadge,
  tipoRecursoEmoji,
  tipoRecursoLabel,
} from '../../portal-docente/recursos/recursos.model';
import { ApiResource } from '../../../core/api/api.models';
import { ClasesEstudianteService } from './clases-estudiante.service';
import {
  CursoClaseEstudiante,
  SesionClaseDetalle,
} from './clases.model';
import { RecursosEstudianteService } from './recursos-estudiante.service';

@Component({
  standalone: true,
  imports: [NgClass, OverlayPortalDirective],
  template: `
    <div class="space-y-5 animate-fade-in">
      @if (!cursoSeleccionado()) {
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Mis Clases</h2>
            <p class="text-sm text-gray-400 mt-0.5">
              {{ auth.nombreCompleto() }} · {{ perfil().aulaLabel }} · Selecciona un curso para ver el temario
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="cargarCursos()" [disabled]="loadingCursos()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
        </div>

        @if (error()) {
          <div class="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">{{ error() }}</div>
        }

        @if (loadingCursos() || horarios.loading()) {
          <div class="card p-12 text-center text-gray-400 text-sm">Cargando tus cursos…</div>
        } @else if (!cursos().length) {
          <div class="card p-16 text-center">
            <span class="text-4xl mb-4 block">📚</span>
            <h3 class="text-lg font-semibold text-gray-700">Sin cursos asignados</h3>
            <p class="text-sm text-gray-500 mt-1">Aún no hay cursos en tu horario escolar.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (c of cursos(); track c.id) {
              <button type="button"
                class="card overflow-hidden p-0 text-left hover:shadow-md hover:border-indigo-200 border border-transparent transition-all group flex"
                (click)="seleccionarCurso(c)">
                <div class="w-24 sm:w-28 shrink-0 flex items-center justify-center min-h-[5.5rem] border-r border-gray-100"
                  [ngClass]="c.colorClass">
                  <span class="text-xl sm:text-2xl font-bold">{{ c.iniciales }}</span>
                </div>
                <div class="flex-1 min-w-0 p-3 flex flex-col justify-between gap-2">
                  <div>
                    <h3 class="font-bold text-gray-900 text-sm truncate">{{ c.nombre }}</h3>
                    <p class="text-xs text-gray-500 mt-0.5 truncate">{{ c.area }} · {{ c.docenteAbrev }}</p>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex flex-wrap gap-1">
                      <span class="badge badge-indigo text-[10px]">{{ c.sesionesSemana }}/sem</span>
                      <span class="badge badge-gray text-[10px]">{{ c.diasSemana.length }} días</span>
                    </div>
                    <span class="icon text-gray-300 shrink-0 text-lg group-hover:text-indigo-400 transition-colors">chevron_right</span>
                  </div>
                </div>
              </button>
            }
          </div>
        }
      } @else {
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <button type="button" class="btn btn-ghost btn-sm self-start" (click)="volver()">
            <span class="icon icon-sm">arrow_back</span> Mis clases
          </button>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="w-3 h-3 rounded-full" [ngClass]="cursoSeleccionado()!.dotClass"></span>
              <h2 class="text-2xl font-bold text-gray-900">{{ cursoSeleccionado()!.nombre }}</h2>
            </div>
            <p class="text-sm text-gray-500 mt-0.5">
              {{ cursoSeleccionado()!.area }} · Prof. {{ cursoSeleccionado()!.docenteNombre }}
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="recargarCurso()" [disabled]="loadingCurso()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
        </div>

        @if (errorCurso()) {
          <div class="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">{{ errorCurso() }}</div>
        }

        @if (loadingCurso()) {
          <div class="card p-12 text-center text-gray-400 text-sm">Cargando temario del curso…</div>
        } @else if (!sesiones().length) {
          <div class="card p-10 text-center text-gray-500 text-sm">
            Tu docente aún no ha publicado clases para este curso.
          </div>
        } @else {
          <p class="text-sm text-gray-500">{{ sesiones().length }} clase(s) en orden cronológico. Toca una para ver el contenido.</p>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (ses of sesiones(); track ses.fechaClase) {
              <button type="button"
                class="card overflow-hidden flex text-left transition-all group"
                [ngClass]="sesionPanel()?.fechaClase === ses.fechaClase
                  ? 'ring-2 ring-indigo-400 border-indigo-200 shadow-md'
                  : 'hover:shadow-md hover:border-indigo-200 border border-transparent'"
                (click)="abrirPanelSesion(ses)">
                <div class="w-24 sm:w-28 shrink-0 flex items-center justify-center min-h-[6.5rem] border-r border-gray-100"
                  [ngClass]="cursoSeleccionado()!.colorClass">
                  <span class="text-xl sm:text-2xl font-bold">{{ cursoSeleccionado()!.iniciales }}</span>
                </div>
                <div class="flex-1 min-w-0 p-3 flex flex-col justify-between gap-2">
                  <div>
                    <span class="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-xs mb-1.5">
                      {{ ses.orden }}
                    </span>
                    <div class="font-semibold text-gray-900 text-sm leading-snug">{{ ses.fechaClaseDisplay }}</div>
                    <div class="text-xs text-gray-500 mt-0.5">
                      {{ ses.temas.length }} tema(s)
                      @if (ses.recursos.length) { · {{ ses.recursos.length }} recurso(s) }
                    </div>
                    <div class="mt-1 space-y-0.5">
                      @for (t of ses.temas; track t.id) {
                        <p class="text-xs text-gray-400 line-clamp-1">{{ $index + 1 }}. {{ t.titulo }}</p>
                      }
                    </div>
                  </div>
                  <span class="icon text-gray-300 text-lg self-end group-hover:text-indigo-400 transition-colors">chevron_right</span>
                </div>
              </button>
            }
          </div>
        }
      }
    </div>

    @if (sesionPanel(); as ses) {
      <div appOverlayPortal class="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" (click)="cerrarPanelSesion()"></div>
      <aside appOverlayPortal
        class="fixed inset-y-0 right-0 z-[90] w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-slide-in-r border-l border-gray-200">
        <div class="relative px-5 sm:px-6 py-5 border-b border-gray-200 shrink-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
          <button type="button" class="btn btn-ghost btn-icon absolute top-4 right-4" (click)="cerrarPanelSesion()">
            <span class="icon icon-sm">close</span>
          </button>
          <div class="flex items-start gap-3 pr-10">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold text-lg shadow-sm border"
              [ngClass]="cursoSeleccionado()!.colorClass">
              {{ cursoSeleccionado()!.iniciales }}
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Clase {{ ses.orden }}</p>
              <h2 class="text-lg font-bold text-gray-900 mt-0.5 leading-snug">{{ ses.fechaClaseDisplay }}</h2>
              <p class="text-sm text-gray-500 mt-1">{{ cursoSeleccionado()!.nombre }} · Prof. {{ cursoSeleccionado()!.docenteAbrev }} · {{ ses.temas.length }} temas</p>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-8">
          @for (t of ses.temas; track t.id; let i = $index) {
            <article class="space-y-5" [class.pt-2]="i > 0" [class.border-t]="i > 0" [class.border-gray-100]="i > 0">
              <div class="flex flex-wrap items-center gap-2" [class.pt-5]="i > 0">
                <span class="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 text-xs font-bold">
                  {{ i + 1 }}
                </span>
                <h3 class="text-base font-bold text-gray-900 flex-1 min-w-0">{{ t.titulo }}</h3>
                <span class="badge text-xs shrink-0" [ngClass]="estadoBadge(t.estado)">{{ estadoLabel(t.estado) }}</span>
              </div>

              @if (t.contenidoClase) {
                <section>
                  <p class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Desarrollo de la clase</p>
                  <div class="text-sm sm:text-base text-gray-800 whitespace-pre-line leading-relaxed rounded-xl bg-gray-50 border border-gray-100 p-4 sm:p-5">
                    {{ t.contenidoClase }}
                  </div>
                </section>
              }
              @if (t.descripcion) {
                <section>
                  <p class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Resumen</p>
                  <p class="text-sm sm:text-base text-gray-700 whitespace-pre-line leading-relaxed">{{ t.descripcion }}</p>
                </section>
              }
              @if (t.objetivos) {
                <section>
                  <p class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Objetivos</p>
                  <p class="text-sm sm:text-base text-gray-600 whitespace-pre-line leading-relaxed">{{ t.objetivos }}</p>
                </section>
              }
              @if (t.imagenesClase.length) {
                <section>
                  <p class="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Imágenes y recursos visuales</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    @for (img of t.imagenesClase; track img.url) {
                      <figure class="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
                        <img [src]="imagenUrl(img)" [alt]="img.nombre" class="w-full h-40 sm:h-48 object-cover">
                        @if (img.nombre || img.leyenda) {
                          <figcaption class="p-3 text-xs text-gray-600">
                            @if (img.nombre) { <span class="font-medium text-gray-800">{{ img.nombre }}</span> }
                            @if (img.leyenda) { <p class="mt-0.5">{{ img.leyenda }}</p> }
                          </figcaption>
                        }
                      </figure>
                    }
                  </div>
                </section>
              }
              @if (t.tieneMaterial) {
                <section class="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5 space-y-3">
                  <p class="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                    Material del docente · {{ materialLabel(t.materialTipo) }}
                  </p>
                  @if (t.materialTitulo) {
                    <p class="text-sm sm:text-base font-medium text-gray-900">{{ t.materialTitulo }}</p>
                  }
                  @if (t.materialDescripcion) {
                    <p class="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{{ t.materialDescripcion }}</p>
                  }
                  @if (materialUrl(t); as url) {
                    <a [href]="url" target="_blank" rel="noopener" class="btn btn-secondary btn-sm inline-flex">
                      <span class="icon icon-sm">open_in_new</span>
                      @if (t.materialTipo === 'video' || t.materialTipo === 'enlace') { Ver enlace }
                      @else { Abrir material }
                    </a>
                  }
                </section>
              }
              @if (!tieneContenido(t) && !t.tieneMaterial) {
                <p class="text-sm text-gray-400 italic">Sin contenido publicado aún.</p>
              }
            </article>
          }

          @if (ses.recursos.length) {
            <section class="pt-2 border-t border-gray-100">
              <h4 class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Recursos compartidos</h4>
              <div class="space-y-2">
                @for (r of ses.recursos; track r.id) {
                  <div class="flex items-start gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <span class="text-xl shrink-0">{{ tipoEmoji(r.tipo) }}</span>
                    <div class="flex-1 min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-medium text-gray-900 text-sm sm:text-base">{{ r.titulo }}</span>
                        <span class="badge text-xs" [ngClass]="tipoBadge(r.tipo)">{{ tipoLabel(r.tipo) }}</span>
                      </div>
                      @if (r.descripcion) {
                        <p class="text-xs sm:text-sm text-gray-500 mt-1">{{ r.descripcion }}</p>
                      }
                    </div>
                    @if (linkRecurso(r); as url) {
                      <a [href]="url" target="_blank" rel="noopener" class="btn btn-secondary btn-sm shrink-0">Abrir</a>
                    }
                  </div>
                }
              </div>
            </section>
          }
        </div>
      </aside>
    }
  `,
})
export class ClasesEstudianteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly horarios = inject(HorariosService);
  readonly portal = inject(PortalEstudianteService);
  readonly temarioSvc = inject(ClasesTemarioService);
  readonly recursosSvc = inject(RecursosEstudianteService);
  readonly clasesSvc = inject(ClasesEstudianteService);

  private readonly _temario = signal<TemarioClaseItem[]>([]);
  private readonly _recursos = signal<ApiResource[]>([]);
  private readonly _loadingCursos = signal(false);
  private readonly _loadingCurso = signal(false);
  readonly error = signal('');
  readonly errorCurso = signal('');
  readonly cursoSeleccionado = signal<CursoClaseEstudiante | null>(null);
  readonly sesionPanel = signal<SesionClaseDetalle | null>(null);

  readonly loadingCursos = this._loadingCursos.asReadonly();
  readonly loadingCurso = computed(
    () => this._loadingCurso() || this.temarioSvc.loading() || this.recursosSvc.loading(),
  );
  readonly perfil = computed(() => this.horarios.getPerfilEstudiante());
  readonly cursos = computed(() => this.clasesSvc.buildCursosAsignados());

  readonly sesiones = computed((): SesionClaseDetalle[] => {
    if (!this.cursoSeleccionado()) return [];
    return this.clasesSvc.buildSesionesPorCurso(this._temario(), this._recursos());
  });

  readonly estadoBadge = estadoTemarioBadge;
  readonly estadoLabel = estadoTemarioLabel;
  readonly tipoEmoji = tipoRecursoEmoji;
  readonly tipoLabel = tipoRecursoLabel;
  readonly tipoBadge = tipoRecursoBadge;
  readonly formatBytes = formatBytes;
  readonly materialLabel = materialTemarioLabel;
  readonly materialUrl = temarioMaterialUrl;
  readonly imagenUrl = temarioImagenUrl;
  readonly tieneContenido = tieneContenidoClase;

  ngOnInit(): void {
    this.layout.setTitle('Clases');
    this.cargarCursos();
  }

  cargarCursos(): void {
    this.error.set('');
    this._loadingCursos.set(true);

    const iniciar = () => {
      if (!this.horarios.entradas().length && !this.horarios.loading()) {
        this.horarios.load();
      }
      const esperar = () => {
        if (this.horarios.loading()) {
          globalThis.setTimeout(esperar, 150);
          return;
        }
        this._loadingCursos.set(false);
      };
      esperar();
    };

    if (this.auth.isPortalEstudiante()) {
      this.portal.ensureLoaded().subscribe(() => iniciar());
    } else {
      iniciar();
    }
  }

  seleccionarCurso(curso: CursoClaseEstudiante): void {
    this.cursoSeleccionado.set(curso);
    this.cerrarPanelSesion();
    this._temario.set([]);
    this._recursos.set([]);
    this.cargarContenidoCurso(curso);
  }

  recargarCurso(): void {
    const curso = this.cursoSeleccionado();
    if (curso) this.cargarContenidoCurso(curso);
  }

  volver(): void {
    this.cursoSeleccionado.set(null);
    this.cerrarPanelSesion();
    this._temario.set([]);
    this._recursos.set([]);
    this.errorCurso.set('');
  }

  private cargarContenidoCurso(curso: CursoClaseEstudiante): void {
    this.errorCurso.set('');
    this._loadingCurso.set(true);
    const p = this.perfil();

    forkJoin({
      temario: this.temarioSvc.listByCurso({
        curso: curso.nombre,
        nivel: p.nivel,
        grado: p.grado,
        seccion: p.seccion,
        anioEscolar: new Date().getFullYear(),
      }),
      recursos: this.recursosSvc.load({
        nivel: p.nivel,
        grado: p.grado,
        seccion: p.seccion,
        curso: curso.nombre,
      }),
    }).subscribe({
      next: ({ temario, recursos }) => {
        this._temario.set(temario);
        this._recursos.set(recursos);
        this._loadingCurso.set(false);
      },
      error: () => {
        this.errorCurso.set('No se pudo cargar el temario de este curso');
        this._loadingCurso.set(false);
      },
    });
  }

  abrirPanelSesion(ses: SesionClaseDetalle): void {
    this.sesionPanel.set(ses);
  }

  cerrarPanelSesion(): void {
    this.sesionPanel.set(null);
  }

  linkRecurso(r: ApiResource): string | null {
    if (r.url?.startsWith('http')) return r.url;
    if (r.url) return resourceFileUrl(r.url);
    return null;
  }
}
