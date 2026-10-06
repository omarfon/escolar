import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { markTenantReloadReady, setupTenantReload } from '../../core/tenant/tenant-reload.util';
import {
  TrasladoContext,
  TrasladoDetalle,
  TrasladoResumen,
  TrasladosService,
  trasladoErrorMessage,
} from './traslados.service';
import { TrasladosDetalleDrawerComponent } from './traslados-detalle-drawer.component';
import { TRASLADO_BADGE, TRASLADO_ESTADOS_PENDIENTES_DESTINO } from './traslados.constants';
import { transferIdDesdeQuery } from './traslados-query.util';

@Component({
  selector: 'app-traslados-destino',
  standalone: true,
  imports: [FormsModule, NgClass, TrasladosDetalleDrawerComponent],
  template: `
<div class="space-y-4">
  @if (pendientes() > 0) {
    <p class="text-sm text-teal-800 font-medium" role="status">{{ pendientes() }} solicitud(es) pendiente(s) de aprobación.</p>
  }

  @if (successMsg()) {
    <div class="p-4 bg-[#dcfce7] border border-green-200 rounded-2xl text-sm text-[#15803d]" role="status">{{ successMsg() }}</div>
  }
  @if (errorMsg()) {
    <div class="p-4 bg-[#fee2e2] border border-red-200 rounded-2xl text-sm text-[#b91c1c]" role="alert">{{ errorMsg() }}</div>
  }

  <div class="card overflow-hidden">
    <div class="px-6 py-4 border-b border-[#f1f3f7] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <select class="form-input w-full sm:w-auto" [ngModel]="filtroEstado()" name="filtroEstado" (ngModelChange)="filtroEstado.set($event); cargar()">
        <option value="pendientes">Solo pendientes</option>
        <option value="todas">Todas las recibidas</option>
      </select>
      <div class="flex gap-2 w-full sm:w-auto">
        <input class="form-input flex-1" placeholder="Código, alumno o IE origen" [ngModel]="filtro" name="filtro" (ngModelChange)="filtro = $event" />
        <button type="button" class="btn btn-secondary btn-sm" (click)="cargar()">Filtrar</button>
      </div>
    </div>
    @if (svc.loading()) {
      <p class="p-6 text-sm text-indigo-700">Cargando solicitudes…</p>
    } @else if (!itemsVisibles().length) {
      <p class="p-6 text-sm text-[#94a3b8]">
        @if (filtroEstado() === 'pendientes') {
          No hay traslados pendientes de aprobación en esta IE de destino.
        } @else {
          No hay traslados recibidos en esta IE de destino.
        }
        @if (context(); as ctx) {
          @if (ctx.institucion; as ie) {
            <span class="block mt-1 text-xs">Contexto: {{ ie.nombre }} (modular {{ ie.codigoModular }}).</span>
          }
        }
      </p>
    } @else {
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Estudiante</th>
              <th>IE origen</th>
              <th>Estado</th>
              <th>Plazo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of itemsVisibles(); track item.id) {
              <tr [class.bg-teal-50/50]="esPendiente(item)" [class.bg-indigo-50/40]="detalle()?.id === item.id">
                <td class="font-medium text-indigo-700">{{ item.codigo }}</td>
                <td>{{ item.studentNombre }}<div class="text-xs text-[#94a3b8]">{{ item.studentDni }}</div></td>
                <td>
                  {{ item.ieOrigenNombre }}
                  <div class="text-xs text-[#94a3b8]">{{ item.ieOrigenCodigoModular }}</div>
                </td>
                <td>
                  <span class="badge" [ngClass]="badge(item.estado)">{{ item.estado }}</span>
                  @if (esPendiente(item)) { <span class="badge badge-yellow ml-1">Pendiente</span> }
                </td>
                <td>{{ item.plazoHasta }}</td>
                <td><button type="button" class="btn btn-ghost btn-sm" (click)="abrir(item)">Ver</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  <app-traslados-detalle-drawer
    [abierto]="detalleCargando() || detalle() !== null"
    [cargando]="detalleCargando()"
    [detalle]="detalle()"
    [context]="context()"
    (cerrar)="cerrarDetalle()"
    (accion)="onAccion($event)"
    (actualizado)="onMotivoRegistrado($event)"
  />
</div>
  `,
})
export class TrasladosDestinoComponent implements OnInit {
  readonly svc = inject(TrasladosService);
  readonly tenant = inject(TenantContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly _tenantReloadReady = setupTenantReload(
    () => this.cargar(),
    {
      onBeforeReload: () => {
        this.items.set([]);
        this.detalle.set(null);
        this.detalleCargando.set(false);
        this.successMsg.set('');
        this.errorMsg.set('');
      },
    },
  );

  readonly context = signal<TrasladoContext | null>(null);
  readonly items = signal<TrasladoResumen[]>([]);
  readonly detalle = signal<TrasladoDetalle | null>(null);
  readonly detalleCargando = signal(false);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');
  readonly filtroEstado = signal<'pendientes' | 'todas'>('pendientes');

  filtro = '';

  readonly pendientes = computed(() =>
    this.items().filter((i) => TRASLADO_ESTADOS_PENDIENTES_DESTINO.includes(i.estado)).length,
  );

  readonly itemsVisibles = computed(() => {
    const rows = this.items();
    if (this.filtroEstado() === 'pendientes') {
      return rows.filter((i) => TRASLADO_ESTADOS_PENDIENTES_DESTINO.includes(i.estado));
    }
    return rows;
  });

  ngOnInit(): void {
    if (this.tenant.requiresSelection()) {
      this.items.set([]);
    } else {
      this.cargar();
    }
    markTenantReloadReady(this._tenantReloadReady);
    this.route.queryParamMap.subscribe((params) => {
      if (this.tenant.requiresSelection()) return;
      const transferId = transferIdDesdeQuery(params);
      if (transferId) this.abrirPorId(transferId);
    });
  }

  cargar(): void {
    if (this.tenant.requiresSelection()) {
      this.errorMsg.set('Seleccione una institución educativa en el encabezado.');
      return;
    }
    this.errorMsg.set('');
    this.svc.getContext().subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        const pendientes = this.filtroEstado() === 'pendientes';
        this.svc.listRecibidosDestino(1, this.filtro, pendientes).subscribe({
          next: (page) => this.items.set(page.items),
          error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cargar el listado')),
        });
      },
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cargar el contexto')),
    });
  }

  esPendiente(item: TrasladoResumen): boolean {
    return TRASLADO_ESTADOS_PENDIENTES_DESTINO.includes(item.estado);
  }

  badge(estado: string): string {
    return TRASLADO_BADGE[estado] ?? 'badge-gray';
  }

  abrir(item: TrasladoResumen): void {
    this.abrirPorId(item.id);
  }

  abrirPorId(id: number): void {
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
        this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo abrir la solicitud'));
      },
    });
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
    this.detalleCargando.set(false);
  }

  onMotivoRegistrado(res: TrasladoDetalle): void {
    this.detalle.set(res);
    this.successMsg.set('Motivo registrado en el historial.');
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
        this.cargar();
      },
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cambiar el estado')),
    });
  }
}
