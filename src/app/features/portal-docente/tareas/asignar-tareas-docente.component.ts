import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/services/auth.service';
import { AsistenciaDocenteService } from '../asistencia/asistencia-docente.service';
import { DocenteSalonAsignado } from '../asistencia/asistencia-docente.model';
import { PortalDocenteService } from '../portal-docente.service';
import { mapPortalCursoToDocente, PortalDocenteCursoDocente } from '../portal-docente.model';
import { RecursosService } from '../recursos/recursos.service';
import {
  acceptForTipo,
  RecursoItem,
  RecursoPayload,
  RecursoTipo,
  resourceFileUrl,
  tipoRecursoBadge,
  tipoRecursoEmoji,
  tipoRecursoLabel,
} from '../recursos/recursos.model';

@Component({
  selector: 'app-asignar-tareas-docente',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
@if (toast()) {
  <div class="fixed bottom-6 right-6 z-[100] flex items-start gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-slide-in-r max-w-sm bg-white"
    [ngClass]="toast()!.tipo === 'ok' ? 'border-emerald-300' : 'border-red-300'">
    <span>{{ toast()!.tipo === 'ok' ? '✓' : '✕' }}</span>
    <p class="text-sm text-gray-700 font-medium flex-1">{{ toast()!.msg }}</p>
    <button type="button" (click)="toast.set(null)" class="text-gray-400">×</button>
  </div>
}

@if (!salonSeleccionado()) {
  <div>
    <h2 class="text-2xl font-bold text-gray-900">Asignar tareas</h2>
    <p class="text-sm text-gray-500 mt-0.5">Selecciona grado y sección para publicar tareas a tus alumnos</p>
  </div>

  @if (salonesSvc.loading()) {
    <div class="card p-12 text-center text-gray-400">Cargando salones…</div>
  } @else if (!salones().length) {
    <div class="card p-12 text-center text-gray-500">No tienes salones asignados.</div>
  } @else {
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      @for (s of salones(); track salonKey(s)) {
        <button type="button" class="card px-3 py-3 text-left hover:shadow-md border-l-4 border-l-indigo-500 transition-shadow"
          (click)="seleccionarSalon(s)">
          <div class="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">{{ s.nivel }}</div>
          <h3 class="font-bold text-gray-800 text-base leading-snug mt-0.5">{{ s.grado }} "{{ s.seccion }}"</h3>
          <p class="text-xs text-gray-500 mt-0.5">{{ s.totalAlumnos }} alumno(s)</p>
          @if (s.cursos.length) {
            <div class="mt-2 flex flex-wrap gap-1">
              @for (c of s.cursos.slice(0, 3); track c) {
                <span class="badge badge-gray text-[10px]">{{ c }}</span>
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
      <button type="button" class="btn btn-secondary btn-sm" (click)="volverSalones()">
        <span class="icon icon-sm">arrow_back</span> Salones
      </button>
      <div>
        <h2 class="text-lg font-bold text-gray-800">{{ salonSeleccionado()!.label }}</h2>
        <p class="text-sm text-gray-500">Tareas y evaluaciones del salón</p>
      </div>
    </div>
    <div class="flex gap-2">
      <button type="button" class="btn btn-secondary btn-sm" (click)="cargarTareas()" [disabled]="svc.loading()">
        <span class="icon icon-sm">refresh</span> Actualizar
      </button>
      <button type="button" class="btn btn-primary btn-sm" (click)="abrirModal()">
        <span class="icon icon-sm">add</span> Nueva tarea
      </button>
    </div>
  </div>

  <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
    @for (k of kpis(); track k.label) {
      <div class="card p-4">
        <p class="text-xs text-gray-400">{{ k.label }}</p>
        <p class="text-2xl font-bold mt-0.5" [ngClass]="k.color">{{ k.value }}</p>
      </div>
    }
  </div>

  @if (svc.loading()) {
    <div class="card p-12 text-center text-gray-400">Cargando tareas…</div>
  } @else if (!tareas().length) {
    <div class="card p-12 text-center text-gray-500">
      <span class="icon mb-3 block mx-auto text-gray-300" style="font-size:48px">assignment</span>
      <p class="font-medium">Aún no hay tareas en este salón</p>
      <p class="text-sm mt-1">Publica la primera con el botón «Nueva tarea».</p>
    </div>
  } @else {
    <div class="space-y-3">
      @for (t of tareas(); track t.id) {
        <div class="card p-4 hover:shadow-md transition-shadow">
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-lg">{{ tipoRecursoEmoji(t.tipo) }}</span>
                <span class="badge text-[10px]" [ngClass]="tipoRecursoBadge(t.tipo)">
                  {{ tipoRecursoLabel(t.tipo) }}
                </span>
                @if (!t.visible) {
                  <span class="badge badge-gray text-[10px]">Oculta</span>
                }
              </div>
              <h3 class="font-semibold text-gray-900 mt-1">{{ t.titulo }}</h3>
              <p class="text-sm text-gray-500">{{ t.curso }}</p>
              @if (t.descripcion) {
                <p class="text-sm text-gray-600 mt-1 line-clamp-2">{{ t.descripcion }}</p>
              }
              <div class="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                <span class="flex items-center gap-1">
                  <span class="icon icon-sm">event</span>
                  Entrega: {{ t.fechaEntregaDisplay || t.fechaEntrega || '—' }}
                </span>
                @if (t.nombreArchivo) {
                  <span class="flex items-center gap-1">
                    <span class="icon icon-sm">attach_file</span> {{ t.nombreArchivo }}
                  </span>
                }
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button type="button" class="btn btn-secondary btn-sm" (click)="abrirModal(t)">
                <span class="icon icon-sm">edit</span> Editar
              </button>
              <button type="button" class="btn btn-ghost btn-sm text-red-500" (click)="pedirEliminar(t)">
                <span class="icon icon-sm">delete</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  }
}

@if (modalAbierto()) {
  <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" (click)="cerrarModal()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
      <div class="px-6 py-4 border-b flex items-center justify-between">
        <h3 class="font-bold text-gray-900">{{ editId() ? 'Editar tarea' : 'Nueva tarea' }}</h3>
        <button type="button" class="btn-icon text-gray-400" (click)="cerrarModal()">
          <span class="icon">close</span>
        </button>
      </div>
      <div class="px-6 py-5 space-y-4">
        <div>
          <label class="form-label">Curso <span class="text-red-400">*</span></label>
          <select class="form-select mt-1" [ngModel]="cursoClave()" (ngModelChange)="cursoClave.set($event)">
            @for (c of cursosSalon(); track c.clave) {
              <option [value]="c.clave">{{ c.nombre }}</option>
            }
          </select>
        </div>
        <div>
          <label class="form-label">Tipo <span class="text-red-400">*</span></label>
          <select class="form-select mt-1" [ngModel]="tipo()" (ngModelChange)="tipo.set($any($event))">
            <option value="tarea">Tarea</option>
            <option value="evaluacion">Evaluación</option>
          </select>
        </div>
        <div>
          <label class="form-label">Título <span class="text-red-400">*</span></label>
          <input class="form-input mt-1" [(ngModel)]="tituloVal" (ngModelChange)="titulo.set($event)">
        </div>
        <div>
          <label class="form-label">Instrucciones</label>
          <textarea class="form-input mt-1 resize-none h-24" [(ngModel)]="descripcionVal"
            (ngModelChange)="descripcion.set($event)" placeholder="Describe qué deben entregar los alumnos…"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Publicación</label>
            <input type="date" class="form-input mt-1" [(ngModel)]="fechaPublVal" (ngModelChange)="fechaPubl.set($event)">
          </div>
          <div>
            <label class="form-label">Fecha de entrega <span class="text-red-400">*</span></label>
            <input type="date" class="form-input mt-1" [(ngModel)]="fechaEntregaVal" (ngModelChange)="fechaEntrega.set($event)">
          </div>
        </div>
        <div>
          <label class="form-label">Archivo adjunto (opcional)</label>
          <input type="file" class="form-input mt-1 text-sm" [accept]="acceptForTipo(tipo())" (change)="onFileSelect($event)">
          @if (archivoNombre()) {
            <p class="text-xs text-gray-500 mt-1">{{ archivoNombre() }}</p>
          }
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" [ngModel]="visible()" (ngModelChange)="visible.set($event)">
          Visible para los alumnos
        </label>
      </div>
      <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="cerrarModal()">Cancelar</button>
        <button type="button" class="btn btn-primary" (click)="guardar()" [disabled]="!puedeGuardar() || svc.saving() || svc.uploading()">
          {{ svc.saving() || svc.uploading() ? 'Guardando…' : (editId() ? 'Guardar cambios' : 'Publicar tarea') }}
        </button>
      </div>
    </div>
  </div>
}

@if (eliminarTarget()) {
  <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" (click)="eliminarTarget.set(null)">
    <div class="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" (click)="$event.stopPropagation()">
      <h3 class="font-bold text-gray-900">Eliminar tarea</h3>
      <p class="text-sm text-gray-500 mt-2">¿Eliminar «{{ eliminarTarget()!.titulo }}»? Se quitarán las entregas asociadas.</p>
      <div class="flex gap-2 mt-5">
        <button type="button" class="btn btn-secondary flex-1" (click)="eliminarTarget.set(null)">Cancelar</button>
        <button type="button" class="btn btn-danger flex-1" (click)="confirmarEliminar()">Eliminar</button>
      </div>
    </div>
  </div>
}
  `,
})
export class AsignarTareasDocenteComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly salonesSvc = inject(AsistenciaDocenteService);
  private readonly portalSvc = inject(PortalDocenteService);
  readonly svc = inject(RecursosService);

  readonly tipoRecursoLabel = tipoRecursoLabel;
  readonly tipoRecursoBadge = tipoRecursoBadge;
  readonly tipoRecursoEmoji = tipoRecursoEmoji;
  readonly acceptForTipo = acceptForTipo;

  readonly salones = signal<DocenteSalonAsignado[]>([]);
  readonly cursosAsignados = signal<PortalDocenteCursoDocente[]>([]);
  readonly salonSeleccionado = signal<(DocenteSalonAsignado & { label: string }) | null>(null);
  readonly tareas = signal<RecursoItem[]>([]);
  readonly modalAbierto = signal(false);
  readonly editId = signal<number | null>(null);
  readonly eliminarTarget = signal<RecursoItem | null>(null);
  readonly toast = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

  readonly cursoClave = signal('');
  readonly titulo = signal('');
  readonly descripcion = signal('');
  readonly tipo = signal<RecursoTipo>('tarea');
  readonly fechaPubl = signal('');
  readonly fechaEntrega = signal('');
  readonly archivoNombre = signal('');
  readonly visible = signal(true);

  tituloVal = '';
  descripcionVal = '';
  fechaPublVal = '';
  fechaEntregaVal = '';
  private archivoFile: File | null = null;
  private archivoUrl = '';
  private archivoMime = '';
  private archivoTamano = 0;

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
      if (seen.has(c.nombre)) return false;
      seen.add(c.nombre);
      return true;
    });
  });

  readonly kpis = computed(() => {
    const items = this.tareas();
    return [
      { label: 'Total', value: items.length, color: 'text-gray-900' },
      { label: 'Tareas', value: items.filter((t) => t.tipo === 'tarea').length, color: 'text-indigo-700' },
      { label: 'Evaluaciones', value: items.filter((t) => t.tipo === 'evaluacion').length, color: 'text-red-600' },
    ];
  });

  readonly puedeGuardar = computed(() =>
    !!this.cursoClave() && !!this.titulo().trim() && !!this.fechaEntrega(),
  );

  ngOnInit(): void {
    this.fechaPubl.set(this.todayIso());
    this.fechaPublVal = this.todayIso();
    this.salonesSvc.loadMisSalones(new Date().getFullYear()).subscribe({
      next: (res) => {
        this.salones.set(res.salones);
        this.portalSvc.loadMiAula(res.anioEscolar).subscribe({
          next: (aula) => this.cursosAsignados.set(aula.cursos.map(mapPortalCursoToDocente)),
        });
      },
      error: () => this.salones.set([]),
    });
  }

  salonKey(s: DocenteSalonAsignado): string {
    return `${s.nivel}-${s.grado}-${s.seccion}`;
  }

  seleccionarSalon(s: DocenteSalonAsignado): void {
    this.salonSeleccionado.set({
      ...s,
      label: `${s.grado} "${s.seccion}" · ${s.nivel}`,
    });
    this.cargarTareas();
  }

  volverSalones(): void {
    this.salonSeleccionado.set(null);
    this.tareas.set([]);
  }

  cargarTareas(): void {
    const salon = this.salonSeleccionado();
    if (!salon) return;
    this.svc.load({
      nivel: salon.nivel,
      grado: salon.grado,
      seccion: salon.seccion,
    }).subscribe({
      next: (items) => {
        this.tareas.set(
          items
            .filter((r) => r.tipo === 'tarea' || r.tipo === 'evaluacion')
            .map((r) => this.enrich(r)),
        );
      },
      error: () => this.mostrarToast('No se pudieron cargar las tareas', 'err'),
    });
  }

  abrirModal(item?: RecursoItem): void {
    if (item) {
      this.editId.set(item.id);
      const curso = this.cursosSalon().find((c) => c.nombre === item.curso);
      this.cursoClave.set(curso?.clave ?? '');
      this.titulo.set(item.titulo);
      this.tituloVal = item.titulo;
      this.descripcion.set(item.descripcion);
      this.descripcionVal = item.descripcion;
      this.tipo.set(item.tipo);
      this.fechaPubl.set(item.fechaPublicacion);
      this.fechaPublVal = item.fechaPublicacion;
      this.fechaEntrega.set(item.fechaEntrega ?? '');
      this.fechaEntregaVal = item.fechaEntrega ?? '';
      this.archivoNombre.set(item.nombreArchivo ?? '');
      this.archivoUrl = item.url ?? '';
      this.archivoMime = item.mimeType ?? '';
      this.archivoTamano = item.tamanoBytes ?? 0;
      this.archivoFile = null;
      this.visible.set(item.visible);
    } else {
      this.editId.set(null);
      this.cursoClave.set(this.cursosSalon()[0]?.clave ?? '');
      this.titulo.set('');
      this.tituloVal = '';
      this.descripcion.set('');
      this.descripcionVal = '';
      this.tipo.set('tarea');
      this.fechaPubl.set(this.todayIso());
      this.fechaPublVal = this.todayIso();
      this.fechaEntrega.set('');
      this.fechaEntregaVal = '';
      this.archivoNombre.set('');
      this.archivoUrl = '';
      this.archivoFile = null;
      this.visible.set(true);
    }
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.svc.saving() || this.svc.uploading()) return;
    this.modalAbierto.set(false);
  }

  onFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.archivoFile = file;
    this.archivoNombre.set(file.name);
    this.archivoTamano = file.size;
    this.archivoUrl = '';
  }

  guardar(): void {
    if (!this.puedeGuardar()) return;
    const salon = this.salonSeleccionado();
    const curso = this.cursosSalon().find((c) => c.clave === this.cursoClave());
    if (!salon || !curso) return;

    const buildPayload = (fileMeta?: {
      url: string;
      nombreArchivo: string;
      mimeType: string;
      tamanoBytes: number;
    }): RecursoPayload => ({
      titulo: this.titulo().trim(),
      descripcion: this.descripcion().trim(),
      tipo: this.tipo(),
      courseId: curso.id,
      curso: curso.nombre,
      nivel: salon.nivel,
      grado: salon.grado,
      seccion: salon.seccion,
      docente: this.docenteNombre(),
      fechaPublicacion: this.fechaPubl(),
      fechaEntrega: this.fechaEntrega(),
      url: fileMeta?.url ?? this.archivoUrl,
      nombreArchivo: fileMeta?.nombreArchivo ?? this.archivoNombre(),
      mimeType: fileMeta?.mimeType ?? this.archivoMime,
      tamanoBytes: fileMeta?.tamanoBytes ?? this.archivoTamano,
      visible: this.visible(),
    });

    const id = this.editId();
    const uploadAndSave = this.archivoFile
      ? this.svc
          .upload(this.archivoFile, {
            tipo: this.tipo(),
            nivel: salon.nivel,
            grado: salon.grado,
            seccion: salon.seccion,
          })
          .pipe(
            switchMap((uploaded) => {
              const payload = buildPayload(uploaded);
              return id ? this.svc.update(id, payload) : this.svc.create(payload);
            }),
          )
      : id
        ? this.svc.update(id, buildPayload())
        : this.svc.create(buildPayload());

    uploadAndSave.subscribe({
      next: (saved) => {
        const enriched = this.enrich(saved);
        if (id) {
          this.tareas.update((list) => list.map((t) => (t.id === id ? enriched : t)));
          this.mostrarToast('Tarea actualizada', 'ok');
        } else {
          this.tareas.update((list) => [enriched, ...list]);
          this.mostrarToast('Tarea publicada · los alumnos ya pueden verla', 'ok');
        }
        this.cerrarModal();
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'Error al guardar';
        this.mostrarToast(Array.isArray(msg) ? msg.join(', ') : String(msg), 'err');
      },
    });
  }

  pedirEliminar(t: RecursoItem): void {
    this.eliminarTarget.set(t);
  }

  confirmarEliminar(): void {
    const t = this.eliminarTarget();
    if (!t) return;
    this.svc.delete(t.id).subscribe({
      next: () => {
        this.tareas.update((list) => list.filter((x) => x.id !== t.id));
        this.eliminarTarget.set(null);
        this.mostrarToast('Tarea eliminada', 'ok');
      },
      error: () => this.mostrarToast('No se pudo eliminar', 'err'),
    });
  }

  private enrich(r: import('../../../core/api/api.models').ApiResource): RecursoItem {
    return {
      ...r,
      cursoLabel: r.curso,
      archivoUrl: resourceFileUrl(r.url ?? ''),
    };
  }

  private docenteNombre(): string {
    return this.auth.nombreCompleto() || this.auth.currentUser()?.username || 'Docente';
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
