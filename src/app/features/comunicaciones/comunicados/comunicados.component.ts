import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { ComunicadosService, Comunicado, TipoCom, DestCom, PrioCom } from './comunicados.service';
import {
  ErroresCampoComunicado,
  comunicadoFormularioMinimoListo,
  primerErrorComunicado,
  validarCampoComunicado,
  validarComunicadoForm,
} from './comunicado-form.validation';

// ── Display config ──────────────────────────────────────────────────────────
const TIPO_CFG: Record<TipoCom, { badge: string; label: string; icon: string }> = {
  general:        { badge: 'badge-blue',   label: 'General',        icon: 'campaign'              },
  academico:      { badge: 'badge-indigo', label: 'Acad\u00e9mico',      icon: 'school'                },
  administrativo: { badge: 'badge-gray',   label: 'Administrativo', icon: 'admin_panel_settings'  },
  urgente:        { badge: 'badge-red',    label: 'Urgente',        icon: 'warning'               },
  evento:         { badge: 'badge-purple', label: 'Evento',         icon: 'event'                 },
};
const PRIO_CFG: Record<PrioCom, { badge: string; label: string }> = {
  alta:  { badge: 'badge-red',    label: 'Alta'  },
  media: { badge: 'badge-yellow', label: 'Media' },
  baja:  { badge: 'badge-gray',   label: 'Baja'  },
};
const DEST_CFG: Record<DestCom, { badge: string; label: string; icon: string }> = {
  alumnos:  { badge: 'badge-blue',   label: 'Alumnos',   icon: 'groups'           },
  padres:   { badge: 'badge-green',  label: 'Padres',    icon: 'family_restroom'  },
  todos:    { badge: 'badge-indigo', label: 'Todos',     icon: 'public'           },
  docentes: { badge: 'badge-orange', label: 'Docentes',  icon: 'person'           },
};

@Component({
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
@if (toast()) {
  <div class="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-scale-in"
       [ngClass]="toast()!.tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'">
    <span class="icon text-base">{{ toast()!.tipo === 'ok' ? 'check_circle' : 'error' }}</span>
    {{ toast()!.msg }}
  </div>
}

<div class="space-y-5 animate-fade-in">

  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-bold text-gray-800">Comunicados</h2>
      <p class="text-sm text-gray-500">Gesti\u00f3n de comunicados institucionales para portales</p>
    </div>
    <button class="btn btn-primary" (click)="abrirCrear()">
      <span class="icon text-base">add</span> Nuevo Comunicado
    </button>
  </div>

  <!-- KPIs -->
  @let k = kpis();
  <div class="grid grid-cols-4 gap-4">
    <div class="card p-4">
      <div class="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</div>
      <div class="text-2xl font-bold text-gray-800 mt-1">{{ k.total }}</div>
      <div class="text-xs text-gray-400">comunicados</div>
    </div>
    <div class="card p-4 border-l-4 border-emerald-400">
      <div class="text-xs text-emerald-600 font-medium uppercase tracking-wide">Habilitados</div>
      <div class="text-2xl font-bold text-emerald-700 mt-1">{{ k.habilitados }}</div>
      <div class="text-xs text-gray-400">visibles en portales</div>
    </div>
    <div class="card p-4 border-l-4 border-gray-300">
      <div class="text-xs text-gray-500 font-medium uppercase tracking-wide">Deshabilitados</div>
      <div class="text-2xl font-bold text-gray-700 mt-1">{{ k.deshabilitados }}</div>
      <div class="text-xs text-gray-400">ocultos</div>
    </div>
    <div class="card p-4 border-l-4 border-red-400">
      <div class="text-xs text-red-600 font-medium uppercase tracking-wide">Urgentes activos</div>
      <div class="text-2xl font-bold text-red-700 mt-1">{{ k.urgentes }}</div>
      <div class="text-xs text-gray-400">tipo urgente</div>
    </div>
  </div>

  <!-- Filters -->
  <div class="card px-3 py-2.5 flex flex-col gap-2">
    <!-- Fila 1: campos -->
    <div class="flex items-center gap-2">
      <div class="relative">
        <span class="icon absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
        <input class="form-input pl-8 pr-2 h-9 text-sm w-48" type="text" placeholder="Buscar..."
               [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)">
      </div>
      <select class="form-input h-9 text-sm w-36" [ngModel]="filtroTipo()" (ngModelChange)="filtroTipo.set($event)">
        <option value="todos">Tipo</option>
        @for (t of tipos; track t.val) { <option [value]="t.val">{{ t.label }}</option> }
      </select>
      <select class="form-input h-9 text-sm w-36" [ngModel]="filtroDest()" (ngModelChange)="filtroDest.set($event)">
        <option value="todos">Destinatario</option>
        @for (d of dests; track d.val) { <option [value]="d.val">{{ d.label }}</option> }
      </select>
    </div>
    <!-- Fila 2: botones de estado + resultados -->
    <div class="flex items-center gap-1">
      @for (opt of estadoOpts; track opt.val) {
        <button class="px-3 h-8 text-xs rounded-lg font-medium transition-colors"
                [ngClass]="filtroEstado() === opt.val ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                (click)="filtroEstado.set(opt.val)">{{ opt.label }}</button>
      }
      @if (busqueda() || filtroTipo() !== 'todos' || filtroDest() !== 'todos' || filtroEstado() !== 'todos') {
        <button class="h-8 px-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors flex items-center gap-1 text-xs" (click)="limpiarFiltros()">
          <span class="icon text-sm">filter_alt_off</span> Limpiar
        </button>
      }
      <span class="ml-auto text-xs text-gray-400 whitespace-nowrap">{{ listado().length }} resultado(s)</span>
    </div>
  </div>

  <!-- Main -->
  <div class="flex gap-5 items-start">

    <!-- Table -->
    <div class="flex-1 min-w-0 card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="data-table w-full">
          <thead>
            <tr>
              <th>T\u00edtulo</th>
              <th class="w-28">Tipo</th>
              <th class="w-28">Destinatarios</th>
              <th class="w-20">Prioridad</th>
              <th class="w-24 text-center">Estado</th>
              <th class="w-24">Publicaci\u00f3n</th>
              <th class="w-24">Vencimiento</th>
              <th class="w-16 text-center">Le\u00eddos</th>
              <th class="w-20">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (c of listado(); track c.id) {
              <tr class="cursor-pointer"
                  [ngClass]="selId() === c.id ? 'bg-indigo-50' : ''"
                  (click)="selId.set(c.id)">
                <td>
                  <div class="flex items-center gap-2">
                    <span class="icon text-sm" [ngClass]="tipoBadge(c.tipo).includes('red') ? 'text-red-400' : tipoBadge(c.tipo).includes('indigo') ? 'text-indigo-400' : tipoBadge(c.tipo).includes('purple') ? 'text-purple-400' : 'text-gray-400'">
                      {{ tipoIcon(c.tipo) }}
                    </span>
                    <span class="font-medium text-gray-800 text-sm line-clamp-1">{{ c.titulo }}</span>
                  </div>
                  <div class="text-xs text-gray-400 mt-0.5 pl-6 line-clamp-1">{{ c.autor }}</div>
                </td>
                <td><span class="badge" [ngClass]="tipoBadge(c.tipo)">{{ tipoLabel(c.tipo) }}</span></td>
                <td><span class="badge" [ngClass]="destBadge(c.destinatarios)">{{ destLabel(c.destinatarios) }}</span></td>
                <td><span class="badge" [ngClass]="prioBadge(c.prioridad)">{{ prioLabel(c.prioridad) }}</span></td>
                <td class="text-center">
                  <button class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                          [ngClass]="c.habilitado ? 'bg-emerald-500' : 'bg-gray-300'"
                          (click)="$event.stopPropagation(); toggleHabilitado(c.id)"
                          [title]="c.habilitado ? 'Deshabilitar' : 'Habilitar'">
                    <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                          [ngClass]="c.habilitado ? 'translate-x-6' : 'translate-x-1'"></span>
                  </button>
                </td>
                <td class="text-xs text-gray-600">{{ c.fechaPublicacion }}</td>
                <td class="text-xs" [ngClass]="c.fechaVencimiento ? 'text-gray-600' : 'text-gray-300'">
                  {{ c.fechaVencimiento ?? '\u2014' }}
                </td>
                <td class="text-center text-sm font-medium text-gray-700">{{ c.leidos }}</td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-icon" title="Editar" (click)="$event.stopPropagation(); abrirEditar(c)">
                      <span class="icon text-sm">edit</span>
                    </button>
                    <button class="btn btn-icon text-red-400 hover:bg-red-50" title="Eliminar"
                            (click)="$event.stopPropagation(); confirmarEliminar(c.id)">
                      <span class="icon text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            }
            @empty {
              <tr><td colspan="9" class="py-12 text-center text-gray-400 text-sm">Sin comunicados para los filtros seleccionados</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Drawer overlay + panel -->
    @if (comunicadoSel(); as c) {
      <div class="fixed inset-0 z-30" (click)="selId.set(null)"></div>
      <div class="fixed inset-y-0 right-0 z-40 w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r">
        <!-- Drawer header -->
        <div class="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-2 shrink-0">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="badge" [ngClass]="tipoBadge(c.tipo)">{{ tipoLabel(c.tipo) }}</span>
              <span class="badge" [ngClass]="prioBadge(c.prioridad)">{{ prioLabel(c.prioridad) }}</span>
            </div>
            <div class="font-semibold text-gray-800 text-sm leading-snug">{{ c.titulo }}</div>
          </div>
          <button class="btn btn-icon shrink-0" (click)="selId.set(null)">
            <span class="icon text-base">close</span>
          </button>
        </div>

        <!-- Drawer body -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- Metadata -->
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <div class="text-gray-400 font-medium">Destinatarios</div>
              <span class="badge mt-0.5" [ngClass]="destBadge(c.destinatarios)">{{ destLabel(c.destinatarios) }}</span>
            </div>
            <div>
              <div class="text-gray-400 font-medium">Autor</div>
              <div class="text-gray-700 font-medium">{{ c.autor }}</div>
            </div>
            <div>
              <div class="text-gray-400 font-medium">Publicaci\u00f3n</div>
              <div class="text-gray-700">{{ c.fechaPublicacion }}</div>
            </div>
            <div>
              <div class="text-gray-400 font-medium">Vencimiento</div>
              <div class="text-gray-700">{{ c.fechaVencimiento ?? 'Sin l\u00edmite' }}</div>
            </div>
            <div>
              <div class="text-gray-400 font-medium">Le\u00eddos</div>
              <div class="text-gray-700 font-semibold">{{ c.leidos }} personas</div>
            </div>
            <div>
              <div class="text-gray-400 font-medium">Estado</div>
              <span class="badge" [ngClass]="c.habilitado ? 'badge-green' : 'badge-gray'">
                {{ c.habilitado ? 'Habilitado' : 'Deshabilitado' }}
              </span>
            </div>
          </div>

          <!-- Contenido -->
          <div>
            <div class="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">Contenido</div>
            <div class="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">{{ c.cuerpo }}</div>
          </div>

          <!-- Confirm delete -->
          @if (eliminandoId() === c.id) {
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <div class="text-sm font-semibold text-red-700 mb-2">\u00bfEliminar este comunicado?</div>
              <div class="flex gap-2">
                <button class="btn btn-danger text-xs py-1.5 flex-1" (click)="ejecutarEliminar(c.id)">S\u00ed, eliminar</button>
                <button class="btn btn-ghost text-xs py-1.5 flex-1" (click)="eliminandoId.set(null)">Cancelar</button>
              </div>
            </div>
          }
        </div>

        <!-- Drawer actions -->
        <div class="px-4 py-3 border-t border-gray-100 flex gap-2 shrink-0">
          <button class="btn flex-1 text-xs py-2"
                  [ngClass]="c.habilitado ? 'btn-secondary' : 'btn-primary'"
                  (click)="toggleHabilitado(c.id)">
            <span class="icon text-sm">{{ c.habilitado ? 'visibility_off' : 'visibility' }}</span>
            {{ c.habilitado ? 'Deshabilitar' : 'Habilitar' }}
          </button>
          <button class="btn btn-secondary text-xs py-2 flex-1" (click)="abrirEditar(c)">
            <span class="icon text-sm">edit</span> Editar
          </button>
        </div>
      </div>
    }
  </div>
</div>

<!-- ─── Modal crear / editar ─── -->
@if (modalVisible()) {
  <div class="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" (click)="cerrarModal()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in" (click)="$event.stopPropagation()">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 class="font-bold text-gray-800 text-lg">{{ editandoId() ? 'Editar Comunicado' : 'Nuevo Comunicado' }}</h3>
        <button class="btn btn-icon" (click)="cerrarModal()"><span class="icon">close</span></button>
      </div>
      <div class="p-6 space-y-4">
        @if (errorForm()) {
          <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span class="icon icon-sm text-red-500">error_outline</span> {{ errorForm() }}
          </div>
        }
        <!-- T\u00edtulo -->
        <div>
          <label class="form-label">T\u00edtulo <span class="text-red-400">*</span></label>
          <input class="form-input" type="text" placeholder="T\u00edtulo del comunicado"
                 [ngClass]="claseCampo('titulo')"
                 [ngModel]="fTitulo()"
                 (ngModelChange)="onCampoFormChange('titulo', $event)"
                 (blur)="onCampoBlur('titulo')">
          @if (campoError('titulo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <!-- Cuerpo -->
        <div>
          <label class="form-label">Contenido <span class="text-red-400">*</span></label>
          <textarea class="form-input h-32 resize-none" placeholder="Escriba aqu\u00ed el contenido del comunicado..."
                    [ngClass]="claseCampo('cuerpo')"
                    [ngModel]="fCuerpo()"
                    (ngModelChange)="onCampoFormChange('cuerpo', $event)"
                    (blur)="onCampoBlur('cuerpo')"></textarea>
          @if (campoError('cuerpo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <!-- Fila 2 -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="form-label">Tipo <span class="text-red-400">*</span></label>
            <select class="form-input" [ngClass]="claseCampo('tipo')"
                    [ngModel]="fTipo()"
                    (ngModelChange)="onCampoFormChange('tipo', $event)"
                    (blur)="onCampoBlur('tipo')">
              @for (t of tipos; track t.val) { <option [value]="t.val">{{ t.label }}</option> }
            </select>
            @if (campoError('tipo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label">Destinatarios <span class="text-red-400">*</span></label>
            <select class="form-input" [ngClass]="claseCampo('destinatarios')"
                    [ngModel]="fDest()"
                    (ngModelChange)="onCampoFormChange('destinatarios', $event)"
                    (blur)="onCampoBlur('destinatarios')">
              @for (d of dests; track d.val) { <option [value]="d.val">{{ d.label }}</option> }
            </select>
            @if (campoError('destinatarios'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label">Prioridad</label>
            <select class="form-input" [ngModel]="fPrioridad()" (ngModelChange)="fPrioridad.set($event)">
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>
        <!-- Fila 3 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Fecha de publicaci\u00f3n <span class="text-red-400">*</span></label>
            <input class="form-input" type="text" placeholder="DD/MM/AAAA"
                   [ngClass]="claseCampo('fechaPublicacion')"
                   [ngModel]="fFechaPub()"
                   (ngModelChange)="onCampoFormChange('fechaPublicacion', $event)"
                   (blur)="onCampoBlur('fechaPublicacion')">
            @if (campoError('fechaPublicacion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label">Fecha de vencimiento <span class="text-gray-400 font-normal">(opcional)</span></label>
            <input class="form-input" type="text" placeholder="DD/MM/AAAA"
                   [ngClass]="claseCampo('fechaVencimiento')"
                   [ngModel]="fFechaVenc()"
                   (ngModelChange)="onCampoFormChange('fechaVencimiento', $event)"
                   (blur)="onCampoBlur('fechaVencimiento')">
            @if (campoError('fechaVencimiento'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
        </div>
        <!-- Autor -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Autor</label>
            <input class="form-input" type="text" placeholder="Direcci\u00f3n, Secretar\u00eda..."
                   [ngClass]="claseCampo('autor')"
                   [ngModel]="fAutor()"
                   (ngModelChange)="onCampoFormChange('autor', $event)"
                   (blur)="onCampoBlur('autor')">
            @if (campoError('autor'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div class="flex items-end pb-1">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <button type="button" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      [ngClass]="fHabilitado() ? 'bg-emerald-500' : 'bg-gray-300'"
                      (click)="fHabilitado.set(!fHabilitado())">
                <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                      [ngClass]="fHabilitado() ? 'translate-x-6' : 'translate-x-1'"></span>
              </button>
              <span class="text-sm font-medium text-gray-700">
                {{ fHabilitado() ? 'Habilitado (visible en portales)' : 'Deshabilitado (oculto)' }}
              </span>
            </label>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
        <button class="btn btn-ghost" (click)="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary"
                (click)="guardarModal()"
                [disabled]="!puedeGuardarForm()"
                [title]="puedeGuardarForm() ? '' : 'Completa título, contenido, tipo, destinatarios y fecha de publicación'">
          <span class="icon text-base">{{ editandoId() ? 'save' : 'add' }}</span>
          {{ editandoId() ? 'Guardar cambios' : 'Crear comunicado' }}
        </button>
      </div>
    </div>
  </div>
}
  `,
})
export class ComunicadosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly svc = inject(ComunicadosService);

  ngOnInit() { this.layout.setTitle('Comunicados'); }

  // ── Filter state ──
  busqueda     = signal('');
  filtroTipo   = signal<TipoCom | 'todos'>('todos');
  filtroDest   = signal<DestCom | 'todos'>('todos');
  filtroEstado = signal<'todos' | 'habilitado' | 'deshabilitado'>('todos');
  selId        = signal<number | null>(null);
  eliminandoId = signal<number | null>(null);
  toast        = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

  // ── Modal state ──
  modalVisible = signal(false);
  editandoId   = signal<number | null>(null);
  fTitulo      = signal('');
  fCuerpo      = signal('');
  fTipo        = signal<TipoCom>('general');
  fDest        = signal<DestCom>('todos');
  fPrioridad   = signal<PrioCom>('media');
  fFechaPub    = signal('');
  fFechaVenc   = signal('');
  fAutor       = signal('Direcci\u00f3n');
  fHabilitado  = signal(true);
  errorForm = signal('');
  fieldErrors = signal<ErroresCampoComunicado>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);

  readonly puedeGuardarForm = computed(() =>
    comunicadoFormularioMinimoListo({
      titulo: this.fTitulo(),
      cuerpo: this.fCuerpo(),
      tipo: this.fTipo(),
      destinatarios: this.fDest(),
      prioridad: this.fPrioridad(),
      fechaPublicacion: this.fFechaPub(),
      fechaVencimiento: this.fFechaVenc(),
      autor: this.fAutor(),
    }),
  );

  // ── Options ──
  readonly tipos = Object.entries(TIPO_CFG).map(([val, cfg]) => ({ val: val as TipoCom, label: cfg.label }));
  readonly dests = Object.entries(DEST_CFG).map(([val, cfg]) => ({ val: val as DestCom, label: cfg.label }));
  readonly estadoOpts = [
    { val: 'todos' as const,         label: 'Todos'          },
    { val: 'habilitado' as const,    label: 'Habilitados'    },
    { val: 'deshabilitado' as const, label: 'Deshabilitados' },
  ];

  // ── Computed ──
  listado = computed(() => {
    let r = this.svc.comunicados();
    const q = this.busqueda().toLowerCase().trim();
    if (q) r = r.filter(c => c.titulo.toLowerCase().includes(q) || c.cuerpo.toLowerCase().includes(q) || c.autor.toLowerCase().includes(q));
    if (this.filtroTipo() !== 'todos') r = r.filter(c => c.tipo === this.filtroTipo());
    if (this.filtroDest() !== 'todos') r = r.filter(c => c.destinatarios === this.filtroDest());
    if (this.filtroEstado() === 'habilitado')    r = r.filter(c => c.habilitado);
    if (this.filtroEstado() === 'deshabilitado') r = r.filter(c => !c.habilitado);
    return r;
  });

  comunicadoSel = computed(() => {
    const id = this.selId();
    return id ? this.svc.comunicados().find(c => c.id === id) ?? null : null;
  });

  kpis = computed(() => {
    const all = this.svc.comunicados();
    return {
      total:         all.length,
      habilitados:   all.filter(c => c.habilitado).length,
      deshabilitados: all.filter(c => !c.habilitado).length,
      urgentes:      all.filter(c => c.habilitado && c.tipo === 'urgente').length,
    };
  });

  // ── Display helpers ──
  tipoBadge(t: TipoCom)  { return 'badge ' + TIPO_CFG[t].badge;  }
  tipoLabel(t: TipoCom)  { return TIPO_CFG[t].label; }
  tipoIcon(t: TipoCom)   { return TIPO_CFG[t].icon;  }
  destBadge(d: DestCom)  { return 'badge ' + DEST_CFG[d].badge;  }
  destLabel(d: DestCom)  { return DEST_CFG[d].label; }
  prioBadge(p: PrioCom)  { return 'badge ' + PRIO_CFG[p].badge;  }
  prioLabel(p: PrioCom)  { return PRIO_CFG[p].label; }

  // ── Actions ──
  toggleHabilitado(id: number) {
    const c = this.svc.comunicados().find(x => x.id === id);
    this.svc.toggle(id);
    this.mostrarToast(c?.habilitado ? 'Comunicado deshabilitado.' : 'Comunicado habilitado.', 'ok');
  }

  confirmarEliminar(id: number) { this.eliminandoId.set(id); }

  ejecutarEliminar(id: number) {
    this.svc.eliminar(id);
    this.eliminandoId.set(null);
    if (this.selId() === id) this.selId.set(null);
    this.mostrarToast('Comunicado eliminado.', 'ok');
  }

  limpiarFiltros() {
    this.busqueda.set(''); this.filtroTipo.set('todos');
    this.filtroDest.set('todos'); this.filtroEstado.set('todos');
  }

  // ── Modal ──
  abrirCrear() {
    this.editandoId.set(null);
    const hoy = new Date().toLocaleDateString('es-PE');
    this.fTitulo.set(''); this.fCuerpo.set(''); this.fTipo.set('general');
    this.fDest.set('todos'); this.fPrioridad.set('media');
    this.fFechaPub.set(hoy); this.fFechaVenc.set('');
    this.fAutor.set('Direcci\u00f3n'); this.fHabilitado.set(true);
    this.resetValidacionForm();
    this.modalVisible.set(true);
  }

  abrirEditar(c: Comunicado) {
    this.editandoId.set(c.id);
    this.fTitulo.set(c.titulo); this.fCuerpo.set(c.cuerpo);
    this.fTipo.set(c.tipo); this.fDest.set(c.destinatarios);
    this.fPrioridad.set(c.prioridad); this.fFechaPub.set(c.fechaPublicacion);
    this.fFechaVenc.set(c.fechaVencimiento ?? '');
    this.fAutor.set(c.autor); this.fHabilitado.set(c.habilitado);
    this.resetValidacionForm();
    this.modalVisible.set(true);
  }

  cerrarModal() {
    this.modalVisible.set(false);
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
      titulo: this.fTitulo(),
      cuerpo: this.fCuerpo(),
      tipo: this.fTipo(),
      destinatarios: this.fDest(),
      prioridad: this.fPrioridad(),
      fechaPublicacion: this.fFechaPub(),
      fechaVencimiento: this.fFechaVenc(),
      autor: this.fAutor(),
    };
  }

  onCampoBlur(key: string): void {
    this.camposTocados.update((t) => ({ ...t, [key]: true }));
    this.validarCampoEnVivo(key);
  }

  onCampoFormChange(key: string, value: string | TipoCom | DestCom): void {
    switch (key) {
      case 'titulo':
        this.fTitulo.set(String(value));
        break;
      case 'cuerpo':
        this.fCuerpo.set(String(value));
        break;
      case 'tipo':
        this.fTipo.set(value as TipoCom);
        break;
      case 'destinatarios':
        this.fDest.set(value as DestCom);
        break;
      case 'fechaPublicacion':
        this.fFechaPub.set(String(value));
        break;
      case 'fechaVencimiento':
        this.fFechaVenc.set(String(value));
        break;
      case 'autor':
        this.fAutor.set(String(value));
        break;
    }

    if (this.camposTocados()[key] || this.intentoGuardar() || this.fieldErrors()[key]) {
      this.validarCampoEnVivo(key);
    } else {
      this.quitarErrorCampo(key);
    }

    if (key === 'fechaPublicacion' && this.camposTocados()['fechaVencimiento']) {
      this.validarCampoEnVivo('fechaVencimiento');
    }
  }

  private validarCamposMinimosEnVivo(): void {
    for (const key of ['titulo', 'cuerpo', 'tipo', 'destinatarios', 'fechaPublicacion']) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoComunicado(this.valoresFormulario(), key);
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

  guardarModal() {
    this.intentoGuardar.set(true);
    if (!this.puedeGuardarForm()) {
      this.validarCamposMinimosEnVivo();
      this.errorForm.set('Completa los campos obligatorios del comunicado.');
      return;
    }

    const errors = validarComunicadoForm(this.valoresFormulario());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm.set(primerErrorComunicado(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    this.errorForm.set('');
    const data = {
      titulo: this.fTitulo().trim(), cuerpo: this.fCuerpo().trim(),
      tipo: this.fTipo(), destinatarios: this.fDest(), prioridad: this.fPrioridad(),
      habilitado: this.fHabilitado(), autor: this.fAutor().trim() || 'Direcci\u00f3n',
      fechaCreacion: new Date().toLocaleDateString('es-PE'),
      fechaPublicacion: this.fFechaPub() || new Date().toLocaleDateString('es-PE'),
      fechaVencimiento: this.fFechaVenc().trim() || null,
    };
    const id = this.editandoId();
    if (id) {
      this.svc.actualizar(id, data);
      this.mostrarToast('Comunicado actualizado correctamente.', 'ok');
    } else {
      this.svc.crear(data);
      this.mostrarToast('Comunicado creado y listo para publicar.', 'ok');
    }
    this.cerrarModal();
  }

  mostrarToast(msg: string, tipo: 'ok' | 'err') {
    this.toast.set({ msg, tipo });
    setTimeout(() => this.toast.set(null), 3500);
  }
}


