import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { NgClass } from '@angular/common';

import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../core/auth/services/auth.service';

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

import { TRASLADO_BADGE } from './traslados.constants';

import { transferIdDesdeQuery } from './traslados-query.util';

import {

  mensajeSeleccionInstitucionTraslados,

  trasladosRequiereSeleccionInstitucion,

} from './traslados-territorial.util';



@Component({

  selector: 'app-traslados-supervision',

  standalone: true,

  imports: [FormsModule, NgClass, TrasladosDetalleDrawerComponent],

  template: `

<div class="space-y-4">

  @if (alcanceLabel()) {

    <p class="text-sm text-[#64748b] px-1">{{ alcanceLabel() }}</p>

  }

  @if (successMsg()) {

    <div class="p-4 bg-[#dcfce7] border border-green-200 rounded-2xl text-sm text-[#15803d]" role="status">{{ successMsg() }}</div>

  }

  @if (errorMsg()) {

    <div class="p-4 bg-[#fee2e2] border border-red-200 rounded-2xl text-sm text-[#b91c1c]" role="alert">{{ errorMsg() }}</div>

  }



  <div class="card overflow-hidden">

    <div class="px-6 py-4 border-b border-[#f1f3f7] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">

      <div class="flex flex-wrap gap-2 w-full sm:justify-end">

        <select class="form-input w-auto" [ngModel]="estadoFiltro" name="estadoFiltro" (ngModelChange)="estadoFiltro = $event; cargar()">

          <option value="">Todos los estados</option>

          <option value="enviada">Enviada</option>

          <option value="observada">Observada</option>

          <option value="aprobada">Aprobada</option>

          <option value="rechazada">Rechazada</option>

          <option value="concluida">Concluida</option>

        </select>

        <input class="form-input" placeholder="Código, alumno o IE" [ngModel]="filtro" name="filtro" (ngModelChange)="filtro = $event" />

        <button type="button" class="btn btn-secondary btn-sm" (click)="cargar()">Filtrar</button>

      </div>

    </div>

    @if (requiereSeleccion()) {

      <p class="p-6 text-sm text-[#b45309]">{{ mensajeSeleccion() }}</p>

    } @else if (svc.loading()) {

      <p class="p-6 text-sm text-indigo-700">Cargando solicitudes…</p>

    } @else if (!items().length) {

      <p class="p-6 text-sm text-[#94a3b8]">No hay solicitudes en su ámbito territorial.</p>

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

              <tr [class.bg-indigo-50/40]="detalle()?.id === item.id">

                <td class="font-medium text-indigo-700">{{ item.codigo }}</td>

                <td>{{ item.studentNombre }}<div class="text-xs text-[#94a3b8]">{{ item.studentDni }}</div></td>

                <td>

                  {{ item.ieOrigenNombre }} → {{ item.ieDestinoNombre }}

                  <div class="text-xs text-[#94a3b8]">{{ item.ieDestinoCodigoModular }}</div>

                </td>

                <td><span class="badge" [ngClass]="badge(item.estado)">{{ item.estado }}</span></td>

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

export class TrasladosSupervisionComponent implements OnInit {

  readonly svc = inject(TrasladosService);

  private readonly route = inject(ActivatedRoute);

  private readonly auth = inject(AuthService);

  readonly tenant = inject(TenantContextService);

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

  readonly alcanceLabel = signal('');



  filtro = '';

  estadoFiltro = '';



  readonly mensajeSeleccion = mensajeSeleccionInstitucionTraslados;



  ngOnInit(): void {

    if (!this.requiereSeleccion()) {

      this.cargar();

    }

    markTenantReloadReady(this._tenantReloadReady);

    this.route.queryParamMap.subscribe((params) => {

      if (this.requiereSeleccion()) return;

      this.cargar();

      const transferId = transferIdDesdeQuery(params);

      if (transferId) this.abrirPorId(transferId);

    });

  }



  requiereSeleccion(): boolean {

    return trasladosRequiereSeleccionInstitucion(this.auth, this.tenant);

  }



  cargar(): void {

    if (this.requiereSeleccion()) {

      this.errorMsg.set(this.mensajeSeleccion());

      this.items.set([]);

      return;

    }

    this.errorMsg.set('');

    this.svc.getContext().subscribe({

      next: (ctx) => {

        this.context.set(ctx);

        this.alcanceLabel.set(this.etiquetaAlcance(ctx));

        this.svc.list(1, this.filtro, this.estadoFiltro).subscribe({

          next: (page) => this.items.set(page.items),

          error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cargar el listado')),

        });

      },

      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cargar el contexto')),

    });

  }



  private etiquetaAlcance(ctx: TrasladoContext): string {

    const a = ctx.alcanceTerritorial;

    if (a.nivel === 'MINEDU') return 'Ámbito: MINEDU (nacional)';

    if (a.nivel === 'DRE' && a.dre) return `Ámbito: DRE ${a.dre}`;

    if (a.nivel === 'UGEL' && a.ugel) return `Ámbito: UGEL ${a.ugel}`;

    if (ctx.institucion?.nombre) return `Referencia: ${ctx.institucion.nombre}`;

    return '';

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


