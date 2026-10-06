import { Component, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AsistenciaRegistroComponent } from '../../asistencia/registro/asistencia-registro.component';
import { DocenteSalonAsignado } from './asistencia-docente.model';
import { AsistenciaDocenteService } from './asistencia-docente.service';
import { MaestrosPeriodosAcademicosService } from '../../matricula/maestros/periodos-academicos/periodos-academicos.service';
import { PeriodoAcademicoItem } from '../../matricula/maestros/periodos-academicos/periodos-academicos.model';

@Component({
  standalone: true,
  imports: [NgClass, AsistenciaRegistroComponent],
  template: `
<div class="space-y-5 animate-fade-in">

  @if (toast()) {
    <div class="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
         [ngClass]="toast()!.tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'">
      {{ toast()!.msg }}
    </div>
  }

  @if (!salonSeleccionado()) {
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Asistencia docente</h2>
        <p class="text-sm text-gray-500">
          Selecciona un salón asignado para tomar la asistencia del día
          @if (anioEscolar()) {
            · A.E. {{ anioEscolar() }}
            @if (periodoActual()) { · {{ periodoActual()!.nombre }} }
          }
        </p>
      </div>
    </div>

    @if (error()) {
      <div class="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">{{ error() }}</div>
    }

    @if (svc.loading()) {
      <div class="card p-10 text-center text-gray-500">Cargando salones asignados…</div>
    } @else if (!salones().length) {
      <div class="card p-10 text-center text-gray-500">
        <div class="text-4xl mb-3">🏫</div>
        <p class="font-medium text-gray-700">No tienes salones asignados</p>
        <p class="text-sm mt-1">Contacta a coordinación académica para revisar tu asignación.</p>
      </div>
    } @else {
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        @for (s of salones(); track salonKey(s)) {
          <button type="button"
                  class="card px-3 py-3 text-left hover:shadow-md hover:border-indigo-200 border border-transparent transition-all border-l-4 border-l-indigo-500"
                  (click)="seleccionarSalon(s)">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">{{ s.nivel }}</div>
                <h3 class="font-bold text-gray-800 text-base leading-snug">{{ s.grado }} "{{ s.seccion }}"</h3>
                <p class="text-xs text-gray-500 mt-0.5">{{ s.totalAlumnos }} alumno(s)</p>
              </div>
              <span class="icon text-indigo-500 shrink-0">fact_check</span>
            </div>
            @if (s.cursos.length) {
              <div class="mt-2 flex flex-wrap gap-1">
                @for (c of s.cursos.slice(0, 3); track c) {
                  <span class="badge badge-gray text-[10px]">{{ c }}</span>
                }
                @if (s.cursos.length > 3) {
                  <span class="badge badge-gray text-[10px]">+{{ s.cursos.length - 3 }}</span>
                }
              </div>
            }
          </button>
        }
      </div>
    }
  } @else {
    <div class="flex items-center gap-3">
      <button type="button" class="btn btn-secondary btn-sm" (click)="volverASalones()">
        <span class="icon icon-sm">arrow_back</span> Mis salones
      </button>
      <div>
        <h2 class="text-lg font-bold text-gray-800">{{ salonSeleccionado()!.label }}</h2>
        <p class="text-sm text-gray-500">{{ salonSeleccionado()!.totalAlumnos }} alumnos · Registro diario</p>
      </div>
    </div>

    <app-asistencia-registro
      [modoDocente]="true"
      [salonInicial]="salonSeleccionado()!"
    />
  }
</div>
  `,
})
export class AsistenciaDocenteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly svc = inject(AsistenciaDocenteService);
  private readonly periodosSvc = inject(MaestrosPeriodosAcademicosService);

  salones = signal<DocenteSalonAsignado[]>([]);
  salonSeleccionado = signal<DocenteSalonAsignado | null>(null);
  anioEscolar = signal<number | null>(null);
  periodoActual = signal<PeriodoAcademicoItem | null>(null);
  error = signal('');
  toast = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

  ngOnInit(): void {
    this.layout.setTitle('Asistencia docente');
    this.cargarSalones();

    this.route.queryParamMap.subscribe((params) => {
      const nivel = params.get('nivel');
      const grado = params.get('grado');
      const seccion = params.get('seccion');
      if (!nivel || !grado || !seccion) return;

      const found = this.salones().find(
        (s) =>
          s.nivel === nivel &&
          s.grado === grado &&
          s.seccion.toUpperCase() === seccion.toUpperCase(),
      );
      if (found) this.salonSeleccionado.set(found);
    });
  }

  cargarSalones(): void {
    this.error.set('');
    this.periodosSvc.resolveContext().subscribe({
      next: (ctx) => {
        this.periodoActual.set(ctx.periodoActual);
        this.anioEscolar.set(ctx.anioEscolar);
      },
    });
    this.svc.loadMisSalones().subscribe({
      next: (res) => {
        this.salones.set(res.salones);
        this.anioEscolar.set(res.anioEscolar);
        this.aplicarQuerySalon();
      },
      error: (err) => {
        const msg =
          err?.error?.message ??
          'No se pudieron cargar tus salones asignados.';
        this.error.set(typeof msg === 'string' ? msg : 'Error al cargar salones');
        this.salones.set([]);
      },
    });
  }

  seleccionarSalon(salon: DocenteSalonAsignado): void {
    this.salonSeleccionado.set(salon);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        nivel: salon.nivel,
        grado: salon.grado,
        seccion: salon.seccion,
      },
      queryParamsHandling: 'merge',
    });
  }

  volverASalones(): void {
    this.salonSeleccionado.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { nivel: null, grado: null, seccion: null },
      queryParamsHandling: 'merge',
    });
  }

  salonKey(s: DocenteSalonAsignado): string {
    return `${s.nivel}|${s.grado}|${s.seccion}`;
  }

  private aplicarQuerySalon(): void {
    const params = this.route.snapshot.queryParamMap;
    const nivel = params.get('nivel');
    const grado = params.get('grado');
    const seccion = params.get('seccion');
    if (!nivel || !grado || !seccion) return;

    const found = this.salones().find(
      (s) =>
        s.nivel === nivel &&
        s.grado === grado &&
        s.seccion.toUpperCase() === seccion.toUpperCase(),
    );
    if (found) this.salonSeleccionado.set(found);
  }
}
