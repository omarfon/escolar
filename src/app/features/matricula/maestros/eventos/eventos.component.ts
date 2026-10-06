import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../../core/layout/services/layout.service';
import { markTenantReloadReady, setupTenantReload } from '../../../../core/tenant/tenant-reload.util';
import { InstitucionalService } from '../../../administracion/institucional/institucional.service';
import { MaestrosEventosService } from './eventos.service';
import { EventoDetallePreviewComponent } from '../../../comunicaciones/eventos/evento-detalle-preview.component';
import {
  AUDIENCIA_LIMITADA_EVENTO,
  ESTADOS_EVENTO,
  EventoAudienciaLimitada,
  EventoDestinatario,
  EventoEstado,
  EventoItem,
  EventoTipo,
  EventoVisibilidad,
  MESES_EVENTOS,
  resolveVisibilidadEvento,
  TIPOS_EVENTO,
} from '../../../comunicaciones/eventos/eventos.model';
import { Nivel } from '../../../administracion/institucional/institucional.model';
import {
  ErroresCampoMaestroEvento,
  maestroEventoFormularioMinimoListo,
  primerErrorMaestroEvento,
  validarCampoMaestroEvento,
  validarMaestroEventoForm,
} from './maestro-evento-form.validation';

@Component({
  selector: 'app-maestros-eventos',
  standalone: true,
  imports: [FormsModule, NgClass, EventoDetallePreviewComponent],
  template: `
<div class="space-y-4">

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h3 class="text-lg font-bold text-gray-900">Eventos escolares</h3>
      <p class="text-sm text-gray-400 mt-0.5">
        Catálogo maestro de eventos institucionales (tabla eventos en BD)
      </p>
    </div>
    <div class="flex gap-2">
      <button type="button" class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="svc.loading()">
        <span class="icon icon-sm">refresh</span> Actualizar
      </button>
      <button type="button" class="btn btn-primary btn-sm" (click)="abrirModal()">
        <span class="icon icon-sm">add</span> Nuevo evento
      </button>
    </div>
  </div>

  <div class="card p-4 space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label class="form-label">Mes</label>
        <div class="relative mt-1">
          <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">calendar_month</span>
          <select class="form-select pl-10 bg-gray-50 w-full" [(ngModel)]="filtroMes" (ngModelChange)="cargar()">
            @for (m of mesesOpts; track m.value) {
              <option [ngValue]="m.value">{{ m.label }}</option>
            }
          </select>
        </div>
      </div>
      <div>
        <label class="form-label">Tipo</label>
        <div class="relative mt-1">
          <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">category</span>
          <select class="form-select pl-10 bg-gray-50 w-full" [(ngModel)]="filtroTipo" (ngModelChange)="cargar()">
            @for (t of tiposOpts; track t.value) {
              <option [ngValue]="t.value">{{ t.label }}</option>
            }
          </select>
        </div>
      </div>
      <div>
        <label class="form-label">Estado</label>
        <div class="relative mt-1">
          <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">flag</span>
          <select class="form-select pl-10 bg-gray-50 w-full" [(ngModel)]="filtroEstado" (ngModelChange)="cargar()">
            @for (e of estadosOpts; track e.value) {
              <option [ngValue]="e.value">{{ e.label }}</option>
            }
          </select>
        </div>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row gap-3 lg:items-end">
      <div class="flex-1 min-w-0">
        <label class="form-label">Buscar evento</label>
        <div class="relative mt-1">
          <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">search</span>
          <input
            class="form-input pl-10 w-full bg-gray-50"
            [ngModel]="filtroBusqueda()"
            (ngModelChange)="onBusquedaChange($event)"
            (keyup.enter)="buscar()"
            placeholder="Título, lugar, responsable..."
          />
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0 pb-0.5">
        @if (filtroBusqueda()) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="limpiarBusqueda()" title="Limpiar búsqueda">
            <span class="icon icon-sm">close</span>
          </button>
        }
        @if (filtroMes || filtroTipo || filtroEstado || filtroBusqueda()) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="limpiarFiltros()">Limpiar</button>
        }
        <p class="text-xs text-gray-400 whitespace-nowrap">{{ eventos().length }} evento(s)</p>
      </div>
    </div>
  </div>

  @if (error()) {
    <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{{ error() }}</div>
  }
  @if (toast()) {
    <div class="rounded-xl px-4 py-3 text-sm"
      [ngClass]="toast()!.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
      {{ toast()!.msg }}
    </div>
  }

  <div class="card overflow-hidden">
    @if (svc.loading()) {
      <div class="p-10 text-center text-gray-400 text-sm">Cargando eventos...</div>
    } @else if (!eventos().length) {
      <div class="p-10 text-center text-gray-500 text-sm">
        No hay eventos para los filtros seleccionados.
        @if (filtroMes || filtroTipo || filtroEstado || filtroBusqueda()) {
          <button type="button" class="btn btn-ghost btn-sm mt-2" (click)="limpiarFiltros()">Limpiar filtros</button>
        }
      </div>
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">Evento</th>
              <th class="px-4 py-3 text-left">Fecha / Horario</th>
              <th class="px-4 py-3 text-left">Lugar</th>
              <th class="px-4 py-3 text-left">Visibilidad</th>
              <th class="px-4 py-3 text-center">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (e of eventos(); track e.id) {
              <tr class="hover:bg-gray-50/80 cursor-pointer group" (click)="verDetalle(e)">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">{{ e.titulo }}</div>
                  <div class="text-xs text-gray-500 line-clamp-2 mt-0.5">{{ e.descripcion }}</div>
                  <span class="badge text-[10px] mt-1" [ngClass]="tipoCfg(e.tipo).badge">{{ tipoCfg(e.tipo).label }}</span>
                </td>
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                  <div>{{ e.fechaInicioDisplay }}@if (e.fechaFinDisplay && e.fechaFinDisplay !== e.fechaInicioDisplay) { — {{ e.fechaFinDisplay }} }</div>
                  <div class="text-xs text-gray-400">{{ e.horario }}</div>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ e.lugar || '—' }}</td>
                <td class="px-4 py-3">
                  @let vis = visibilidadCfg(e);
                  <span class="badge text-[10px] inline-flex items-center gap-1" [ngClass]="vis.badge">
                    <span class="icon icon-sm">{{ vis.icon }}</span>
                    {{ vis.tipoLabel }}
                  </span>
                  <div class="text-xs text-gray-500 mt-1">{{ vis.detalle }}</div>
                </td>
                <td class="px-4 py-3 text-center" (click)="$event.stopPropagation()">
                  <select
                    class="form-select text-xs py-1.5 px-2 w-auto min-w-[8.5rem] mx-auto bg-gray-50"
                    [ngModel]="e.estado"
                    (ngModelChange)="cambiarEstado(e, $event)">
                    @for (st of estadosForm; track st.value) {
                      <option [ngValue]="st.value">{{ st.label }}</option>
                    }
                  </select>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap" (click)="$event.stopPropagation()">
                  <div class="flex items-center justify-end gap-0.5">
                    <button type="button" class="btn btn-ghost btn-icon text-indigo-600" title="Ver detalle" (click)="verDetalle(e)">
                      <span class="icon icon-sm">visibility</span>
                    </button>
                    <button type="button" class="btn btn-ghost btn-icon text-gray-600 hover:text-indigo-600" title="Editar" (click)="abrirModal(e)">
                      <span class="icon icon-sm">edit</span>
                    </button>
                    <button type="button" class="btn btn-ghost btn-icon text-red-500" title="Cancelar evento" (click)="eliminar(e)">
                      <span class="icon icon-sm">cancel</span>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
</div>

<app-evento-detalle-preview
  [evento]="detalle()"
  [institucion]="nombreInstitucion()"
  [showEdit]="true"
  (closed)="detalle.set(null)"
  (edit)="editarDesdePreview($event)"
/>

@if (modalOpen()) {
  <div class="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" (click)="cerrarModal()"></div>
  <div class="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-[90] flex flex-col animate-slide-in-r">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
      <div>
        <h2 class="text-lg font-bold text-gray-900">{{ editId() ? 'Editar evento' : 'Nuevo evento' }}</h2>
        <p class="text-xs text-gray-500 mt-0.5">Catálogo maestro de eventos institucionales</p>
      </div>
      <button type="button" class="btn btn-ghost btn-icon" title="Cerrar" (click)="cerrarModal()">
        <span class="icon icon-sm">close</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      @if (errorForm()) {
        <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span class="icon icon-sm text-red-500">error_outline</span> {{ errorForm() }}
        </div>
      }

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Estado</label>
          <select class="form-input w-full" [(ngModel)]="form.estado">
            @for (st of estadosForm; track st.value) {
              <option [ngValue]="st.value">{{ st.label }}</option>
            }
          </select>
          <p class="text-xs text-gray-400 mt-1">Editable manualmente. Al cancelar se despublica del calendario.</p>
        </div>
        <div>
          <label class="form-label">Tipo <span class="text-red-400">*</span></label>
          <select class="form-input w-full" [ngClass]="claseCampo('tipo')"
                  [(ngModel)]="form.tipo"
                  (ngModelChange)="onCampoFormChange('tipo')"
                  (blur)="onCampoBlur('tipo')">
            @for (t of tiposForm; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
          @if (campoError('tipo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
      </div>

      <div>
        <label class="form-label">Título <span class="text-red-400">*</span></label>
        <input class="form-input w-full" [ngClass]="claseCampo('titulo')"
               [(ngModel)]="form.titulo"
               (ngModelChange)="onCampoFormChange('titulo')"
               (blur)="onCampoBlur('titulo')" />
        @if (campoError('titulo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>
      <div>
        <label class="form-label">Descripción <span class="text-gray-400 font-normal">(opcional)</span></label>
        <textarea class="form-input w-full h-24 resize-none" [ngClass]="claseCampo('descripcion')"
                  [(ngModel)]="form.descripcion"
                  (ngModelChange)="onCampoFormChange('descripcion')"
                  (blur)="onCampoBlur('descripcion')"></textarea>
        @if (campoError('descripcion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>

      <div class="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50">
        <label class="form-label mb-0">Visibilidad del evento</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button type="button"
            class="rounded-xl border-2 p-3 text-left transition-all"
            [ngClass]="form.visibilidad === 'global' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'"
            (click)="setVisibilidad('global')">
            <div class="flex items-center gap-2 font-semibold text-gray-900">
              <span class="icon text-indigo-600">public</span> Global
            </div>
            <p class="text-xs text-gray-500 mt-1">Toda la comunidad educativa</p>
          </button>
          <button type="button"
            class="rounded-xl border-2 p-3 text-left transition-all"
            [ngClass]="form.visibilidad === 'limitado' ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'"
            (click)="setVisibilidad('limitado')">
            <div class="flex items-center gap-2 font-semibold text-gray-900">
              <span class="icon text-amber-600">lock</span> Limitado
            </div>
            <p class="text-xs text-gray-500 mt-1">Audiencia específica o salón</p>
          </button>
        </div>

        @if (form.visibilidad === 'limitado') {
          <div>
            <label class="form-label">Dirigido a <span class="text-red-400">*</span></label>
            <select class="form-input w-full" [ngClass]="claseCampo('audienciaLimitada')"
                    [(ngModel)]="form.audienciaLimitada"
                    (ngModelChange)="onAudienciaChange()"
                    (blur)="onCampoBlur('audienciaLimitada')">
              @for (a of audienciaLimitadaOpts; track a.value) {
                <option [value]="a.value">{{ a.label }}</option>
              }
            </select>
            @if (campoError('audienciaLimitada'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          @if (form.audienciaLimitada === 'salon') {
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="form-label">Nivel <span class="text-red-400">*</span></label>
                <select class="form-input w-full" [ngClass]="claseCampo('nivel')"
                        [(ngModel)]="form.nivel"
                        (ngModelChange)="onNivelSalonChange()"
                        (blur)="onCampoBlur('nivel')">
                  <option value="">Seleccionar</option>
                  @for (n of niveles(); track n.id) {
                    <option [value]="n.nombre">{{ n.nombre }}</option>
                  }
                </select>
                @if (campoError('nivel'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div>
                <label class="form-label">Grado <span class="text-red-400">*</span></label>
                <select class="form-input w-full" [ngClass]="claseCampo('grado')"
                        [(ngModel)]="form.grado"
                        (ngModelChange)="onCampoFormChange('grado')"
                        (blur)="onCampoBlur('grado')"
                        [disabled]="!form.nivel">
                  <option value="">Seleccionar</option>
                  @for (g of gradosSalonList(); track g) {
                    <option [value]="g">{{ g }}</option>
                  }
                </select>
                @if (campoError('grado'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div>
                <label class="form-label">Sección <span class="text-red-400">*</span></label>
                <select class="form-input w-full" [ngClass]="claseCampo('seccion')"
                        [(ngModel)]="form.seccion"
                        (ngModelChange)="onCampoFormChange('seccion')"
                        (blur)="onCampoBlur('seccion')"
                        [disabled]="!form.grado">
                  <option value="">Seleccionar</option>
                  @for (s of seccionesSalonList(); track s) {
                    <option [value]="s">{{ s }}</option>
                  }
                </select>
                @if (campoError('seccion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>
          } @else {
            <div>
              <label class="form-label">Nivel <span class="text-gray-400 font-normal">(opcional)</span></label>
              <select class="form-input w-full" [(ngModel)]="form.nivel">
                <option value="">Todos los niveles</option>
                @for (n of niveles(); track n.id) {
                  <option [value]="n.nombre">{{ n.nombre }}</option>
                }
              </select>
            </div>
          }
        }

        <div class="flex items-start gap-2 p-3 rounded-lg bg-white border border-gray-200">
          <span class="icon text-sm mt-0.5" [ngClass]="visibilidadPreview().tipo === 'global' ? 'text-indigo-600' : 'text-amber-600'">
            {{ visibilidadPreview().icon }}
          </span>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Vista previa</p>
            <p class="text-sm font-medium text-gray-900 mt-0.5">
              {{ visibilidadPreview().tipoLabel }} · {{ visibilidadPreview().detalle }}
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Fecha inicio <span class="text-red-400">*</span></label>
          <input type="date" class="form-input w-full" [ngClass]="claseCampo('fechaInicio')"
                 [(ngModel)]="form.fechaInicio"
                 (ngModelChange)="onCampoFormChange('fechaInicio')"
                 (blur)="onCampoBlur('fechaInicio')" />
          @if (campoError('fechaInicio'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div>
          <label class="form-label">Fecha fin <span class="text-gray-400 font-normal">(opcional)</span></label>
          <input type="date" class="form-input w-full" [ngClass]="claseCampo('fechaFin')"
                 [(ngModel)]="form.fechaFin"
                 (ngModelChange)="onCampoFormChange('fechaFin')"
                 (blur)="onCampoBlur('fechaFin')" />
          @if (campoError('fechaFin'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div>
          <label class="form-label">Hora inicio</label>
          <input type="time" class="form-input w-full" [ngClass]="claseCampo('horaInicio')"
                 [(ngModel)]="form.horaInicio"
                 (ngModelChange)="onCampoFormChange('horaInicio')"
                 (blur)="onCampoBlur('horaInicio')" />
          @if (campoError('horaInicio'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div>
          <label class="form-label">Hora fin <span class="text-gray-400 font-normal">(opcional)</span></label>
          <input type="time" class="form-input w-full" [ngClass]="claseCampo('horaFin')"
                 [(ngModel)]="form.horaFin"
                 (ngModelChange)="onCampoFormChange('horaFin')"
                 (blur)="onCampoBlur('horaFin')" />
          @if (campoError('horaFin'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div class="sm:col-span-2">
          <label class="form-label">Lugar <span class="text-gray-400 font-normal">(opcional)</span></label>
          <input class="form-input w-full" placeholder="Auditorio, patio..."
                 [ngClass]="claseCampo('lugar')"
                 [(ngModel)]="form.lugar"
                 (ngModelChange)="onCampoFormChange('lugar')"
                 (blur)="onCampoBlur('lugar')" />
          @if (campoError('lugar'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div class="sm:col-span-2">
          <label class="form-label">Responsable <span class="text-gray-400 font-normal">(opcional)</span></label>
          <input class="form-input w-full" [ngClass]="claseCampo('responsable')"
                 [(ngModel)]="form.responsable"
                 (ngModelChange)="onCampoFormChange('responsable')"
                 (blur)="onCampoBlur('responsable')" />
          @if (campoError('responsable'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" class="rounded border-gray-300" [(ngModel)]="form.publicado" />
        Publicado en calendario
      </label>
    </div>

    <div class="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0">
      <button type="button" class="btn btn-secondary flex-1" (click)="cerrarModal()">Cancelar</button>
      <button type="button" class="btn btn-primary flex-1"
              [disabled]="!puedeGuardarForm() || svc.saving()"
              [title]="puedeGuardarForm() ? '' : 'Completa título, tipo, fecha de inicio y visibilidad'"
              (click)="guardar()">
        {{ svc.saving() ? 'Guardando…' : (editId() ? 'Guardar cambios' : 'Crear evento') }}
      </button>
    </div>
  </div>
}
  `,
})
export class MaestrosEventosComponent implements OnInit {
  private readonly _tenantReloadReady = setupTenantReload(() => this.cargar());
  private readonly layout = inject(LayoutService);
  private readonly institucional = inject(InstitucionalService);
  readonly svc = inject(MaestrosEventosService);

  readonly eventos = signal<EventoItem[]>([]);
  readonly detalle = signal<EventoItem | null>(null);
  readonly nombreInstitucion = signal('');
  readonly error = signal('');
  errorForm = signal('');
  fieldErrors = signal<ErroresCampoMaestroEvento>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);
  private readonly formRevision = signal(0);

  readonly puedeGuardarForm = computed(() => {
    this.formRevision();
    return maestroEventoFormularioMinimoListo(this.valoresFormulario());
  });

  readonly toast = signal<{ msg: string; type: 'ok' | 'error' } | null>(null);
  readonly modalOpen = signal(false);
  readonly editId = signal<number | null>(null);

  filtroMes = '';
  filtroTipo = '';
  filtroEstado = '';
  readonly filtroBusqueda = signal('');

  private busquedaTimer: ReturnType<typeof setTimeout> | null = null;

  readonly mesesOpts = MESES_EVENTOS;
  readonly tiposOpts = TIPOS_EVENTO;
  readonly estadosOpts = ESTADOS_EVENTO;
  readonly tiposForm = TIPOS_EVENTO.filter((t) => t.value);
  readonly estadosForm = ESTADOS_EVENTO.filter((e) => e.value);
  readonly audienciaLimitadaOpts = AUDIENCIA_LIMITADA_EVENTO;

  readonly niveles = signal<Nivel[]>([]);

  form = {
    titulo: '',
    descripcion: '',
    tipo: 'academico' as EventoTipo,
    fechaInicio: '',
    fechaFin: '',
    horaInicio: '08:00',
    horaFin: '',
    lugar: '',
    visibilidad: 'global' as EventoVisibilidad,
    audienciaLimitada: 'alumnos' as EventoAudienciaLimitada,
    nivel: '',
    grado: '',
    seccion: '',
    responsable: '',
    publicado: true,
    estado: 'programado' as EventoEstado,
  };

  ngOnInit(): void {
    this.layout.setTitle('Maestros · Eventos');
    this.institucional.load().subscribe({
      next: (cfg) => this.nombreInstitucion.set(cfg?.institution?.nombre ?? ''),
    });
    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => this.niveles.set(niveles.filter((n) => n.activo)),
    });
    this.cargar();
    markTenantReloadReady(this._tenantReloadReady);
  }

  visibilidadCfg(e: EventoItem) {
    return resolveVisibilidadEvento(e);
  }

  visibilidadPreview() {
    return resolveVisibilidadEvento({
      visibilidad: this.form.visibilidad,
      destinatarios: this.formDestinatarios(),
      nivel: this.form.nivel,
      grado: this.form.grado,
      seccion: this.form.seccion,
    });
  }

  gradosSalonList(): string[] {
    const nivel = this.niveles().find((n) => n.nombre === this.form.nivel);
    return nivel?.grados.map((g) => g.nombre) ?? [];
  }

  seccionesSalonList(): string[] {
    const nivel = this.niveles().find((n) => n.nombre === this.form.nivel);
    const grado = nivel?.grados.find((g) => g.nombre === this.form.grado);
    return grado?.secciones.map((s) => s.nombre) ?? [];
  }

  setVisibilidad(v: EventoVisibilidad): void {
    this.form.visibilidad = v;
    if (v === 'global') {
      this.form.nivel = '';
      this.form.grado = '';
      this.form.seccion = '';
    }
    this.onCampoFormChange('visibilidad');
  }

  onAudienciaChange(): void {
    if (this.form.audienciaLimitada !== 'salon') {
      this.form.grado = '';
      this.form.seccion = '';
    }
    this.onCampoFormChange('audienciaLimitada');
  }

  onNivelSalonChange(): void {
    this.form.grado = '';
    this.form.seccion = '';
    this.onCampoFormChange('nivel');
  }

  private formDestinatarios(): EventoDestinatario {
    if (this.form.visibilidad === 'global') return 'todos';
    return this.form.audienciaLimitada;
  }

  private mapEventoToForm(evento?: EventoItem) {
    const vis = evento
      ? resolveVisibilidadEvento(evento)
      : { tipo: 'global' as EventoVisibilidad };
    const audiencia: EventoAudienciaLimitada =
      vis.tipo === 'limitado'
        ? evento?.destinatarios === 'salon' || (evento?.grado && evento?.seccion)
          ? 'salon'
          : (evento?.destinatarios as EventoAudienciaLimitada) ?? 'alumnos'
        : 'alumnos';

    return {
      titulo: evento?.titulo ?? '',
      descripcion: evento?.descripcion ?? '',
      tipo: evento?.tipo ?? 'academico',
      fechaInicio: evento?.fechaInicio ?? '',
      fechaFin: evento?.fechaFin ?? evento?.fechaInicio ?? '',
      horaInicio: evento?.horaInicio ?? '08:00',
      horaFin: evento?.horaFin ?? '',
      lugar: evento?.lugar ?? '',
      visibilidad: vis.tipo,
      audienciaLimitada: audiencia,
      nivel: evento?.nivel ?? '',
      grado: evento?.grado ?? '',
      seccion: evento?.seccion ?? '',
      responsable: evento?.responsable ?? '',
      publicado: evento?.publicado ?? true,
      estado: evento?.estado ?? 'programado',
    };
  }

  verDetalle(evento: EventoItem): void {
    this.detalle.set(evento);
  }

  editarDesdePreview(evento: EventoItem): void {
    this.detalle.set(null);
    this.abrirModal(evento);
  }

  tipoCfg(tipo: EventoTipo) {
    return TIPOS_EVENTO.find((t) => t.value === tipo) ?? TIPOS_EVENTO[0];
  }

  estadoCfg(estado: string) {
    return ESTADOS_EVENTO.find((e) => e.value === estado) ?? ESTADOS_EVENTO[0];
  }

  cargar(): void {
    this.error.set('');
    this.svc.list({
      mes: this.filtroMes || undefined,
      tipo: this.filtroTipo || undefined,
      estado: this.filtroEstado || undefined,
      busqueda: this.filtroBusqueda().trim() || undefined,
    }).subscribe({
      next: (items) => this.eventos.set(items),
      error: (err) => {
        const msg = err.message || 'No se pudieron cargar los eventos';
        this.error.set(
          msg.includes('Unknown Error') || msg.includes('0')
            ? 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución (puerto 3000).'
            : msg,
        );
      },
    });
  }

  onBusquedaChange(value: string, immediate = false): void {
    this.filtroBusqueda.set(value);
    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
    const ejecutar = () => this.cargar();
    if (immediate) {
      ejecutar();
    } else {
      this.busquedaTimer = setTimeout(ejecutar, 350);
    }
  }

  buscar(): void {
    this.onBusquedaChange(this.filtroBusqueda(), true);
  }

  limpiarBusqueda(): void {
    this.onBusquedaChange('', true);
  }

  limpiarFiltros(): void {
    this.filtroMes = '';
    this.filtroTipo = '';
    this.filtroEstado = '';
    this.filtroBusqueda.set('');
    this.cargar();
  }

  abrirModal(evento?: EventoItem): void {
    this.editId.set(evento?.id ?? null);
    this.form = this.mapEventoToForm(evento);
    this.resetValidacionForm();
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.editId.set(null);
    this.resetValidacionForm();
  }

  private resetValidacionForm(): void {
    this.fieldErrors.set({});
    this.camposTocados.set({});
    this.intentoGuardar.set(false);
    this.errorForm.set('');
  }

  private valoresFormulario() {
    return {
      titulo: this.form.titulo,
      descripcion: this.form.descripcion,
      tipo: this.form.tipo,
      fechaInicio: this.form.fechaInicio,
      fechaFin: this.form.fechaFin,
      horaInicio: this.form.horaInicio,
      horaFin: this.form.horaFin,
      lugar: this.form.lugar,
      visibilidad: this.form.visibilidad,
      audienciaLimitada: this.form.audienciaLimitada,
      nivel: this.form.nivel,
      grado: this.form.grado,
      seccion: this.form.seccion,
      responsable: this.form.responsable,
      estado: this.form.estado,
    };
  }

  onCampoBlur(key: string): void {
    this.camposTocados.update((t) => ({ ...t, [key]: true }));
    this.validarCampoEnVivo(key);
  }

  onCampoFormChange(key: string): void {
    this.formRevision.update((n) => n + 1);

    if (this.camposTocados()[key] || this.intentoGuardar() || this.fieldErrors()[key]) {
      this.validarCampoEnVivo(key);
    } else {
      this.quitarErrorCampo(key);
    }

    if (key === 'fechaInicio') {
      if (this.camposTocados()['fechaFin']) this.validarCampoEnVivo('fechaFin');
      if (this.camposTocados()['horaFin'] || this.camposTocados()['horaInicio']) {
        this.validarCampoEnVivo('horaFin');
      }
    }

    if (key === 'fechaFin' && (this.camposTocados()['horaFin'] || this.camposTocados()['horaInicio'])) {
      this.validarCampoEnVivo('horaFin');
    }

    if (key === 'horaInicio' && this.camposTocados()['horaFin']) {
      this.validarCampoEnVivo('horaFin');
    }

    if (key === 'visibilidad' || key === 'audienciaLimitada') {
      for (const dep of ['nivel', 'grado', 'seccion'] as const) {
        if (this.camposTocados()[dep] || this.intentoGuardar()) {
          this.validarCampoEnVivo(dep);
        } else {
          this.quitarErrorCampo(dep);
        }
      }
    }

    if (key === 'nivel' && this.camposTocados()['grado']) {
      this.validarCampoEnVivo('grado');
    }
    if (key === 'grado' && this.camposTocados()['seccion']) {
      this.validarCampoEnVivo('seccion');
    }
  }

  private validarCamposMinimosEnVivo(): void {
    for (const key of ['titulo', 'tipo', 'fechaInicio', 'visibilidad', 'audienciaLimitada', 'nivel', 'grado', 'seccion']) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoMaestroEvento(this.valoresFormulario(), key);
    if (err) {
      this.fieldErrors.update((errors) => ({ ...errors, [key]: err }));
    } else {
      this.quitarErrorCampo(key);
    }
  }

  private quitarErrorCampo(key: string): void {
    if (!this.fieldErrors()[key]) return;
    this.fieldErrors.update((errors) => {
      const next = { ...errors };
      delete next[key];
      return next;
    });
    if (!Object.keys(this.fieldErrors()).length) this.errorForm.set('');
  }

  campoError(key: string): string | null {
    if (!this.camposTocados()[key] && !this.intentoGuardar()) return null;
    return this.fieldErrors()[key] ?? null;
  }

  claseCampo(key: string): string {
    return this.campoError(key) ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : '';
  }

  guardar(): void {
    this.intentoGuardar.set(true);
    if (!this.puedeGuardarForm()) {
      this.validarCamposMinimosEnVivo();
      this.errorForm.set('Completa los campos obligatorios del evento.');
      return;
    }

    const errors = validarMaestroEventoForm(this.valoresFormulario());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm.set(primerErrorMaestroEvento(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    this.errorForm.set('');

    const payload = {
      titulo: this.form.titulo.trim(),
      descripcion: this.form.descripcion.trim(),
      tipo: this.form.tipo,
      fechaInicio: this.form.fechaInicio,
      fechaFin: this.form.fechaFin || this.form.fechaInicio,
      horaInicio: this.form.horaInicio,
      horaFin: this.form.horaFin || undefined,
      lugar: this.form.lugar.trim(),
      visibilidad: this.form.visibilidad,
      destinatarios: this.formDestinatarios(),
      nivel: this.form.nivel.trim(),
      grado: this.form.grado.trim(),
      seccion: this.form.seccion.trim(),
      responsable: this.form.responsable.trim(),
      publicado: this.form.publicado,
      estado: this.form.estado,
    };

    const editId = this.editId();
    const req = editId
      ? this.svc.update(editId, payload)
      : this.svc.create(payload);

    req.subscribe({
      next: () => {
        this.cerrarModal();
        this.mostrarToast(editId ? 'Evento actualizado' : 'Evento creado', 'ok');
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  eliminar(evento: EventoItem): void {
    if (!confirm(`¿Cancelar el evento "${evento.titulo}"?`)) return;
    this.svc.update(evento.id, { estado: 'cancelado' }).subscribe({
      next: () => {
        this.mostrarToast('Evento cancelado', 'ok');
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  cambiarEstado(evento: EventoItem, estado: EventoEstado): void {
    if (evento.estado === estado) return;
    this.svc.update(evento.id, { estado }).subscribe({
      next: () => {
        this.mostrarToast('Estado actualizado', 'ok');
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  private mostrarToast(msg: string, type: 'ok' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
