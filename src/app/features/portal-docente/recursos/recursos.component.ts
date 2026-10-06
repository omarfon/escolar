import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ApiResource } from '../../../core/api/api.models';
import { AsistenciaDocenteService } from '../asistencia/asistencia-docente.service';
import { DocenteSalonAsignado } from '../asistencia/asistencia-docente.model';
import { PortalDocenteService } from '../portal-docente.service';
import { mapPortalCursoToDocente } from '../portal-docente.model';
import { RecursosService } from './recursos.service';
import {
  acceptForTipo,
  coerceResourceVisible,
  CursoDocente,
  formatBytes,
  RecursoItem,
  RecursoPayload,
  RecursoUpdatePayload,
  RecursoTipo,
  resourceFileUrl,
  TIPOS_MODAL,
  TIPOS_RECURSO,
  tipoRecursoBadge,
  tipoRecursoEmoji,
  tipoRecursoLabel,
  tipoUsaArchivo,
  tipoUsaUrl,
  validateFileForTipo,
  mimeFromFileName,
} from './recursos.model';

@Component({
  selector: 'app-recursos',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
<div class="space-y-5 animate-fade-in">

  @if (toast()) {
    <div class="fixed bottom-6 right-6 z-[100] flex items-start gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-slide-in-r max-w-sm"
      [ngClass]="toast()!.tipo === 'ok' ? 'bg-white border-emerald-300' : 'bg-white border-red-300'">
      <span class="text-lg">{{ toast()!.tipo === 'ok' ? '✓' : '✕' }}</span>
      <p class="text-sm text-gray-700 font-medium flex-1 leading-snug">{{ toast()!.msg }}</p>
      <button type="button" (click)="toast.set(null)" class="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
    </div>
  }

  @if (!salonSeleccionado()) {
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Recursos por salón</h2>
        <p class="text-sm text-gray-500">
          Selecciona un salón asignado para publicar materiales, enlaces y archivos para tus alumnos
          @if (anioEscolar()) { · Año {{ anioEscolar() }} }
        </p>
      </div>
    </div>

    @if (errorSalones()) {
      <div class="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">{{ errorSalones() }}</div>
    }

    @if (salonesSvc.loading()) {
      <div class="card p-10 text-center text-gray-500">Cargando salones asignados…</div>
    } @else if (!salones().length) {
      <div class="card p-10 text-center text-gray-500">
        <div class="text-4xl mb-3">🏫</div>
        <p class="font-medium text-gray-700">No tienes salones asignados</p>
        <p class="text-sm mt-1">Contacta a coordinación académica para revisar tu asignación.</p>
      </div>
    } @else {
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        @for (s of salones(); track salonKey(s)) {
          <button type="button"
                  class="card px-3 py-3 text-left hover:shadow-md hover:border-violet-200 border border-transparent transition-all border-l-4 border-l-violet-500"
                  (click)="seleccionarSalon(s)">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-[10px] font-semibold uppercase tracking-wide text-violet-600">{{ s.nivel }}</div>
                <h3 class="font-bold text-gray-800 text-base leading-snug">{{ s.grado }} "{{ s.seccion }}"</h3>
                <p class="text-xs text-gray-500 mt-0.5">{{ s.totalAlumnos }} alumno(s)</p>
              </div>
              <span class="icon text-violet-500 shrink-0">folder</span>
            </div>
            @if (s.cursos.length) {
              <div class="mt-2 flex flex-wrap gap-1">
                @for (c of s.cursos.slice(0, 3); track c) {
                  <span class="badge badge-gray text-[10px]">{{ c }}</span>
                }
                @if (s.cursos.length > 3) {
                  <span class="badge badge-gray text-[10px]">+{{ s.cursos.length - 3 }}</span>
                }
              </div>
            }
          </button>
        }
      </div>
    }
  } @else {
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button type="button" class="btn btn-secondary btn-sm" (click)="volverASalones()">
          <span class="icon icon-sm">arrow_back</span> Mis salones
        </button>
        <div>
          <h2 class="text-lg font-bold text-gray-800">{{ salonSeleccionado()!.label }}</h2>
          <p class="text-sm text-gray-500">{{ salonSeleccionado()!.totalAlumnos }} alumnos · Recursos compartidos</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn btn-secondary btn-sm" (click)="cargarRecursos()" [disabled]="svc.loading()">
          <span class="icon icon-sm">refresh</span> Actualizar
        </button>
        <button type="button" class="btn btn-primary btn-sm" (click)="abrirModal()">
          <span class="icon icon-sm">add</span> Publicar recurso
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      @for (kpi of kpis(); track kpi.label) {
        <div class="card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" [ngClass]="kpi.bg">
            <span class="text-lg">{{ kpi.emoji }}</span>
          </div>
          <div>
            <p class="text-xs text-gray-400">{{ kpi.label }}</p>
            <p class="text-xl font-bold text-gray-900">{{ kpi.value }}</p>
          </div>
        </div>
      }
    </div>

    <div class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="form-label mb-1 block">Curso</label>
          <select class="form-select" [ngModel]="filtroCurso()" (ngModelChange)="filtroCurso.set($event)">
            <option value="">Todos los cursos del salón</option>
            @for (c of cursosSalon(); track c.clave) {
              <option [value]="c.nombre">{{ c.nombre }}</option>
            }
          </select>
        </div>
        <div>
          <label class="form-label mb-1 block">Tipo</label>
          <select class="form-select" [ngModel]="filtroTipo()" (ngModelChange)="filtroTipo.set($event)">
            @for (t of tiposFiltro; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
        </div>
        <div>
          <label class="form-label mb-1 block">Buscar</label>
          <div class="relative">
            <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input class="form-input pl-10" placeholder="Título o descripción…"
              [ngModel]="filtroBusqueda()" (ngModelChange)="filtroBusqueda.set($event)">
          </div>
        </div>
      </div>
    </div>

    @if (svc.loading()) {
      <div class="card p-12 text-center text-gray-400 text-sm">Cargando recursos…</div>
    } @else if (!filtrados().length) {
      <div class="card p-16 text-center">
        <span class="text-4xl mb-4 block">📁</span>
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Sin recursos en este salón</h3>
        <p class="text-gray-500 text-sm mb-4">Publica documentos, videos, enlaces o tareas para tus alumnos.</p>
        <button type="button" class="btn btn-primary btn-sm" (click)="abrirModal()">
          <span class="icon icon-sm">add</span> Publicar recurso
        </button>
      </div>
    } @else {
      <div class="space-y-3">
        @for (r of filtrados(); track r.id) {
          <div class="card p-4 hover:shadow-md transition-shadow">
            <div class="flex flex-col lg:flex-row lg:items-start gap-4">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center text-xl shrink-0">
                  {{ tipoEmoji(r.tipo) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <h3 class="font-semibold text-gray-900 truncate">{{ r.titulo }}</h3>
                    <span class="badge text-xs" [ngClass]="tipoBadge(r.tipo)">{{ tipoLabel(r.tipo) }}</span>
                    @if (!r.visible) {
                      <span class="badge badge-gray text-xs">Oculto</span>
                    }
                  </div>
                  <p class="text-sm text-gray-500">{{ r.cursoLabel }}</p>
                  @if (r.descripcion) {
                    <p class="text-sm text-gray-600 mt-1 line-clamp-2">{{ r.descripcion }}</p>
                  }
                  <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                    <span>📅 {{ r.fechaPublicacionDisplay }}</span>
                    @if (r.fechaEntregaDisplay) {
                      <span>⏰ Entrega: {{ r.fechaEntregaDisplay }}</span>
                    }
                    @if (r.nombreArchivo) {
                      <span>📎 {{ r.nombreArchivo }}@if (r.tamanoBytes) { · {{ formatBytes(r.tamanoBytes) }} }</span>
                    }
                    @if (r.url && (r.tipo === 'enlace' || r.tipo === 'video')) {
                      <a [href]="r.url.startsWith('http') ? r.url : archivoUrl(r.url)" target="_blank" rel="noopener"
                         class="text-violet-600 hover:underline truncate max-w-xs">🔗 Abrir enlace</a>
                    }
                    @if (r.archivoUrl && r.tipo !== 'enlace') {
                      <a [href]="r.archivoUrl" target="_blank" rel="noopener" class="text-violet-600 hover:underline">⬇ Descargar</a>
                    }
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 shrink-0">
                <button type="button" class="btn btn-secondary btn-sm"
                  [disabled]="svc.saving() && togglingId() === r.id"
                  [title]="r.visible ? 'Ocultar para alumnos' : 'Mostrar a alumnos'"
                  (click)="toggleVisible(r)">
                  <span class="icon icon-sm">{{ r.visible ? 'visibility' : 'visibility_off' }}</span>
                </button>
                <button type="button" class="btn btn-secondary btn-sm" (click)="abrirModal(r)">
                  <span class="icon icon-sm">edit</span>
                </button>
                <button type="button" class="btn btn-danger btn-sm" (click)="confirmarEliminar(r)">
                  <span class="icon icon-sm">delete</span>
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  }
</div>

@if (modalOpen()) {
  <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    (click)="cerrarModal()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in"
      (click)="$event.stopPropagation()">

      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">📎</div>
          <div>
            <h3 class="text-lg font-bold text-gray-900">{{ editId() ? 'Editar recurso' : 'Publicar recurso' }}</h3>
            <p class="text-xs text-gray-500">{{ salonSeleccionado()?.label }}</p>
          </div>
        </div>
        <button type="button" (click)="cerrarModal()" class="text-gray-400 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">×</button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2 sm:col-span-1">
            <label class="form-label">Curso <span class="text-red-500">*</span></label>
            <select class="form-input text-sm mt-1" [ngModel]="mCursoClave()" (ngModelChange)="mCursoClave.set($event)">
              <option value="">— Seleccionar —</option>
              @for (c of cursosSalon(); track c.clave) {
                <option [value]="c.clave">{{ c.nombre }}</option>
              }
            </select>
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="form-label">Tipo de recurso</label>
            <select class="form-input text-sm mt-1" [ngModel]="mTipo()" (ngModelChange)="onTipoChange($event)">
              @for (t of tiposModal; track t.value) {
                <option [value]="t.value">{{ t.emoji }} {{ t.label }}</option>
              }
            </select>
          </div>
        </div>

        <div>
          <label class="form-label">Título <span class="text-red-500">*</span></label>
          <input class="form-input text-sm mt-1" placeholder="Ej: Guía de fracciones — Semana 3"
            [ngModel]="mTitulo()" (ngModelChange)="mTitulo.set($event)">
        </div>

        <div>
          <label class="form-label">Descripción / instrucciones</label>
          <textarea class="form-input text-sm mt-1 resize-none" rows="3"
            placeholder="Indica a los alumnos cómo usar este material…"
            [ngModel]="mDescripcion()" (ngModelChange)="mDescripcion.set($event)"></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Fecha de publicación</label>
            <input type="date" class="form-input text-sm mt-1"
              [ngModel]="mFechaPubl()" (ngModelChange)="mFechaPubl.set($event)">
          </div>
          @if (mTipo() === 'tarea' || mTipo() === 'evaluacion') {
            <div>
              <label class="form-label">Fecha de entrega <span class="text-red-500">*</span></label>
              <input type="date" class="form-input text-sm mt-1"
                [ngModel]="mFechaEntrega()" (ngModelChange)="mFechaEntrega.set($event)">
            </div>
          }
        </div>

        @if (usaUrl()) {
          <div>
            <label class="form-label">{{ mTipo() === 'video' ? 'URL del video (YouTube, Drive, etc.)' : 'URL del enlace' }} <span class="text-red-500">*</span></label>
            <input type="url" class="form-input text-sm mt-1" placeholder="https://…"
              [ngModel]="mUrl()" (ngModelChange)="mUrl.set($event)">
          </div>
        }

        @if (usaArchivo()) {
          <div>
            <label class="form-label">
              {{ mTipo() === 'video' ? 'O sube un archivo de video' : 'Archivo' }}
              @if (mTipo() === 'tarea' || mTipo() === 'evaluacion' || (mTipo() !== 'video' && mTipo() !== 'clase' && mTipo() !== 'lectura')) {
                <span class="text-red-500">*</span>
              }
            </label>
            <label class="mt-1 flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all"
              [ngClass]="errorArchivo() ? 'border-red-300 bg-red-50/40' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50'">
              <input type="file" class="sr-only" [accept]="acceptFor(mTipo())" (change)="onFileSelect($event)">
              @if (mArchivoNombre()) {
                <span class="text-2xl">📎</span>
                <span class="text-sm font-medium text-violet-700">{{ mArchivoNombre() }}</span>
                @if (mArchivoTamano()) {
                  <span class="text-xs text-gray-400">{{ formatBytes(mArchivoTamano()) }}</span>
                }
                <span class="text-xs text-gray-400">Haz clic para cambiar</span>
              } @else {
                <span class="text-3xl">📁</span>
                <span class="text-sm font-medium text-gray-600">Seleccionar archivo</span>
                <span class="text-xs text-gray-400 text-center">PDF, Word, Excel, PPT, imágenes o video · máx. 10 MB</span>
              }
            </label>
            @if (svc.uploading()) {
              <p class="text-xs text-violet-600 mt-2">Subiendo archivo…</p>
            }
            @if (errorArchivo()) {
              <p class="text-xs text-red-600 mt-2">{{ errorArchivo() }}</p>
            }
          </div>
        }

        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p class="text-sm font-semibold text-gray-700">Visible para alumnos</p>
            <p class="text-xs text-gray-400 mt-0.5">Aparecerá en el portal del estudiante</p>
          </div>
          <button type="button" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            [ngClass]="mVisible() ? 'bg-violet-600' : 'bg-gray-300'"
            (click)="mVisible.set(!mVisible())">
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform"
              [ngClass]="mVisible() ? 'translate-x-6' : 'translate-x-1'"></span>
          </button>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
        <button type="button" (click)="cerrarModal()" class="btn btn-secondary text-sm">Cancelar</button>
        <button type="button" (click)="guardar()" [disabled]="!puedeGuardar() || !!errorArchivo() || svc.saving() || svc.uploading()"
          class="btn btn-primary text-sm">
          {{ svc.saving() ? 'Guardando…' : (editId() ? 'Guardar cambios' : 'Publicar material') }}
        </button>
      </div>
    </div>
  </div>
}

@if (eliminarTarget()) {
  <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    (click)="eliminarTarget.set(null)">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in" (click)="$event.stopPropagation()">
      <h3 class="text-lg font-bold text-gray-900 mb-2">Eliminar recurso</h3>
      <p class="text-sm text-gray-600 mb-6">
        ¿Eliminar <strong>{{ eliminarTarget()!.titulo }}</strong>? Esta acción no se puede deshacer.
      </p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-secondary btn-sm" (click)="eliminarTarget.set(null)">Cancelar</button>
        <button type="button" class="btn btn-danger btn-sm" (click)="eliminar()">Eliminar</button>
      </div>
    </div>
  </div>
}
  `,
})
export class RecursosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly svc = inject(RecursosService);
  readonly salonesSvc = inject(AsistenciaDocenteService);
  readonly portalSvc = inject(PortalDocenteService);

  readonly salones = signal<DocenteSalonAsignado[]>([]);
  readonly salonSeleccionado = signal<DocenteSalonAsignado | null>(null);
  readonly anioEscolar = signal<number | null>(null);
  readonly errorSalones = signal('');
  readonly cursosAsignados = signal<CursoDocente[]>([]);

  readonly recursos = signal<RecursoItem[]>([]);
  readonly filtroCurso = signal('');
  readonly filtroTipo = signal('');
  readonly filtroBusqueda = signal('');

  readonly modalOpen = signal(false);
  readonly editId = signal<number | null>(null);
  readonly mCursoClave = signal('');
  readonly mTitulo = signal('');
  readonly mTipo = signal<RecursoTipo>('documento');
  readonly mDescripcion = signal('');
  readonly mFechaPubl = signal('');
  readonly mFechaEntrega = signal('');
  readonly mUrl = signal('');
  readonly mArchivoNombre = signal('');
  readonly mArchivoUrl = signal('');
  readonly mArchivoMime = signal('');
  readonly mArchivoTamano = signal(0);
  private mArchivoFile: File | null = null;
  readonly mVisible = signal(true);
  readonly errorArchivo = signal('');
  readonly eliminarTarget = signal<RecursoItem | null>(null);
  readonly togglingId = signal<number | null>(null);
  readonly toast = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

  readonly tiposFiltro = TIPOS_RECURSO;
  readonly tiposModal = TIPOS_MODAL;

  readonly cursosSalon = computed(() => {
    const salon = this.salonSeleccionado();
    if (!salon) return [];
    const seen = new Set<string>();
    return this.cursosAsignados().filter((c) => {
      if (
        c.nivel !== salon.nivel ||
        c.grado !== salon.grado ||
        c.seccion.toUpperCase() !== salon.seccion.toUpperCase()
      ) {
        return false;
      }
      const key = c.nombre;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  readonly filtrados = computed(() => {
    const q = this.filtroBusqueda().trim().toLowerCase();
    return this.recursos().filter((r) => {
      if (this.filtroCurso() && r.curso !== this.filtroCurso()) return false;
      if (this.filtroTipo() && r.tipo !== this.filtroTipo()) return false;
      if (q && !`${r.titulo} ${r.descripcion} ${r.curso}`.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  readonly kpis = computed(() => {
    const items = this.recursos();
    return [
      { label: 'Total recursos', value: items.length, emoji: '📁', bg: 'bg-violet-50' },
      { label: 'Archivos', value: items.filter((r) => r.nombreArchivo).length, emoji: '📎', bg: 'bg-blue-50' },
      { label: 'Enlaces / videos', value: items.filter((r) => r.tipo === 'enlace' || r.tipo === 'video').length, emoji: '🔗', bg: 'bg-cyan-50' },
      { label: 'Visibles', value: items.filter((r) => r.visible).length, emoji: '👁', bg: 'bg-emerald-50' },
    ];
  });

  readonly puedeGuardar = computed(() => {
    if (!this.mCursoClave() || !this.mTitulo().trim()) return false;
    if ((this.mTipo() === 'tarea' || this.mTipo() === 'evaluacion') && !this.mFechaEntrega()) return false;
    if (this.mTipo() === 'enlace' && !this.mUrl().trim()) return false;
    if (
      this.mTipo() === 'video' &&
      !this.mUrl().trim() &&
      !this.mArchivoNombre() &&
      !this.editId()
    ) {
      return false;
    }
    if (this.mTipo() === 'tarea' || this.mTipo() === 'evaluacion') {
      const tieneArchivo =
        !!this.mArchivoFile ||
        !!this.mArchivoNombre().trim() ||
        !!this.mArchivoUrl().trim();
      if (!tieneArchivo) return false;
    }
    if (
      this.usaArchivo() &&
      !['video', 'tarea', 'evaluacion', 'clase', 'lectura'].includes(this.mTipo()) &&
      !this.mArchivoNombre() &&
      !this.editId()
    ) {
      return false;
    }
    return true;
  });

  ngOnInit(): void {
    this.layout.setTitle('Recursos y Materiales');
    this.mFechaPubl.set(this.todayIso());
    this.cargarSalones();

    this.route.queryParamMap.subscribe((params) => {
      const nivel = params.get('nivel');
      const grado = params.get('grado');
      const seccion = params.get('seccion');
      if (!nivel || !grado || !seccion) return;
      const found = this.salones().find(
        (s) =>
          s.nivel === nivel &&
          s.grado === grado &&
          s.seccion.toUpperCase() === seccion.toUpperCase(),
      );
      if (found) {
        this.salonSeleccionado.set(found);
        this.cargarRecursos();
      }
    });
  }

  cargarSalones(): void {
    this.errorSalones.set('');
    this.salonesSvc.loadMisSalones(2026).subscribe({
      next: (res) => {
        this.salones.set(res.salones);
        this.anioEscolar.set(res.anioEscolar);
        this.portalSvc.loadMiAula(2026).subscribe({
          next: (aula) => this.cursosAsignados.set(aula.cursos.map(mapPortalCursoToDocente)),
        });
        this.aplicarQuerySalon();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'No se pudieron cargar tus salones';
        this.errorSalones.set(typeof msg === 'string' ? msg : 'Error al cargar salones');
      },
    });
  }

  seleccionarSalon(salon: DocenteSalonAsignado): void {
    this.salonSeleccionado.set(salon);
    this.filtroCurso.set('');
    this.filtroTipo.set('');
    this.filtroBusqueda.set('');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { nivel: salon.nivel, grado: salon.grado, seccion: salon.seccion },
      queryParamsHandling: 'merge',
    });
    this.cargarRecursos();
  }

  volverASalones(): void {
    this.salonSeleccionado.set(null);
    this.recursos.set([]);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { nivel: null, grado: null, seccion: null },
      queryParamsHandling: 'merge',
    });
  }

  cargarRecursos(): void {
    const salon = this.salonSeleccionado();
    if (!salon) return;
    this.svc.load({
      nivel: salon.nivel,
      grado: salon.grado,
      seccion: salon.seccion,
    }).subscribe({
      next: (items) => this.recursos.set(items.map((r) => this.enrich(r))),
      error: () => this.mostrarToast('No se pudieron cargar los recursos', 'err'),
    });
  }

  abrirModal(item?: RecursoItem): void {
    if (item) {
      this.editId.set(item.id);
      const curso = this.cursosSalon().find((c) => c.nombre === item.curso);
      this.mCursoClave.set(curso?.clave ?? '');
      this.mTitulo.set(item.titulo);
      this.mTipo.set(item.tipo);
      this.mDescripcion.set(item.descripcion);
      this.mFechaPubl.set(item.fechaPublicacion);
      this.mFechaEntrega.set(item.fechaEntrega ?? '');
      this.mUrl.set(item.url);
      this.mArchivoNombre.set(item.nombreArchivo);
      this.mArchivoUrl.set(item.url);
      this.mArchivoMime.set(item.mimeType ?? '');
      this.mArchivoTamano.set(item.tamanoBytes ?? 0);
      this.mArchivoFile = null;
      this.mVisible.set(item.visible);
      this.errorArchivo.set('');
    } else {
      this.editId.set(null);
      this.mCursoClave.set(this.cursosSalon()[0]?.clave ?? '');
      this.mTitulo.set('');
      this.mTipo.set('documento');
      this.mDescripcion.set('');
      this.mFechaPubl.set(this.todayIso());
      this.mFechaEntrega.set('');
      this.mUrl.set('');
      this.mArchivoNombre.set('');
      this.mArchivoUrl.set('');
      this.mArchivoMime.set('');
      this.mArchivoTamano.set(0);
      this.mArchivoFile = null;
      this.mVisible.set(true);
      this.errorArchivo.set('');
    }
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    if (this.svc.saving() || this.svc.uploading()) return;
    this.modalOpen.set(false);
  }

  onTipoChange(tipo: RecursoTipo): void {
    this.mTipo.set(tipo);
    this.errorArchivo.set('');
    if (!this.usaUrl()) this.mUrl.set('');
    if (!this.usaArchivo()) {
      this.mArchivoNombre.set('');
      this.mArchivoFile = null;
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const check = validateFileForTipo(file, this.mTipo());
    if (!check.ok) {
      this.mArchivoFile = null;
      this.mArchivoNombre.set('');
      this.mArchivoTamano.set(0);
      this.mArchivoMime.set('');
      this.mArchivoUrl.set('');
      this.errorArchivo.set(check.message);
      input.value = '';
      return;
    }

    this.errorArchivo.set('');
    this.mArchivoFile = file;
    this.mArchivoNombre.set(file.name);
    this.mArchivoTamano.set(file.size);
    this.mArchivoMime.set(file.type || mimeFromFileName(file.name));
    this.mArchivoUrl.set('');
  }

  guardar(): void {
    if (!this.puedeGuardar()) return;
    const salon = this.salonSeleccionado();
    const curso = this.cursosSalon().find((c) => c.clave === this.mCursoClave());
    if (!salon || !curso) return;

    const buildCreatePayload = (
      fileMeta?: { url: string; nombreArchivo: string; mimeType: string; tamanoBytes: number },
    ): RecursoPayload => ({
      titulo: this.mTitulo().trim(),
      descripcion: this.mDescripcion().trim(),
      tipo: this.mTipo(),
      courseId: curso.id,
      curso: curso.nombre,
      nivel: salon.nivel,
      grado: salon.grado,
      seccion: salon.seccion,
      docente: this.docenteNombre(),
      fechaPublicacion: this.mFechaPubl(),
      fechaEntrega: this.mFechaEntrega() || undefined,
      url: this.usaUrl() ? this.mUrl().trim() : fileMeta?.url ?? this.mArchivoUrl(),
      nombreArchivo: fileMeta?.nombreArchivo ?? this.mArchivoNombre(),
      mimeType: fileMeta?.mimeType ?? this.mArchivoMime(),
      tamanoBytes: fileMeta?.tamanoBytes ?? this.mArchivoTamano(),
      visible: this.mVisible(),
    });

    const buildUpdatePayload = (
      fileMeta?: { url: string; nombreArchivo: string; mimeType: string; tamanoBytes: number },
    ): RecursoUpdatePayload => ({
      titulo: this.mTitulo().trim(),
      descripcion: this.mDescripcion().trim(),
      tipo: this.mTipo(),
      fechaPublicacion: this.mFechaPubl(),
      fechaEntrega: this.mFechaEntrega() || undefined,
      url: this.usaUrl() ? this.mUrl().trim() : fileMeta?.url ?? this.mArchivoUrl(),
      nombreArchivo: fileMeta?.nombreArchivo ?? this.mArchivoNombre(),
      mimeType: fileMeta?.mimeType ?? this.mArchivoMime(),
      tamanoBytes: fileMeta?.tamanoBytes ?? this.mArchivoTamano(),
      visible: this.mVisible(),
    });

    const id = this.editId();
    const uploadAndSave = this.mArchivoFile
      ? this.svc.upload(this.mArchivoFile, {
          tipo: this.mTipo(),
          nivel: salon.nivel,
          grado: salon.grado,
          seccion: salon.seccion,
        }).pipe(
          switchMap((uploaded) => {
            if (id) {
              return this.svc.update(id, buildUpdatePayload(uploaded));
            }
            return this.svc.create(buildCreatePayload(uploaded));
          }),
        )
      : id
        ? this.svc.update(id, buildUpdatePayload())
        : this.svc.create(buildCreatePayload());

    uploadAndSave.subscribe({
      next: (saved) => {
        const enriched = this.enrich(saved);
        if (id) {
          this.recursos.update((list) => list.map((r) => (r.id === id ? enriched : r)));
          this.mostrarToast(`"${saved.titulo}" actualizado`, 'ok');
        } else {
          this.recursos.update((list) => [enriched, ...list]);
          this.mostrarToast(`"${saved.titulo}" publicado`, 'ok');
        }
        this.modalOpen.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message;
        const text = Array.isArray(msg)
          ? msg.join(', ')
          : typeof msg === 'string'
            ? msg
            : err?.message ?? 'Error al guardar';
        this.mostrarToast(text, 'err');
      },
    });
  }

  toggleVisible(item: RecursoItem): void {
    const next = !item.visible;
    this.togglingId.set(item.id);
    this.svc.setVisibility(item.id, next).subscribe({
      next: (saved) => {
        const enriched = this.enrich(saved);
        this.recursos.update((list) => list.map((r) => (r.id === item.id ? enriched : r)));
        this.togglingId.set(null);
        this.mostrarToast(
          enriched.visible ? 'Recurso visible para alumnos' : 'Recurso oculto para alumnos',
          'ok',
        );
      },
      error: (err) => {
        this.togglingId.set(null);
        const msg = err?.error?.message ?? err?.userMessage;
        this.mostrarToast(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo cambiar la visibilidad',
          'err',
        );
      },
    });
  }

  confirmarEliminar(item: RecursoItem): void {
    this.eliminarTarget.set(item);
  }

  eliminar(): void {
    const target = this.eliminarTarget();
    if (!target) return;
    this.svc.delete(target.id).subscribe({
      next: () => {
        this.recursos.update((list) => list.filter((r) => r.id !== target.id));
        this.eliminarTarget.set(null);
        this.mostrarToast('Recurso eliminado', 'ok');
      },
      error: () => this.mostrarToast('No se pudo eliminar', 'err'),
    });
  }

  salonKey(s: DocenteSalonAsignado): string {
    return `${s.nivel}|${s.grado}|${s.seccion}`;
  }

  usaUrl = () => tipoUsaUrl(this.mTipo());
  usaArchivo = () => tipoUsaArchivo(this.mTipo());
  acceptFor = acceptForTipo;
  archivoUrl = resourceFileUrl;
  formatBytes = formatBytes;
  tipoLabel = tipoRecursoLabel;
  tipoEmoji = tipoRecursoEmoji;
  tipoBadge = tipoRecursoBadge;

  private aplicarQuerySalon(): void {
    const params = this.route.snapshot.queryParamMap;
    const nivel = params.get('nivel');
    const grado = params.get('grado');
    const seccion = params.get('seccion');
    if (!nivel || !grado || !seccion) return;
    const found = this.salones().find(
      (s) =>
        s.nivel === nivel &&
        s.grado === grado &&
        s.seccion.toUpperCase() === seccion.toUpperCase(),
    );
    if (found) {
      this.salonSeleccionado.set(found);
      this.cargarRecursos();
    }
  }

  private enrich(r: ApiResource): RecursoItem {
    const curso = this.cursosSalon().find((c) => c.nombre === r.curso);
    const filePath = r.url && !r.url.startsWith('http') ? r.url : '';
    return {
      ...r,
      visible: coerceResourceVisible(r.visible),
      mimeType: r.mimeType ?? '',
      tamanoBytes: r.tamanoBytes ?? 0,
      cursoLabel: curso ? `${r.curso} · ${curso.gradoLabel}` : `${r.curso} · ${r.grado} ${r.seccion}`,
      archivoUrl: filePath ? resourceFileUrl(filePath) : (r.url.startsWith('http') ? r.url : ''),
    };
  }

  private docenteNombre(): string {
    return this.auth.nombreCompleto() || 'Docente';
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toastTimer?: ReturnType<typeof setTimeout>;
  private mostrarToast(msg: string, tipo: 'ok' | 'err'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ msg, tipo });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4500);
  }
}
