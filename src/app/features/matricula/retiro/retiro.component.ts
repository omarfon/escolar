import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import {
  StudentWithdrawal,
  StudentWithdrawalContext,
  StudentWithdrawalEligibility,
} from '../../../core/api/student-withdrawals-api.service';
import { ApiExpediente } from '../../../core/api/api.models';
import { ExpedientesApiService } from '../../../core/api/expedientes-api.service';
import { httpErrorMessage, RetiroService } from './retiro.service';
import { retiroFormularioListo, validarRetiroForm } from './retiro-form.validation';

@Component({
  selector: 'app-retiro-estudiante',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Registrar retiro del estudiante</h2>
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
        <h3 class="font-semibold text-gray-900">1. Seleccionar estudiante con matrícula activa</h3>
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
          <p class="text-sm text-gray-500">No hay estudiantes activos para los criterios de búsqueda.</p>
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
              Matrícula activa en {{ elig.nivel }} {{ elig.grado }} "{{ elig.seccion }}".
              Ventana de fecha: {{ elig.fechaMin }} — {{ elig.fechaMax }}.
            </p>
          }
        }
      </div>

      <div class="card p-4 space-y-4">
        <h3 class="font-semibold text-gray-900">2. Datos del retiro</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="form-label mb-1 block" for="fechaRetiro">Fecha de retiro *</label>
            <input
              id="fechaRetiro"
              type="date"
              class="form-input"
              [ngModel]="fechaRetiro()"
              (ngModelChange)="fechaRetiro.set($event)"
              [min]="fechaMin()"
              [max]="fechaMax()"
            />
            @if (errores().fechaRetiro) {
              <p class="text-xs text-red-600 mt-1">{{ errores().fechaRetiro }}</p>
            }
          </div>
          <div>
            <label class="form-label mb-1 block" for="motivoRetiro">Motivo *</label>
            <select id="motivoRetiro" class="form-select" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)">
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
            <label class="form-label mb-1 block" for="sustentoRetiro">Sustento *</label>
            <textarea
              id="sustentoRetiro"
              class="form-input min-h-[96px]"
              [ngModel]="sustento()"
              (ngModelChange)="sustento.set($event)"
              maxlength="800"
              placeholder="Describa el sustento documental o administrativo del retiro"
            ></textarea>
            @if (errores().sustento) {
              <p class="text-xs text-red-600 mt-1">{{ errores().sustento }}</p>
            }
          </div>
        </div>
        <p class="text-xs text-gray-500">
          Las calificaciones y la asistencia previas se conservan. La vacante se libera sin eliminar la matrícula.
        </p>
        <div class="flex justify-end">
          <button
            class="btn btn-primary"
            [disabled]="!puedeRegistrar() || svc.saving()"
            (click)="confirmarRetiro()"
          >
            {{ svc.saving() ? 'Registrando…' : 'Registrar retiro' }}
          </button>
        </div>
      </div>
      } @else {
        <div class="card p-4 text-sm text-gray-600" role="status">
          Puede consultar los retiros registrados. No tiene permiso para registrar un nuevo retiro.
        </div>
      }

      <div class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">Retiros registrados</h3>
          <input
            class="form-input w-56"
            [(ngModel)]="busquedaLista"
            placeholder="Filtrar listado"
            (keyup.enter)="cargarLista()"
          />
        </div>
        @if (svc.loading() && !retiros().length) {
          <div class="p-10 text-center text-gray-400">Cargando…</div>
        } @else if (!retiros().length) {
          <div class="p-12 text-center text-gray-500">
            <span class="icon icon-2xl text-indigo-300 mb-3 block">person_off</span>
            No hay retiros registrados para los filtros seleccionados.
          </div>
        } @else {
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Fecha</th>
                <th>Motivo</th>
                <th>Actor</th>
                <th>Vacante</th>
              </tr>
            </thead>
            <tbody>
              @for (r of retiros(); track r.id) {
                <tr>
                  <td>
                    <div class="font-medium text-gray-900">{{ r.studentNombre }}</div>
                    <div class="text-xs text-gray-400">{{ r.studentCodigo }} · {{ r.grado }} "{{ r.seccion }}"</div>
                  </td>
                  <td class="text-sm">{{ r.fechaRetiro }}</td>
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
export class RetiroEstudianteComponent implements OnInit {
  readonly svc = inject(RetiroService);
  private readonly layout = inject(LayoutService);
  private readonly expedientesApi = inject(ExpedientesApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly context = signal<StudentWithdrawalContext | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly candidatos = signal<ApiExpediente[]>([]);
  readonly eligiendo = signal(false);
  readonly seleccionado = signal<ApiExpediente | null>(null);
  readonly elegibilidad = signal<StudentWithdrawalEligibility | null>(null);
  readonly retiros = signal<StudentWithdrawal[]>([]);

  busquedaEstudiante = '';
  busquedaLista = '';
  readonly fechaRetiro = signal('');
  readonly motivo = signal('');
  readonly sustento = signal('');

  readonly motivos = computed(() => this.context()?.motivos ?? []);
  readonly fechaMin = computed(
    () => this.elegibilidad()?.fechaMin ?? this.context()?.fechaMin ?? '',
  );
  readonly fechaMax = computed(
    () => this.elegibilidad()?.fechaMax ?? this.context()?.fechaMax ?? '',
  );
  readonly puedeVerFormulario = computed(
    () => this.auth.isAdmin() || this.auth.hasRole('DIRECTOR') || this.auth.hasAnyPermiso('matricula.retiro'),
  );
  readonly errores = computed(() =>
    validarRetiroForm({
      fechaRetiro: this.fechaRetiro(),
      motivo: this.motivo(),
      sustento: this.sustento(),
      fechaMin: this.fechaMin(),
      fechaMax: this.fechaMax(),
    }),
  );

  ngOnInit(): void {
    this.layout.setTitle('Retiro de estudiante');
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
        this.retiros.set(res.items);
        this.svc.loading.set(false);
      },
      error: (err) => {
        this.svc.loading.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo listar los retiros'));
      },
    });
  }

  filtrarEstudiantes(): void {
    this.eligiendo.set(true);
    this.expedientesApi.list(this.busquedaEstudiante).subscribe({
      next: (rows) => {
        this.candidatos.set(rows.filter((e) => e.estado === 'activo'));
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
        if (!this.fechaRetiro()) this.fechaRetiro.set(elig.fechaMax);
      },
      error: (err) => {
        this.elegibilidad.set(null);
        this.error.set(httpErrorMessage(err, 'No se pudo validar la elegibilidad'));
      },
    });
  }

  puedeRegistrar(): boolean {
    return (
      this.auth.isAdmin() ||
      this.auth.hasRole('DIRECTOR') ||
      this.auth.hasAnyPermiso('matricula.retiro') &&
      !!this.seleccionado() &&
      !!this.elegibilidad()?.elegible &&
      retiroFormularioListo({
        fechaRetiro: this.fechaRetiro(),
        motivo: this.motivo(),
        sustento: this.sustento(),
        fechaMin: this.fechaMin(),
        fechaMax: this.fechaMax(),
      })
    );
  }

  confirmarRetiro(): void {
    const student = this.seleccionado();
    if (!student || !this.puedeRegistrar()) return;
    if (!window.confirm(`¿Confirma el retiro de ${student.apellidos}, ${student.nombres}? La vacante se liberará y el historial se conservará.`)) {
      return;
    }
    const key = crypto.randomUUID();
    this.svc.register(student.id, {
      fechaRetiro: this.fechaRetiro(),
      motivo: this.motivo(),
      sustento: this.sustento(),
    }, key).subscribe({
      next: (res) => {
        this.svc.saving.set(false);
        this.success.set(
          `Retiro registrado. Vacantes disponibles en el salón: ${res.vacantesDisponiblesDespues}. Notas conservadas: ${res.notasConservadas}.`,
        );
        this.fechaRetiro.set('');
        this.motivo.set('');
        this.sustento.set('');
        this.seleccionado.set(null);
        this.elegibilidad.set(null);
        this.cargarLista();
        this.filtrarEstudiantes();
      },
      error: (err) => {
        this.svc.saving.set(false);
        this.error.set(httpErrorMessage(err, 'No se pudo registrar el retiro'));
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
