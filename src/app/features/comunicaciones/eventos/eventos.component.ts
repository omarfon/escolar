import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { isoToDisplay } from '../../../core/api/date.util';
import { InstitucionalService } from '../../administracion/institucional/institucional.service';
import { Nivel } from '../../administracion/institucional/institucional.model';
import { EventosService } from './eventos.service';
import { EventoDetallePreviewComponent } from './evento-detalle-preview.component';
import {
  DESTINATARIOS_EVENTO,
  ESTADOS_EVENTO,
  EventoDestinatario,
  EventoEstado,
  EventoItem,
  EventoTipo,
  MESES_EVENTOS,
  TIPOS_EVENTO,
} from './eventos.model';
import {
  ErroresCampoEvento,
  eventoFormularioMinimoListo,
  primerErrorEvento,
  validarCampoEvento,
  validarEventoForm,
} from './evento-form.validation';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [FormsModule, NgClass, EventoDetallePreviewComponent],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Eventos</h2>
          <p class="text-sm text-gray-400 mt-0.5">Calendario y gestión de actividades institucionales</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" (click)="cargar()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
          <button class="btn btn-primary btn-sm" (click)="abrirModal()">
            <span class="icon icon-sm">add</span> Nuevo evento
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        @for (kpi of kpis(); track kpi.label) {
          <div class="card p-4 flex items-center gap-3" [ngClass]="kpi.border ?? ''">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" [ngClass]="kpi.bg">
              <span class="icon" [ngClass]="kpi.color">{{ kpi.icon }}</span>
            </div>
            <div>
              <p class="text-xs text-gray-400">{{ kpi.label }}</p>
              <p class="text-xl font-bold" [ngClass]="kpi.text ?? 'text-gray-900'">{{ kpi.value }}</p>
            </div>
          </div>
        }
      </div>

      <div class="tabs">
        <button class="tab" [class.tab-active]="vista() === 'lista'" (click)="vista.set('lista')">
          <span class="icon icon-sm">list</span> Lista
        </button>
        <button class="tab" [class.tab-active]="vista() === 'calendario'" (click)="vista.set('calendario')">
          <span class="icon icon-sm">calendar_month</span> Calendario
        </button>
      </div>

      <div class="card p-4 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="form-label">Mes</label>
            <div class="relative mt-1">
              <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">calendar_month</span>
              <select class="form-select pl-10 bg-gray-50 w-full" [ngModel]="filtro().mes" (ngModelChange)="setFiltro('mes', $event)">
                @for (m of meses; track m.value) {
                  <option [ngValue]="m.value">{{ m.label }}</option>
                }
              </select>
            </div>
          </div>
          <div>
            <label class="form-label">Tipo</label>
            <div class="relative mt-1">
              <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">category</span>
              <select class="form-select pl-10 bg-gray-50 w-full" [ngModel]="filtro().tipo" (ngModelChange)="setFiltro('tipo', $event)">
                @for (t of tipos; track t.value) {
                  <option [ngValue]="t.value">{{ t.label }}</option>
                }
              </select>
            </div>
          </div>
          <div>
            <label class="form-label">Destinatarios</label>
            <div class="relative mt-1">
              <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">groups</span>
              <select class="form-select pl-10 bg-gray-50 w-full" [ngModel]="filtro().destinatarios" (ngModelChange)="setFiltro('destinatarios', $event)">
                @for (d of destinatarios; track d.value) {
                  <option [ngValue]="d.value">{{ d.label }}</option>
                }
              </select>
            </div>
          </div>
          <div>
            <label class="form-label">Estado</label>
            <div class="relative mt-1">
              <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">flag</span>
              <select class="form-select pl-10 bg-gray-50 w-full" [ngModel]="filtro().estado" (ngModelChange)="setFiltro('estado', $event)">
                @for (e of estados; track e.value) {
                  <option [ngValue]="e.value">{{ e.label }}</option>
                }
              </select>
            </div>
          </div>
        </div>
        <div>
          <label class="form-label">Buscar evento</label>
          <div class="relative mt-1">
            <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">search</span>
            <input
              class="form-input pl-10 w-full bg-gray-50"
              placeholder="Título, lugar, responsable o descripción..."
              [ngModel]="filtro().busqueda"
              (ngModelChange)="setFiltro('busqueda', $event)"
            />
          </div>
        </div>
      </div>

      @if (vista() === 'calendario') {
        <div class="card p-4">
          <div class="grid grid-cols-7 gap-1 mb-2">
            @for (d of diasSemana; track d) {
              <div class="text-center text-xs font-medium text-gray-400 py-1">{{ d }}</div>
            }
          </div>
          <div class="grid grid-cols-7 gap-1">
            @for (celda of celdasCalendario(); track celda.key) {
              <button type="button"
                class="min-h-16 p-1 rounded-lg border text-left transition-colors"
                [ngClass]="celda.dia ? (diaSeleccionado() === celda.iso ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50') : 'border-transparent'"
                [disabled]="!celda.dia"
                (click)="celda.dia && seleccionarDia(celda.iso)">
                @if (celda.dia) {
                  <span class="text-xs font-medium" [ngClass]="celda.hoy ? 'text-indigo-600' : 'text-gray-700'">{{ celda.dia }}</span>
                  @if (celda.count) {
                    <span class="block mt-1 text-[10px] font-bold text-purple-600">{{ celda.count }} evt.</span>
                  }
                }
              </button>
            }
          </div>
          @if (diaSeleccionado()) {
            <p class="text-xs text-gray-500 mt-3">Día seleccionado: {{ isoToDisplay(diaSeleccionado()) }}</p>
          }
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        @if (svc.loading()) {
          <div class="lg:col-span-3 card p-12 text-center text-gray-400">Cargando eventos...</div>
        } @else {
          @for (e of eventosFiltrados(); track e.id) {
            <div class="card p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-l-4 group"
              [ngClass]="estadoBorder(e.estado)"
              (click)="seleccionar(e)">
              <div class="flex items-start justify-between gap-2 mb-2">
                <span class="badge text-[10px]" [ngClass]="tipoCfg(e.tipo).badge">{{ tipoCfg(e.tipo).label }}</span>
                <select
                  class="form-select text-[10px] py-1 px-2 w-auto min-w-[7.5rem] bg-gray-50"
                  [ngModel]="e.estado"
                  (ngModelChange)="cambiarEstado(e, $event)"
                  (click)="$event.stopPropagation()">
                  @for (st of estadosForm; track st.value) {
                    <option [ngValue]="st.value">{{ st.label }}</option>
                  }
                </select>
              </div>
              <h3 class="font-semibold text-gray-900 leading-snug">{{ e.titulo }}</h3>
              <div class="mt-3 space-y-1.5 text-xs text-gray-500">
                <p class="flex items-center gap-1.5">
                  <span class="icon icon-sm text-indigo-400">calendar_today</span>
                  {{ rangoFecha(e) }}
                </p>
                <p class="flex items-center gap-1.5">
                  <span class="icon icon-sm text-indigo-400">schedule</span> {{ e.horario }}
                </p>
                @if (e.lugar) {
                  <p class="flex items-center gap-1.5">
                    <span class="icon icon-sm text-indigo-400">place</span> {{ e.lugar }}
                  </p>
                }
                <p class="flex items-center gap-1.5">
                  <span class="icon icon-sm text-indigo-400">groups</span> {{ destLabel(e.destinatarios) }}
                </p>
              </div>
              <div class="mt-3 pt-3 border-t flex items-center justify-between gap-2">
                <span class="text-[11px] text-gray-400 truncate">{{ e.responsable || 'Sin responsable' }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-[11px] text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    <span class="icon icon-sm">visibility</span> Ver
                  </span>
                  <div class="flex gap-1" (click)="$event.stopPropagation()">
                  <button class="btn-icon text-indigo-500" title="Editar" (click)="editar(e)">
                    <span class="icon icon-sm">edit</span>
                  </button>
                  @if (!e.cancelado) {
                    <button class="btn-icon text-amber-500" title="Cancelar" (click)="cancelar(e.id)">
                      <span class="icon icon-sm">block</span>
                    </button>
                  }
                  <button class="btn-icon text-rose-500" title="Eliminar" (click)="eliminar(e.id)">
                    <span class="icon icon-sm">delete</span>
                  </button>
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="lg:col-span-3 card p-12 text-center">
              <span class="icon icon-2xl text-gray-200 block mb-2">event_busy</span>
              <p class="text-gray-400 text-sm">No hay eventos para los filtros seleccionados</p>
            </div>
          }
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

    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" (click)="cerrarModal()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b sticky top-0 bg-white flex justify-between items-center">
            <h3 class="font-bold text-gray-900">{{ editando() ? 'Editar evento' : 'Nuevo evento' }}</h3>
            <button class="btn-icon text-gray-400" (click)="cerrarModal()"><span class="icon">close</span></button>
          </div>
          <div class="px-6 py-5 space-y-4">
            @if (errorForm()) {
              <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <span class="icon icon-sm text-red-500">error_outline</span> {{ errorForm() }}
              </div>
            }
            <div>
              <label class="form-label">Título <span class="text-red-400">*</span></label>
              <input class="form-input mt-1" [ngClass]="claseCampo('titulo')"
                     [(ngModel)]="form.titulo"
                     (ngModelChange)="onCampoFormChange('titulo')"
                     (blur)="onCampoBlur('titulo')">
              @if (campoError('titulo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
            <div>
              <label class="form-label">Descripción <span class="text-gray-400 font-normal">(opcional)</span></label>
              <textarea class="form-input mt-1 min-h-20 resize-none" [ngClass]="claseCampo('descripcion')"
                        [(ngModel)]="form.descripcion"
                        (ngModelChange)="onCampoFormChange('descripcion')"
                        (blur)="onCampoBlur('descripcion')"></textarea>
              @if (campoError('descripcion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Tipo <span class="text-red-400">*</span></label>
                <select class="form-select mt-1" [ngClass]="claseCampo('tipo')"
                        [(ngModel)]="form.tipo"
                        (ngModelChange)="onCampoFormChange('tipo')"
                        (blur)="onCampoBlur('tipo')">
                  @for (t of tipos.slice(1); track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
                @if (campoError('tipo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div>
                <label class="form-label">Estado</label>
                <select class="form-select mt-1" [(ngModel)]="form.estado">
                  @for (st of estadosForm; track st.value) {
                    <option [ngValue]="st.value">{{ st.label }}</option>
                  }
                </select>
              </div>
            </div>
            <div>
              <label class="form-label">Destinatarios <span class="text-red-400">*</span></label>
              <select class="form-select mt-1" [ngClass]="claseCampo('destinatarios')"
                      [(ngModel)]="form.destinatarios"
                      (ngModelChange)="onCampoFormChange('destinatarios')"
                      (blur)="onCampoBlur('destinatarios')">
                @for (d of destinatarios.slice(1); track d.value) {
                  <option [value]="d.value">{{ d.label }}</option>
                }
              </select>
              @if (campoError('destinatarios'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Fecha inicio <span class="text-red-400">*</span></label>
                <input type="date" class="form-input mt-1" [ngClass]="claseCampo('fechaInicio')"
                       [(ngModel)]="form.fechaInicio"
                       (ngModelChange)="onCampoFormChange('fechaInicio')"
                       (blur)="onCampoBlur('fechaInicio')">
                @if (campoError('fechaInicio'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div>
                <label class="form-label">Fecha fin <span class="text-gray-400 font-normal">(opcional)</span></label>
                <input type="date" class="form-input mt-1" [ngClass]="claseCampo('fechaFin')"
                       [(ngModel)]="form.fechaFin"
                       (ngModelChange)="onCampoFormChange('fechaFin')"
                       (blur)="onCampoBlur('fechaFin')">
                @if (campoError('fechaFin'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Hora inicio</label>
                <input type="time" class="form-input mt-1" [ngClass]="claseCampo('horaInicio')"
                       [(ngModel)]="form.horaInicio"
                       (ngModelChange)="onCampoFormChange('horaInicio')"
                       (blur)="onCampoBlur('horaInicio')">
                @if (campoError('horaInicio'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div>
                <label class="form-label">Hora fin <span class="text-gray-400 font-normal">(opcional)</span></label>
                <input type="time" class="form-input mt-1" [ngClass]="claseCampo('horaFin')"
                       [(ngModel)]="form.horaFin"
                       (ngModelChange)="onCampoFormChange('horaFin')"
                       (blur)="onCampoBlur('horaFin')">
                @if (campoError('horaFin'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>
            <div>
              <label class="form-label">Lugar <span class="text-gray-400 font-normal">(opcional)</span></label>
              <input class="form-input mt-1" placeholder="Auditorio, patio..."
                     [ngClass]="claseCampo('lugar')"
                     [(ngModel)]="form.lugar"
                     (ngModelChange)="onCampoFormChange('lugar')"
                     (blur)="onCampoBlur('lugar')">
              @if (campoError('lugar'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Nivel <span class="text-gray-400 font-normal">(opcional)</span></label>
                <select class="form-select mt-1" [(ngModel)]="form.nivel">
                  <option value="">Todos los niveles</option>
                  @for (n of niveles(); track n.id) {
                    <option [value]="n.nombre">{{ n.nombre }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="form-label">Responsable <span class="text-gray-400 font-normal">(opcional)</span></label>
                <input class="form-input mt-1" [ngClass]="claseCampo('responsable')"
                       [(ngModel)]="form.responsable"
                       (ngModelChange)="onCampoFormChange('responsable')"
                       (blur)="onCampoBlur('responsable')">
                @if (campoError('responsable'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>
            <label class="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" [(ngModel)]="form.publicado"> Publicado en portales
            </label>
          </div>
          <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2 sticky bottom-0">
            <button class="btn btn-secondary" (click)="cerrarModal()">Cancelar</button>
            <button class="btn btn-primary" (click)="guardar()"
                    [disabled]="!puedeGuardarForm() || svc.saving()"
                    [title]="puedeGuardarForm() ? '' : 'Completa título, tipo, destinatarios y fecha de inicio'">
              {{ svc.saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (notificacion(); as n) {
      <div class="fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-[60] text-white"
        [ngClass]="n.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'">
        <span class="icon">{{ n.tipo === 'success' ? 'check_circle' : 'error' }}</span>
        {{ n.mensaje }}
      </div>
    }
  `,
})
export class EventosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly svc = inject(EventosService);
  private readonly institucional = inject(InstitucionalService);

  readonly isoToDisplay = isoToDisplay;
  readonly tipos = TIPOS_EVENTO;
  readonly destinatarios = DESTINATARIOS_EVENTO;
  readonly estados = ESTADOS_EVENTO;
  readonly estadosForm = ESTADOS_EVENTO.filter((e) => e.value);
  readonly meses = MESES_EVENTOS;
  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly vista = signal<'lista' | 'calendario'>('lista');
  readonly modalAbierto = signal(false);
  readonly editando = signal<EventoItem | null>(null);
  readonly detalle = signal<EventoItem | null>(null);
  readonly diaSeleccionado = signal('');
  readonly errorForm = signal('');
  readonly notificacion = signal<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);
  fieldErrors = signal<ErroresCampoEvento>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);
  private readonly formRevision = signal(0);

  readonly puedeGuardarForm = computed(() => {
    this.formRevision();
    return eventoFormularioMinimoListo(this.valoresFormulario());
  });

  private readonly _eventos = signal<EventoItem[]>([]);
  private readonly _niveles = signal<Nivel[]>([]);
  private readonly _nombreInstitucion = signal('');
  readonly niveles = this._niveles.asReadonly();
  readonly nombreInstitucion = this._nombreInstitucion.asReadonly();

  readonly filtro = signal({
    mes: '',
    tipo: '',
    destinatarios: '',
    estado: '',
    busqueda: '',
  });

  form = this.formVacio();

  private busquedaTimer: ReturnType<typeof setTimeout> | null = null;

  readonly eventosFiltrados = computed(() => {
    let list = this._eventos();
    const dia = this.diaSeleccionado();
    if (dia && this.vista() === 'calendario') {
      list = list.filter((e) => eventoEnDia(e, dia));
    }
    const q = this.filtro().busqueda.toLowerCase().trim();
    if (q) {
      list = list.filter((e) =>
        `${e.titulo} ${e.lugar} ${e.responsable} ${e.descripcion}`.toLowerCase().includes(q),
      );
    }
    return list;
  });

  readonly kpis = computed(() => {
    const list = this._eventos();
    return [
      { label: 'Total', value: list.length, icon: 'event', bg: 'bg-indigo-100', color: 'text-indigo-600' },
      { label: 'Programados', value: list.filter((e) => e.estado === 'programado').length, icon: 'upcoming', bg: 'bg-blue-100', color: 'text-blue-600', text: 'text-blue-700' },
      { label: 'En curso', value: list.filter((e) => e.estado === 'en_curso').length, icon: 'play_circle', bg: 'bg-green-100', color: 'text-green-600', text: 'text-green-700', border: 'border-l-4 border-green-400' },
      { label: 'Cancelados', value: list.filter((e) => e.estado === 'cancelado').length, icon: 'block', bg: 'bg-red-100', color: 'text-red-600', text: 'text-red-700' },
    ];
  });

  readonly celdasCalendario = computed(() => {
    const mes = this.filtro().mes || '2026-06';
    const [y, m] = mes.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0).getDate();
    const startPad = (first.getDay() + 6) % 7;
    const eventos = this._eventos();
    const hoy = new Date().toISOString().slice(0, 10);

    const celdas: { key: string; dia: number | null; iso: string; count: number; hoy: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      celdas.push({ key: `pad-${i}`, dia: null, iso: '', count: 0, hoy: false });
    }
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const count = eventos.filter((e) => eventoEnDia(e, iso)).length;
      celdas.push({ key: iso, dia: d, iso, count, hoy: iso === hoy });
    }
    return celdas;
  });

  ngOnInit(): void {
    this.layout.setTitle('Eventos');
    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => this._niveles.set(niveles),
    });
    this.institucional.load().subscribe({
      next: (cfg) => this._nombreInstitucion.set(cfg?.institution?.nombre ?? ''),
    });
    this.cargar();
  }

  cargar(): void {
    const { mes, tipo, destinatarios, estado, busqueda } = this.filtro();
    this.svc
      .load({
        mes: mes || undefined,
        tipo: tipo || undefined,
        destinatarios: destinatarios || undefined,
        estado: estado || undefined,
        busqueda: busqueda || undefined,
      })
      .subscribe({
        next: (items) => this._eventos.set(items),
        error: () => this.mostrarNotificacion('No se pudieron cargar los eventos', 'error'),
      });
  }

  setFiltro(
    campo: 'mes' | 'tipo' | 'destinatarios' | 'estado' | 'busqueda',
    valor: string,
  ): void {
    this.filtro.update((f) => ({ ...f, [campo]: valor }));
    if (campo === 'busqueda') {
      if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
      this.busquedaTimer = setTimeout(() => this.cargar(), 350);
      return;
    }
    this.diaSeleccionado.set('');
    this.cargar();
  }

  seleccionarDia(iso: string): void {
    this.diaSeleccionado.set(this.diaSeleccionado() === iso ? '' : iso);
  }

  seleccionar(e: EventoItem): void {
    this.detalle.set(e);
  }

  editarDesdePreview(e: EventoItem): void {
    this.detalle.set(null);
    this.editar(e);
  }

  abrirModal(): void {
    this.editando.set(null);
    this.form = this.formVacio();
    this.resetValidacionForm();
    this.modalAbierto.set(true);
  }

  editar(e: EventoItem): void {
    this.editando.set(e);
    this.form = {
      titulo: e.titulo,
      descripcion: e.descripcion,
      tipo: e.tipo,
      fechaInicio: e.fechaInicio,
      fechaFin: e.fechaFin ?? e.fechaInicio,
      horaInicio: e.horaInicio,
      horaFin: e.horaFin ?? '',
      lugar: e.lugar,
      destinatarios: e.destinatarios,
      nivel: e.nivel,
      responsable: e.responsable,
      publicado: e.publicado,
      estado: e.estado,
    };
    this.resetValidacionForm();
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.editando.set(null);
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
      destinatarios: this.form.destinatarios,
      nivel: this.form.nivel,
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
  }

  private validarCamposMinimosEnVivo(): void {
    for (const key of ['titulo', 'tipo', 'destinatarios', 'fechaInicio']) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoEvento(this.valoresFormulario(), key);
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

    const errors = validarEventoForm(this.valoresFormulario());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm.set(primerErrorEvento(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    this.errorForm.set('');

    const payload = {
      titulo: this.form.titulo.trim(),
      descripcion: this.form.descripcion.trim(),
      tipo: this.form.tipo,
      fechaInicio: this.form.fechaInicio,
      fechaFin: this.form.fechaFin || this.form.fechaInicio,
      horaInicio: this.form.horaInicio || '08:00',
      horaFin: this.form.horaFin || undefined,
      lugar: this.form.lugar.trim(),
      destinatarios: this.form.destinatarios,
      nivel: this.form.nivel || undefined,
      responsable: this.form.responsable.trim() || undefined,
      publicado: this.form.publicado,
      estado: this.form.estado,
    };

    const req = this.editando()
      ? this.svc.update(this.editando()!.id, payload)
      : this.svc.create(payload);

    req.subscribe({
      next: () => {
        this.cerrarModal();
        this.cargar();
        this.mostrarNotificacion(this.editando() ? 'Evento actualizado' : 'Evento creado');
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorForm.set(Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo guardar');
      },
    });
  }

  cancelar(id: number): void {
    if (!confirm('¿Cancelar este evento?')) return;
    this.svc.update(id, { estado: 'cancelado' }).subscribe({
      next: () => { this.cargar(); this.mostrarNotificacion('Evento cancelado'); },
      error: () => this.mostrarNotificacion('No se pudo cancelar', 'error'),
    });
  }

  cambiarEstado(evento: EventoItem, estado: EventoEstado): void {
    if (evento.estado === estado) return;
    this.svc.update(evento.id, { estado }).subscribe({
      next: () => {
        this.cargar();
        this.mostrarNotificacion('Estado actualizado');
      },
      error: () => this.mostrarNotificacion('No se pudo actualizar el estado', 'error'),
    });
  }

  eliminar(id: number): void {
    if (!confirm('¿Eliminar este evento permanentemente?')) return;
    this.svc.delete(id).subscribe({
      next: () => {
        this.detalle.set(null);
        this.cargar();
        this.mostrarNotificacion('Evento eliminado');
      },
      error: () => this.mostrarNotificacion('No se pudo eliminar', 'error'),
    });
  }

  tipoCfg(t: EventoTipo) {
    return TIPOS_EVENTO.find((x) => x.value === t) ?? TIPOS_EVENTO[TIPOS_EVENTO.length - 1];
  }

  estadoCfg(e: EventoEstado) {
    return ESTADOS_EVENTO.find((x) => x.value === e) ?? ESTADOS_EVENTO[0];
  }

  estadoBorder(e: EventoEstado): string {
    return {
      programado: 'border-blue-400',
      en_curso: 'border-green-400',
      finalizado: 'border-gray-300',
      cancelado: 'border-red-300 opacity-70',
    }[e];
  }

  destLabel(d: EventoDestinatario): string {
    return DESTINATARIOS_EVENTO.find((x) => x.value === d)?.label ?? d;
  }

  rangoFecha(e: EventoItem): string {
    if (!e.fechaFinDisplay || e.fechaFinDisplay === e.fechaInicioDisplay) {
      return e.fechaInicioDisplay;
    }
    return `${e.fechaInicioDisplay} – ${e.fechaFinDisplay}`;
  }

  private formVacio() {
    return {
      titulo: '',
      descripcion: '',
      tipo: 'academico' as EventoTipo,
      fechaInicio: '',
      fechaFin: '',
      horaInicio: '08:00',
      horaFin: '',
      lugar: '',
      destinatarios: 'todos' as EventoDestinatario,
      nivel: '',
      responsable: '',
      publicado: true,
      estado: 'programado' as EventoEstado,
    };
  }

  private mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' = 'success'): void {
    this.notificacion.set({ mensaje, tipo });
    setTimeout(() => this.notificacion.set(null), 3000);
  }
}

function eventoEnDia(e: EventoItem, iso: string): boolean {
  const fin = e.fechaFin ?? e.fechaInicio;
  return iso >= e.fechaInicio && iso <= fin;
}
