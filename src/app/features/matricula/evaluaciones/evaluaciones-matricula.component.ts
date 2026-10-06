import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import {
  EnrollmentEvaluation,
  EnrollmentEvaluationContext,
  EnrollmentEvaluationEligibility,
} from '../../../core/api/enrollment-evaluations-api.service';
import { ApiExpediente } from '../../../core/api/api.models';
import { ExpedientesApiService } from '../../../core/api/expedientes-api.service';
import { EsperaService } from '../espera/espera.service';
import { EsperaItem } from '../espera/espera.model';
import {
  EvaluacionesMatriculaService,
  httpErrorMessage,
} from './evaluaciones-matricula.service';
import {
  evaluacionMatriculaFormularioListo,
  validarEvaluacionMatriculaForm,
} from './evaluaciones-matricula-form.validation';

@Component({
  selector: 'app-evaluaciones-matricula',
  standalone: true,
  imports: [FormsModule, NgClass, DatePipe],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Evaluaciones de matrícula</h2>
          @if (context(); as ctx) {
            <p class="text-sm text-gray-500 mt-0.5">
              {{ ctx.institucion.nombre }}
              · A.E. {{ ctx.institucion.anioEscolar }}
              · {{ ctx.institucion.ugel || 'UGEL' }}
              · {{ ctx.institucion.dre || 'DRE' }}
            </p>
          }
        </div>
        <button class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="svc.loading() || svc.saving()">
          <span class="icon icon-sm">refresh</span> Actualizar
        </button>
      </div>

      @if (error()) {
        <div class="card p-4 text-sm text-red-700 bg-red-50 border border-red-100" role="alert">{{ error() }}</div>
      }
      @if (success()) {
        <div class="card p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100" role="status">{{ success() }}</div>
      }

      @if (puedeVerFormulario()) {
      <div class="card p-4 space-y-4">
        <div class="flex gap-2 border-b border-gray-100 pb-3">
          <button
            type="button"
            class="btn btn-sm"
            [ngClass]="modoOrigen() === 'waitlist' ? 'btn-primary' : 'btn-secondary'"
            (click)="modoOrigen.set('waitlist')"
          >Lista de espera</button>
          <button
            type="button"
            class="btn btn-sm"
            [ngClass]="modoOrigen() === 'estudiante' ? 'btn-primary' : 'btn-secondary'"
            (click)="modoOrigen.set('estudiante')"
          >Estudiante</button>
        </div>

        <h3 class="font-semibold text-gray-900">1. Seleccionar candidato</h3>

        @if (modoOrigen() === 'waitlist') {
          <div class="flex flex-col sm:flex-row gap-2">
            <input class="form-input flex-1" [(ngModel)]="busquedaWaitlist" placeholder="Filtrar por nombre o DNI" (keyup.enter)="filtrarWaitlist()" />
            <button class="btn btn-secondary" (click)="filtrarWaitlist()">Buscar</button>
          </div>
          @if (eligiendo()) {
            <p class="text-sm text-gray-400">Cargando solicitudes…</p>
          } @else if (!candidatosWaitlist().length) {
            <p class="text-sm text-gray-500">No hay solicitudes activas en lista de espera.</p>
          } @else {
            <div class="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
              @for (w of candidatosWaitlist(); track w.id) {
                <button
                  type="button"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                  [ngClass]="waitlistSeleccionado()?.id === w.id ? 'bg-indigo-50' : ''"
                  (click)="seleccionarWaitlist(w)"
                >
                  <span class="font-medium text-gray-900">{{ w.apellidos }}, {{ w.nombres }}</span>
                  <span class="text-gray-500"> · DNI {{ w.dni }} · {{ w.nivel }} {{ w.grado }}</span>
                </button>
              }
            </div>
          }
        } @else {
          <div class="flex flex-col sm:flex-row gap-2">
            <input class="form-input flex-1" [(ngModel)]="busquedaEstudiante" placeholder="Buscar por nombre, código o DNI" (keyup.enter)="filtrarEstudiantes()" />
            <button class="btn btn-secondary" (click)="filtrarEstudiantes()">Buscar</button>
          </div>
          @if (eligiendo()) {
            <p class="text-sm text-gray-400">Cargando estudiantes…</p>
          } @else if (!candidatosEstudiante().length) {
            <p class="text-sm text-gray-500">No hay estudiantes para los criterios de búsqueda.</p>
          } @else {
            <div class="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
              @for (e of candidatosEstudiante(); track e.id) {
                <button
                  type="button"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                  [ngClass]="estudianteSeleccionado()?.id === e.id ? 'bg-indigo-50' : ''"
                  (click)="seleccionarEstudiante(e)"
                >
                  <span class="font-medium text-gray-900">{{ e.apellidos }}, {{ e.nombres }}</span>
                  <span class="text-gray-500"> · {{ e.codigo }} · {{ e.gradoLabel }} "{{ e.seccion }}"</span>
                </button>
              }
            </div>
          }
        }

        @if (elegibilidad(); as elig) {
          @if (!elig.elegible) {
            <p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="alert">
              {{ elig.motivoInelegible }}
            </p>
          } @else {
            <p class="text-sm text-emerald-700">
              Candidato elegible en {{ elig.nivel }} {{ elig.grado }}.
              Tipos disponibles: {{ elig.tiposDisponibles.length }}.
              Ventana de fecha: {{ elig.fechaMin }} — {{ elig.fechaMax }}.
            </p>
          }
        }
      </div>

      <div class="card p-4 space-y-4">
        <h3 class="font-semibold text-gray-900">2. Registrar evaluación</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="form-label mb-1 block" for="tipoEvaluacion">Tipo *</label>
            <select id="tipoEvaluacion" class="form-select" [ngModel]="tipoEvaluacion()" (ngModelChange)="tipoEvaluacion.set($event)">
              <option value="">Seleccione…</option>
              @for (t of tiposDisponibles(); track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
            @if (errores().tipoEvaluacion) {
              <p class="text-xs text-red-600 mt-1">{{ errores().tipoEvaluacion }}</p>
            }
          </div>
          <div>
            <label class="form-label mb-1 block" for="fechaEvaluacion">Fecha *</label>
            <input
              id="fechaEvaluacion"
              type="date"
              class="form-input"
              [ngModel]="fechaEvaluacion()"
              (ngModelChange)="fechaEvaluacion.set($event)"
              [min]="fechaMin()"
              [max]="fechaMax()"
            />
            @if (errores().fechaEvaluacion) {
              <p class="text-xs text-red-600 mt-1">{{ errores().fechaEvaluacion }}</p>
            }
          </div>
          <div>
            <label class="form-label mb-1 block" for="resultadoEvaluacion">Resultado *</label>
            <select id="resultadoEvaluacion" class="form-select" [ngModel]="resultado()" (ngModelChange)="resultado.set($event)">
              <option value="">Seleccione…</option>
              @for (r of resultados(); track r) {
                <option [value]="r">{{ resultadoLabel(r) }}</option>
              }
            </select>
            @if (errores().resultado) {
              <p class="text-xs text-red-600 mt-1">{{ errores().resultado }}</p>
            }
          </div>
          <div>
            <label class="form-label mb-1 block" for="puntajeEvaluacion">Puntaje (0–20)</label>
            <input
              id="puntajeEvaluacion"
              type="number"
              min="0"
              max="20"
              step="0.5"
              class="form-input"
              [ngModel]="puntaje()"
              (ngModelChange)="puntaje.set($event)"
            />
            @if (errores().puntaje) {
              <p class="text-xs text-red-600 mt-1">{{ errores().puntaje }}</p>
            }
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block" for="observacionesEvaluacion">Observaciones</label>
            <textarea
              id="observacionesEvaluacion"
              class="form-input min-h-[72px]"
              [ngModel]="observaciones()"
              (ngModelChange)="observaciones.set($event)"
              maxlength="500"
            ></textarea>
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block" for="resolucionEvaluacion">Resolución / sustento *</label>
            <textarea
              id="resolucionEvaluacion"
              class="form-input min-h-[96px]"
              [ngModel]="resolucion()"
              (ngModelChange)="resolucion.set($event)"
              maxlength="800"
              placeholder="Indique la resolución o sustento que respalda la evaluación"
            ></textarea>
            @if (errores().resolucion) {
              <p class="text-xs text-red-600 mt-1">{{ errores().resolucion }}</p>
            }
          </div>
        </div>
        <p class="text-xs text-gray-500">
          Las evaluaciones previas se conservan. No se altera el historial académico del candidato.
        </p>
        <div class="flex justify-end">
          <button class="btn btn-primary" [disabled]="!puedeRegistrar() || svc.saving()" (click)="confirmarEvaluacion()">
            {{ svc.saving() ? 'Registrando…' : 'Registrar evaluación' }}
          </button>
        </div>
      </div>
      } @else {
        <div class="card p-4 text-sm text-gray-600" role="status">
          Puede consultar las evaluaciones registradas. No tiene permiso para registrar una nueva evaluación.
        </div>
      }

      <div class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 class="font-semibold text-gray-900">Evaluaciones registradas</h3>
            <button class="btn btn-secondary btn-sm" (click)="cargarLista()">Aplicar filtros</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input class="form-input" [(ngModel)]="busquedaLista" placeholder="Buscar candidato o DNI" (keyup.enter)="cargarLista()" />
            <select class="form-select" [(ngModel)]="filtroResultado" (change)="paginaLista.set(1); cargarLista()">
              <option value="">Todos los resultados</option>
              @for (r of resultados(); track r) {
                <option [value]="r">{{ resultadoLabel(r) }}</option>
              }
            </select>
            <select class="form-select" [(ngModel)]="filtroTipo" (change)="paginaLista.set(1); cargarLista()">
              <option value="">Todos los tipos</option>
              @for (t of context()?.tiposEvaluacion ?? []; track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
            <select class="form-select" [(ngModel)]="pageSizeLista" (change)="paginaLista.set(1); cargarLista()">
              <option [ngValue]="10">10 por página</option>
              <option [ngValue]="20">20 por página</option>
              <option [ngValue]="50">50 por página</option>
            </select>
          </div>
        </div>
        @if (svc.loading() && !evaluaciones().length) {
          <div class="p-10 text-center text-gray-400">Cargando…</div>
        } @else if (!evaluaciones().length) {
          <div class="p-12 text-center text-gray-500">
            <span class="icon icon-2xl text-indigo-300 mb-3 block">fact_check</span>
            No hay evaluaciones registradas para los filtros seleccionados.
          </div>
        } @else {
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Candidato</th>
                <th>Origen</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Resultado</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              @for (ev of evaluaciones(); track ev.id) {
                <tr class="cursor-pointer hover:bg-gray-50" (click)="verDetalle(ev.id)">
                  <td>
                    <div class="font-medium text-gray-900">{{ ev.candidatoNombre }}</div>
                    <div class="text-xs text-gray-400">{{ ev.candidatoDni }} · {{ ev.grado }}</div>
                  </td>
                  <td class="text-sm capitalize">{{ ev.origen }}</td>
                  <td class="text-sm">{{ ev.tipoEvaluacion }}</td>
                  <td class="text-sm">{{ ev.fechaEvaluacion }}</td>
                  <td class="text-sm">{{ resultadoLabel(ev.resultado) }}</td>
                  <td class="text-sm">
                    {{ ev.actorNombre }}
                    <div class="text-xs text-gray-400">{{ ev.actorRol }}</div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (paginacion(); as p) {
            <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
              <span>{{ p.totalItems }} registro(s) · página {{ p.page }} de {{ p.totalPages }}</span>
              <div class="flex gap-2">
                <button class="btn btn-secondary btn-sm" [disabled]="p.page <= 1" (click)="irPagina(p.page - 1)">Anterior</button>
                <button class="btn btn-secondary btn-sm" [disabled]="p.page >= p.totalPages" (click)="irPagina(p.page + 1)">Siguiente</button>
              </div>
            </div>
          }
        }
      </div>

      @if (detalle(); as d) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detalle-evaluacion-titulo"
          (click)="cerrarDetalle()"
        >
          <div class="card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-4" (click)="$event.stopPropagation()">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 id="detalle-evaluacion-titulo" class="text-lg font-semibold text-gray-900">{{ d.candidatoNombre }}</h3>
                <p class="text-sm text-gray-500">{{ d.tipoEvaluacion }} · {{ resultadoLabel(d.resultado) }} · {{ d.fechaEvaluacion }}</p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" (click)="cerrarDetalle()">Cerrar</button>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><dt class="text-gray-500">Origen</dt><dd class="font-medium capitalize">{{ d.origen }}</dd></div>
              <div><dt class="text-gray-500">Grado</dt><dd class="font-medium">{{ d.nivel }} {{ d.grado }}</dd></div>
              <div><dt class="text-gray-500">Puntaje</dt><dd class="font-medium">{{ d.puntaje ?? '—' }}</dd></div>
              <div><dt class="text-gray-500">Registrado</dt><dd class="font-medium">{{ d.createdAt | date:'short' }}</dd></div>
              <div class="sm:col-span-2"><dt class="text-gray-500">Actor</dt><dd class="font-medium">{{ d.actorNombre }} ({{ d.actorRol }})</dd></div>
            </dl>
            @if (d.observaciones) {
              <div>
                <h4 class="text-sm font-semibold text-gray-700 mb-1">Observaciones</h4>
                <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ d.observaciones }}</p>
              </div>
            }
            <div>
              <h4 class="text-sm font-semibold text-gray-700 mb-1">Resolución / sustento</h4>
              <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ d.resolucion }}</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class EvaluacionesMatriculaComponent implements OnInit {
  readonly svc = inject(EvaluacionesMatriculaService);
  private readonly layout = inject(LayoutService);
  private readonly esperaSvc = inject(EsperaService);
  private readonly expedientesApi = inject(ExpedientesApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly context = signal<EnrollmentEvaluationContext | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly evaluaciones = signal<EnrollmentEvaluation[]>([]);
  readonly paginacion = signal<{
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  } | null>(null);
  readonly detalle = signal<EnrollmentEvaluation | null>(null);
  readonly paginaLista = signal(1);
  readonly candidatosWaitlist = signal<EsperaItem[]>([]);
  readonly candidatosEstudiante = signal<ApiExpediente[]>([]);
  readonly waitlistSeleccionado = signal<EsperaItem | null>(null);
  readonly estudianteSeleccionado = signal<ApiExpediente | null>(null);
  readonly elegibilidad = signal<EnrollmentEvaluationEligibility | null>(null);
  readonly eligiendo = signal(false);
  readonly modoOrigen = signal<'waitlist' | 'estudiante'>('waitlist');

  busquedaWaitlist = '';
  busquedaEstudiante = '';
  busquedaLista = '';
  filtroResultado = '';
  filtroTipo = '';
  pageSizeLista = 20;

  readonly tipoEvaluacion = signal('');
  readonly fechaEvaluacion = signal('');
  readonly resultado = signal('');
  readonly puntaje = signal<string>('');
  readonly observaciones = signal('');
  readonly resolucion = signal('');

  readonly resultados = computed(() => this.context()?.resultados ?? []);
  readonly tiposDisponibles = computed(
    () => this.elegibilidad()?.tiposDisponibles ?? this.context()?.tiposEvaluacion ?? [],
  );
  readonly fechaMin = computed(
    () => this.elegibilidad()?.fechaMin ?? this.context()?.fechaMin ?? '',
  );
  readonly fechaMax = computed(
    () => this.elegibilidad()?.fechaMax ?? this.context()?.fechaMax ?? '',
  );
  readonly puedeVerFormulario = computed(
    () =>
      this.auth.isAdmin() ||
      this.auth.hasRole('DIRECTOR') ||
      this.auth.hasAnyPermiso('matricula.evaluacion'),
  );
  readonly errores = computed(() =>
    validarEvaluacionMatriculaForm({
      tipoEvaluacion: this.tipoEvaluacion(),
      fechaEvaluacion: this.fechaEvaluacion(),
      resultado: this.resultado(),
      puntaje: this.puntaje(),
      resolucion: this.resolucion(),
      fechaMin: this.fechaMin(),
      fechaMax: this.fechaMax(),
    }),
  );

  ngOnInit(): void {
    this.layout.setTitle('Evaluaciones de matrícula');
    this.cargar();
    const waitlistId = this.route.snapshot.queryParamMap.get('waitlistId');
    if (waitlistId) {
      this.modoOrigen.set('waitlist');
      this.precargarWaitlist(+waitlistId);
    }
    const studentId = this.route.snapshot.queryParamMap.get('studentId');
    if (studentId) {
      this.modoOrigen.set('estudiante');
      this.precargarEstudiante(+studentId);
    }
  }

  cargar(): void {
    this.svc.loadContext().subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.svc.loading.set(false);
        this.cargarLista();
        if (this.modoOrigen() === 'waitlist') this.filtrarWaitlist();
      },
      error: (err) => {
        this.svc.loading.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo cargar el contexto institucional'));
      },
    });
  }

  cargarLista(): void {
    this.svc
      .list({
        busqueda: this.busquedaLista,
        resultado: this.filtroResultado || undefined,
        tipoEvaluacion: this.filtroTipo || undefined,
        page: this.paginaLista(),
        pageSize: this.pageSizeLista,
      })
      .subscribe({
      next: (res) => {
        this.evaluaciones.set(res.items);
        this.paginacion.set(res.pagination);
        this.svc.loading.set(false);
      },
      error: (err) => {
        this.svc.loading.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo listar las evaluaciones'));
      },
    });
  }

  filtrarWaitlist(): void {
    this.eligiendo.set(true);
    this.esperaSvc.load().subscribe({
      next: (rows) => {
        const q = this.busquedaWaitlist.trim().toLowerCase();
        this.candidatosWaitlist.set(
          rows.filter((w) => {
            if (w.estado !== 'en_espera' && w.estado !== 'notificado') return false;
            if (!q) return true;
            return (
              `${w.apellidos} ${w.nombres} ${w.dni}`.toLowerCase().includes(q)
            );
          }),
        );
        this.eligiendo.set(false);
      },
      error: () => {
        this.eligiendo.set(false);
        this.candidatosWaitlist.set([]);
      },
    });
  }

  filtrarEstudiantes(): void {
    this.eligiendo.set(true);
    this.expedientesApi.list(this.busquedaEstudiante).subscribe({
      next: (rows) => {
        this.candidatosEstudiante.set(rows.filter((e) => e.estado !== 'retirado'));
        this.eligiendo.set(false);
      },
      error: () => {
        this.eligiendo.set(false);
        this.candidatosEstudiante.set([]);
      },
    });
  }

  seleccionarWaitlist(w: EsperaItem): void {
    this.waitlistSeleccionado.set(w);
    this.estudianteSeleccionado.set(null);
    this.success.set(null);
    this.svc.waitlistEligibility(w.id).subscribe({
      next: (elig) => {
        this.elegibilidad.set(elig);
        if (!this.fechaEvaluacion()) this.fechaEvaluacion.set(elig.fechaMax);
        if (!this.tipoEvaluacion() && elig.tiposDisponibles[0]) {
          this.tipoEvaluacion.set(elig.tiposDisponibles[0]);
        }
      },
      error: (err) => {
        this.elegibilidad.set(null);
        this.error.set(httpErrorMessage(err, 'No se pudo validar la elegibilidad'));
      },
    });
  }

  seleccionarEstudiante(e: ApiExpediente): void {
    this.estudianteSeleccionado.set(e);
    this.waitlistSeleccionado.set(null);
    this.success.set(null);
    this.svc.studentEligibility(e.id).subscribe({
      next: (elig) => {
        this.elegibilidad.set(elig);
        if (!this.fechaEvaluacion()) this.fechaEvaluacion.set(elig.fechaMax);
        if (!this.tipoEvaluacion() && elig.tiposDisponibles[0]) {
          this.tipoEvaluacion.set(elig.tiposDisponibles[0]);
        }
      },
      error: (err) => {
        this.elegibilidad.set(null);
        this.error.set(httpErrorMessage(err, 'No se pudo validar la elegibilidad'));
      },
    });
  }

  resultadoLabel(code: string): string {
    return this.context()?.resultadoLabels?.[code] ?? code;
  }

  puedeRegistrar(): boolean {
    const candidato =
      this.modoOrigen() === 'waitlist'
        ? this.waitlistSeleccionado()
        : this.estudianteSeleccionado();
    return (
      (this.auth.isAdmin() ||
        this.auth.hasRole('DIRECTOR') ||
        this.auth.hasAnyPermiso('matricula.evaluacion')) &&
      !!candidato &&
      !!this.elegibilidad()?.elegible &&
      evaluacionMatriculaFormularioListo({
        tipoEvaluacion: this.tipoEvaluacion(),
        fechaEvaluacion: this.fechaEvaluacion(),
        resultado: this.resultado(),
        puntaje: this.puntaje(),
        resolucion: this.resolucion(),
        fechaMin: this.fechaMin(),
        fechaMax: this.fechaMax(),
      })
    );
  }

  confirmarEvaluacion(): void {
    if (!this.puedeRegistrar()) return;
    const nombre =
      this.modoOrigen() === 'waitlist'
        ? `${this.waitlistSeleccionado()!.apellidos}, ${this.waitlistSeleccionado()!.nombres}`
        : `${this.estudianteSeleccionado()!.apellidos}, ${this.estudianteSeleccionado()!.nombres}`;
    if (
      !window.confirm(
        `¿Confirma registrar la evaluación de ${nombre}? El registro quedará en auditoría.`,
      )
    ) {
      return;
    }

    const payload =
      this.modoOrigen() === 'waitlist'
        ? {
            waitlistEntryId: this.waitlistSeleccionado()!.id,
            tipoEvaluacion: this.tipoEvaluacion(),
            fechaEvaluacion: this.fechaEvaluacion(),
            resultado: this.resultado(),
            puntaje: this.puntaje() ? Number(this.puntaje()) : undefined,
            observaciones: this.observaciones(),
            resolucion: this.resolucion(),
          }
        : {
            studentId: this.estudianteSeleccionado()!.id,
            tipoEvaluacion: this.tipoEvaluacion(),
            fechaEvaluacion: this.fechaEvaluacion(),
            resultado: this.resultado(),
            puntaje: this.puntaje() ? Number(this.puntaje()) : undefined,
            observaciones: this.observaciones(),
            resolucion: this.resolucion(),
          };

    this.svc.register(payload, crypto.randomUUID()).subscribe({
      next: (res) => {
        this.svc.saving.set(false);
        this.success.set(
          `Evaluación registrada (${this.resultadoLabel(res.resultado)}). Tipo: ${res.tipoEvaluacion}.`,
        );
        this.limpiarFormulario();
        this.cargarLista();
        if (this.modoOrigen() === 'waitlist') this.filtrarWaitlist();
      },
      error: (err) => {
        this.svc.saving.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo registrar la evaluación'));
      },
    });
  }

  private limpiarFormulario(): void {
    this.tipoEvaluacion.set('');
    this.fechaEvaluacion.set('');
    this.resultado.set('');
    this.puntaje.set('');
    this.observaciones.set('');
    this.resolucion.set('');
    this.waitlistSeleccionado.set(null);
    this.estudianteSeleccionado.set(null);
    this.elegibilidad.set(null);
  }

  private precargarWaitlist(id: number): void {
    this.esperaSvc.load().subscribe({
      next: (rows) => {
        const w = rows.find((r) => r.id === id);
        if (w) this.seleccionarWaitlist(w);
      },
      error: () => undefined,
    });
  }

  private precargarEstudiante(id: number): void {
    this.expedientesApi.get(id).subscribe({
      next: (e) => this.seleccionarEstudiante(e),
      error: () => undefined,
    });
  }

  irPagina(page: number): void {
    this.paginaLista.set(page);
    this.cargarLista();
  }

  verDetalle(id: number): void {
    this.svc.get(id).subscribe({
      next: (row) => this.detalle.set(row),
      error: (err) =>
        this.error.set(httpErrorMessage(err, 'No se pudo cargar el detalle')),
    });
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
  }
}
