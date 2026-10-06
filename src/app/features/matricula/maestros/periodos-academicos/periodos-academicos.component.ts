import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { markTenantReloadReady, setupTenantReload } from '../../../../core/tenant/tenant-reload.util';
import { MaestrosPeriodosAcademicosService } from './periodos-academicos.service';
import {
  ErroresCampoPeriodoAcademico,
  periodoAcademicoFormularioMinimoListo,
  primerErrorPeriodoAcademico,
  validarCampoPeriodoAcademico,
  validarPeriodoAcademicoForm,
} from './periodo-academico-form.validation';
import {
  ESTADO_PERIODO_CFG,
  AnioEscolarCatalogoItem,
  PeriodoAcademicoItem,
  PeriodoAcademicoPayload,
  PeriodoAcademicoTipo,
  TIPOS_PERIODO,
} from './periodos-academicos.model';

@Component({
  selector: 'app-maestros-periodos-academicos',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
<div class="space-y-4">

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h3 class="text-lg font-bold text-gray-900">Períodos Académicos</h3>
      <p class="text-sm text-gray-400 mt-0.5">
        Bimestres, trimestres o semestres del calendario escolar por año lectivo
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      @if (puedeGestionar()) {
        <button type="button" class="btn btn-secondary btn-sm" (click)="abrirDividir()">
          <span class="icon icon-sm">calendar_view_month</span> Dividir año
        </button>
        <button type="button" class="btn btn-primary btn-sm" (click)="abrirModal()">
          <span class="icon icon-sm">add</span> Nuevo período
        </button>
      }
    </div>
  </div>

  <div class="card p-4 space-y-2">
    <div class="flex flex-wrap items-end gap-4">
      <div class="form-group w-48">
        <label class="form-label">Año escolar</label>
        <select
          class="form-select"
          [ngModel]="filtroAnio()"
          (ngModelChange)="onFiltroAnioChange($event)"
          [disabled]="aniosCargando()"
        >
          <option [ngValue]="0">Todos</option>
          @for (a of aniosDisponibles(); track a.anio) {
            <option [ngValue]="a.anio">{{ etiquetaAnioCatalogo(a) }}</option>
          }
        </select>
      </div>
      <div class="form-group w-40">
        <label class="form-label">Tipo</label>
        <select class="form-select" [ngModel]="filtroTipo()" (ngModelChange)="filtroTipo.set($event)">
          <option value="">Todos</option>
          @for (t of tiposPeriodo; track t.value) {
            <option [value]="t.value">{{ t.label }}</option>
          }
        </select>
      </div>
      <p class="text-xs text-gray-400 ml-auto pb-2">{{ periodosFiltrados().length }} período(s)</p>
    </div>
    @if (aniosCargando()) {
      <p class="form-hint">Cargando años…</p>
    } @else if (!aniosDisponibles().length) {
      <p class="form-hint text-amber-600">Sin años registrados. Créelos en Años escolares.</p>
    }
  </div>

  @if (periodoActual()) {
    <div class="card p-4 bg-green-50 border border-green-100 flex flex-wrap items-center gap-3">
      <span class="icon text-green-600">event_available</span>
      <p class="text-sm text-green-900">
        Período vigente:
        <span class="font-semibold">{{ periodoActual()!.nombre }}</span>
        ({{ periodoActual()!.inicioDisplay }} – {{ periodoActual()!.finDisplay }})
      </p>
    </div>
  }

  @if (error()) {
    <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{{ error() }}</div>
  }

  <div class="card overflow-hidden">
    @if (svc.loading()) {
      <div class="p-10 text-center text-gray-400 animate-pulse">Cargando períodos...</div>
    } @else if (!periodosFiltrados().length) {
      <div class="p-10 text-center text-gray-500">No hay períodos registrados para los filtros seleccionados.</div>
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">Año</th>
              <th class="px-4 py-3 text-left">#</th>
              <th class="px-4 py-3 text-left">Nombre</th>
              <th class="px-4 py-3 text-left">Tipo</th>
              <th class="px-4 py-3 text-left">Inicio</th>
              <th class="px-4 py-3 text-left">Fin</th>
              <th class="px-4 py-3 text-left">Duración</th>
              <th class="px-4 py-3 text-left">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (p of periodosFiltrados(); track p.id) {
              <tr class="hover:bg-gray-50/80" [class.bg-green-50/40]="p.actual">
                <td class="px-4 py-3 font-medium text-gray-800">{{ p.anioEscolar }}</td>
                <td class="px-4 py-3 text-gray-600">{{ p.numero }}</td>
                <td class="px-4 py-3 text-gray-800">
                  {{ p.nombre }}
                  @if (p.actual) {
                    <span class="badge badge-green text-[10px] ml-1">Vigente</span>
                  }
                </td>
                <td class="px-4 py-3 capitalize text-gray-600">{{ p.tipo }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-gray-700">{{ p.inicioDisplay }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-gray-700">{{ p.finDisplay }}</td>
                <td class="px-4 py-3 text-xs text-gray-500">
                  {{ p.duracionDias }} días · {{ p.duracionSemanas }} sem.
                </td>
                <td class="px-4 py-3">
                  <span class="badge text-[10px]" [ngClass]="estadoCfg(p.estado).badge">
                    {{ estadoCfg(p.estado).label }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  @if (puedeGestionar()) {
                    <div class="flex items-center justify-end gap-0.5">
                      @if (!p.actual) {
                        <button type="button" class="btn btn-ghost btn-icon text-green-600"
                          (click)="marcarVigente(p)" title="Marcar como vigente">
                          <span class="icon icon-sm">verified</span>
                        </button>
                      }
                      <button type="button" class="btn btn-ghost btn-icon text-gray-600 hover:text-indigo-600"
                        title="Editar" (click)="abrirModal(p)">
                        <span class="icon icon-sm">edit</span>
                      </button>
                      <button type="button" class="btn btn-ghost btn-icon text-red-500"
                        title="Eliminar" (click)="eliminar(p)">
                        <span class="icon icon-sm">delete</span>
                      </button>
                    </div>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  @if (drawerDividirAbierto()) {
    <div class="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" (click)="cerrarDividir()" aria-hidden="true"></div>
    <aside
      class="fixed inset-y-0 right-0 z-[90] w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tituloDividirPeriodos"
      (click)="$event.stopPropagation()"
    >
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h4 id="tituloDividirPeriodos" class="text-lg font-bold text-gray-900">Dividir año en periodos</h4>
          <p class="text-xs text-gray-500 mt-0.5">Genera bimestres, trimestres o semestres con fechas MINEDU</p>
        </div>
        <button type="button" class="btn btn-ghost btn-icon" title="Cerrar" (click)="cerrarDividir()">
          <span class="icon icon-sm">close</span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div>
          <label class="form-label" for="dividirAnio">Año escolar</label>
          <select id="dividirAnio" class="form-select" [(ngModel)]="dividirForm.anioEscolar">
            @for (a of aniosDisponibles(); track a.anio) {
              <option [ngValue]="a.anio">{{ a.anio }} · {{ a.tipoPeriodo }}</option>
            }
          </select>
        </div>
        <div>
          <label class="form-label" for="dividirTipo">Tipo de periodos</label>
          <select id="dividirTipo" class="form-select" [(ngModel)]="dividirForm.tipo">
            @for (t of tiposPeriodo; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
        </div>
        <div>
          <label class="form-label" for="dividirMotivo">Motivo <span class="text-gray-400 font-normal">(opcional)</span></label>
          <textarea id="dividirMotivo" class="form-input" rows="2" [(ngModel)]="dividirForm.motivo"></textarea>
        </div>
        <label class="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" class="mt-0.5" [(ngModel)]="dividirForm.sobreescribir" />
          <span>Sobreescribir periodos existentes del año seleccionado</span>
        </label>
        @if (dividirError()) {
          <p class="form-error" role="alert">{{ dividirError() }}</p>
        }
      </div>
      <div class="shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="cerrarDividir()">Cancelar</button>
        <button type="button" class="btn btn-primary" [disabled]="svc.saving()" (click)="confirmarDividir()">
          @if (svc.saving()) { Generando… } @else { Dividir año }
        </button>
      </div>
    </aside>
  }

  @if (modalOpen()) {
    <div class="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" (click)="cerrarModal()" aria-hidden="true"></div>
    <aside
      class="fixed inset-y-0 right-0 z-[90] w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tituloPeriodoForm"
      (click)="$event.stopPropagation()"
    >
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <h2 id="tituloPeriodoForm" class="text-lg font-bold text-gray-900">{{ editId() ? 'Editar período' : 'Nuevo período académico' }}</h2>
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

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Año escolar <span class="text-red-400">*</span></label>
            <input type="number" class="form-input w-full" min="2000" step="1"
                   [ngClass]="claseCampo('anioEscolar')"
                   [(ngModel)]="formAnio"
                   (ngModelChange)="onCampoFormChange('anioEscolar')"
                   (blur)="onCampoBlur('anioEscolar')" />
            @if (campoError('anioEscolar'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label">Número <span class="text-red-400">*</span></label>
            <input type="number" class="form-input w-full" min="1" max="12" step="1"
                   [ngClass]="claseCampo('numero')"
                   [(ngModel)]="formNumero"
                   (ngModelChange)="onCampoFormChange('numero')"
                   (blur)="onCampoBlur('numero')" />
            @if (campoError('numero'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
        </div>
        <div>
          <label class="form-label">Nombre <span class="text-red-400">*</span></label>
          <input class="form-input w-full" placeholder="Ej. Primer Bimestre"
                 [ngClass]="claseCampo('nombre')"
                 [(ngModel)]="formNombre"
                 (ngModelChange)="onCampoFormChange('nombre')"
                 (blur)="onCampoBlur('nombre')" />
          @if (campoError('nombre'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div>
          <label class="form-label">Tipo <span class="text-red-400">*</span></label>
          <select class="form-select w-full" [ngClass]="claseCampo('tipo')"
                  [(ngModel)]="formTipo"
                  (ngModelChange)="onCampoFormChange('tipo')"
                  (blur)="onCampoBlur('tipo')">
            @for (t of tiposPeriodo; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
          @if (campoError('tipo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Inicio <span class="text-red-400">*</span></label>
            <input type="date" class="form-input w-full"
                   [ngClass]="claseCampo('inicio')"
                   [(ngModel)]="formInicio"
                   (ngModelChange)="onCampoFormChange('inicio')"
                   (blur)="onCampoBlur('inicio')" />
            @if (campoError('inicio'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label">Fin <span class="text-red-400">*</span></label>
            <input type="date" class="form-input w-full"
                   [ngClass]="claseCampo('fin')"
                   [(ngModel)]="formFin"
                   (ngModelChange)="onCampoFormChange('fin')"
                   (blur)="onCampoBlur('fin')" />
            @if (campoError('fin'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
        </div>
        <div>
          <label class="form-label">Descripción <span class="text-gray-400 font-normal">(opcional)</span></label>
          <textarea class="form-input w-full" rows="2"
                    [ngClass]="claseCampo('descripcion')"
                    [(ngModel)]="formDescripcion"
                    (ngModelChange)="onCampoFormChange('descripcion')"
                    (blur)="onCampoBlur('descripcion')"></textarea>
          @if (campoError('descripcion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" [(ngModel)]="formActual" class="rounded" />
          Marcar como período vigente
        </label>

      </div>
      <div class="shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="cerrarModal()">Cancelar</button>
        <button type="button" class="btn btn-primary" (click)="guardar()"
          [disabled]="!puedeGuardarForm() || svc.saving()"
          [title]="puedeGuardarForm() ? '' : 'Completa año escolar, número, nombre, tipo e inicio/fin'">
          {{ editId() ? 'Guardar' : 'Crear' }}
        </button>
      </div>
    </aside>
  }

  @if (toast()) {
    <div class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-white text-sm"
      [ngClass]="toast()!.type === 'success' ? 'bg-green-600' : 'bg-red-600'">
      {{ toast()!.msg }}
    </div>
  }
</div>
  `,
})
export class MaestrosPeriodosAcademicosComponent implements OnInit {
  private readonly _tenantReloadReady = setupTenantReload(() => this.cargarAniosEscolares(() => this.cargar()));
  readonly svc = inject(MaestrosPeriodosAcademicosService);
  private readonly auth = inject(AuthService);
  readonly tiposPeriodo = TIPOS_PERIODO;

  readonly periodos = signal<PeriodoAcademicoItem[]>([]);
  readonly aniosDisponibles = signal<AnioEscolarCatalogoItem[]>([]);
  readonly aniosCargando = signal(false);
  readonly drawerDividirAbierto = signal(false);
  readonly dividirError = signal('');
  readonly modalOpen = signal(false);
  readonly editId = signal<number | null>(null);
  readonly error = signal('');
  errorForm = signal('');
  fieldErrors = signal<ErroresCampoPeriodoAcademico>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);
  private readonly formRevision = signal(0);

  readonly puedeGuardarForm = computed(() => {
    this.formRevision();
    return periodoAcademicoFormularioMinimoListo(this.valoresFormulario());
  });

  readonly toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  readonly puedeGestionar = computed(() =>
    this.auth.hasAnyPermiso('calendarizacion.gestionar', 'admin.institucional'),
  );

  readonly filtroAnio = signal(0);
  readonly filtroTipo = signal('');

  readonly periodosFiltrados = computed(() => {
    const tipo = this.filtroTipo();
    const rows = this.periodos();
    if (!tipo) return rows;
    return rows.filter((p) => p.tipo === tipo);
  });

  dividirForm = {
    anioEscolar: new Date().getFullYear(),
    tipo: 'bimestre' as PeriodoAcademicoTipo,
    motivo: '',
    sobreescribir: false,
  };

  formAnio = new Date().getFullYear();
  formNumero = 1;
  formNombre = '';
  formTipo: PeriodoAcademicoTipo = 'bimestre';
  formInicio = '';
  formFin = '';
  formDescripcion = '';
  formActual = false;

  readonly periodoActual = computed(() => this.periodos().find((p) => p.actual) ?? null);

  ngOnInit(): void {
    this.cargarAniosEscolares(() => this.cargar());
    markTenantReloadReady(this._tenantReloadReady);
  }

  private cargarAniosEscolares(onReady?: () => void): void {
    this.aniosCargando.set(true);
    this.svc.listCatalogoAnios().subscribe({
      next: (items) => {
        this.aniosDisponibles.set(items);
        this.aniosCargando.set(false);
        this.aplicarFiltroAnioPorDefecto(items);
        onReady?.();
      },
      error: (err) => {
        this.aniosCargando.set(false);
        this.error.set(err?.message || 'No se pudieron cargar los años escolares.');
        onReady?.();
      },
    });
  }

  onFiltroAnioChange(value: number | string): void {
    this.filtroAnio.set(Number(value) || 0);
    this.cargar();
  }

  etiquetaAnioCatalogo(a: AnioEscolarCatalogoItem): string {
    return a.estado ? `${a.anio} · ${a.estado}` : String(a.anio);
  }

  private aplicarFiltroAnioPorDefecto(items: AnioEscolarCatalogoItem[]): void {
    if (!items.length) return;
    const filtroNum = this.filtroAnio();
    const vigente = items.find((a) => a.estado === 'activo') ?? items[0];
    if (filtroNum <= 0 || !items.some((a) => a.anio === filtroNum)) {
      this.filtroAnio.set(vigente.anio);
    }
  }

  private fusionarAniosDesdePeriodos(rows: PeriodoAcademicoItem[]): void {
    if (!rows.length) return;
    const actuales = new Map(this.aniosDisponibles().map((a) => [a.anio, a]));
    for (const p of rows) {
      if (!actuales.has(p.anioEscolar)) {
        actuales.set(p.anioEscolar, { anio: p.anioEscolar, tipoPeriodo: p.tipo });
      }
    }
    const merged = [...actuales.values()].sort((a, b) => b.anio - a.anio);
    this.aniosDisponibles.set(merged);
    this.aplicarFiltroAnioPorDefecto(merged);
  }

  estadoCfg(estado: PeriodoAcademicoItem['estado']) {
    return ESTADO_PERIODO_CFG[estado];
  }

  cargar(): void {
    this.error.set('');
    const filters: { anioEscolar?: number; activo?: boolean } = { activo: true };
    const anio = this.filtroAnio();
    if (anio > 0) filters.anioEscolar = anio;

    this.svc.list(filters).subscribe({
      next: (rows) => {
        this.periodos.set(rows);
        if (!this.aniosDisponibles().length) {
          this.fusionarAniosDesdePeriodos(rows);
        }
      },
      error: (err) => this.error.set(err.message),
    });
  }

  abrirDividir(): void {
    const anioSel = this.aniosDisponibles().find((a) => a.anio === this.filtroAnio())
      ?? this.aniosDisponibles()[0];
    this.dividirForm = {
      anioEscolar: anioSel?.anio ?? this.filtroAnio(),
      tipo: anioSel?.tipoPeriodo ?? 'bimestre',
      motivo: '',
      sobreescribir: false,
    };
    this.dividirError.set('');
    this.drawerDividirAbierto.set(true);
  }

  cerrarDividir(): void {
    this.drawerDividirAbierto.set(false);
    this.dividirError.set('');
  }

  confirmarDividir(): void {
    this.dividirError.set('');
    this.svc.dividir({
      anioEscolar: this.dividirForm.anioEscolar,
      tipo: this.dividirForm.tipo,
      motivo: this.dividirForm.motivo.trim() || undefined,
      sobreescribir: this.dividirForm.sobreescribir,
    }).subscribe({
      next: (res) => {
        this.mostrarToast(res.mensaje, 'success');
        this.filtroAnio.set(res.anioEscolar);
        this.cerrarDividir();
        this.cargarAniosEscolares(() => this.cargar());
      },
      error: (err) => this.dividirError.set(err.message),
    });
  }

  abrirModal(item?: PeriodoAcademicoItem): void {
    if (item) {
      this.editId.set(item.id);
      this.formAnio = item.anioEscolar;
      this.formNumero = item.numero;
      this.formNombre = item.nombre;
      this.formTipo = item.tipo;
      this.formInicio = item.inicio.slice(0, 10);
      this.formFin = item.fin.slice(0, 10);
      this.formDescripcion = item.descripcion ?? '';
      this.formActual = item.actual;
    } else {
      this.editId.set(null);
      this.formAnio = this.filtroAnio() > 0 ? this.filtroAnio() : new Date().getFullYear();
      this.formNumero = 1;
      this.formNombre = '';
      this.formTipo = 'bimestre';
      this.formInicio = '';
      this.formFin = '';
      this.formDescripcion = '';
      this.formActual = false;
    }
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
      anioEscolar: Number(this.formAnio),
      numero: Number(this.formNumero),
      nombre: this.formNombre,
      tipo: this.formTipo,
      inicio: this.formInicio,
      fin: this.formFin,
      descripcion: this.formDescripcion,
    };
  }

  onCampoBlur(key: string): void {
    this.camposTocados.update((t) => ({ ...t, [key]: true }));
    this.validarCampoEnVivo(key);
  }

  onCampoFormChange(key: string): void {
    this.formRevision.update((n) => n + 1);

    if (key === 'anioEscolar') {
      const n = Number(this.formAnio);
      this.formAnio = Number.isFinite(n) ? n : 0;
    }
    if (key === 'numero') {
      const n = Number(this.formNumero);
      this.formNumero = Number.isFinite(n) ? n : 0;
    }

    if (this.camposTocados()[key] || this.intentoGuardar() || this.fieldErrors()[key]) {
      this.validarCampoEnVivo(key);
    } else {
      this.quitarErrorCampo(key);
    }

    if (key === 'anioEscolar') {
      for (const dep of ['inicio', 'fin'] as const) {
        if (this.camposTocados()[dep]) this.validarCampoEnVivo(dep);
      }
    }
    if (key === 'inicio' && this.camposTocados()['fin']) {
      this.validarCampoEnVivo('fin');
    }
    if (key === 'fin' && this.camposTocados()['inicio']) {
      this.validarCampoEnVivo('fin');
    }
  }

  private validarCamposMinimosEnVivo(): void {
    for (const key of ['anioEscolar', 'numero', 'nombre', 'tipo', 'inicio', 'fin']) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoPeriodoAcademico(this.valoresFormulario(), key);
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
      this.errorForm.set('Completa los campos obligatorios del período académico.');
      return;
    }

    const errors = validarPeriodoAcademicoForm(this.valoresFormulario());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm.set(primerErrorPeriodoAcademico(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    this.errorForm.set('');

    const payload: PeriodoAcademicoPayload = {
      anioEscolar: this.formAnio,
      numero: this.formNumero,
      nombre: this.formNombre.trim(),
      tipo: this.formTipo,
      inicio: this.formInicio,
      fin: this.formFin,
      descripcion: this.formDescripcion.trim(),
      actual: this.formActual,
    };

    const id = this.editId();
    const req = id ? this.svc.update(id, payload) : this.svc.create(payload);

    req.subscribe({
      next: () => {
        this.mostrarToast(id ? 'Período actualizado' : 'Período creado', 'success');
        this.cerrarModal();
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  marcarVigente(p: PeriodoAcademicoItem): void {
    this.svc.marcarActual(p.id).subscribe({
      next: () => {
        this.mostrarToast(`"${p.nombre}" marcado como vigente`, 'success');
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  eliminar(p: PeriodoAcademicoItem): void {
    if (!confirm(`¿Eliminar el período "${p.nombre}"?`)) return;
    this.svc.remove(p.id).subscribe({
      next: () => {
        this.mostrarToast('Período eliminado', 'success');
        this.cargar();
      },
      error: (err) => this.mostrarToast(err.message, 'error'),
    });
  }

  private mostrarToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
