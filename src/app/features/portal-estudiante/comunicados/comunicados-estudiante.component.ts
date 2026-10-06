import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { ComunicadosService, TipoCom } from '../../comunicaciones/comunicados/comunicados.service';
import { ConductaEstudianteService } from './conducta-estudiante.service';
import {
  ESTADO_CFG,
  NIVEL_CFG,
  TIPO_CFG as TIPO_CONDUCTA_CFG,
  tipoCardClasses,
  tipoIconBgClasses,
  tipoMedidaTextClass,
  tipoRowBorderClass,
  TipoIncidente,
} from '../../estudiantes/conducta/conducta.model';

const TIPO_CFG: Record<TipoCom, { badge: string; label: string; icon: string }> = {
  general:        { badge: 'badge-blue',   label: 'General',        icon: 'campaign'             },
  academico:      { badge: 'badge-indigo', label: 'Acad\u00e9mico',      icon: 'school'               },
  administrativo: { badge: 'badge-gray',   label: 'Administrativo', icon: 'admin_panel_settings' },
  urgente:        { badge: 'badge-red',    label: 'Urgente',        icon: 'warning'              },
  evento:         { badge: 'badge-purple', label: 'Evento',         icon: 'event'                },
};

type ConductaVista = 'meritos' | 'demeritos';

@Component({
  standalone: true,
  imports: [NgClass, NgTemplateOutlet],
  template: `
<div class="space-y-5 animate-fade-in">

  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-bold text-gray-800">Comunicados</h2>
      <p class="text-sm text-gray-500">Avisos institucionales, méritos y deméritos de conducta</p>
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-500">
      <span class="icon text-base text-indigo-400">notifications</span>
      <span>{{ svc.leidosEstudiante().size }} leídos de {{ svc.paraAlumnos().length }}</span>
    </div>
  </div>

  <section class="card overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50/80 via-white to-emerald-50/60">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
          <span class="icon text-amber-600">gavel</span> Mi conducta
        </h3>
        @if (conductSvc.conducta(); as c) {
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-indigo text-xs">Nota {{ c.conductaNota }}</span>
            <span class="badge text-xs" [ngClass]="nivelBadge(c.resumen.nivel)">{{ nivelLabel(c.resumen.nivel) }}</span>
          </div>
        }
      </div>
    </div>
    @if (conductSvc.loading()) {
      <div class="p-10 flex flex-col items-center text-gray-400">
        <span class="icon icon-xl animate-spin mb-2">progress_activity</span>
        <p class="text-sm">Cargando conducta…</p>
      </div>
    } @else if (conductSvc.conducta(); as c) {
      <div class="p-5 space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div class="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
            <p class="text-2xl font-bold text-emerald-700">{{ c.resumen.reconocimientos }}</p>
            <p class="text-[11px] text-emerald-700 font-medium mt-0.5">Méritos</p>
          </div>
          <div class="rounded-xl border border-red-100 bg-red-50/40 p-3 text-center">
            <p class="text-2xl font-bold text-red-700">{{ c.resumen.totalDemeritos }}</p>
            <p class="text-[11px] text-red-700 font-medium mt-0.5">Deméritos</p>
          </div>
          <div class="rounded-xl border border-yellow-200 bg-yellow-50/50 p-3 text-center">
            <p class="text-2xl font-bold text-yellow-700">{{ c.resumen.leves }}</p>
            <p class="text-[11px] text-yellow-800 font-medium mt-0.5">Faltas leves</p>
          </div>
          <div class="rounded-xl border border-orange-300 bg-orange-50/60 p-3 text-center">
            <p class="text-2xl font-bold text-orange-700">{{ c.resumen.graves }}</p>
            <p class="text-[11px] text-orange-800 font-medium mt-0.5">Faltas graves</p>
          </div>
          <div class="rounded-xl border border-red-400 bg-red-100/50 p-3 text-center ring-1 ring-red-200/80">
            <p class="text-2xl font-bold text-red-800">{{ c.resumen.muyGraves }}</p>
            <p class="text-[11px] text-red-900 font-medium mt-0.5">Muy graves</p>
          </div>
        </div>
        <div class="tabs">
          <button type="button" class="tab" [class.tab-active]="conductaVista() === 'meritos'"
            (click)="conductaVista.set('meritos')">
            <span class="icon icon-sm">emoji_events</span> Méritos ({{ c.meritos.length }})
          </button>
          <button type="button" class="tab" [class.tab-active]="conductaVista() === 'demeritos'"
            (click)="conductaVista.set('demeritos')">
            <span class="icon icon-sm">report</span> Deméritos ({{ c.demeritos.length }})
          </button>
        </div>
        @if (conductaVista() === 'meritos') {
          @if (!c.meritos.length) {
            <div class="py-8 text-center text-sm text-gray-400">Sin reconocimientos registrados</div>
          } @else {
            <div class="space-y-2">
              @for (item of c.meritos; track item.id) {
                <ng-container *ngTemplateOutlet="registroTpl; context: { $implicit: item, esMerito: true }"></ng-container>
              }
            </div>
          }
        } @else {
          @if (!c.demeritos.length) {
            <div class="py-8 text-center text-sm text-gray-400">Sin deméritos registrados</div>
          } @else {
            <div class="space-y-2">
              @for (item of c.demeritos; track item.id) {
                <ng-container *ngTemplateOutlet="registroTpl; context: { $implicit: item, esMerito: false }"></ng-container>
              }
            </div>
          }
        }
      </div>
    }
  </section>

  <div class="flex items-center gap-2 pt-1">
    <span class="icon text-indigo-500">campaign</span>
    <h3 class="font-semibold text-gray-800">Comunicados de la institución</h3>
  </div>

  @if (!svc.paraAlumnos().length) {
    <div class="card p-16 flex flex-col items-center justify-center text-center text-gray-400">
      <div class="text-5xl mb-4">📭</div>
      <div class="font-semibold text-gray-600 mb-1">Sin comunicados activos</div>
      <div class="text-sm">No hay comunicados publicados para estudiantes en este momento</div>
    </div>
  }

  @if (urgentesActivos().length) {
    <div class="space-y-3">
      <div class="flex items-center gap-2 text-sm font-semibold text-red-600">
        <span class="icon text-base">warning</span> Avisos urgentes
      </div>
      @for (c of urgentesActivos(); track c.id) {
        <div class="border-2 border-red-200 bg-red-50 rounded-xl p-5 animate-fade-in">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <span class="icon text-base text-red-500">{{ tipoIcon(c.tipo) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-1 flex-wrap">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-800">{{ c.titulo }}</span>
                  @if (svc.leidosEstudiante().has(c.id)) { <span class="badge badge-gray text-xs">Le\u00eddo</span> }
                  @else { <span class="badge badge-red text-xs shrink-0">Nuevo</span> }
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
                  @if (svc.noLeido(c.id, 'estudiante')) {
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
          <span class="icon text-base text-gray-400">campaign</span> Comunicados generales
        </div>
      }
      @for (c of normalesActivos(); track c.id) {
        <div class="card border rounded-xl p-5" [ngClass]="svc.leidosEstudiante().has(c.id) ? 'opacity-70' : ''">
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
                  @if (svc.leidosEstudiante().has(c.id)) { <span class="badge badge-gray text-xs">Le\u00eddo</span> }
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
                  @if (svc.noLeido(c.id, 'estudiante')) {
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

<ng-template #registroTpl let-item let-esMerito="esMerito">
  <div class="rounded-xl border border-l-4 p-3.5 flex flex-wrap gap-3 transition-colors"
    [ngClass]="esMerito ? tipoCardClasses('reconocimiento') + ' ' + tipoRowBorderClass('reconocimiento') : tipoCardClasses(item.tipo) + ' ' + tipoRowBorderClass(item.tipo)">
    <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      [ngClass]="tipoIconBgClasses(esMerito ? 'reconocimiento' : item.tipo)">
      <span class="icon icon-sm">{{ tipoIconConducta(esMerito ? 'reconocimiento' : item.tipo) }}</span>
    </div>
    <div class="flex-1 min-w-[180px]">
      <div class="flex flex-wrap items-center gap-2 mb-1">
        <span class="badge text-[10px]" [ngClass]="tipoBadgeConducta(item.tipo)">{{ tipoLabelConducta(item.tipo) }}</span>
        <span class="badge text-[10px]" [ngClass]="estadoBadge(item.estado)">{{ estadoLabel(item.estado) }}</span>
        <span class="text-xs text-gray-400">{{ item.fecha }}</span>
      </div>
      <p class="text-sm font-medium text-gray-900">{{ item.descripcion }}</p>
      @if (item.medida) {
        <p class="text-xs mt-1" [ngClass]="tipoMedidaTextClass(esMerito ? 'reconocimiento' : item.tipo)">
          <span class="font-medium">{{ esMerito ? 'Reconocimiento:' : 'Medida:' }}</span> {{ item.medida }}
        </p>
      }
    </div>
  </div>
</ng-template>
  `,
})
export class ComunicadosEstudianteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly svc = inject(ComunicadosService);
  readonly conductSvc = inject(ConductaEstudianteService);

  readonly conductaVista = signal<ConductaVista>('meritos');

  ngOnInit() {
    this.layout.setTitle('Comunicados');
    this.svc.syncLeidosFromStorage();
    this.conductSvc.load().subscribe({ error: () => this.conductSvc.conducta.set(null) });
  }

  expandidos = signal<Set<number>>(new Set());

  urgentesActivos = computed(() =>
    this.svc.urgentesNoLeidosEstudiante()
      .sort((a, b) => (a.fechaPublicacion > b.fechaPublicacion ? -1 : 1)),
  );
  normalesActivos = computed(() =>
    this.svc.paraAlumnos()
      .filter(c => {
        const esUrgente = c.tipo === 'urgente' || c.prioridad === 'alta';
        return !esUrgente || this.svc.leidosEstudiante().has(c.id);
      })
      .sort((a, b) => (a.fechaPublicacion > b.fechaPublicacion ? -1 : 1)),
  );

  tipoBadge(t: TipoCom) { return 'badge ' + TIPO_CFG[t].badge; }
  tipoLabel(t: TipoCom) { return TIPO_CFG[t].label; }
  tipoIcon(t: TipoCom)  { return TIPO_CFG[t].icon;  }

  tipoBadgeConducta(t: string) {
    return 'badge ' + (TIPO_CONDUCTA_CFG[t as TipoIncidente]?.badge ?? 'badge-gray');
  }
  tipoLabelConducta(t: string) {
    return TIPO_CONDUCTA_CFG[t as TipoIncidente]?.label ?? t;
  }
  tipoIconConducta(t: string) {
    return TIPO_CONDUCTA_CFG[t as TipoIncidente]?.icon ?? 'help';
  }
  tipoCardClasses = tipoCardClasses;
  tipoIconBgClasses = tipoIconBgClasses;
  tipoMedidaTextClass = tipoMedidaTextClass;
  tipoRowBorderClass = tipoRowBorderClass;
  estadoBadge(e: string) {
    return 'badge ' + (ESTADO_CFG[e as keyof typeof ESTADO_CFG]?.badge ?? 'badge-gray');
  }
  estadoLabel(e: string) {
    return ESTADO_CFG[e as keyof typeof ESTADO_CFG]?.label ?? e;
  }
  nivelBadge(n: string) {
    return NIVEL_CFG[n as keyof typeof NIVEL_CFG]?.badge ?? 'badge-gray';
  }
  nivelLabel(n: string) {
    return NIVEL_CFG[n as keyof typeof NIVEL_CFG]?.label ?? n;
  }

  marcarLeido(id: number) {
    this.svc.marcarLeido(id, 'estudiante');
  }
  toggleExpandir(id: number) {
    this.expandidos.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
}
