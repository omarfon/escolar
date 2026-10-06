import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { markTenantReloadReady, setupTenantReload } from '../../core/tenant/tenant-reload.util';
import {
  TrasladoContext,
  TrasladoResumen,
  TrasladoSeguimiento,
  TrasladosService,
  trasladoErrorMessage,
} from './traslados.service';
import { TrasladosDetalleDrawerComponent } from './traslados-detalle-drawer.component';
import { TRASLADO_BADGE } from './traslados.constants';
import { transferIdDesdeQuery } from './traslados-query.util';
import {
  ETAPA_SEGUIMIENTO_CLASE,
  ETAPA_SEGUIMIENTO_ICONO,
  LINEA_TIEMPO_TIPO_CLASE,
  LINEA_TIEMPO_TIPO_ETIQUETA,
  etiquetaRolVisualizador,
} from './traslados-seguimiento.util';
import { TrasladosTransparenciaSnapshotComponent } from './traslados-transparencia-snapshot.component';

@Component({
  selector: 'app-traslados-seguimiento',
  standalone: true,
  imports: [FormsModule, NgClass, DatePipe, RouterLink, TrasladosDetalleDrawerComponent, TrasladosTransparenciaSnapshotComponent],
  template: `
<div class="space-y-4">
  @if (successMsg()) {
    <div class="p-4 bg-[#dcfce7] border border-green-200 rounded-2xl text-sm text-[#15803d]" role="status">{{ successMsg() }}</div>
  }
  @if (errorMsg()) {
    <div class="p-4 bg-[#fee2e2] border border-red-200 rounded-2xl text-sm text-[#b91c1c]" role="alert">{{ errorMsg() }}</div>
  }

  <div class="card overflow-hidden">
    <div class="px-6 py-4 border-b border-[#f1f3f7] flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div>
        <h2 class="font-bold text-[#1a202c]">Seguimiento del proceso</h2>
        <p class="text-xs text-[#94a3b8] mt-0.5">Consulte el avance de las solicitudes en curso dentro de su ámbito.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <select class="form-input w-auto" [ngModel]="filtroActivos()" name="filtroActivos" (ngModelChange)="filtroActivos.set($event); cargar()">
          <option value="activos">Solo en curso</option>
          <option value="todos">Todas</option>
        </select>
        <input class="form-input" placeholder="Código, alumno o IE" [ngModel]="filtro" name="filtro" (ngModelChange)="filtro = $event" />
        <button type="button" class="btn btn-secondary btn-sm" (click)="cargar()">Filtrar</button>
      </div>
    </div>

    @if (svc.loading()) {
      <p class="p-6 text-sm text-indigo-700" role="status">Cargando solicitudes…</p>
    } @else if (!items().length) {
      <p class="p-6 text-sm text-[#94a3b8]">No hay solicitudes para seguir en su ámbito.</p>
    } @else {
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Estudiante</th>
              <th>Trayecto</th>
              <th>Estado</th>
              <th>Plazo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr [class.bg-indigo-50/40]="seguimiento()?.solicitud?.id === item.id">
                <td class="font-medium text-indigo-700">{{ item.codigo }}</td>
                <td>{{ item.studentNombre }}<div class="text-xs text-[#94a3b8]">{{ item.studentDni }}</div></td>
                <td>{{ item.ieOrigenNombre }} → {{ item.ieDestinoNombre }}</td>
                <td><span class="badge" [ngClass]="badge(item.estado)">{{ item.estado }}</span></td>
                <td>{{ item.plazoHasta }}</td>
                <td>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="abrirSeguimiento(item)">Seguir</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  @if (seguimiento(); as s) {
    <div class="card p-6 space-y-6" role="region" aria-label="Detalle de seguimiento">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="font-bold text-[#1a202c]">{{ s.solicitud.codigo }} · {{ s.resumen.estadoActual }}</h2>
          <p class="text-sm text-[#64748b]">{{ s.solicitud.studentNombre }} · DNI {{ s.solicitud.studentDni }}</p>
          <p class="text-sm text-[#64748b]">{{ s.solicitud.ieOrigenNombre }} → {{ s.solicitud.ieDestinoNombre }}</p>
          <span class="badge badge-indigo mt-2">{{ etiquetaRol(s.solicitud.rolVisualizador) }}</span>
          @if (s.resumen.plazoVencido && !s.resumen.esTerminal) {
            <span class="badge badge-red ml-2">Plazo vencido</span>
          }
        </div>
        <button type="button" class="btn-icon" (click)="cerrarSeguimiento()" aria-label="Cerrar seguimiento">
          <span class="icon">close</span>
        </button>
      </div>

      @if (s.transparencia) {
        <app-traslados-transparencia-snapshot [transparencia]="s.transparencia" />
      }

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div class="rounded-xl border border-[#e8eaf0] p-3">
          <p class="text-xs text-[#94a3b8]">Días en proceso</p>
          <p class="font-bold text-[#1a202c]">{{ s.resumen.diasEnProceso }}</p>
        </div>
        <div class="rounded-xl border border-[#e8eaf0] p-3">
          <p class="text-xs text-[#94a3b8]">Plazo hasta</p>
          <p class="font-bold text-[#1a202c]">{{ s.resumen.plazoVence }}</p>
        </div>
        <div class="rounded-xl border border-[#e8eaf0] p-3 sm:col-span-2">
          <p class="text-xs text-[#94a3b8]">Última actividad</p>
          <p class="font-bold text-[#1a202c]">{{ s.resumen.ultimaActividad | date:'dd/MM/yyyy HH:mm' }}</p>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-bold text-[#1a202c] mb-3">Etapas del proceso</h3>
        <ol class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          @for (etapa of s.etapas; track etapa.id) {
            <li class="rounded-xl border p-3 text-sm" [ngClass]="claseEtapa(etapa.estado)">
              <div class="flex items-center gap-2 mb-1">
                <span class="icon text-[18px]">{{ iconoEtapa(etapa.estado) }}</span>
                <span class="font-medium">{{ etapa.etiqueta }}</span>
              </div>
              <p class="text-xs opacity-80">{{ etapa.descripcion }}</p>
              @if (etapa.fechaCompletado) {
                <p class="text-xs mt-2 opacity-70">{{ etapa.fechaCompletado | date:'dd/MM/yyyy HH:mm' }}</p>
              }
            </li>
          }
        </ol>
      </div>

      <div>
        <h3 class="text-sm font-bold text-[#1a202c] mb-3">Línea de tiempo</h3>
        @if (!s.lineaTiempo.length) {
          <p class="text-sm text-[#94a3b8]">Sin eventos registrados aún.</p>
        } @else {
          <ol class="relative border-l border-indigo-100 ml-3 space-y-4">
            @for (item of s.lineaTiempo; track item.id) {
              <li class="ml-4">
                <span class="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white"></span>
                <div class="rounded-xl border border-[#e8eaf0] p-3 bg-white">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="badge badge-xs" [ngClass]="claseTipoLinea(item.tipo)">{{ etiquetaTipoLinea(item.tipo) }}</span>
                    <span class="text-xs text-[#94a3b8]">{{ item.fecha | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  <p class="font-medium text-[#1a202c]">{{ item.titulo }}</p>
                  <p class="text-sm text-[#64748b] mt-0.5">{{ item.detalle }}</p>
                  <p class="text-xs text-[#94a3b8] mt-1">{{ item.actor }}</p>
                </div>
              </li>
            }
          </ol>
        }
      </div>

      <div class="flex flex-wrap gap-2 pt-2 border-t border-[#e8eaf0]">
        <button type="button" class="btn btn-secondary btn-sm" (click)="abrirDetalleAcciones(s.solicitud.id)">
          Ver acciones y detalle
        </button>
        <a
          class="btn btn-ghost btn-sm"
          routerLink="/matricula/historial"
          [queryParams]="{ studentId: s.solicitud.studentId }"
        >
          Historial de matrícula
        </a>
      </div>
    </div>
  }

  <app-traslados-detalle-drawer
    [abierto]="detalleCargando() || detalle() !== null"
    [cargando]="detalleCargando()"
    [detalle]="detalle()"
    [context]="context()"
    (cerrar)="cerrarDetalle()"
    (accion)="onAccion($event)"
    (actualizado)="onDetalleActualizado($event)"
  />
</div>
  `,
})
export class TrasladosSeguimientoComponent implements OnInit {
  readonly svc = inject(TrasladosService);
  private readonly route = inject(ActivatedRoute);
  private readonly _tenantReloadReady = setupTenantReload(
    () => this.cargar(),
    {
      onBeforeReload: () => {
        this.items.set([]);
        this.seguimiento.set(null);
        this.detalle.set(null);
        this.detalleCargando.set(false);
        this.successMsg.set('');
        this.errorMsg.set('');
      },
    },
  );

  readonly context = signal<TrasladoContext | null>(null);
  readonly items = signal<TrasladoResumen[]>([]);
  readonly seguimiento = signal<TrasladoSeguimiento | null>(null);
  readonly detalle = signal<import('./traslados.service').TrasladoDetalle | null>(null);
  readonly detalleCargando = signal(false);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');
  readonly filtroActivos = signal<'activos' | 'todos'>('activos');

  filtro = '';

  claseEtapa(estado: string): string {
    return ETAPA_SEGUIMIENTO_CLASE[estado as keyof typeof ETAPA_SEGUIMIENTO_CLASE] ?? ETAPA_SEGUIMIENTO_CLASE.pendiente;
  }

  iconoEtapa(estado: string): string {
    return ETAPA_SEGUIMIENTO_ICONO[estado as keyof typeof ETAPA_SEGUIMIENTO_ICONO] ?? ETAPA_SEGUIMIENTO_ICONO.pendiente;
  }

  readonly claseTipoLinea = (tipo: string) => LINEA_TIEMPO_TIPO_CLASE[tipo] ?? 'badge-gray';
  readonly etiquetaTipoLinea = (tipo: string) => LINEA_TIEMPO_TIPO_ETIQUETA[tipo] ?? tipo;
  readonly etiquetaRol = etiquetaRolVisualizador;

  ngOnInit(): void {
    this.cargar();
    this.route.queryParamMap.subscribe((params) => {
      const transferId = transferIdDesdeQuery(params);
      if (transferId) this.abrirSeguimientoPorId(transferId);
    });
    markTenantReloadReady(this._tenantReloadReady);
  }

  cargar(): void {
    this.errorMsg.set('');
    this.svc.getContext().subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        const soloActivos = this.filtroActivos() === 'activos';
        this.svc.listSeguimiento(1, this.filtro, '', soloActivos).subscribe({
          next: (page) => this.items.set(page.items),
          error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cargar el listado')),
        });
      },
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cargar el contexto')),
    });
  }

  badge(estado: string): string {
    return TRASLADO_BADGE[estado] ?? 'badge-gray';
  }

  abrirSeguimiento(item: TrasladoResumen): void {
    this.abrirSeguimientoPorId(item.id);
  }

  abrirSeguimientoPorId(id: number): void {
    this.errorMsg.set('');
    this.detalle.set(null);
    this.svc.seguimiento(id).subscribe({
      next: (res) => this.seguimiento.set(res),
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cargar el seguimiento')),
    });
  }

  cerrarSeguimiento(): void {
    this.seguimiento.set(null);
  }

  abrirDetalleAcciones(id: number): void {
    this.detalleCargando.set(true);
    this.errorMsg.set('');
    this.svc.detail(id).subscribe({
      next: (res) => {
        this.detalle.set(res);
        this.detalleCargando.set(false);
      },
      error: (err) => {
        this.detalleCargando.set(false);
        this.detalle.set(null);
        this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo abrir el detalle'));
      },
    });
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
    this.detalleCargando.set(false);
  }

  onDetalleActualizado(res: import('./traslados.service').TrasladoDetalle): void {
    this.detalle.set(res);
    this.successMsg.set('Seguimiento actualizado.');
    this.abrirSeguimientoPorId(res.id);
    this.cargar();
  }

  onAccion(ev: { accion: string; motivo?: string; seccionDestino?: string; error?: string }): void {
    if (ev.error) {
      this.errorMsg.set(ev.error);
      return;
    }
    const d = this.detalle();
    if (!d) return;
    this.errorMsg.set('');
    this.successMsg.set('');
    this.svc.transition(d.id, ev.accion, ev.motivo, undefined, ev.seccionDestino).subscribe({
      next: (res) => {
        this.detalle.set(res);
        this.successMsg.set(`${res.codigo} pasó a ${res.estado}.`);
        this.abrirSeguimientoPorId(res.id);
        this.cargar();
      },
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cambiar el estado')),
    });
  }
}
