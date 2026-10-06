import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { OverlayPortalDirective } from '../../../core/overlay/overlay-portal.directive';
import { InstitucionalService } from '../../administracion/institucional/institucional.service';
import { Nivel } from '../../administracion/institucional/institucional.model';
import { EsperaService } from './espera.service';
import {
  ESTADOS_ESPERA,
  EsperaItem,
  PRIORIDADES_ESPERA,
  PrioridadEspera,
  EstadoEspera,
} from './espera.model';
import {
  ErroresCampoEspera,
  esperaFormularioMinimoListo,
  primerErrorEspera,
  validarCampoEspera,
  validarEsperaForm,
} from './espera-form.validation';

function gradoKey(value: string): string {
  let t = value
    .toLowerCase()
    .replace(/[°º]/g, '')
    .replace(/\s*(grado|año|ano|anos)\b/g, '')
    .trim();
  const withNivel = t.match(/^(.+?)\s+(inicial|primaria|secundaria)$/i);
  if (withNivel) t = withNivel[1].trim();
  const num = t.match(/^(\d+)/);
  return num ? num[1] : t;
}

@Component({
  selector: 'app-espera',
  standalone: true,
  imports: [FormsModule, NgClass, TitleCasePipe, OverlayPortalDirective, RouterLink],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Lista de Espera</h2>
          <p class="text-sm text-gray-400 mt-0.5">
            Cola de asignacion cuando una seccion esta llena
          </p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" (click)="cargar()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
          <button class="btn btn-primary btn-sm" (click)="abrirDrawer()">
            <span class="icon icon-sm">person_add</span> Agregar solicitud
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        @for (kpi of kpis(); track kpi.label) {
          <div class="card p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" [ngClass]="kpi.bg">
              <span class="icon" [ngClass]="kpi.color">{{ kpi.icon }}</span>
            </div>
            <div>
              <p class="text-xs text-gray-400">{{ kpi.label }}</p>
              <p class="text-xl font-bold text-gray-900">{{ kpi.value }}</p>
            </div>
          </div>
        }
      </div>

      <div class="card p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label class="form-label mb-1 block">Nivel</label>
            <select class="form-select" [ngModel]="filtro().nivel" (ngModelChange)="setFiltro('nivel', $event)">
              <option value="">Todos</option>
              @for (n of niveles(); track n.id) {
                <option [value]="n.nombre">{{ n.nombre }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Grado</label>
            <select class="form-select" [ngModel]="filtro().grado" (ngModelChange)="setFiltro('grado', $event)" [disabled]="!filtro().nivel">
              <option value="">Todos</option>
              @for (g of gradosDisponibles(); track g) {
                <option [value]="g">{{ g }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Prioridad</label>
            <select class="form-select" [ngModel]="filtro().prioridad" (ngModelChange)="setFiltro('prioridad', $event)">
              <option value="">Todas</option>
              @for (p of prioridades; track p.value) {
                <option [value]="p.value">{{ p.label }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Estado</label>
            <select class="form-select" [ngModel]="filtro().estado" (ngModelChange)="setFiltro('estado', $event)">
              @for (e of estados; track e.value) {
                <option [value]="e.value">{{ e.label }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Buscar</label>
            <div class="relative">
              <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input class="form-input pl-10" placeholder="Nombre o DNI..."
                [ngModel]="filtro().busqueda" (ngModelChange)="setFiltro('busqueda', $event)">
            </div>
          </div>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Estudiante</th>
                <th>DNI</th>
                <th>Solicitud</th>
                <th>Nivel / Grado</th>
                <th class="text-center">Prioridad</th>
                <th>Estado</th>
                <th>Vacantes</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (svc.loading()) {
                <tr><td colspan="9" class="py-12 text-center text-gray-400">Cargando lista de espera...</td></tr>
              } @else {
                @for (e of filtrados(); track e.id) {
                  <tr [class.opacity-60]="e.estado === 'asignado'">
                    <td class="text-xs font-mono text-gray-400">{{ e.id }}</td>
                    <td>
                      <div class="font-medium text-gray-900">{{ e.estudiante }}</div>
                      @if (e.telefono) {
                        <div class="text-xs text-gray-400">{{ e.telefono }}</div>
                      }
                    </td>
                    <td class="text-xs font-mono text-gray-500">{{ e.dni }}</td>
                    <td class="text-xs text-gray-500 whitespace-nowrap">{{ e.fechaSolicitud }}</td>
                    <td>
                      <span class="badge text-[11px]" [ngClass]="nivelBadge(e.nivel)">{{ e.nivel }}</span>
                      <div class="text-sm text-gray-700 mt-1">{{ e.grado }}</div>
                    </td>
                    <td class="text-center">
                      <span class="badge text-[11px]" [ngClass]="prioridadBadge(e.prioridad)">
                        {{ e.prioridad | titlecase }}
                      </span>
                    </td>
                    <td>
                      <span class="badge text-[11px]" [ngClass]="estadoBadge(e.estado)">
                        {{ estadoLabel(e.estado) }}
                      </span>
                      @if (e.vacanteDisponible && e.estado !== 'asignado') {
                        <span class="badge badge-green text-[10px] mt-1 block w-fit">Vacante disponible</span>
                      }
                    </td>
                    <td class="text-sm">
                      @if (e.vacanteDisponible) {
                        <span class="text-green-600 font-bold">{{ e.vacantesDisponibles }}</span>
                        <span class="text-gray-400 text-xs ml-1">disp.</span>
                        @if (e.seccionSugerida) {
                          <div class="text-[10px] text-green-700 mt-0.5">Secc. {{ e.seccionSugerida }}</div>
                        }
                      } @else {
                        <span class="text-red-500 text-xs font-medium">Sin vacantes</span>
                      }
                    </td>
                    <td>
                      <div class="flex items-center gap-1 justify-center">
                        @if (e.estado !== 'asignado') {
                          <button class="btn-icon text-green-600 hover:bg-green-50" title="Asignar vacante"
                            (click)="abrirModalAsignar(e)" [disabled]="!e.vacanteDisponible || svc.saving()">
                            <span class="icon icon-sm">how_to_reg</span>
                          </button>
                          @if (e.estado === 'en_espera' || e.estado === 'notificado') {
                            <a
                              class="btn-icon text-teal-600 hover:bg-teal-50"
                              title="Registrar evaluación"
                              [routerLink]="['/matricula/evaluaciones']"
                              [queryParams]="{ waitlistId: e.id }"
                            >
                              <span class="icon icon-sm">fact_check</span>
                            </a>
                          }
                          @if (e.estado === 'en_espera') {
                            <button class="btn-icon text-amber-500 hover:bg-amber-50" title="Notificar"
                              (click)="notificar(e.id)">
                              <span class="icon icon-sm">notifications</span>
                            </button>
                          }
                          <button class="btn-icon text-indigo-500 hover:bg-indigo-50" title="Editar"
                            (click)="editar(e)">
                            <span class="icon icon-sm">edit</span>
                          </button>
                        }
                        <button class="btn-icon text-rose-500 hover:bg-rose-50" title="Eliminar"
                          (click)="eliminar(e.id)">
                          <span class="icon icon-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="py-12 text-center">
                      <span class="icon icon-2xl text-gray-200 block mb-2">hourglass_empty</span>
                      <p class="text-gray-400 text-sm">La lista de espera esta vacia</p>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
          <p class="font-bold mb-1 flex items-center gap-1">
            <span class="icon icon-sm">info</span> RN-004 · Anular matricula
          </p>
          <p>Al anular una matricula, la vacante se libera y se notifica al primero en lista de espera.</p>
        </div>
        <div class="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
          <p class="font-bold mb-1 flex items-center gap-1">
            <span class="icon icon-sm">info</span> RN-005 · Prioridad
          </p>
          <p>La cola se ordena por prioridad (alta → media → baja) y fecha de solicitud.</p>
        </div>
      </div>
    </div>

    @if (drawerAbierto()) {
      <div appOverlayPortal class="fixed inset-0 z-40">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="cerrarDrawer()"></div>
      <div class="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl flex flex-col animate-slide-in-l">
        <div class="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h3 class="font-semibold text-gray-900">
              {{ editando() ? 'Editar solicitud' : 'Nueva solicitud' }}
            </h3>
            <p class="text-xs text-gray-500">Campos obligatorios marcados con *</p>
          </div>
          <button class="btn-icon text-gray-400" (click)="cerrarDrawer()"><span class="icon">close</span></button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">Nombres *</label>
              <input class="form-input" [ngClass]="claseCampo('nombres')"
                     [ngModel]="form.nombres"
                     (ngModelChange)="onCampoFormChange('nombres', $event)"
                     (blur)="onCampoBlur('nombres')">
              @if (campoError('nombres'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
            <div class="form-group">
              <label class="form-label">Apellidos *</label>
              <input class="form-input" [ngClass]="claseCampo('apellidos')"
                     [ngModel]="form.apellidos"
                     (ngModelChange)="onCampoFormChange('apellidos', $event)"
                     (blur)="onCampoBlur('apellidos')">
              @if (campoError('apellidos'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">DNI *</label>
              <input class="form-input" [ngClass]="claseCampo('dni')"
                     [ngModel]="form.dni"
                     (ngModelChange)="onCampoFormChange('dni', $event)"
                     (blur)="onCampoBlur('dni')"
                     maxlength="8" inputmode="numeric">
              @if (campoError('dni'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
            <div class="form-group">
              <label class="form-label">Telefono</label>
              <input class="form-input" [ngClass]="claseCampo('telefono')"
                     [ngModel]="form.telefono"
                     (ngModelChange)="onCampoFormChange('telefono', $event)"
                     (blur)="onCampoBlur('telefono')">
              @if (campoError('telefono'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" [ngClass]="claseCampo('email')"
                   [ngModel]="form.email"
                   (ngModelChange)="onCampoFormChange('email', $event)"
                   (blur)="onCampoBlur('email')">
            @if (campoError('email'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">Nivel *</label>
              <select class="form-select" [ngClass]="claseCampo('nivel')"
                      [ngModel]="form.nivel"
                      (ngModelChange)="onNivelChange($event)"
                      (blur)="onCampoBlur('nivel')">
                <option value="">Seleccionar</option>
                @for (n of niveles(); track n.id) {
                  <option [value]="n.nombre">{{ n.nombre }}</option>
                }
              </select>
              @if (campoError('nivel'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
            <div class="form-group">
              <label class="form-label">Grado *</label>
              <select class="form-select" [ngClass]="claseCampo('grado')"
                      [ngModel]="form.grado"
                      (ngModelChange)="onCampoFormChange('grado', $event)"
                      (blur)="onCampoBlur('grado')"
                      [disabled]="!form.nivel">
                <option value="">Seleccionar</option>
                @for (g of gradosFormulario(); track g) {
                  <option [value]="g">{{ g }}</option>
                }
              </select>
              @if (campoError('grado'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">Seccion deseada</label>
              <select class="form-select" [(ngModel)]="form.seccionDeseada" [disabled]="!form.grado">
                <option value="">Cualquiera con vacante</option>
                @for (s of seccionesFormulario(); track s) {
                  <option [value]="s">{{ s }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Prioridad</label>
              <select class="form-select" [(ngModel)]="form.prioridad">
                @for (p of prioridades; track p.value) {
                  <option [value]="p.value">{{ p.label }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observacion</label>
            <textarea class="form-input min-h-20" [ngClass]="claseCampo('observacion')"
                      [ngModel]="form.observacion"
                      (ngModelChange)="onCampoFormChange('observacion', $event)"
                      (blur)="onCampoBlur('observacion')"></textarea>
            @if (campoError('observacion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          @if (errorForm()) {
            <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ errorForm() }}</div>
          }
        </div>

        <div class="px-6 py-4 border-t bg-gray-50 flex gap-2 shrink-0">
          <button class="btn btn-primary flex-1"
                  (click)="guardar()"
                  [disabled]="!puedeGuardarForm() || svc.saving()"
                  [title]="puedeGuardarForm() ? '' : 'Completa nombres, apellidos, DNI, nivel y grado'">
            {{ svc.saving() ? 'Guardando...' : (editando() ? 'Guardar cambios' : 'Registrar solicitud') }}
          </button>
          <button class="btn btn-secondary" (click)="cerrarDrawer()">Cancelar</button>
        </div>
      </div>
      </div>
    }

    @if (modalAsignar(); as item) {
      <div appOverlayPortal class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" (click)="cerrarModalAsignar()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in" (click)="$event.stopPropagation()">
          <div class="px-6 py-5 border-b">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                <span class="icon text-green-600" style="font-size:24px">how_to_reg</span>
              </div>
              <div>
                <h3 class="font-bold text-gray-900 text-lg">Asignar vacante</h3>
                <p class="text-xs text-gray-400 mt-0.5">Confirmar matricula desde lista de espera</p>
              </div>
            </div>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100">
              <div class="px-4 py-3">
                <p class="text-xs text-gray-400 mb-0.5">Estudiante</p>
                <p class="text-sm font-semibold text-gray-900">{{ item.estudiante }}</p>
                <p class="text-xs font-mono text-gray-500 mt-1">DNI {{ item.dni }}</p>
              </div>
              <div class="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Destino</p>
                  <p class="text-sm font-medium text-gray-800">{{ item.grado }} · {{ item.nivel }}</p>
                </div>
                <span class="badge text-[11px]" [ngClass]="nivelBadge(item.nivel)">{{ item.nivel }}</span>
              </div>
              <div class="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Seccion</p>
                  @if (seccionModalAsignar()) {
                    <p class="text-sm font-bold text-green-700">Seccion {{ seccionModalAsignar() }}</p>
                  } @else {
                    <p class="text-sm text-gray-600">Primera seccion con vacante disponible</p>
                  }
                </div>
                <div class="text-right">
                  <p class="text-xs text-gray-400 mb-0.5">Vacantes</p>
                  <p class="text-lg font-bold text-green-600">{{ item.vacantesDisponibles }}</p>
                </div>
              </div>
            </div>
            <div class="flex gap-2 bg-green-50 rounded-xl p-3 text-xs text-green-800 border border-green-100">
              <span class="icon text-green-500 shrink-0" style="font-size:16px">info</span>
              El estudiante quedara matriculado y el registro pasara a estado <span class="font-semibold">Asignado</span>.
            </div>
          </div>
          <div class="flex gap-3 px-6 py-4 border-t">
            <button class="btn btn-secondary flex-1" (click)="cerrarModalAsignar()" [disabled]="svc.saving()">
              Cancelar
            </button>
            <button class="btn btn-primary flex-1" (click)="confirmarAsignar()" [disabled]="svc.saving()">
              <span class="icon icon-sm">how_to_reg</span>
              {{ svc.saving() ? 'Asignando...' : 'Confirmar asignacion' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (notificacion(); as n) {
      <div class="fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 text-white"
        [ngClass]="n.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'">
        <span class="icon">{{ n.tipo === 'success' ? 'check_circle' : 'error' }}</span>
        {{ n.mensaje }}
      </div>
    }
  `,
})
export class EsperaComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly svc = inject(EsperaService);
  private readonly institucional = inject(InstitucionalService);

  readonly prioridades = PRIORIDADES_ESPERA;
  readonly estados = ESTADOS_ESPERA;

  readonly drawerAbierto = signal(false);
  readonly editando = signal<EsperaItem | null>(null);
  readonly modalAsignar = signal<EsperaItem | null>(null);
  readonly errorForm = signal('');
  readonly notificacion = signal<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);
  fieldErrors = signal<ErroresCampoEspera>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);
  private readonly formRevision = signal(0);

  readonly puedeGuardarForm = computed(() => {
    this.formRevision();
    return esperaFormularioMinimoListo(this.form);
  });

  private readonly _items = signal<EsperaItem[]>([]);
  private readonly _niveles = signal<Nivel[]>([]);
  readonly niveles = this._niveles.asReadonly();

  readonly filtro = signal({
    nivel: '',
    grado: '',
    prioridad: '',
    estado: '',
    busqueda: '',
  });

  form = this.formVacio();

  readonly gradosDisponibles = computed(() => {
    const nivel = this._niveles().find((n) => n.nombre === this.filtro().nivel);
    return nivel?.grados.map((g) => g.nombre) ?? [];
  });

  readonly gradosFormulario = computed(() => {
    this.formRevision();
    const nivel = this._niveles().find((n) => n.nombre === this.form.nivel);
    return nivel?.grados.map((g) => g.nombre) ?? [];
  });

  readonly seccionesFormulario = computed(() => {
    this.formRevision();
    const nivel = this._niveles().find((n) => n.nombre === this.form.nivel);
    const grado = nivel?.grados.find((g) => gradoKey(g.nombre) === gradoKey(this.form.grado));
    return grado?.secciones.map((s) => s.nombre) ?? [];
  });

  readonly filtrados = computed(() => {
    const { nivel, grado, prioridad, estado, busqueda } = this.filtro();
    const q = busqueda.toLowerCase().trim();
    return this._items().filter((e) => {
      if (nivel && e.nivel !== nivel) return false;
      if (grado && gradoKey(e.grado) !== gradoKey(grado)) return false;
      if (prioridad && e.prioridad !== prioridad) return false;
      if (estado && e.estado !== estado) return false;
      if (
        q &&
        !`${e.estudiante} ${e.nombres} ${e.apellidos} ${e.dni} ${e.email} ${e.telefono}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  });

  readonly seccionModalAsignar = computed(() => {
    const item = this.modalAsignar();
    if (!item) return null;
    return item.seccionSugerida || item.seccionDeseada || null;
  });

  readonly kpis = computed(() => {
    const items = this._items();
    return [
      {
        label: 'En espera',
        value: items.filter((e) => e.estado === 'en_espera').length,
        icon: 'hourglass_top',
        bg: 'bg-amber-100',
        color: 'text-amber-600',
      },
      {
        label: 'Notificados',
        value: items.filter((e) => e.estado === 'notificado').length,
        icon: 'notifications',
        bg: 'bg-blue-100',
        color: 'text-blue-600',
      },
      {
        label: 'Asignados',
        value: items.filter((e) => e.estado === 'asignado').length,
        icon: 'how_to_reg',
        bg: 'bg-green-100',
        color: 'text-green-600',
      },
      {
        label: 'Con vacante',
        value: items.filter((e) => e.vacanteDisponible && e.estado !== 'asignado').length,
        icon: 'event_available',
        bg: 'bg-green-100',
        color: 'text-green-600',
      },
      {
        label: 'Total registros',
        value: items.length,
        icon: 'groups',
        bg: 'bg-indigo-100',
        color: 'text-indigo-600',
      },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle('Lista de Espera');
    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => this._niveles.set(niveles),
    });
    this.cargar();
  }

  cargar(): void {
    this.svc.load().subscribe({
      next: (items) => this._items.set(items),
      error: () => this.mostrarNotificacion('No se pudo cargar la lista de espera', 'error'),
    });
  }

  setFiltro(campo: 'nivel' | 'grado' | 'prioridad' | 'estado' | 'busqueda', valor: string): void {
    this.filtro.update((f) => {
      const next = { ...f, [campo]: valor };
      if (campo === 'nivel') next.grado = '';
      return next;
    });
  }

  abrirDrawer(): void {
    this.editando.set(null);
    this.form = this.formVacio();
    this.resetValidacionForm();
    this.formRevision.update((n) => n + 1);
    this.drawerAbierto.set(true);
  }

  editar(item: EsperaItem): void {
    this.editando.set(item);
    this.form = {
      nombres: item.nombres,
      apellidos: item.apellidos,
      dni: item.dni,
      email: item.email,
      telefono: item.telefono,
      nivel: item.nivel,
      grado: item.grado,
      seccionDeseada: item.seccionDeseada,
      prioridad: item.prioridad,
      observacion: item.observacion,
    };
    this.resetValidacionForm();
    this.formRevision.update((n) => n + 1);
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
    this.editando.set(null);
    this.resetValidacionForm();
  }

  private resetValidacionForm(): void {
    this.fieldErrors.set({});
    this.camposTocados.set({});
    this.intentoGuardar.set(false);
    this.errorForm.set('');
  }

  onNivelChange(nivel: string): void {
    this.form.nivel = nivel;
    this.form.grado = '';
    this.form.seccionDeseada = '';
    this.formRevision.update((n) => n + 1);
    this.onCampoFormChange('nivel', nivel);
    this.quitarErrorCampo('grado');
  }

  onCampoBlur(key: string): void {
    this.camposTocados.update((t) => ({ ...t, [key]: true }));
    this.validarCampoEnVivo(key);
  }

  onCampoFormChange(key: string, value: string): void {
    switch (key) {
      case 'nombres':
        this.form.nombres = value;
        break;
      case 'apellidos':
        this.form.apellidos = value;
        break;
      case 'dni':
        this.form.dni = value.replace(/\D/g, '').slice(0, 8);
        break;
      case 'telefono':
        this.form.telefono = value;
        break;
      case 'email':
        this.form.email = value;
        break;
      case 'nivel':
        this.form.nivel = value;
        break;
      case 'grado':
        this.form.grado = value;
        break;
      case 'observacion':
        this.form.observacion = value;
        break;
    }
    this.formRevision.update((n) => n + 1);

    if (this.camposTocados()[key] || this.intentoGuardar() || this.fieldErrors()[key]) {
      this.validarCampoEnVivo(key);
    } else {
      this.quitarErrorCampo(key);
    }
  }

  private validarCamposMinimosEnVivo(): void {
    for (const key of ['nombres', 'apellidos', 'dni', 'nivel', 'grado']) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoEspera(this.form, key);
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
      this.errorForm.set('Completa los campos obligatorios de la solicitud.');
      return;
    }

    const errors = validarEsperaForm(this.form);
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm.set(primerErrorEspera(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    this.errorForm.set('');

    const payload = {
      nombres: this.form.nombres.trim(),
      apellidos: this.form.apellidos.trim(),
      dni: this.form.dni.trim(),
      email: this.form.email.trim(),
      telefono: this.form.telefono.trim(),
      nivel: this.form.nivel,
      grado: this.form.grado,
      seccionDeseada: this.form.seccionDeseada || undefined,
      prioridad: this.form.prioridad,
      observacion: this.form.observacion.trim(),
    };

    const req = this.editando()
      ? this.svc.update(this.editando()!.id, payload)
      : this.svc.create(payload);

    req.subscribe({
      next: () => {
        const eraEdicion = !!this.editando();
        this.cerrarDrawer();
        this.cargar();
        this.mostrarNotificacion(
          eraEdicion ? 'Solicitud actualizada' : 'Solicitud registrada en lista de espera',
        );
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorForm.set(Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo guardar');
      },
    });
  }

  notificar(id: number): void {
    this.svc.notify(id).subscribe({
      next: () => {
        this.cargar();
        this.mostrarNotificacion('Notificacion registrada al apoderado');
      },
      error: () => this.mostrarNotificacion('No se pudo notificar', 'error'),
    });
  }

  abrirModalAsignar(item: EsperaItem): void {
    if (!item.vacanteDisponible) return;
    this.modalAsignar.set(item);
  }

  cerrarModalAsignar(): void {
    this.modalAsignar.set(null);
  }

  confirmarAsignar(): void {
    const item = this.modalAsignar();
    if (!item) return;
    const seccion = item.seccionSugerida || item.seccionDeseada || undefined;
    this.svc.assign(item.id, { seccion }).subscribe({
      next: (res) => {
        this.cerrarModalAsignar();
        this.cargar();
        this.mostrarNotificacion(
          `${item.estudiante} asignado a seccion ${res.seccionAsignada}`,
        );
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.mostrarNotificacion(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo asignar',
          'error',
        );
      },
    });
  }

  eliminar(id: number): void {
    if (!confirm('Eliminar este registro de la lista de espera?')) return;
    this.svc.delete(id).subscribe({
      next: () => {
        this.cargar();
        this.mostrarNotificacion('Registro eliminado');
      },
      error: () => this.mostrarNotificacion('No se pudo eliminar', 'error'),
    });
  }

  nivelBadge(nivel: string): string {
    return {
      Inicial: 'badge-purple',
      Primaria: 'badge-blue',
      Secundaria: 'badge-indigo',
    }[nivel] ?? 'badge-gray';
  }

  prioridadBadge(p: PrioridadEspera): string {
    return { alta: 'badge-red', media: 'badge-yellow', baja: 'badge-gray' }[p];
  }

  estadoBadge(e: EstadoEspera): string {
    return {
      en_espera: 'badge-blue',
      notificado: 'badge-yellow',
      asignado: 'badge-green',
      cancelado: 'badge-gray',
    }[e];
  }

  estadoLabel(e: EstadoEspera): string {
    return {
      en_espera: 'En espera',
      notificado: 'Notificado',
      asignado: 'Asignado',
      cancelado: 'Cancelado',
    }[e];
  }

  private formVacio() {
    return {
      nombres: '',
      apellidos: '',
      dni: '',
      email: '',
      telefono: '',
      nivel: '',
      grado: '',
      seccionDeseada: '',
      prioridad: 'media' as PrioridadEspera,
      observacion: '',
    };
  }

  private mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' = 'success'): void {
    this.notificacion.set({ mensaje, tipo });
    setTimeout(() => this.notificacion.set(null), 3000);
  }
}
