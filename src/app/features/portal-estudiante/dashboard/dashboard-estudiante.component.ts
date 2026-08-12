import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { HorariosService } from '../../academico/horarios/services/horarios.service';
import { ComunicadosService, TipoCom } from '../../comunicaciones/comunicados/comunicados.service';
import { TareasEstudianteService } from '../tareas/tareas-estudiante.service';
import { cursoStyle } from '../tareas/tareas.model';
import { DIAS } from '../../academico/horarios/data/horario.constants';

const TIPO_COM_CFG: Record<TipoCom, { badge: string; label: string }> = {
  general: { badge: 'badge-gray', label: 'General' },
  academico: { badge: 'badge-indigo', label: 'Académico' },
  administrativo: { badge: 'badge-gray', label: 'Administrativo' },
  urgente: { badge: 'badge-red', label: 'Urgente' },
  evento: { badge: 'badge-purple', label: 'Evento' },
};

@Component({
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Hola, {{ primerNombre() }} 👋</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Tu inicio académico · anuncios, tareas y clases de hoy
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge badge-indigo">{{ perfil().aulaLabel }}</span>
          <a routerLink="/portal-estudiante/horarios" class="btn btn-secondary btn-sm">
            <span class="icon icon-sm">schedule</span> Horario completo
          </a>
        </div>
      </div>

      @if (comunicadosUrgentes().length) {
        <div class="card p-4 border-red-100 bg-red-50/60">
          <div class="flex items-start gap-3">
            <span class="icon text-red-600 shrink-0">campaign</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-red-800">Avisos urgentes</p>
              <div class="mt-2 space-y-1.5">
                @for (c of comunicadosUrgentes(); track c.id) {
                  <a routerLink="/portal-estudiante/comunicados"
                    class="block text-sm text-red-900 hover:underline truncate">{{ c.titulo }}</a>
                }
              </div>
            </div>
            <a routerLink="/portal-estudiante/comunicados" class="text-xs text-red-700 font-medium shrink-0 hover:underline">
              Ver todos
            </a>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div class="xl:col-span-2 space-y-5">
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <span class="icon text-indigo-600">campaign</span> Anuncios
              </h3>
              <span class="text-xs text-gray-400">{{ anunciosPreview().length }} de {{ comunicadosActivos() }}</span>
            </div>

            @if (comunicadosSvc.loading()) {
              <p class="text-sm text-gray-400 py-6 text-center">Cargando anuncios…</p>
            } @else if (!anunciosPreview().length) {
              <p class="text-sm text-gray-400 py-6 text-center">No hay anuncios publicados para alumnos.</p>
            } @else {
              <div class="space-y-3">
                @for (c of anunciosPreview(); track c.id) {
                  <div class="p-3 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors">
                    <div class="flex items-start justify-between gap-2 mb-1">
                      <p class="text-sm font-medium text-gray-800">{{ c.titulo }}</p>
                      <div class="flex items-center gap-1 shrink-0">
                        <span class="badge text-[10px]" [ngClass]="tipoComCfg(c.tipo).badge">
                          {{ tipoComCfg(c.tipo).label }}
                        </span>
                        @if (c.prioridad === 'alta' || c.tipo === 'urgente') {
                          <span class="badge badge-red text-[10px]">Urgente</span>
                        }
                      </div>
                    </div>
                    <p class="text-xs text-gray-500 line-clamp-2">{{ c.cuerpo }}</p>
                    <p class="text-[11px] text-gray-400 mt-1">{{ c.fechaPublicacion }}</p>
                  </div>
                }
              </div>
            }

            <div class="mt-4 pt-4 border-t border-gray-100">
              <a routerLink="/portal-estudiante/comunicados" class="text-xs text-indigo-600 hover:underline font-medium">
                Ver todos los comunicados
              </a>
            </div>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <span class="icon text-amber-600">assignment</span> Próximas tareas a entregar
              </h3>
              <span class="text-xs text-gray-400">{{ tareasPorEntregar().length }} pendiente(s)</span>
            </div>

            @if (tareasSvc.loading()) {
              <p class="text-sm text-gray-400 py-6 text-center">Cargando tareas…</p>
            } @else if (!tareasPorEntregar().length) {
              <p class="text-sm text-gray-400 py-6 text-center">No tienes tareas pendientes por entregar.</p>
            } @else {
              <div class="space-y-3">
                @for (t of tareasPorEntregar(); track t.id) {
                  @let estilo = cursoStyle(t.curso);
                  <a routerLink="/portal-estudiante/tareas"
                    class="block p-3 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors">
                    <div class="flex items-start gap-3">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                        [ngClass]="estilo.colorClass">
                        {{ estilo.emoji }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2">
                          <p class="text-sm font-medium text-gray-800">{{ t.titulo }}</p>
                          <span class="badge text-[10px] shrink-0" [ngClass]="tareasSvc.prioridadBadge(t.prioridad)">
                            {{ tareasSvc.prioridadLabel(t.prioridad) }}
                          </span>
                        </div>
                        <p class="text-xs text-gray-500 mt-0.5">{{ t.curso }}</p>
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
                          <span class="inline-flex items-center gap-1 text-gray-500">
                            <span class="icon icon-sm">event</span>
                            Entrega {{ tareasSvc.formatFecha(t.fechaEntrega) }}
                          </span>
                          <span class="font-medium"
                            [ngClass]="t.vencida ? 'text-red-600' : t.venceHoy ? 'text-amber-600' : 'text-indigo-600'">
                            {{ tareasSvc.diasRestantesLabel(t.diasRestantes, t.venceHoy, t.vencida) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                }
              </div>
            }

            <div class="mt-4 pt-4 border-t border-gray-100">
              <a routerLink="/portal-estudiante/tareas" class="text-xs text-indigo-600 hover:underline font-medium">
                Ir a mis tareas
              </a>
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <span class="icon text-indigo-600">calendar_today</span> Mi semana
              </h3>
              <span class="text-xs text-gray-400 capitalize">{{ tituloSemana() }}</span>
            </div>

            <div class="grid grid-cols-5 gap-1.5 mb-4">
              @for (dia of semanaLaboral(); track dia.fecha.getTime()) {
                <div class="rounded-xl border p-2 text-center transition-colors"
                  [ngClass]="dia.esHoy
                    ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                    : dia.clases.length
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-100 bg-gray-50/80'">
                  <p class="text-[10px] uppercase font-semibold"
                    [ngClass]="dia.esHoy ? 'text-indigo-600' : 'text-gray-400'">
                    {{ dia.nombreCorto }}
                  </p>
                  <p class="text-sm font-bold mt-0.5"
                    [ngClass]="dia.esHoy ? 'text-indigo-700' : 'text-gray-700'">
                    {{ dia.fecha.getDate() }}
                  </p>
                  @if (dia.clases.length) {
                    <p class="text-[10px] mt-1 font-medium"
                      [ngClass]="dia.esHoy ? 'text-indigo-600' : 'text-gray-500'">
                      {{ dia.clases.length }} cls
                    </p>
                  }
                </div>
              }
            </div>

            <div class="border-t border-gray-100 pt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-gray-800 capitalize">
                  Clases de hoy · {{ tituloHoy() }}
                </h4>
                @if (clasesHoyDetalle().length) {
                  <span class="badge badge-indigo text-[10px]">{{ clasesHoyDetalle().length }}</span>
                }
              </div>

              @if (esFinDeSemana()) {
                <p class="text-sm text-gray-400 py-4 text-center">Hoy no hay clases programadas.</p>
              } @else if (!clasesHoyDetalle().length) {
                <p class="text-sm text-gray-400 py-4 text-center">No tienes clases en el horario de hoy.</p>
              } @else {
                <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
                  @for (cl of clasesHoyDetalle(); track cl.periodo.id) {
                    <div class="flex items-center gap-3 p-2.5 rounded-xl border" [ngClass]="cl.curso.colorClass">
                      <div class="text-center shrink-0 w-14">
                        <div class="text-xs font-bold">{{ cl.periodo.horaInicio }}</div>
                        <div class="text-[10px] opacity-60">{{ cl.periodo.horaFin }}</div>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-semibold text-sm truncate">{{ cl.curso.nombre }}</div>
                        <div class="text-xs opacity-70 truncate">{{ cl.docente.abrev }} · {{ cl.periodo.nombre }}</div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="card p-4">
              <p class="text-xs text-gray-500">Tareas pendientes</p>
              <p class="text-2xl font-bold text-amber-600 mt-1">{{ tareasSvc.pendientes().length }}</p>
            </div>
            <div class="card p-4">
              <p class="text-xs text-gray-500">Clases hoy</p>
              <p class="text-2xl font-bold text-indigo-700 mt-1">{{ clasesHoyDetalle().length }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardEstudianteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly horariosSvc = inject(HorariosService);
  readonly comunicadosSvc = inject(ComunicadosService);
  readonly tareasSvc = inject(TareasEstudianteService);

  readonly cursoStyle = cursoStyle;
  readonly tipoComCfg = (tipo: TipoCom) => TIPO_COM_CFG[tipo];

  readonly perfil = computed(() => this.horariosSvc.getPerfilEstudiante());
  readonly entradas = computed(() => {
    this.horariosSvc.entradas();
    return this.horariosSvc.getEntradas(this.perfil());
  });

  readonly comunicadosActivos = computed(() => this.comunicadosSvc.paraAlumnos().length);
  readonly comunicadosUrgentes = computed(() =>
    this.comunicadosSvc.urgentesNoLeidosEstudiante().slice(0, 3),
  );
  readonly anunciosPreview = computed(() => this.comunicadosSvc.paraAlumnos().slice(0, 4));

  readonly tareasPorEntregar = computed(() =>
    this.tareasSvc
      .tareas()
      .filter(t => t.estado === 'PENDING' || t.estado === 'OVERDUE')
      .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega))
      .slice(0, 5),
  );

  readonly semanaLaboral = computed(() => {
    const fechas = this.horariosSvc.fechasSemanaLaboral(new Date());
    const entradas = this.entradas();
    const nivel = this.perfil().nivel;

    return fechas.map((fecha, i) => {
      const diaHorario = this.horariosSvc.diaHorarioDesdeFecha(fecha);
      const clases =
        diaHorario !== null ? this.horariosSvc.clasesDelDia(entradas, diaHorario, nivel) : [];
      return {
        fecha,
        nombreCorto: DIAS[i]?.slice(0, 3) ?? '',
        esHoy: isToday(fecha),
        clases,
      };
    });
  });

  readonly clasesHoyDetalle = computed(() => {
    const dia = this.horariosSvc.diaActualHorario();
    if (dia === null) return [];
    return this.horariosSvc.clasesDelDia(this.entradas(), dia, this.perfil().nivel);
  });

  readonly esFinDeSemana = computed(() => this.horariosSvc.diaActualHorario() === null);

  readonly tituloSemana = computed(() =>
    format(new Date(), 'MMMM yyyy', { locale: es }),
  );

  readonly tituloHoy = computed(() =>
    format(new Date(), "EEEE d 'de' MMMM", { locale: es }),
  );

  ngOnInit(): void {
    this.layout.setTitle('Inicio');
    this.tareasSvc.load();
  }

  primerNombre(): string {
    return this.auth.currentUser()?.nombre?.split(' ')[0] ?? 'Estudiante';
  }
}
