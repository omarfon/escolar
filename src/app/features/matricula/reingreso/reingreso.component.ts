import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import {
  StudentReadmission,
  StudentReadmissionContext,
  StudentReadmissionEligibility,
} from '../../../core/api/student-readmissions-api.service';
import { ApiExpediente } from '../../../core/api/api.models';
import { ExpedientesApiService } from '../../../core/api/expedientes-api.service';
import { httpErrorMessage, ReingresoService } from './reingreso.service';
import { reingresoFormularioListo, validarReingresoForm } from './reingreso-form.validation';

@Component({
  selector: 'app-reingreso-estudiante',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Registrar reingreso del estudiante</h2>
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
        <h3 class="font-semibold text-gray-900">1. Seleccionar estudiante retirado</h3>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            class="form-input flex-1"
            [(ngModel)]="busquedaEstudiante"
            placeholder="Buscar por nombre, código o DNI"
            (keyup.enter)="filtrarEstudiantes()"
          />
          <button class="btn btn-secondary" (click)="filtrarEstudiantes()">Buscar</button>
        </div>
        @if (eligiendo()) {
          <p class="text-sm text-gray-400">Cargando estudiantes…</p>
        } @else if (!candidatos().length) {
          <p class="text-sm text-gray-500">No hay estudiantes retirados para los criterios de búsqueda.</p>
        } @else {
          <div class="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
            @for (e of candidatos(); track e.id) {
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                [ngClass]="seleccionado()?.id === e.id ? 'bg-indigo-50' : ''"
                (click)="seleccionarEstudiante(e)"
              >
                <span class="font-medium text-gray-900">{{ e.apellidos }}, {{ e.nombres }}</span>
                <span class="text-gray-500"> · {{ e.codigo }} · {{ e.gradoLabel }} "{{ e.seccion }}"</span>
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
              Retiro previo el {{ elig.fechaRetiro }} en {{ elig.nivel }} {{ elig.grado }} "{{ elig.seccion }}".
              Vacantes disponibles: {{ elig.vacantesDisponibles }}.
              Ventana de fecha: {{ elig.fechaMin }} — {{ elig.fechaMax }}.
            </p>
          }
        }
      </div>

      <div class="card p-4 space-y-4">
        <h3 class="font-semibold text-gray-900">2. Datos del reingreso</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="form-label mb-1 block" for="fechaReingreso">Fecha de reingreso *</label>
            <input
              id="fechaReingreso"
              type="date"
              class="form-input"
              [ngModel]="fechaReingreso()"
              (ngModelChange)="fechaReingreso.set($event)"
              [min]="fechaMin()"
              [max]="fechaMax()"
            />
            @if (errores().fechaReingreso) {
              <p class="text-xs text-red-600 mt-1">{{ errores().fechaReingreso }}</p>
            }
          </div>
          <div>
            <label class="form-label mb-1 block" for="motivoReingreso">Motivo *</label>
            <select id="motivoReingreso" class="form-select" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)">
              <option value="">Seleccione…</option>
              @for (m of motivos(); track m) {
                <option [value]="m">{{ m }}</option>
              }
            </select>
            @if (errores().motivo) {
              <p class="text-xs text-red-600 mt-1">{{ errores().motivo }}</p>
            }
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block" for="autorizacionReingreso">Autorización / resolución *</label>
            <textarea
              id="autorizacionReingreso"
              class="form-input min-h-[96px]"
              [ngModel]="autorizacion()"
              (ngModelChange)="autorizacion.set($event)"
              maxlength="800"
              placeholder="Indique la resolución o autorización que sustenta el reingreso"
            ></textarea>
            @if (errores().autorizacion) {
              <p class="text-xs text-red-600 mt-1">{{ errores().autorizacion }}</p>
            }
          </div>
        </div>
        <p class="text-xs text-gray-500">
          El retiro previo se conserva. Las calificaciones y la asistencia histórica no se alteran.
        </p>
        <div class="flex justify-end">
          <button
            class="btn btn-primary"
            [disabled]="!puedeRegistrar() || svc.saving()"
            (click)="confirmarReingreso()"
          >
            {{ svc.saving() ? 'Registrando…' : 'Registrar reingreso' }}
          </button>
        </div>
      </div>
      } @else {
        <div class="card p-4 text-sm text-gray-600" role="status">
          Puede consultar los reingresos registrados. No tiene permiso para registrar un nuevo reingreso.
        </div>
      }

      <div class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">Reingresos registrados</h3>
          <input
            class="form-input w-56"
            [(ngModel)]="busquedaLista"
            placeholder="Filtrar listado"
            (keyup.enter)="cargarLista()"
          />
        </div>
        @if (svc.loading() && !reingresos().length) {
          <div class="p-10 text-center text-gray-400">Cargando…</div>
        } @else if (!reingresos().length) {
          <div class="p-12 text-center text-gray-500">
            <span class="icon icon-2xl text-indigo-300 mb-3 block">person_add</span>
            No hay reingresos registrados para los filtros seleccionados.
          </div>
        } @else {
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Fecha</th>
                <th>Retiro vinculado</th>
                <th>Motivo</th>
                <th>Actor</th>
                <th>Vacante</th>
              </tr>
            </thead>
            <tbody>
              @for (r of reingresos(); track r.id) {
                <tr>
                  <td>
                    <div class="font-medium text-gray-900">{{ r.studentNombre }}</div>
                    <div class="text-xs text-gray-400">{{ r.studentCodigo }} · {{ r.grado }} "{{ r.seccion }}"</div>
                  </td>
                  <td class="text-sm">{{ r.fechaReingreso }}</td>
                  <td class="text-sm">{{ r.fechaRetiroVinculada }}</td>
                  <td class="text-sm">{{ r.motivo }}</td>
                  <td class="text-sm">
                    {{ r.actorNombre }}
                    <div class="text-xs text-gray-400">{{ r.actorRol }}</div>
                  </td>
                  <td class="text-sm">{{ r.vacantesDisponiblesDespues }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
})
export class ReingresoEstudianteComponent implements OnInit {
  readonly svc = inject(ReingresoService);
  private readonly layout = inject(LayoutService);
  private readonly expedientesApi = inject(ExpedientesApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly context = signal<StudentReadmissionContext | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly candidatos = signal<ApiExpediente[]>([]);
  readonly eligiendo = signal(false);
  readonly seleccionado = signal<ApiExpediente | null>(null);
  readonly elegibilidad = signal<StudentReadmissionEligibility | null>(null);
  readonly reingresos = signal<StudentReadmission[]>([]);

  busquedaEstudiante = '';
  busquedaLista = '';
  readonly fechaReingreso = signal('');
  readonly motivo = signal('');
  readonly autorizacion = signal('');

  readonly motivos = computed(() => this.context()?.motivos ?? []);
  readonly fechaMin = computed(
    () => this.elegibilidad()?.fechaMin ?? this.context()?.fechaMin ?? '',
  );
  readonly fechaMax = computed(
    () => this.elegibilidad()?.fechaMax ?? this.context()?.fechaMax ?? '',
  );
  readonly puedeVerFormulario = computed(
    () => this.auth.isAdmin() || this.auth.hasRole('DIRECTOR') || this.auth.hasAnyPermiso('matricula.reingreso'),
  );
  readonly errores = computed(() =>
    validarReingresoForm({
      fechaReingreso: this.fechaReingreso(),
      motivo: this.motivo(),
      autorizacion: this.autorizacion(),
      fechaMin: this.fechaMin(),
      fechaMax: this.fechaMax(),
    }),
  );

  ngOnInit(): void {
    this.layout.setTitle('Reingreso de estudiante');
    this.cargar();
    const pre = this.route.snapshot.queryParamMap.get('studentId');
    if (pre) {
      this.precargarEstudiante(+pre);
    }
  }

  cargar(): void {
    this.svc.loadContext().subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.svc.loading.set(false);
        this.cargarLista();
        this.filtrarEstudiantes();
      },
      error: (err) => {
        this.svc.loading.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo cargar el contexto institucional'));
      },
    });
  }

  cargarLista(): void {
    this.svc.list({ busqueda: this.busquedaLista, page: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        this.reingresos.set(res.items);
        this.svc.loading.set(false);
      },
      error: (err) => {
        this.svc.loading.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo listar los reingresos'));
      },
    });
  }

  filtrarEstudiantes(): void {
    this.eligiendo.set(true);
    this.expedientesApi.list(this.busquedaEstudiante).subscribe({
      next: (rows) => {
        this.candidatos.set(rows.filter((e) => e.estado === 'retirado'));
        this.eligiendo.set(false);
      },
      error: () => {
        this.eligiendo.set(false);
        this.candidatos.set([]);
      },
    });
  }

  seleccionarEstudiante(e: ApiExpediente): void {
    this.seleccionado.set(e);
    this.success.set(null);
    this.svc.eligibility(e.id).subscribe({
      next: (elig) => {
        this.elegibilidad.set(elig);
        if (!this.fechaReingreso()) this.fechaReingreso.set(elig.fechaMax);
      },
      error: (err) => {
        this.elegibilidad.set(null);
        this.error.set(httpErrorMessage(err, 'No se pudo validar la elegibilidad'));
      },
    });
  }

  puedeRegistrar(): boolean {
    return (
      (this.auth.isAdmin() ||
        this.auth.hasRole('DIRECTOR') ||
        this.auth.hasAnyPermiso('matricula.reingreso')) &&
      !!this.seleccionado() &&
      !!this.elegibilidad()?.elegible &&
      reingresoFormularioListo({
        fechaReingreso: this.fechaReingreso(),
        motivo: this.motivo(),
        autorizacion: this.autorizacion(),
        fechaMin: this.fechaMin(),
        fechaMax: this.fechaMax(),
      })
    );
  }

  confirmarReingreso(): void {
    const student = this.seleccionado();
    if (!student || !this.puedeRegistrar()) return;
    if (!window.confirm(`¿Confirma el reingreso de ${student.apellidos}, ${student.nombres}? Se validará la vacante y se conservará el historial previo.`)) {
      return;
    }
    const key = crypto.randomUUID();
    this.svc.register(student.id, {
      fechaReingreso: this.fechaReingreso(),
      motivo: this.motivo(),
      autorizacion: this.autorizacion(),
    }, key).subscribe({
      next: (res) => {
        this.svc.saving.set(false);
        this.success.set(
          `Reingreso registrado. Vacantes restantes en el salón: ${res.vacantesDisponiblesDespues}. Notas conservadas: ${res.notasConservadas}.`,
        );
        this.fechaReingreso.set('');
        this.motivo.set('');
        this.autorizacion.set('');
        this.seleccionado.set(null);
        this.elegibilidad.set(null);
        this.cargarLista();
        this.filtrarEstudiantes();
      },
      error: (err) => {
        this.svc.saving.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo registrar el reingreso'));
      },
    });
  }

  private precargarEstudiante(id: number): void {
    this.expedientesApi.get(id).subscribe({
      next: (e) => this.seleccionarEstudiante(e),
      error: () => undefined,
    });
  }
}
