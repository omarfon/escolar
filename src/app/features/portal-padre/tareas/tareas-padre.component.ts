import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { HijoSelectorComponent } from '../shared/hijo-selector.component';
import { SeguimientoService } from '../seguimiento/seguimiento.service';
import { TareasPadreService, TareaPadreItem } from './tareas-padre.service';
import {
  TareaVista,
  cursoStyle,
  fileAccentForName,
  fileIconForName,
  formatFileSize,
  materialRecursoNombre,
  materialRecursoUrl,
  taskFileUrl,
} from '../../portal-estudiante/tareas/tareas.model';
import {
  tipoRecursoBadge,
  tipoRecursoEmoji,
  tipoRecursoLabel,
} from '../../portal-docente/recursos/recursos.model';
import { HijoResumen } from '../seguimiento/seguimiento.model';

@Component({
  standalone: true,
  imports: [FormsModule, NgClass, HijoSelectorComponent],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Tareas de mis hijos</h2>
        <p class="text-sm text-gray-400 mt-0.5">
          {{ auth.nombreCompleto() }} · Consulta tareas asignadas y materiales del docente
        </p>
      </div>

      <app-hijo-selector (hijoChange)="onHijoChange($event)" />

      @if (hijosSvc.hijoSeleccionado(); as hijo) {
        <div class="flex justify-end">
          <button class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="svc.loading()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
          @for (kpi of kpis(); track kpi.label) {
            <button type="button" class="card p-4 text-left hover:shadow-md transition-shadow"
              [ngClass]="vista() === kpi.vista ? 'ring-2 ring-indigo-400' : ''"
              (click)="vista.set(kpi.vista)">
              <p class="text-xs text-gray-400">{{ kpi.label }}</p>
              <p class="text-xl font-bold" [ngClass]="kpi.text ?? 'text-gray-900'">{{ kpi.value }}</p>
            </button>
          }
        </div>

        <div class="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="form-label mb-1 block">Curso</label>
            <select class="form-select" [ngModel]="filtroCurso()" (ngModelChange)="filtroCurso.set($event)">
              <option value="">Todos</option>
              @for (c of svc.cursosDisponibles(); track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Buscar</label>
            <input class="form-input" placeholder="Título o curso…"
              [ngModel]="filtroBusqueda()" (ngModelChange)="filtroBusqueda.set($event)">
          </div>
        </div>

        @if (svc.loading()) {
          <div class="card p-12 text-center text-gray-400 text-sm">Cargando tareas de {{ hijo.nombreCompleto }}…</div>
        } @else if (!filtradas().length) {
          <div class="card p-12 text-center text-gray-400 text-sm">No hay tareas con los filtros seleccionados.</div>
        } @else {
          <div class="space-y-3">
            @for (t of filtradas(); track t.id) {
              @let style = cursoStyle(t.curso);
              <div class="card p-4 hover:shadow-md cursor-pointer transition-shadow"
                (click)="abrirDetalle(t)">
                <div class="flex flex-wrap items-start gap-3">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                    [ngClass]="style.colorClass">{{ style.emoji }}</div>
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <h3 class="font-semibold text-gray-900">{{ t.titulo }}</h3>
                      <span class="badge text-xs" [ngClass]="svc.estadoBadge(t.estado)">{{ svc.estadoLabel(t.estado) }}</span>
                    </div>
                    <p class="text-sm text-gray-500">{{ t.curso }} · Entrega: {{ svc.formatFecha(t.fechaEntrega) }}</p>
                    @if (t.recurso) {
                      <p class="text-xs text-indigo-600 mt-1">Material del docente disponible</p>
                    }
                    @if (t.estado === 'GRADED') {
                      <p class="text-xs text-indigo-700 mt-1 font-medium">Calificación: {{ t.nota ?? '—' }}/20</p>
                    }
                  </div>
                  <span class="btn btn-secondary btn-sm shrink-0" (click)="$event.stopPropagation(); abrirDetalle(t)">
                    Ver detalle
                  </span>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>

    @if (detalle(); as t) {
      <div class="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" (click)="cerrarDetalle()"></div>
      <div class="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-[90] flex flex-col animate-slide-in-r">
        <div class="px-6 py-5 border-b flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase text-indigo-600">Tarea</p>
            <h2 class="text-lg font-bold text-gray-900">{{ t.titulo }}</h2>
            <p class="text-sm text-gray-500 mt-1">{{ t.curso }} · {{ svc.formatFecha(t.fechaEntrega) }}</p>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" (click)="cerrarDetalle()">
            <span class="icon icon-sm">close</span>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          @if (t.recurso; as r) {
            <section class="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
              <h3 class="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                <span>{{ tipoEmoji(r.tipo) }}</span> Material del docente
              </h3>
              @if (r.descripcion) {
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ r.descripcion }}</p>
              }
              @if (materialUrl(r.url); as url) {
                @let nombre = materialNombre(r.nombreArchivo, r.url);
                <a [href]="url" target="_blank" rel="noopener" class="btn btn-primary btn-sm inline-flex">
                  Abrir {{ nombre || 'recurso' }}
                </a>
              }
            </section>
          }
          @if (t.archivoEntregaNombre) {
            <section class="rounded-xl border p-3">
              <p class="text-xs text-gray-400 mb-2">Entrega del alumno</p>
              <a [href]="taskFileUrl(t.archivoEntregaUrl)" target="_blank" rel="noopener"
                class="text-sm text-indigo-600 hover:underline">{{ t.archivoEntregaNombre }}</a>
            </section>
          }
          @if (t.estado === 'GRADED') {
            <section class="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
              <p class="font-semibold text-indigo-800">Calificación: {{ t.nota ?? '—' }}/20</p>
              @if (t.retroalimentacion) {
                <p class="text-sm text-indigo-900 mt-2">{{ t.retroalimentacion }}</p>
              }
            </section>
          }
        </div>
        <div class="px-6 py-4 border-t">
          <button type="button" class="btn btn-secondary w-full" (click)="cerrarDetalle()">Cerrar</button>
        </div>
      </div>
    }
  `,
})
export class TareasPadreComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly hijosSvc = inject(SeguimientoService);
  readonly svc = inject(TareasPadreService);

  readonly vista = signal<TareaVista>('todas');
  readonly filtroCurso = signal('');
  readonly filtroBusqueda = signal('');
  readonly detalle = signal<TareaPadreItem | null>(null);

  readonly filtradas = computed(() =>
    this.svc.filtrar(this.vista(), this.filtroCurso(), this.filtroBusqueda()),
  );

  readonly kpis = computed(() => [
    { label: 'Total', value: this.svc.tareas().length, vista: 'todas' as TareaVista },
    { label: 'Pendientes', value: this.svc.pendientes().length, text: 'text-amber-700', vista: 'pendientes' as TareaVista },
    { label: 'Entregadas', value: this.svc.entregadas().length, text: 'text-emerald-700', vista: 'entregadas' as TareaVista },
    { label: 'Calificadas', value: this.svc.calificadas().length, text: 'text-indigo-700', vista: 'calificadas' as TareaVista },
    { label: 'Vencidas', value: this.svc.vencidas().length, text: 'text-red-600', vista: 'vencidas' as TareaVista },
  ]);

  cursoStyle = cursoStyle;
  taskFileUrl = taskFileUrl;
  materialUrl = materialRecursoUrl;
  materialNombre = materialRecursoNombre;
  formatFileSize = formatFileSize;
  fileIconForName = fileIconForName;
  fileAccentForName = fileAccentForName;
  tipoEmoji = tipoRecursoEmoji;
  tipoLabel = tipoRecursoLabel;
  tipoBadge = tipoRecursoBadge;

  ngOnInit(): void {
    this.layout.setTitle('Tareas');
  }

  onHijoChange(hijo: HijoResumen): void {
    this.cargarHijo(hijo);
  }

  cargar(): void {
    const hijo = this.hijosSvc.hijoSeleccionado();
    if (hijo) this.svc.load(hijo.studentId);
  }

  abrirDetalle(t: TareaPadreItem): void {
    this.detalle.set(t);
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
  }

  private cargarHijo(hijo: HijoResumen): void {
    this.hijosSvc.seleccionarHijo(hijo);
    this.vista.set('todas');
    this.filtroCurso.set('');
    this.filtroBusqueda.set('');
    this.detalle.set(null);
    this.svc.load(hijo.studentId);
  }
}
