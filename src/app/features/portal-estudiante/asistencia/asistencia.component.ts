import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { AsistenciaEstudianteService } from '../../asistencia/services/asistencia-estudiante.service';
import { EstadoAsistencia } from '../../asistencia/models/asistencia-estudiante.model';

@Component({
  standalone: true,
  imports: [NgClass, FormsModule],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Mi Asistencia</h2>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ auth.nombreCompleto() }} · {{ perfil().aulaLabel }} · Año {{ svc.anioActual }} · {{ mesSeleccionadoLabel() }}
          </p>
        </div>
        <div class="flex gap-3">
          <div class="w-44">
            <label class="form-label">Mes</label>
            <select
              class="form-input"
              [ngModel]="filtroMes()"
              (ngModelChange)="filtroMes.set($event)">
              @for (mes of mesesDisponibles(); track mes) {
                <option [value]="mes">{{ svc.formatMes(mes) }}</option>
              }
            </select>
          </div>
          <div class="w-40">
            <label class="form-label">Estado</label>
            <select
              class="form-input"
              [ngModel]="filtroEstado()"
              (ngModelChange)="filtroEstado.set($event)">
              <option value="TODOS">Todos</option>
              <option value="P">Presentes</option>
              <option value="F">Faltas</option>
              <option value="T">Tardanzas</option>
              <option value="J">Justificadas</option>
            </select>
          </div>
        </div>
      </div>

      @let r = resumen();
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div class="card p-4">
          <p class="text-xs text-gray-500">Asistencia</p>
          <p class="text-2xl font-bold" [ngClass]="r.asistenciaPct >= 90 ? 'text-emerald-600' : r.asistenciaPct >= 75 ? 'text-amber-600' : 'text-red-600'">
            {{ r.asistenciaPct }}%
          </p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-gray-500">Días registrados</p>
          <p class="text-2xl font-bold text-gray-800">{{ r.totalDias }}</p>
        </div>
        <div class="card p-4 border-l-4 border-l-emerald-400">
          <p class="text-xs text-emerald-600">Presentes</p>
          <p class="text-2xl font-bold text-emerald-600">{{ r.presentes }}</p>
        </div>
        <div class="card p-4 border-l-4 border-l-red-400">
          <p class="text-xs text-red-600">Faltas</p>
          <p class="text-2xl font-bold text-red-600">{{ r.faltas }}</p>
        </div>
        <div class="card p-4 border-l-4 border-l-amber-400">
          <p class="text-xs text-amber-600">Tardanzas</p>
          <p class="text-2xl font-bold text-amber-600">{{ r.tardanzas }}</p>
        </div>
        <div class="card p-4 border-l-4 border-l-blue-400">
          <p class="text-xs text-blue-600">Inasist. justificadas</p>
          <p class="text-2xl font-bold text-blue-600">{{ r.justificadas }}</p>
        </div>
      </div>

      <div class="card p-4">
        <div class="flex items-center justify-between gap-4 mb-2">
          <div class="text-sm font-semibold text-gray-700">Historial de asistencia</div>
          <div class="text-xs text-gray-400">{{ registrosFiltrados().length }} registro(s)</div>
        </div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all"
            [style.width.%]="resumen().asistenciaPct"
            [ngClass]="resumen().asistenciaPct >= 90 ? 'bg-emerald-500' : resumen().asistenciaPct >= 75 ? 'bg-amber-400' : 'bg-red-400'">
          </div>
        </div>
      </div>

      <div class="card overflow-hidden">
        <table class="data-table w-full text-sm">
          <thead>
            <tr>
              <th class="text-left">Fecha</th>
              <th class="text-left">Día</th>
              <th class="text-center">Estado</th>
              <th class="text-left">Observación</th>
            </tr>
          </thead>
          <tbody>
            @for (reg of registrosFiltrados(); track reg.id) {
              <tr>
                <td class="text-gray-700 font-medium">{{ svc.formatFecha(reg.fecha) }}</td>
                <td class="text-gray-500 capitalize">{{ svc.formatDia(reg.fecha) }}</td>
                <td class="text-center">
                  <span class="badge text-xs" [ngClass]="svc.estadoBadge(reg.estado)">
                    {{ reg.estado }} · {{ svc.estadoLabel(reg.estado) }}
                  </span>
                </td>
                <td class="text-gray-500 text-sm">{{ reg.observacion || '—' }}</td>
              </tr>
            }
            @if (!registrosFiltrados().length) {
              <tr>
                <td colspan="4" class="text-center py-10 text-sm text-gray-400">
                  Sin registros para el filtro seleccionado.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AsistenciaEstudianteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly svc = inject(AsistenciaEstudianteService);

  readonly perfil = computed(() => this.svc.getPerfil());
  readonly registros = computed(() => this.svc.registros());
  readonly mesesDisponibles = computed(() =>
    this.svc.obtenerMesesDisponibles(this.registros()),
  );

  readonly filtroMes = signal<string>(this.svc.mesActual());
  readonly filtroEstado = signal<EstadoAsistencia | 'TODOS'>('TODOS');

  readonly registrosPorMes = computed(() =>
    this.svc.filtrarPorMes(this.registros(), this.filtroMes()),
  );

  readonly resumen = computed(() => this.svc.calcularResumen(this.registrosPorMes()));

  readonly registrosFiltrados = computed(() =>
    this.svc.filtrarRegistros(this.registrosPorMes(), this.filtroEstado()),
  );

  readonly mesSeleccionadoLabel = computed(() => this.svc.formatMes(this.filtroMes()));

  private readonly syncFiltroMes = effect(() => {
    const meses = this.mesesDisponibles();
    if (!meses.length) return;
    const mesActual = this.svc.mesActual();
    const seleccionado = this.filtroMes();
    if (!meses.includes(seleccionado)) {
      this.filtroMes.set(meses.includes(mesActual) ? mesActual : meses[0]);
    }
  });

  ngOnInit(): void {
    this.layout.setTitle('Mi Asistencia');
    this.svc.load();
  }
}


