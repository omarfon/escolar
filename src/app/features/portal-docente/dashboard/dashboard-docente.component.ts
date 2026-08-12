import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ComunicadosService, TipoCom } from '../../comunicaciones/comunicados/comunicados.service';
import { EventosService } from '../../comunicaciones/eventos/eventos.service';
import { EventoItem, TIPOS_EVENTO } from '../../comunicaciones/eventos/eventos.model';
import { PortalDocenteService } from '../portal-docente.service';
import { PendienteRevisionDocente, TareasDocenteService } from '../tareas/tareas-docente.service';
import { estadoEntregaBadge, estadoEntregaLabel } from '../tareas/tareas-docente.model';

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
            Tu inicio docente · pendientes, anuncios y eventos
            @if (miAula(); as d) {
              · {{ d.docente.especialidad }}
            }
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          @if (miAula(); as d) {
            <span class="badge badge-indigo">A.E. {{ d.anioEscolar }}</span>
          }
          <a routerLink="/portal-docente/mi-aula" class="btn btn-secondary btn-sm">
            <span class="icon icon-sm">class</span> Mi Aula
          </a>
        </div>
      </div>

      @if (portalSvc.perfilError()) {
        <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {{ portalSvc.perfilError() }}
        </div>
      }

      @if (comunicadosUrgentes().length) {
        <div class="card p-4 border-red-100 bg-red-50/60">
          <div class="flex items-start gap-3">
            <span class="icon text-red-600 shrink-0">campaign</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-red-800">Avisos urgentes</p>
              <div class="mt-2 space-y-1.5">
                @for (c of comunicadosUrgentes(); track c.id) {
                  <a routerLink="/portal-docente/comunicados"
                    class="block text-sm text-red-900 hover:underline truncate">{{ c.titulo }}</a>
                }
              </div>
            </div>
            <a routerLink="/portal-docente/comunicados" class="text-xs text-red-700 font-medium shrink-0 hover:underline">
              Ver todos
            </a>
          </div>
        </div>
      }

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        @for (kpi of kpis(); track kpi.label) {
          <div class="card p-4">
            <p class="text-xs text-gray-400">{{ kpi.label }}</p>
            <p class="text-2xl font-bold mt-1" [ngClass]="kpi.color">{{ kpi.value }}</p>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div class="xl:col-span-2 space-y-5">
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <span class="icon text-violet-600">rate_review</span> Pendientes de revisión
              </h3>
              <span class="text-xs text-gray-400">{{ porCalificar().length }} entrega(s)</span>
            </div>

            @if (tareasSvc.loadingPendientes()) {
              <p class="text-sm text-gray-400 py-6 text-center">Cargando pendientes…</p>
            } @else if (!porCalificar().length && !vencidasSinEntrega().length) {
              <p class="text-sm text-gray-400 py-6 text-center">No tienes entregas pendientes de calificar.</p>
            } @else {
              @if (porCalificar().length) {
                <div class="space-y-3">
                  @for (p of porCalificarPreview(); track p.id) {
                    <a routerLink="/portal-docente/tareas"
                      class="block p-3 rounded-xl border border-violet-100 bg-violet-50/40 hover:bg-violet-50 transition-colors">
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-gray-800">{{ p.tareaTitulo }}</p>
                          <p class="text-xs text-gray-500 mt-0.5">{{ p.alumnoLabel }} · {{ p.salonLabel }}</p>
                          <p class="text-xs text-gray-400 mt-1">{{ p.curso }}</p>
                        </div>
                        <span class="badge badge-green text-[10px] shrink-0">Por calificar</span>
                      </div>
                    </a>
                  }
                </div>
              }

              @if (vencidasSinEntrega().length) {
                <div class="mt-4 pt-4 border-t border-gray-100">
                  <p class="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">
                    Sin entrega · {{ vencidasSinEntrega().length }}
                  </p>
                  <div class="space-y-2">
                    @for (p of vencidasPreview(); track p.id) {
                      <div class="p-2.5 rounded-lg border border-amber-100 bg-amber-50/50 text-sm">
                        <div class="flex items-center justify-between gap-2">
                          <span class="font-medium text-gray-800 truncate">{{ p.tareaTitulo }}</span>
                          <span class="badge text-[10px] shrink-0" [ngClass]="estadoEntregaBadge(p.estado)">
                            {{ estadoEntregaLabel(p.estado) }}
                          </span>
                        </div>
                        <p class="text-xs text-gray-500 mt-0.5">{{ p.alumnoLabel }} · vence {{ p.fechaEntregaDisplay }}</p>
                      </div>
                    }
                  </div>
                </div>
              }
            }

            <div class="mt-4 pt-4 border-t border-gray-100">
              <a routerLink="/portal-docente/tareas" class="text-xs text-indigo-600 hover:underline font-medium">
                Ir a entregas y tareas
              </a>
            </div>
          </div>

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
              <p class="text-sm text-gray-400 py-6 text-center">No hay anuncios publicados para docentes.</p>
            } @else {
              <div class="space-y-3">
                @for (c of anunciosPreview(); track c.id) {
                  <div class="p-3 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors">
                    <div class="flex items-start justify-between gap-2 mb-1">
                      <p class="text-sm font-medium text-gray-800">{{ c.titulo }}</p>
                      <span class="badge text-[10px]" [ngClass]="tipoComCfg(c.tipo).badge">
                        {{ tipoComCfg(c.tipo).label }}
                      </span>
                    </div>
                    <p class="text-xs text-gray-500 line-clamp-2">{{ c.cuerpo }}</p>
                    <p class="text-[11px] text-gray-400 mt-1">{{ c.fechaPublicacion }}</p>
                  </div>
                }
              </div>
            }

            <div class="mt-4 pt-4 border-t border-gray-100">
              <a routerLink="/portal-docente/comunicados" class="text-xs text-indigo-600 hover:underline font-medium">
                Ver todos los comunicados
              </a>
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <span class="icon text-purple-600">event</span> Próximos eventos
              </h3>
            </div>

            @if (eventosLoading()) {
              <p class="text-sm text-gray-400 py-6 text-center">Cargando eventos…</p>
            } @else if (!eventosPreview().length) {
              <p class="text-sm text-gray-400 py-6 text-center">No hay eventos programados.</p>
            } @else {
              <div class="space-y-3">
                @for (e of eventosPreview(); track e.id) {
                  <div class="p-3 rounded-xl border border-gray-100">
                    <p class="text-sm font-medium text-gray-800">{{ e.titulo }}</p>
                    <p class="text-xs text-gray-500 mt-1">{{ rangoEvento(e) }}</p>
                  </div>
                }
              </div>
            }
          </div>

          @if (miAula(); as d) {
            <div class="card p-5">
              <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span class="icon text-indigo-600">school</span> Resumen del aula
              </h3>
              <ul class="text-sm text-gray-600 space-y-2">
                <li class="flex justify-between"><span>Cursos</span><strong>{{ d.resumen.totalCursos }}</strong></li>
                <li class="flex justify-between"><span>Salones</span><strong>{{ d.resumen.totalSalones }}</strong></li>
                <li class="flex justify-between"><span>Alumnos</span><strong>{{ d.resumen.totalAlumnos }}</strong></li>
              </ul>
              <a routerLink="/portal-docente/mi-aula" class="btn btn-secondary btn-sm w-full mt-4">
                Ver mis cursos
              </a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class DashboardDocenteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly portalSvc = inject(PortalDocenteService);
  readonly comunicadosSvc = inject(ComunicadosService);
  readonly tareasSvc = inject(TareasDocenteService);
  private readonly eventosSvc = inject(EventosService);

  private readonly _eventos = signal<EventoItem[]>([]);
  private readonly _porCalificar = signal<PendienteRevisionDocente[]>([]);
  private readonly _vencidasSinEntrega = signal<PendienteRevisionDocente[]>([]);
  readonly eventosLoading = signal(false);

  readonly miAula = this.portalSvc.miAula;
  readonly porCalificar = this._porCalificar.asReadonly();
  readonly vencidasSinEntrega = this._vencidasSinEntrega.asReadonly();

  readonly estadoEntregaBadge = estadoEntregaBadge;
  readonly estadoEntregaLabel = estadoEntregaLabel;
  readonly tipoComCfg = (tipo: TipoCom) => TIPO_COM_CFG[tipo];

  readonly primerNombre = computed(() => this.auth.currentUser()?.nombre?.split(' ')[0] ?? 'Docente');

  readonly comunicadosActivos = computed(() => this.comunicadosSvc.paraDocentes().length);
  readonly comunicadosUrgentes = computed(() =>
    this.comunicadosSvc.urgentesNoLeidosDocente().slice(0, 3),
  );
  readonly anunciosPreview = computed(() => this.comunicadosSvc.paraDocentes().slice(0, 4));

  readonly porCalificarPreview = computed(() => this.porCalificar().slice(0, 6));
  readonly vencidasPreview = computed(() => this.vencidasSinEntrega().slice(0, 4));

  readonly eventosPreview = computed(() =>
    this._eventos()
      .filter(e => e.publicado && !e.cancelado)
      .filter(e => e.destinatarios === 'docentes' || e.destinatarios === 'todos')
      .filter(e => e.estado === 'programado' || e.estado === 'en_curso')
      .slice(0, 4),
  );

  readonly kpis = computed(() => {
    const r = this.miAula()?.resumen;
    return [
      { label: 'Por calificar', value: this.porCalificar().length, color: 'text-violet-700' },
      { label: 'Sin entrega', value: this.vencidasSinEntrega().length, color: 'text-amber-600' },
      { label: 'Cursos', value: r?.totalCursos ?? 0, color: 'text-gray-900' },
      { label: 'Alumnos', value: r?.totalAlumnos ?? 0, color: 'text-indigo-700' },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle('Inicio');
    const anio = new Date().getFullYear();
    this.portalSvc.ensureLoaded(anio).subscribe();
    this.tareasSvc.loadPendientesRevision(anio).subscribe({
      next: (res) => {
        this._porCalificar.set(res.porCalificar);
        this._vencidasSinEntrega.set(res.vencidasSinEntrega);
      },
    });
    this.cargarEventos();
  }

  cargarEventos(): void {
    this.eventosLoading.set(true);
    this.eventosSvc.load().subscribe({
      next: (items) => {
        this._eventos.set(items);
        this.eventosLoading.set(false);
      },
      error: () => {
        this._eventos.set([]);
        this.eventosLoading.set(false);
      },
    });
  }

  rangoEvento(e: EventoItem): string {
    if (e.fechaFinDisplay && e.fechaFinDisplay !== e.fechaInicioDisplay) {
      return `${e.fechaInicioDisplay} – ${e.fechaFinDisplay}`;
    }
    return e.fechaInicioDisplay;
  }
}
