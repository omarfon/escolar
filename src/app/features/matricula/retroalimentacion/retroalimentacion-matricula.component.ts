import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import {
  EnrollmentEvaluation,
  EnrollmentEvaluationsApiService,
} from '../../../core/api/enrollment-evaluations-api.service';
import {
  EnrollmentFeedback,
  EnrollmentFeedbackEligibility,
  EnrollmentFeedbackContext,
} from '../../../core/api/enrollment-feedbacks-api.service';
import {
  RetroalimentacionMatriculaService,
  httpErrorMessage,
} from './retroalimentacion-matricula.service';
import {
  retroalimentacionFormularioListo,
  validarRetroalimentacionForm,
} from './retroalimentacion-form.validation';

@Component({
  selector: 'app-retroalimentacion-matricula',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Retroalimentación de matrícula</h2>
          @if (context(); as ctx) {
            <p class="text-sm text-gray-500 mt-0.5">
              {{ ctx.institucion.nombre }} · A.E. {{ ctx.institucion.anioEscolar }}
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
        <h3 class="font-semibold text-gray-900">1. Seleccionar evaluación registrada</h3>
        @if (cargandoEvaluaciones()) {
          <p class="text-sm text-gray-400">Cargando evaluaciones…</p>
        } @else if (!evaluaciones().length) {
          <p class="text-sm text-gray-500">No hay evaluaciones registradas. Registre primero una evaluación de matrícula.</p>
        } @else {
          <div class="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
            @for (ev of evaluaciones(); track ev.id) {
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                [ngClass]="seleccionada()?.id === ev.id ? 'bg-indigo-50' : ''"
                (click)="seleccionarEvaluacion(ev)"
              >
                <span class="font-medium text-gray-900">{{ ev.candidatoNombre }}</span>
                <span class="text-gray-500"> · {{ ev.tipoEvaluacion }} · {{ ev.resultado }}</span>
              </button>
            }
          </div>
        }

        @if (elegibilidad(); as elig) {
          @if (!elig.elegible) {
            <p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="alert">
              {{ elig.motivoInelegible }}
            </p>
          } @else {
            <p class="text-sm text-emerald-700">
              Evaluación: {{ elig.tipoEvaluacion }} — resultado {{ elig.resultadoEvaluacion }}.
              Ventana: {{ elig.fechaMin }} — {{ elig.fechaMax }}.
            </p>
          }
        }
      </div>

      <div class="card p-4 space-y-4">
        <h3 class="font-semibold text-gray-900">2. Comunicación al apoderado</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="form-label mb-1 block" for="canalRetro">Canal *</label>
            <select id="canalRetro" class="form-select" [ngModel]="canal()" (ngModelChange)="canal.set($event)">
              <option value="">Seleccione…</option>
              @for (c of canales(); track c) { <option [value]="c">{{ c }}</option> }
            </select>
            @if (errores().canal) { <p class="text-xs text-red-600 mt-1">{{ errores().canal }}</p> }
          </div>
          <div>
            <label class="form-label mb-1 block" for="fechaRetro">Fecha *</label>
            <input id="fechaRetro" type="date" class="form-input" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)" [min]="fechaMin()" [max]="fechaMax()" />
            @if (errores().fechaRetroalimentacion) { <p class="text-xs text-red-600 mt-1">{{ errores().fechaRetroalimentacion }}</p> }
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block" for="destinatarioRetro">Destinatario *</label>
            <input id="destinatarioRetro" class="form-input" [ngModel]="destinatario()" (ngModelChange)="destinatario.set($event)" maxlength="120" />
            @if (errores().destinatario) { <p class="text-xs text-red-600 mt-1">{{ errores().destinatario }}</p> }
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block" for="mensajeRetro">Mensaje *</label>
            <textarea id="mensajeRetro" class="form-input min-h-[96px]" [ngModel]="mensaje()" (ngModelChange)="mensaje.set($event)" maxlength="1000"></textarea>
            @if (errores().mensaje) { <p class="text-xs text-red-600 mt-1">{{ errores().mensaje }}</p> }
          </div>
          <div class="sm:col-span-2">
            <label class="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" [ngModel]="acuseRecibo()" (ngModelChange)="acuseRecibo.set($event)" />
              Acuse de recibo registrado
            </label>
          </div>
        </div>
        <div class="flex justify-end">
          <button class="btn btn-primary" [disabled]="!puedeRegistrar() || svc.saving()" (click)="confirmar()">
            {{ svc.saving() ? 'Registrando…' : 'Registrar retroalimentación' }}
          </button>
        </div>
      </div>
      } @else {
        <div class="card p-4 text-sm text-gray-600">Puede consultar el listado. No tiene permiso para registrar.</div>
      }

      <div class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">Retroalimentaciones registradas</h3>
          <input class="form-input w-56" [(ngModel)]="busquedaLista" placeholder="Filtrar" (keyup.enter)="cargarLista()" />
        </div>
        @if (!retroalimentaciones().length) {
          <div class="p-12 text-center text-gray-500">No hay retroalimentaciones registradas.</div>
        } @else {
          <table class="data-table w-full">
            <thead><tr><th>Candidato</th><th>Canal</th><th>Fecha</th><th>Destinatario</th><th>Actor</th></tr></thead>
            <tbody>
              @for (r of retroalimentaciones(); track r.id) {
                <tr>
                  <td><div class="font-medium">{{ r.candidatoNombre }}</div><div class="text-xs text-gray-400">{{ r.tipoEvaluacion }}</div></td>
                  <td>{{ r.canal }}</td>
                  <td>{{ r.fechaRetroalimentacion }}</td>
                  <td>{{ r.destinatario }}</td>
                  <td>{{ r.actorNombre }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
})
export class RetroalimentacionMatriculaComponent implements OnInit {
  readonly svc = inject(RetroalimentacionMatriculaService);
  private readonly evaluacionesApi = inject(EnrollmentEvaluationsApiService);
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly context = signal<EnrollmentFeedbackContext | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly evaluaciones = signal<EnrollmentEvaluation[]>([]);
  readonly retroalimentaciones = signal<EnrollmentFeedback[]>([]);
  readonly seleccionada = signal<EnrollmentEvaluation | null>(null);
  readonly elegibilidad = signal<EnrollmentFeedbackEligibility | null>(null);
  readonly cargandoEvaluaciones = signal(false);

  busquedaLista = '';
  readonly canal = signal('');
  readonly fecha = signal('');
  readonly destinatario = signal('');
  readonly mensaje = signal('');
  readonly acuseRecibo = signal(false);

  readonly canales = computed(() => this.context()?.canales ?? []);
  readonly fechaMin = computed(() => this.elegibilidad()?.fechaMin ?? this.context()?.fechaMin ?? '');
  readonly fechaMax = computed(() => this.elegibilidad()?.fechaMax ?? this.context()?.fechaMax ?? '');
  readonly puedeVerFormulario = computed(() =>
    this.auth.isAdmin() || this.auth.hasRole('DIRECTOR') || this.auth.hasAnyPermiso('matricula.retroalimentacion'),
  );
  readonly errores = computed(() =>
    validarRetroalimentacionForm({
      canal: this.canal(),
      fechaRetroalimentacion: this.fecha(),
      destinatario: this.destinatario(),
      mensaje: this.mensaje(),
      fechaMin: this.fechaMin(),
      fechaMax: this.fechaMax(),
    }),
  );

  ngOnInit(): void {
    this.layout.setTitle('Retroalimentación de matrícula');
    this.cargar();
    const evalId = this.route.snapshot.queryParamMap.get('evaluationId');
    if (evalId) this.precargarEvaluacion(+evalId);
  }

  cargar(): void {
    this.svc.loadContext().subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.svc.loading.set(false);
        this.cargarLista();
        this.cargarEvaluaciones();
      },
      error: (err) => {
        this.svc.loading.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo cargar el contexto'));
      },
    });
  }

  cargarEvaluaciones(): void {
    this.cargandoEvaluaciones.set(true);
    this.evaluacionesApi.list({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.evaluaciones.set(res.items);
        this.cargandoEvaluaciones.set(false);
      },
      error: () => {
        this.cargandoEvaluaciones.set(false);
        this.evaluaciones.set([]);
      },
    });
  }

  cargarLista(): void {
    this.svc.list({ busqueda: this.busquedaLista, page: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        this.retroalimentaciones.set(res.items);
        this.svc.loading.set(false);
      },
      error: (err) => {
        this.svc.loading.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo listar'));
      },
    });
  }

  seleccionarEvaluacion(ev: EnrollmentEvaluation): void {
    this.seleccionada.set(ev);
    this.success.set(null);
    this.svc.eligibility(ev.id).subscribe({
      next: (elig) => {
        this.elegibilidad.set(elig);
        if (!this.fecha()) this.fecha.set(elig.fechaMax);
      },
      error: (err) => {
        this.elegibilidad.set(null);
        this.error.set(httpErrorMessage(err, 'No se pudo validar elegibilidad'));
      },
    });
  }

  puedeRegistrar(): boolean {
    return (
      !!this.seleccionada() &&
      !!this.elegibilidad()?.elegible &&
      retroalimentacionFormularioListo({
        canal: this.canal(),
        fechaRetroalimentacion: this.fecha(),
        destinatario: this.destinatario(),
        mensaje: this.mensaje(),
        fechaMin: this.fechaMin(),
        fechaMax: this.fechaMax(),
      })
    );
  }

  confirmar(): void {
    const ev = this.seleccionada();
    if (!ev || !this.puedeRegistrar()) return;
    if (!window.confirm(`¿Confirma registrar la retroalimentación para ${ev.candidatoNombre}?`)) return;

    this.svc.register({
      enrollmentEvaluationId: ev.id,
      canal: this.canal(),
      fechaRetroalimentacion: this.fecha(),
      destinatario: this.destinatario(),
      mensaje: this.mensaje(),
      acuseRecibo: this.acuseRecibo(),
    }, crypto.randomUUID()).subscribe({
      next: () => {
        this.svc.saving.set(false);
        this.success.set('Retroalimentación registrada correctamente.');
        this.canal.set('');
        this.fecha.set('');
        this.destinatario.set('');
        this.mensaje.set('');
        this.acuseRecibo.set(false);
        this.seleccionada.set(null);
        this.elegibilidad.set(null);
        this.cargarLista();
      },
      error: (err) => {
        this.svc.saving.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo registrar'));
      },
    });
  }

  private precargarEvaluacion(id: number): void {
    this.evaluacionesApi.list({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.evaluaciones.set(res.items);
        const ev = res.items.find((e) => e.id === id);
        if (ev) this.seleccionarEvaluacion(ev);
      },
    });
  }
}
