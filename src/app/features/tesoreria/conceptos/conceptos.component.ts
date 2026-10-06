import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgClass, DecimalPipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutService } from '../../../core/layout/services/layout.service';
import {
  Concepto,
  NivelConcepto,
  Periodicidad,
  TipoConcepto,
} from './conceptos.model';
import { ConceptosService } from './conceptos.service';
import {
  ErroresCampoConcepto,
  conceptoFormularioMinimoListo,
  primerErrorConcepto,
  validarCampoConcepto,
  validarConceptoForm,
} from './concepto-form.validation';

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-conceptos',
  standalone: true,
  imports: [FormsModule, NgClass, DecimalPipe, SlicePipe],
  template: `
<div class="animate-fade-in space-y-5">

  <!-- ── Toast ── -->
  @if (toast()) {
    <div class="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border animate-slide-in-r"
      [ngClass]="toast()!.tipo==='ok' ? 'bg-white border-emerald-300' : 'bg-white border-red-300'">
      <span class="text-lg">{{ toast()!.tipo==='ok' ? '✅' : '⚠️' }}</span>
      <span class="text-sm text-gray-700 font-medium">{{ toast()!.msg }}</span>
      <button (click)="toast.set(null)" class="text-gray-400 hover:text-gray-600 text-lg leading-none ml-2">×</button>
    </div>
  }

  <!-- ── Header ── -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Conceptos de Pago</h1>
      <p class="text-sm text-gray-500 mt-0.5">Gestión del catálogo de conceptos y tarifas</p>
    </div>
    <button (click)="abrirDrawer()" class="btn btn-primary text-sm gap-1.5 flex-shrink-0">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Nuevo Concepto
    </button>
  </div>

  <!-- ── KPIs ── -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    @for (k of kpis(); track k.label) {
      <div class="card p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs text-gray-500 mb-1">{{ k.label }}</p>
            <p class="text-2xl font-bold" [ngClass]="k.color">{{ k.value }}</p>
          </div>
          <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" [ngClass]="k.bg">
            <span class="text-lg">{{ k.icon }}</span>
          </div>
        </div>
      </div>
    }
  </div>

  <!-- ── Filtros ── -->
  <div class="card p-3">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- Search -->
      <div class="relative w-100">
        <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
        <input type="text" class="form-input pl-8 text-sm" placeholder="Buscar…"
          [ngModel]="busqueda()" (ngModelChange)="onBusquedaChange($event)">
      </div>
      <!-- Tipo filter -->
      <select class="form-input text-sm w-28" [ngModel]="filtroTipo()" (ngModelChange)="onFiltroTipoChange($event)">
        <option value="todos">Todos los tipos</option>
        <option value="obligatorio">Obligatorio</option>
        <option value="voluntario">Voluntario</option>
        <option value="eventual">Eventual</option>
      </select>
      <!-- Nivel filter -->
      <select class="form-input text-sm w-28" [ngModel]="filtroNivel()" (ngModelChange)="onFiltroNivelChange($event)">
        <option value="todos">Todos los niveles</option>
        <option value="Todos">General (Todos)</option>
        <option value="Inicial">Inicial</option>
        <option value="Primaria">Primaria</option>
        <option value="Secundaria">Secundaria</option>
      </select>
      <!-- Estado filter -->
      <select class="form-input text-sm w-28" [ngModel]="filtroActivo()" (ngModelChange)="onFiltroActivoChange($event)">
        <option value="todos">Activos e inactivos</option>
        <option value="activo">Solo activos</option>
        <option value="inactivo">Solo inactivos</option>
      </select>
      <!-- Count -->
    </div>
    <span class="text-sm text-gray-400 ml-auto">
      {{ conceptosFiltrados().length }} de {{ _lista().length }}
      @if (conceptosFiltrados().length > 0) {
        · página {{ paginaActual() }} de {{ totalPaginas() }}
      }
    </span>
  </div>

  <!-- ── Tabla ── -->
  <div class="card overflow-hidden">
    @if (conceptosService.loading()) {
      <div class="py-16 text-center text-gray-400 text-sm">Cargando conceptos…</div>
    } @else if (loadError()) {
      <div class="py-16 text-center space-y-3 px-4">
        <p class="text-sm text-red-600">{{ loadError() }}</p>
        <button class="btn btn-secondary text-sm" (click)="cargarConceptos()">Reintentar</button>
      </div>
    } @else {
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead>
          <tr>
            <th class="w-24">Código</th>
            <th>Nombre</th>
            <th class="hidden md:table-cell">Descripción</th>
            <th class="text-right">Monto (S/)</th>
            <th class="hidden sm:table-cell">Tipo</th>
            <th class="hidden lg:table-cell">Periodicidad</th>
            <th class="hidden sm:table-cell">Nivel</th>
            <th>Estado</th>
            <th class="text-center w-28">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (c of conceptosVista(); track c.id) {
            <tr [ngClass]="!c.activo ? 'opacity-55' : ''">
              <td>
                <span class="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{{ c.codigo }}</span>
              </td>
              <td>
                <div class="font-semibold text-gray-800 text-sm">{{ c.nombre }}</div>
                <div class="text-xs text-gray-400 md:hidden">{{ c.descripcion | slice:0:40 }}…</div>
              </td>
              <td class="hidden md:table-cell text-gray-500 text-sm max-w-xs">
                <span class="line-clamp-1">{{ c.descripcion }}</span>
              </td>
              <td class="text-right font-bold text-gray-900">{{ c.monto | number:'1.2-2' }}</td>
              <td class="hidden sm:table-cell">
                <span class="badge" [ngClass]="tipoBadge(c.tipo)">{{ tipoLabel(c.tipo) }}</span>
              </td>
              <td class="hidden lg:table-cell text-sm text-gray-600 capitalize">{{ c.periodicidad }}</td>
              <td class="hidden sm:table-cell">
                <span class="badge" [ngClass]="nivelBadge(c.nivel)">{{ c.nivel }}</span>
              </td>
              <td>
                @if (c.activo) {
                  <span class="badge badge-green">Activo</span>
                } @else {
                  <span class="badge badge-gray">Inactivo</span>
                }
              </td>
              <td>
                <div class="flex items-center justify-center gap-1">
                  <!-- Editar -->
                  <button class="btn btn-icon text-gray-400 hover:text-indigo-600" title="Editar" (click)="abrirDrawer(c)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.232 5.232l3.536 3.536M9 11l6-6 3.536 3.536-6 6H9v-3.536z"/>
                    </svg>
                  </button>
                  <!-- Toggle activo -->
                  <button class="btn btn-icon" [title]="c.activo ? 'Desactivar' : 'Activar'"
                    [ngClass]="c.activo ? 'text-gray-400 hover:text-amber-500' : 'text-gray-300 hover:text-emerald-500'"
                    (click)="toggleActivo(c.id)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M18.364 5.636a9 9 0 1 1-12.728 0"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v4"/>
                    </svg>
                  </button>
                  <!-- Eliminar -->
                  <button class="btn btn-icon text-gray-400 hover:text-red-500" title="Eliminar" (click)="pedirEliminar(c)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          }
          @empty {
            <tr>
              <td colspan="9" class="text-center py-12 text-gray-400">
                <div class="flex flex-col items-center gap-2">
                  <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
                  </svg>
                  <span class="text-sm">No se encontraron conceptos con los filtros aplicados</span>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Footer resumen -->
    @if (conceptosFiltrados().length > 0) {
      <div class="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 bg-gray-50">
        <div class="flex items-center gap-4 flex-wrap">
          <span>{{ inicio() + 1 }}–{{ fin() }} de {{ conceptosFiltrados().length }}</span>
          <span class="hidden sm:inline">·</span>
          <span class="hidden sm:inline">Activos: <strong class="text-emerald-600">{{ activosFiltrados() }}</strong></span>
        </div>
        <div class="flex items-center gap-4 flex-wrap">
          <div class="font-semibold text-gray-800">
            Suma montos: <span class="text-indigo-700">S/ {{ sumaFiltrada() | number:'1.2-2' }}</span>
          </div>
          @if (conceptosFiltrados().length > POR_PAGINA) {
            <div class="flex items-center gap-1">
              <button class="btn-icon" [disabled]="paginaActual() === 1" (click)="paginaActual.update(p => p - 1)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              @for (p of paginas(); track p) {
                <button class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                        [ngClass]="p === paginaActual() ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
                        (click)="paginaActual.set(p)">{{ p }}</button>
              }
              <button class="btn-icon" [disabled]="paginaActual() === totalPaginas()" (click)="paginaActual.update(p => p + 1)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          }
        </div>
      </div>
    }
    }
  </div>

</div>

<!-- ═══ DRAWER Crear / Editar ══════════════════════════════════════════════ -->
@if (drawerOpen()) {
  <div class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" (click)="cerrarDrawer()"></div>
  <aside class="fixed top-0 right-0 h-full z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-r">

    <!-- Drawer header -->
    <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
      <div>
        <h2 class="text-lg font-bold text-gray-900">{{ editId() ? 'Editar Concepto' : 'Nuevo Concepto' }}</h2>
        <p class="text-xs text-gray-500 mt-0.5">{{ editId() ? 'Modifica los datos del concepto' : 'Registra un nuevo concepto de pago' }}</p>
      </div>
      <button (click)="cerrarDrawer()" class="btn btn-icon text-gray-400 hover:text-gray-700">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Drawer body -->
    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">

      @if (errorForm()) {
        <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span class="text-base">⚠️</span> {{ errorForm() }}
        </div>
      }

      <!-- Nombre -->
      <div>
        <label class="form-label">Nombre del concepto <span class="text-red-500">*</span></label>
        <input class="form-input" placeholder="Ej: Pensión de Enseñanza"
               [ngClass]="claseCampo('nombre')"
               [ngModel]="fNombre()"
               (ngModelChange)="onCampoFormChange('nombre', $event)"
               (blur)="onCampoBlur('nombre')">
        @if (campoError('nombre'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>

      <!-- Descripción -->
      <div>
        <label class="form-label">Descripción <span class="text-gray-400 font-normal">(opcional)</span></label>
        <textarea class="form-input resize-none" rows="3" placeholder="Descripción detallada del concepto…"
                  [ngClass]="claseCampo('descripcion')"
                  [ngModel]="fDescripcion()"
                  (ngModelChange)="onCampoFormChange('descripcion', $event)"
                  (blur)="onCampoBlur('descripcion')"></textarea>
        @if (campoError('descripcion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>

      <!-- Monto -->
      <div>
        <label class="form-label">Monto (S/) <span class="text-red-500">*</span></label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">S/</span>
          <input type="number" class="form-input pl-8" min="0" step="0.01" placeholder="0.00"
                 [ngClass]="claseCampo('monto')"
                 [ngModel]="fMonto()"
                 (ngModelChange)="onCampoFormChange('monto', $event)"
                 (blur)="onCampoBlur('monto')">
        </div>
        @if (campoError('monto'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>

      <!-- Tipo + Periodicidad -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">Tipo <span class="text-red-500">*</span></label>
          <select class="form-input" [ngClass]="claseCampo('tipo')"
                  [ngModel]="fTipo()"
                  (ngModelChange)="onCampoFormChange('tipo', $event)"
                  (blur)="onCampoBlur('tipo')">
            <option value="obligatorio">Obligatorio</option>
            <option value="voluntario">Voluntario</option>
            <option value="eventual">Eventual</option>
          </select>
          @if (campoError('tipo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div>
          <label class="form-label">Periodicidad <span class="text-red-500">*</span></label>
          <select class="form-input" [ngClass]="claseCampo('periodicidad')"
                  [ngModel]="fPeriodicidad()"
                  (ngModelChange)="onCampoFormChange('periodicidad', $event)"
                  (blur)="onCampoBlur('periodicidad')">
            <option value="mensual">Mensual</option>
            <option value="bimestral">Bimestral</option>
            <option value="anual">Anual</option>
            <option value="único">Único</option>
          </select>
          @if (campoError('periodicidad'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
      </div>

      <!-- Nivel -->
      <div>
        <label class="form-label">Nivel educativo</label>
        <div class="flex gap-2 flex-wrap mt-1">
          @for (nv of NIVELES; track nv) {
            <button type="button" class="px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all"
              [ngClass]="fNivel()===nv ? nivelBtnActive(nv) : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'"
              (click)="seleccionarNivel(nv)">{{ nv }}</button>
          }
        </div>
        @if (campoError('nivel'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>

      <!-- Activo toggle -->
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div>
          <p class="text-sm font-semibold text-gray-700">Concepto activo</p>
          <p class="text-xs text-gray-400 mt-0.5">Los conceptos inactivos no aparecen en los cobros</p>
        </div>
        <button class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          [ngClass]="fActivo() ? 'bg-emerald-500' : 'bg-gray-300'"
          (click)="fActivo.set(!fActivo())">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform"
            [ngClass]="fActivo() ? 'translate-x-6' : 'translate-x-1'"></span>
        </button>
      </div>

      <!-- Info código (edit mode) -->
      @if (editId()) {
        <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700">
          <strong>Código:</strong> {{ editCodigo() }} &nbsp;·&nbsp;
          <strong>Creado:</strong> {{ editFechaCreacion() }}
        </div>
      }

    </div><!-- /body -->

    <!-- Drawer footer -->
    <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
      <button (click)="cerrarDrawer()" class="btn btn-secondary text-sm">Cancelar</button>
      <button (click)="guardar()" [disabled]="!puedeGuardarForm()"
        class="btn btn-primary text-sm gap-1.5"
        [ngClass]="!puedeGuardarForm() ? 'opacity-40 cursor-not-allowed' : ''"
        [title]="puedeGuardarForm() ? '' : 'Completa nombre, monto, tipo y periodicidad'">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ editId() ? 'Guardar cambios' : 'Crear concepto' }}
      </button>
    </div>
  </aside>
}

<!-- ═══ MODAL Confirmar eliminación ════════════════════════════════════════ -->
@if (confirmarEliminarId()) {
  <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    (click)="confirmarEliminarId.set(null)">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in" (click)="$event.stopPropagation()">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-bold text-gray-900">Eliminar concepto</h3>
          <p class="text-sm text-gray-500 mt-0.5">Esta acción no se puede deshacer.</p>
        </div>
      </div>
      <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
        <p class="text-sm text-red-800">
          ¿Estás seguro de que deseas eliminar el concepto
          <strong>{{ nombreParaEliminar() }}</strong>?
        </p>
      </div>
      <div class="flex gap-3">
        <button (click)="confirmarEliminarId.set(null)" class="btn btn-secondary text-sm flex-1">Cancelar</button>
        <button (click)="eliminar()" class="btn btn-danger text-sm flex-1 gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/>
          </svg>
          Sí, eliminar
        </button>
      </div>
    </div>
  </div>
}
  `,
})
export class ConceptosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly conceptosService = inject(ConceptosService);

  // ── State ──────────────────────────────────────────────────────────────
  _lista = signal<Concepto[]>([]);
  loadError = signal<string | null>(null);

  // Filtros
  readonly POR_PAGINA = 10;
  paginaActual = signal(1);
  busqueda    = signal('');
  filtroTipo  = signal<TipoConcepto | 'todos'>('todos');
  filtroNivel = signal<NivelConcepto | 'todos'>('todos');
  filtroActivo = signal<'todos' | 'activo' | 'inactivo'>('todos');

  // Toast
  toast = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  // Drawer
  drawerOpen       = signal(false);
  editId           = signal<number | null>(null);
  editCodigo       = signal('');
  editFechaCreacion = signal('');
  fNombre          = signal('');
  fDescripcion     = signal('');
  fMonto           = signal<number>(0);
  fTipo            = signal<TipoConcepto>('obligatorio');
  fPeriodicidad    = signal<Periodicidad>('mensual');
  fNivel           = signal<NivelConcepto>('Todos');
  fActivo          = signal(true);
  errorForm = signal('');
  fieldErrors = signal<ErroresCampoConcepto>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);

  // Eliminar
  confirmarEliminarId = signal<number | null>(null);

  // ── Static data ────────────────────────────────────────────────────────
  readonly NIVELES: NivelConcepto[] = ['Todos', 'Inicial', 'Primaria', 'Secundaria'];

  // ── Computed ───────────────────────────────────────────────────────────
  conceptosFiltrados = computed(() => {
    let list = this._lista();
    const q = this.busqueda().toLowerCase().trim();
    if (q)                          list = list.filter(c => c.nombre.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q));
    if (this.filtroTipo()  !== 'todos') list = list.filter(c => c.tipo   === this.filtroTipo());
    if (this.filtroNivel() !== 'todos') list = list.filter(c => c.nivel  === this.filtroNivel());
    if (this.filtroActivo() === 'activo')   list = list.filter(c => c.activo);
    if (this.filtroActivo() === 'inactivo') list = list.filter(c => !c.activo);
    return list;
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.conceptosFiltrados().length / this.POR_PAGINA)),
  );
  readonly inicio = computed(() => (this.paginaActual() - 1) * this.POR_PAGINA);
  readonly fin = computed(() => Math.min(this.inicio() + this.POR_PAGINA, this.conceptosFiltrados().length));
  readonly conceptosVista = computed(() => this.conceptosFiltrados().slice(this.inicio(), this.fin()));
  readonly paginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const ini = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    return Array.from({ length: fin - ini + 1 }, (_, i) => ini + i);
  });

  activosFiltrados = computed(() => this.conceptosFiltrados().filter(c => c.activo).length);
  sumaFiltrada     = computed(() => this.conceptosFiltrados().reduce((acc, c) => acc + c.monto, 0));

  kpis = computed(() => {
    const list     = this._lista();
    const total    = list.length;
    const activos  = list.filter(c => c.activo).length;
    const obligat  = list.filter(c => c.tipo === 'obligatorio' && c.activo).length;
    const montoMax = list.length ? Math.max(...list.map(c => c.monto)) : 0;
    return [
      { label:'Total conceptos',   value: total,               color:'text-indigo-700', bg:'bg-indigo-50',  icon:'📋' },
      { label:'Activos',           value: activos,             color:'text-emerald-600',bg:'bg-emerald-50', icon:'✅' },
      { label:'Obligatorios act.', value: obligat,             color:'text-red-600',    bg:'bg-red-50',     icon:'⚠️' },
      { label:'Monto máximo S/',   value: 'S/ '+montoMax.toFixed(2), color:'text-amber-600', bg:'bg-amber-50',  icon:'💰' },
    ];
  });

  nombreParaEliminar = computed(() => {
    const id = this.confirmarEliminarId();
    return id ? (this._lista().find(c => c.id === id)?.nombre ?? '') : '';
  });

  readonly puedeGuardarForm = computed(() =>
    conceptoFormularioMinimoListo({
      nombre: this.fNombre(),
      descripcion: this.fDescripcion(),
      monto: this.fMonto(),
      tipo: this.fTipo(),
      periodicidad: this.fPeriodicidad(),
      nivel: this.fNivel(),
    }),
  );

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.layout.setTitle('Conceptos de Pago');
    this.cargarConceptos();
  }

  cargarConceptos(): void {
    this.loadError.set(null);
    this.conceptosService.list().subscribe({
      next: (rows) => {
        this._lista.set(rows);
        this.paginaActual.set(1);
      },
      error: (err: Error) => {
        this.loadError.set(err.message);
        this.mostrarToast(err.message, 'err');
      },
    });
  }

  onBusquedaChange(value: string): void {
    this.busqueda.set(value);
    this.paginaActual.set(1);
  }

  onFiltroTipoChange(value: TipoConcepto | 'todos'): void {
    this.filtroTipo.set(value);
    this.paginaActual.set(1);
  }

  onFiltroNivelChange(value: NivelConcepto | 'todos'): void {
    this.filtroNivel.set(value);
    this.paginaActual.set(1);
  }

  onFiltroActivoChange(value: 'todos' | 'activo' | 'inactivo'): void {
    this.filtroActivo.set(value);
    this.paginaActual.set(1);
  }

  // ── Drawer ─────────────────────────────────────────────────────────────
  abrirDrawer(concepto?: Concepto): void {
    if (concepto) {
      this.editId.set(concepto.id);
      this.editCodigo.set(concepto.codigo);
      this.editFechaCreacion.set(concepto.creadoEl);
      this.fNombre.set(concepto.nombre);
      this.fDescripcion.set(concepto.descripcion);
      this.fMonto.set(concepto.monto);
      this.fTipo.set(concepto.tipo);
      this.fPeriodicidad.set(concepto.periodicidad);
      this.fNivel.set(concepto.nivel);
      this.fActivo.set(concepto.activo);
    } else {
      this.editId.set(null);
      this.editCodigo.set('');
      this.editFechaCreacion.set('');
      this.fNombre.set(''); this.fDescripcion.set(''); this.fMonto.set(0);
      this.fTipo.set('obligatorio'); this.fPeriodicidad.set('mensual');
      this.fNivel.set('Todos'); this.fActivo.set(true);
    }
    this.resetValidacionForm();
    this.drawerOpen.set(true);
  }
  cerrarDrawer(): void {
    this.drawerOpen.set(false);
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
      nombre: this.fNombre(),
      descripcion: this.fDescripcion(),
      monto: this.fMonto(),
      tipo: this.fTipo(),
      periodicidad: this.fPeriodicidad(),
      nivel: this.fNivel(),
    };
  }

  onCampoBlur(key: string): void {
    this.camposTocados.update((t) => ({ ...t, [key]: true }));
    this.validarCampoEnVivo(key);
  }

  onCampoFormChange(key: string, value: string | number | TipoConcepto | Periodicidad): void {
    switch (key) {
      case 'nombre':
        this.fNombre.set(String(value));
        break;
      case 'descripcion':
        this.fDescripcion.set(String(value));
        break;
      case 'monto': {
        const n = Number(value);
        this.fMonto.set(Number.isFinite(n) ? n : 0);
        break;
      }
      case 'tipo':
        this.fTipo.set(value as TipoConcepto);
        break;
      case 'periodicidad':
        this.fPeriodicidad.set(value as Periodicidad);
        break;
    }

    if (this.camposTocados()[key] || this.intentoGuardar() || this.fieldErrors()[key]) {
      this.validarCampoEnVivo(key);
    } else {
      this.quitarErrorCampo(key);
    }
  }

  seleccionarNivel(nivel: NivelConcepto): void {
    this.fNivel.set(nivel);
    if (this.camposTocados()['nivel'] || this.intentoGuardar() || this.fieldErrors()['nivel']) {
      this.validarCampoEnVivo('nivel');
    } else {
      this.quitarErrorCampo('nivel');
    }
  }

  private validarCamposMinimosEnVivo(): void {
    for (const key of ['nombre', 'monto', 'tipo', 'periodicidad']) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoConcepto(this.valoresFormulario(), key);
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
      this.errorForm.set('Completa los campos obligatorios del concepto.');
      return;
    }

    const errors = validarConceptoForm(this.valoresFormulario());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm.set(primerErrorConcepto(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    this.errorForm.set('');
    if (this.conceptosService.saving()) return;

    const payload = {
      nombre: this.fNombre().trim(),
      descripcion: this.fDescripcion().trim(),
      monto: this.fMonto(),
      tipo: this.fTipo(),
      periodicidad: this.fPeriodicidad(),
      nivel: this.fNivel(),
      activo: this.fActivo(),
    };

    const editId = this.editId();
    const req = editId
      ? this.conceptosService.update(editId, payload)
      : this.conceptosService.create(payload);

    req.subscribe({
      next: (concepto) => {
        if (editId) {
          this._lista.update(list => list.map(c => c.id === editId ? concepto : c));
          this.mostrarToast('Concepto actualizado correctamente', 'ok');
        } else {
          this._lista.update(list => [concepto, ...list]);
          this.mostrarToast(`Concepto "${concepto.nombre}" creado con código ${concepto.codigo}`, 'ok');
        }
        this.cerrarDrawer();
      },
      error: (err: Error) => this.mostrarToast(err.message, 'err'),
    });
  }

  // ── Toggle activo ──────────────────────────────────────────────────────
  toggleActivo(id: number): void {
    const concepto = this._lista().find(c => c.id === id);
    if (!concepto || this.conceptosService.saving()) return;

    this.conceptosService.setActivo(id, !concepto.activo).subscribe({
      next: (actualizado) => {
        this._lista.update(list => list.map(c => c.id === id ? actualizado : c));
        this.mostrarToast(
          concepto.activo ? `"${concepto.nombre}" desactivado` : `"${concepto.nombre}" activado`,
          'ok',
        );
      },
      error: (err: Error) => this.mostrarToast(err.message, 'err'),
    });
  }

  // ── Eliminar ───────────────────────────────────────────────────────────
  pedirEliminar(concepto: Concepto): void { this.confirmarEliminarId.set(concepto.id); }
  eliminar(): void {
    const id = this.confirmarEliminarId();
    if (!id || this.conceptosService.saving()) return;

    const nombre = this.nombreParaEliminar();
    this.conceptosService.remove(id).subscribe({
      next: () => {
        this._lista.update(list => list.filter(c => c.id !== id));
        this.confirmarEliminarId.set(null);
        this.mostrarToast(`Concepto "${nombre}" eliminado`, 'err');
      },
      error: (err: Error) => {
        this.confirmarEliminarId.set(null);
        this.mostrarToast(err.message, 'err');
      },
    });
  }

  // ── Toast ──────────────────────────────────────────────────────────────
  mostrarToast(msg: string, tipo: 'ok' | 'err'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ msg, tipo });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }

  // ── Styling helpers ────────────────────────────────────────────────────
  tipoBadge(tipo: TipoConcepto): string {
    return { obligatorio:'badge-red', voluntario:'badge-blue', eventual:'badge-orange' }[tipo];
  }
  tipoLabel(tipo: TipoConcepto): string {
    return { obligatorio:'Obligatorio', voluntario:'Voluntario', eventual:'Eventual' }[tipo];
  }
  nivelBadge(nivel: NivelConcepto): string {
    return { Todos:'badge-gray', Inicial:'badge-green', Primaria:'badge-indigo', Secundaria:'badge-purple' }[nivel];
  }
  nivelBtnActive(nivel: NivelConcepto): string {
    return { Todos:'bg-gray-800 text-white border-gray-800', Inicial:'bg-emerald-600 text-white border-emerald-600', Primaria:'bg-indigo-600 text-white border-indigo-600', Secundaria:'bg-purple-600 text-white border-purple-600' }[nivel];
  }
}


