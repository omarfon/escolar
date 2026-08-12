import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { ComunicadosService, Comunicado, TipoCom } from '../../comunicaciones/comunicados/comunicados.service';

const TIPO_CFG: Record<TipoCom, { badge: string; label: string; icon: string }> = {
  general:        { badge: 'badge-blue',   label: 'General',        icon: 'campaign'             },
  academico:      { badge: 'badge-indigo', label: 'Acad\u00e9mico',      icon: 'school'               },
  administrativo: { badge: 'badge-gray',   label: 'Administrativo', icon: 'admin_panel_settings' },
  urgente:        { badge: 'badge-red',    label: 'Urgente',        icon: 'warning'              },
  evento:         { badge: 'badge-purple', label: 'Evento',         icon: 'event'                },
};

@Component({
  standalone: true,
  imports: [NgClass],
  template: `
<div class="space-y-5 animate-fade-in">

  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-bold text-gray-800">Comunicados de la Instituci\u00f3n</h2>
      <p class="text-sm text-gray-500">Avisos y comunicados dirigidos a padres de familia</p>
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-500">
      <span class="icon text-base text-indigo-400">mark_email_read</span>
      <span>{{ svc.leidosPadre().size }} le\u00eddos de {{ svc.paraPadres().length }}</span>
    </div>
  </div>

  @if (!svc.paraPadres().length) {
    <div class="card p-16 flex flex-col items-center justify-center text-center text-gray-400">
      <div class="text-5xl mb-4">📭</div>
      <div class="font-semibold text-gray-600 mb-1">Sin comunicados activos</div>
      <div class="text-sm">No hay comunicados publicados en este momento</div>
    </div>
  }

  @if (urgentesActivos().length) {
    <div class="space-y-3">
      <div class="flex items-center gap-2 text-sm font-semibold text-red-600">
        <span class="icon text-base">warning</span> Comunicados urgentes
      </div>
      @for (c of urgentesActivos(); track c.id) {
        <div class="border-2 border-red-200 bg-red-50 rounded-xl p-5">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <span class="icon text-base text-red-500">{{ tipoIcon(c.tipo) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-1 flex-wrap">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-800">{{ c.titulo }}</span>
                </div>
                <span class="badge badge-red text-xs shrink-0">Urgente</span>
              </div>
              <p class="text-sm text-gray-600 leading-relaxed mb-3"
                 [ngClass]="expandidos().has(c.id) ? '' : 'line-clamp-2'">{{ c.cuerpo }}</p>
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-3 text-xs text-gray-400">
                  <span class="flex items-center gap-1"><span class="icon text-xs">person</span>{{ c.autor }}</span>
                  <span class="flex items-center gap-1"><span class="icon text-xs">calendar_today</span>{{ c.fechaPublicacion }}</span>
                  @if (c.fechaVencimiento) {
                    <span class="flex items-center gap-1"><span class="icon text-xs">event_busy</span>Vence: {{ c.fechaVencimiento }}</span>
                  }
                </div>
                <div class="flex gap-3">
                  <button class="text-xs text-indigo-500 hover:text-indigo-700 font-medium" (click)="toggleExpandir(c.id)">
                    {{ expandidos().has(c.id) ? 'Ver menos' : 'Ver m\u00e1s' }}
                  </button>
                  @if (svc.noLeido(c.id, 'padre')) {
                    <button class="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1" (click)="marcarLeido(c.id)">
                      <span class="icon text-xs">done</span> Marcar como le\u00eddo
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  }

  @if (normalesActivos().length) {
    <div class="space-y-3">
      @if (urgentesActivos().length) {
        <div class="text-sm font-semibold text-gray-600 flex items-center gap-2">
          <span class="icon text-base text-gray-400">campaign</span> Otros comunicados
        </div>
      }
      @for (c of normalesActivos(); track c.id) {
        <div class="card border rounded-xl p-5" [ngClass]="svc.leidosPadre().has(c.id) ? 'opacity-70' : ''">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                 [ngClass]="c.tipo === 'academico' ? 'bg-indigo-100' : c.tipo === 'evento' ? 'bg-purple-100' : c.tipo === 'administrativo' ? 'bg-gray-100' : 'bg-blue-100'">
              <span class="icon text-base"
                    [ngClass]="c.tipo === 'academico' ? 'text-indigo-500' : c.tipo === 'evento' ? 'text-purple-500' : c.tipo === 'administrativo' ? 'text-gray-500' : 'text-blue-500'">
                {{ tipoIcon(c.tipo) }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-1 flex-wrap">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-800">{{ c.titulo }}</span>
                  @if (svc.leidosPadre().has(c.id)) { <span class="badge badge-gray text-xs">Le\u00eddo</span> }
                  @else { <span class="badge badge-red text-xs shrink-0">Nuevo</span> }
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="badge text-xs" [ngClass]="tipoBadge(c.tipo)">{{ tipoLabel(c.tipo) }}</span>
                  <span class="badge text-xs" [ngClass]="c.prioridad === 'alta' ? 'badge-red' : c.prioridad === 'media' ? 'badge-yellow' : 'badge-gray'">
                    {{ c.prioridad === 'alta' ? 'Alta' : c.prioridad === 'media' ? 'Media' : 'Baja' }}
                  </span>
                </div>
              </div>
              <p class="text-sm text-gray-600 leading-relaxed mb-3"
                 [ngClass]="expandidos().has(c.id) ? '' : 'line-clamp-2'">{{ c.cuerpo }}</p>
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-3 text-xs text-gray-400">
                  <span class="flex items-center gap-1"><span class="icon text-xs">person</span>{{ c.autor }}</span>
                  <span class="flex items-center gap-1"><span class="icon text-xs">calendar_today</span>{{ c.fechaPublicacion }}</span>
                  @if (c.fechaVencimiento) {
                    <span class="flex items-center gap-1"><span class="icon text-xs">event_busy</span>Vence: {{ c.fechaVencimiento }}</span>
                  }
                </div>
                <div class="flex gap-3">
                  <button class="text-xs text-indigo-500 hover:text-indigo-700 font-medium" (click)="toggleExpandir(c.id)">
                    {{ expandidos().has(c.id) ? 'Ver menos' : 'Ver m\u00e1s' }}
                  </button>
                  @if (svc.noLeido(c.id, 'padre')) {
                    <button class="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1" (click)="marcarLeido(c.id)">
                      <span class="icon text-xs">done</span> Marcar como le\u00eddo
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  }

</div>
  `,
})
export class ComunicacionPadreComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly svc = inject(ComunicadosService);

  ngOnInit() {
    this.layout.setTitle('Comunicados');
    this.svc.syncLeidosFromStorage();
  }

  expandidos = signal<Set<number>>(new Set());

  urgentesActivos = computed(() =>
    this.svc.urgentesNoLeidosPadre()
      .sort((a, b) => (a.fechaPublicacion > b.fechaPublicacion ? -1 : 1)),
  );
  normalesActivos = computed(() =>
    this.svc.paraPadres()
      .filter(c => {
        const esUrgente = c.tipo === 'urgente' || c.prioridad === 'alta';
        return !esUrgente || this.svc.leidosPadre().has(c.id);
      })
      .sort((a, b) => (a.fechaPublicacion > b.fechaPublicacion ? -1 : 1)),
  );

  tipoBadge(t: TipoCom) { return 'badge ' + TIPO_CFG[t].badge; }
  tipoLabel(t: TipoCom) { return TIPO_CFG[t].label; }
  tipoIcon(t: TipoCom)  { return TIPO_CFG[t].icon;  }

  marcarLeido(id: number) {
    this.svc.marcarLeido(id, 'padre');
  }
  toggleExpandir(id: number) {
    this.expandidos.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
}
