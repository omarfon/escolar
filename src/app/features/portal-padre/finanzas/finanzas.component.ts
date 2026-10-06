import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { BoletaVentaViewComponent } from '../../../core/treasury/boleta-venta-view.component';
import { AuthService } from '../../../core/auth/services/auth.service';
import { HijoResumen, parentescoLabel } from '../seguimiento/seguimiento.model';
import { SeguimientoService } from '../seguimiento/seguimiento.service';
import { HijoSelectorComponent } from '../shared/hijo-selector.component';
import { FinanzasPadreService } from './finanzas-padre.service';
import {
  BoletaVenta,
  CargoCuenta,
  estadoCargoBadge,
  estadoCargoLabel,
  filtrarCargos,
  formatFechaCorta,
  FiltroCargo,
  cargosPendientesCuenta,
  metodoPagoLabel,
  PagoRegistrado,
} from './finanzas.model';

@Component({
  standalone: true,
  imports: [NgClass, DecimalPipe, NgTemplateOutlet, FormsModule, BoletaVentaViewComponent, HijoSelectorComponent],
  template: `
<div class="space-y-5 animate-fade-in">

  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-bold text-gray-800">Estado de Cuenta</h2>
      <p class="text-sm text-gray-500 mt-0.5">
        {{ auth.nombreCompleto() }} · Matrícula, mensualidades y otros conceptos
      </p>
    </div>
    <button class="btn btn-secondary btn-sm" (click)="cargar()"
      [disabled]="segSvc.loadingHijos() || svc.loadingCuenta()">
      <span class="icon icon-sm">refresh</span> Actualizar
    </button>
  </div>

  <app-hijo-selector (hijoChange)="onHijoChange($event)" />

  @if (segSvc.hijos().length) {
    @if (svc.loadingCuenta()) {
      <div class="card p-10 flex flex-col items-center text-gray-400">
        <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
        <p class="text-sm">Cargando estado de cuenta…</p>
      </div>
    } @else if (cuenta(); as c) {
      <div class="card p-4 bg-gradient-to-r from-emerald-50 to-white border-emerald-100">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="font-bold text-gray-900">{{ c.estudiante.nombreCompleto }}</h3>
            <p class="text-sm text-gray-500">{{ c.estudiante.aulaLabel }} · A.E. {{ c.anioEscolar }}</p>
          </div>
          @if (c.resumen.proximoVencimiento) {
            <div class="text-right text-sm">
              <p class="text-gray-400 text-xs">Próximo vencimiento</p>
              <p class="font-semibold text-amber-700">{{ formatFechaLarga(c.resumen.proximoVencimiento) }}</p>
            </div>
          }
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        @for (k of kpis(); track k.label) {
          <div class="card p-4">
            <div class="text-xs text-gray-500 mb-1">{{ k.label }}</div>
            <div class="text-xl font-bold" [ngClass]="k.color">S/ {{ k.value | number:'1.2-2' }}</div>
          </div>
        }
      </div>

      <div class="tabs">
        @for (tab of tabs; track tab.id) {
          <button type="button" class="tab" [class.tab-active]="vista() === tab.id" (click)="vista.set(tab.id)">
            <span class="icon icon-sm">{{ tab.icon }}</span> {{ tab.label }}
            @if (tab.id === 'cuenta' && cargosPendientes().length) {
              <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                {{ cargosPendientes().length }}
              </span>
            }
            @if (tab.id === 'pagos' && pagosRealizados().length) {
              <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                {{ pagosRealizados().length }}
              </span>
            }
          </button>
        }
      </div>

      @if (vista() === 'cuenta') {
        @if (cargosPendientes().length) {
          <div class="card overflow-hidden border-2 border-amber-200">
            <div class="px-5 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white">
              <h4 class="font-semibold text-gray-900 flex items-center gap-2">
                <span class="icon text-amber-600">pending_actions</span>
                Pagos pendientes
              </h4>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ cargosPendientes().length }} concepto(s) por pagar · total S/ {{ totalPendiente() | number:'1.2-2' }}
              </p>
            </div>
            <div class="divide-y divide-gray-100">
              @for (cargo of cargosPendientes(); track cargo.id) {
                <div class="px-5 py-4 bg-white">
                  <ng-container *ngTemplateOutlet="cargoRow; context: { $implicit: cargo, destacado: false }"></ng-container>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="card p-8 text-center border border-emerald-100 bg-emerald-50/40">
            <span class="icon text-3xl text-emerald-500 mb-2">check_circle</span>
            <p class="text-sm font-medium text-emerald-800">No tienes pagos pendientes</p>
            <p class="text-xs text-emerald-700 mt-1">Todos los conceptos del año están al día.</p>
          </div>
        }

        @if (c.matricula; as mat) {
          @if (mat.estado === 'pagado') {
          <div class="card p-5">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span class="icon text-emerald-600">school</span> Matrícula
            </h4>
            <ng-container *ngTemplateOutlet="cargoRow; context: { $implicit: mat, destacado: true }"></ng-container>
          </div>
          }
        }

        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h4 class="font-semibold text-gray-800 flex items-center gap-2">
              <span class="icon text-indigo-600">calendar_month</span> Mensualidades
            </h4>
            <div class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              @for (f of filtros; track f.id) {
                <button type="button"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                  [ngClass]="filtro() === f.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-800'"
                  (click)="filtro.set(f.id)">
                  {{ f.label }}
                </button>
              }
            </div>
          </div>

          @if (!mensualidadesFiltradas().length) {
            <div class="p-10 text-center text-sm text-gray-400">
              No hay mensualidades con el filtro seleccionado.
            </div>
          } @else {
            <div class="divide-y divide-gray-100">
              @for (cargo of mensualidadesFiltradas(); track cargo.id) {
                <div class="px-5 py-4">
                  <ng-container *ngTemplateOutlet="cargoRow; context: { $implicit: cargo, destacado: false }"></ng-container>
                </div>
              }
            </div>
          }
        </div>

        @if (c.otros.length) {
          <div class="card overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100">
              <h4 class="font-semibold text-gray-800 flex items-center gap-2">
                <span class="icon text-amber-600">receipt</span> Otros conceptos
              </h4>
            </div>
            <div class="divide-y divide-gray-100">
              @for (cargo of otrosFiltrados(); track cargo.id) {
                <div class="px-5 py-4">
                  <ng-container *ngTemplateOutlet="cargoRow; context: { $implicit: cargo, destacado: false }"></ng-container>
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h4 class="font-semibold text-gray-800 flex items-center gap-2">
              <span class="icon text-green-600">payments</span> Historial de pagos
            </h4>
            <p class="text-xs text-gray-500 mt-1">Matrícula, mensualidades y otros conceptos pagados</p>
          </div>

          @if (!pagosRealizados().length) {
            <div class="p-10 text-center text-sm text-gray-400">
              <span class="icon icon-xl mb-3 block">payments</span>
              Aún no hay pagos registrados para este alumno.
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Método</th>
                    <th>Boleta</th>
                    <th class="text-right">Monto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of pagosRealizados(); track p.id) {
                    <tr>
                      <td class="text-sm">{{ formatFechaCorta(p.fechaPago) }}</td>
                      <td>
                        <span class="badge text-[10px]" [ngClass]="tipoPagoBadge(p.tipo)">{{ p.tipo }}</span>
                      </td>
                      <td>
                        <p class="font-medium text-gray-800">{{ p.concepto }}</p>
                        @if (p.periodoLabel && p.periodoLabel !== p.concepto) {
                          <p class="text-xs text-gray-500">{{ p.periodoLabel }}</p>
                        }
                      </td>
                      <td class="text-sm text-gray-600">{{ metodoPagoLabel(p.metodoPago) }}</td>
                      <td class="text-sm text-gray-500">{{ p.numeroBoleta || '—' }}</td>
                      <td class="text-right font-semibold text-emerald-700">S/ {{ p.monto | number:'1.2-2' }}</td>
                      <td class="text-right">
                        <div class="flex items-center justify-end gap-1">
                          <button type="button" class="btn btn-ghost btn-icon text-indigo-600" title="Ver boleta"
                            (click)="verBoleta(p.id)">
                            <span class="icon icon-sm">visibility</span>
                          </button>
                          <button type="button" class="btn btn-ghost btn-icon text-emerald-600" title="Descargar / imprimir"
                            (click)="verBoleta(p.id, true)">
                            <span class="icon icon-sm">download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    } @else {
      <div class="card p-10 text-center text-gray-400">
        <span class="icon icon-xl mb-3">account_balance_wallet</span>
        <p class="text-sm">No hay información de pagos para este alumno.</p>
        <p class="text-xs mt-2">Contacta con tesorería si crees que es un error.</p>
      </div>
    }
  }

</div>

<ng-template #cargoRow let-cargo let-destacado="destacado">
  <div class="flex flex-col lg:flex-row lg:items-center gap-3"
    [ngClass]="destacado ? '' : ''">
    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <p class="font-medium text-gray-800">{{ cargo.periodoLabel }}</p>
        <span class="badge text-[10px]" [ngClass]="estadoCargoBadge(cargo.estado)">
          {{ estadoCargoLabel(cargo.estado) }}
        </span>
      </div>
      <p class="text-xs text-gray-500 mt-0.5">{{ cargo.concepto }} · Vence {{ formatFechaCorta(cargo.fechaVencimiento) }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-3 shrink-0">
      <p class="text-lg font-bold tabular-nums"
        [ngClass]="cargo.saldo > 0 ? 'text-gray-900' : 'text-emerald-700'">
        S/ {{ cargo.monto | number:'1.2-2' }}
      </p>
      @if (cargo.saldo > 0) {
        <button type="button"
          class="btn btn-primary btn-icon shrink-0"
          title="Pagar mensualidad"
          aria-label="Pagar mensualidad"
          (click)="abrirPagoVisa(cargo)">
          <span class="icon">credit_card</span>
        </button>
      } @else if (ultimoPago(cargo); as pago) {
        <div class="flex items-center gap-1 shrink-0">
          <button type="button"
            class="btn btn-ghost btn-icon text-indigo-600"
            title="Ver boleta {{ pago.numeroBoleta }}"
            (click)="verBoleta(pago.id)">
            <span class="icon icon-sm">visibility</span>
          </button>
          <button type="button"
            class="btn btn-ghost btn-icon text-emerald-600"
            title="Descargar / imprimir boleta"
            (click)="verBoleta(pago.id, true)">
            <span class="icon icon-sm">download</span>
          </button>
        </div>
      }
    </div>
  </div>
</ng-template>

@if (modalPago()) {
  <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    (click)="cerrarPagoVisa()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" (click)="$event.stopPropagation()">
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h3 class="font-bold text-gray-900">Pagar mensualidad</h3>
          <p class="text-xs text-gray-500">{{ cargoPago()?.periodoLabel }} · S/ {{ cargoPago()?.monto | number:'1.2-2' }}</p>
        </div>
        <button type="button" class="btn-icon text-gray-400" (click)="cerrarPagoVisa()">
          <span class="icon">close</span>
        </button>
      </div>
      <div class="px-6 py-5 space-y-4">
        <div class="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
          <div class="w-12 h-8 rounded bg-[#1A1F71] text-white text-xs font-bold flex items-center justify-center">VISA</div>
          <p class="text-xs text-blue-800">Pago simulado para demo. Tarjeta Visa válida (16 dígitos, inicia con 4).</p>
        </div>
        <div>
          <label class="form-label">Número de tarjeta</label>
          <input class="form-input mt-1 font-mono tracking-wider" maxlength="19"
            placeholder="4111 1111 1111 1111" [(ngModel)]="formVisa.numeroTarjeta" (input)="formatearTarjeta()">
        </div>
        <div>
          <label class="form-label">Nombre del titular</label>
          <input class="form-input mt-1 uppercase" placeholder="MARIA LOPEZ QUISPE" [(ngModel)]="formVisa.nombreTitular">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Vencimiento</label>
            <input class="form-input mt-1 font-mono" maxlength="5" placeholder="MM/YY"
              [(ngModel)]="formVisa.vencimiento" (input)="formatearVencimiento()">
          </div>
          <div>
            <label class="form-label">CVV</label>
            <input class="form-input mt-1 font-mono" maxlength="4" placeholder="123"
              [(ngModel)]="formVisa.cvv" type="password">
          </div>
        </div>
        @if (errorPago()) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ errorPago() }}</div>
        }
      </div>
      <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="cerrarPagoVisa()">Cancelar</button>
        <button type="button" class="btn btn-primary" (click)="confirmarPagoVisa()" [disabled]="svc.payingVisa()">
          {{ svc.payingVisa() ? 'Procesando…' : 'Confirmar pago' }}
        </button>
      </div>
    </div>
  </div>
}

@if (modalBoleta()) {
  <div class="boleta-modal-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" (click)="cerrarBoleta()">
    <div class="boleta-modal-panel bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto" (click)="$event.stopPropagation()">
      @if (svc.loadingBoleta()) {
        <div class="p-12 flex flex-col items-center text-gray-400">
          <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
          <p class="text-sm">Cargando boleta…</p>
        </div>
      } @else if (boleta(); as b) {
        <div class="p-4 sm:p-6">
          <app-boleta-venta-view [boleta]="b" />
        </div>
        <div class="boleta-no-print px-6 py-4 border-t bg-gray-50 flex justify-end gap-2 sticky bottom-0">
          <button type="button" class="btn btn-secondary" (click)="cerrarBoleta()">Cerrar</button>
          <button type="button" class="btn btn-primary" (click)="imprimirBoleta()">
            <span class="icon icon-sm">print</span> Imprimir / PDF
          </button>
        </div>
      }
    </div>
  </div>
}

@if (toast()) {
  <div class="fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg z-[60] text-white flex items-center gap-2"
    [ngClass]="toast()!.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'">
    <span class="icon">{{ toast()!.tipo === 'success' ? 'check_circle' : 'error' }}</span>
    {{ toast()!.mensaje }}
  </div>
}
  `,
})
export class FinanzasPadreComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly svc = inject(FinanzasPadreService);
  readonly segSvc = inject(SeguimientoService);

  readonly parentescoLabel = parentescoLabel;
  readonly estadoCargoBadge = estadoCargoBadge;
  readonly estadoCargoLabel = estadoCargoLabel;
  readonly metodoPagoLabel = metodoPagoLabel;
  readonly formatFechaCorta = formatFechaCorta;

  modalPago = signal(false);
  modalBoleta = signal(false);
  cargoPago = signal<CargoCuenta | null>(null);
  boleta = signal<BoletaVenta | null>(null);
  errorPago = signal('');
  toast = signal<{ tipo: 'success' | 'error'; mensaje: string } | null>(null);
  private imprimirAlCargarBoleta = false;

  formVisa = {
    numeroTarjeta: '',
    nombreTitular: '',
    vencimiento: '',
    cvv: '',
  };

  vista = signal<'cuenta' | 'pagos'>('cuenta');
  readonly tabs: { id: 'cuenta' | 'pagos'; label: string; icon: string }[] = [
    { id: 'cuenta', label: 'Por pagar', icon: 'account_balance_wallet' },
    { id: 'pagos', label: 'Pagos realizados', icon: 'payments' },
  ];

  filtro = signal<FiltroCargo>('pendientes');
  readonly filtros: { id: FiltroCargo; label: string }[] = [
    { id: 'pendientes', label: 'Pendientes' },
    { id: 'vencidos', label: 'Vencidas' },
    { id: 'todos', label: 'Todas' },
    { id: 'pagados', label: 'Pagadas' },
  ];

  hijoId = computed(() => this.svc.hijoSeleccionado()?.studentId ?? null);
  cuenta = computed(() => this.svc.estadoCuenta());

  mensualidadesFiltradas = computed(() => {
    const c = this.cuenta();
    if (!c) return [];
    return filtrarCargos(c.mensualidades, this.filtro());
  });

  cargosPendientes = computed(() => {
    const c = this.cuenta();
    if (!c) return [];
    return cargosPendientesCuenta(c);
  });

  totalPendiente = computed(() =>
    this.cargosPendientes().reduce((sum, c) => sum + c.saldo, 0),
  );

  otrosFiltrados = computed(() => {
    const c = this.cuenta();
    if (!c) return [];
    return filtrarCargos(c.otros, this.filtro());
  });

  kpis = computed(() => {
    const r = this.cuenta()?.resumen;
    if (!r) return [];
    return [
      { label: 'Pendiente', value: r.pendiente, color: 'text-amber-600' },
      { label: 'Vencido', value: r.vencido, color: 'text-red-600' },
      { label: 'Pagado', value: r.totalPagado, color: 'text-emerald-600' },
      { label: 'Total año', value: r.totalDeuda, color: 'text-gray-800' },
    ];
  });

  pagosRealizados = computed(() => {
    const c = this.cuenta();
    if (!c) return [];
    const grupos: { tipo: string; cargos: CargoCuenta[] }[] = [
      ...(c.matricula ? [{ tipo: 'Matrícula', cargos: [c.matricula] }] : []),
      { tipo: 'Mensualidad', cargos: c.mensualidades },
      { tipo: 'Otro', cargos: c.otros },
    ];
    return grupos
      .flatMap(({ tipo, cargos }) =>
        cargos.flatMap(cargo =>
          cargo.pagos.map(p => ({
            ...p,
            tipo,
            concepto: cargo.concepto,
            periodoLabel: cargo.periodoLabel,
          })),
        ),
      )
      .sort((a, b) => b.fechaPago.localeCompare(a.fechaPago));
  });

  ngOnInit(): void {
    this.layout.setTitle('Estado de Cuenta');
  }

  cargar(): void {
    const hijo = this.segSvc.hijoSeleccionado();
    if (hijo) {
      this.svc.loadEstadoCuenta(hijo.studentId).subscribe();
      return;
    }
    this.segSvc.loadHijos().subscribe({
      next: () => {
        const seleccionado = this.segSvc.hijoSeleccionado();
        if (seleccionado) {
          this.svc.loadEstadoCuenta(seleccionado.studentId).subscribe();
        }
      },
    });
  }

  onHijoChange(hijo: HijoResumen): void {
    if (this.hijoId() === hijo.studentId && this.cuenta()) return;
    this.filtro.set('pendientes');
    this.vista.set('cuenta');
    this.segSvc.seleccionarHijo(hijo);
    this.svc.loadEstadoCuenta(hijo.studentId).subscribe();
  }

  tipoPagoBadge(tipo: string): string {
    const map: Record<string, string> = {
      Matrícula: 'badge-green',
      Mensualidad: 'badge-blue',
      Otro: 'badge-orange',
    };
    return map[tipo] ?? 'badge-gray';
  }

  abrirPagoVisa(cargo: CargoCuenta): void {
    this.cargoPago.set(cargo);
    this.errorPago.set('');
    this.formVisa = {
      numeroTarjeta: '',
      nombreTitular: this.auth.nombreCompleto()?.toUpperCase() ?? '',
      vencimiento: '',
      cvv: '',
    };
    this.modalPago.set(true);
  }

  cerrarPagoVisa(): void {
    this.modalPago.set(false);
    this.cargoPago.set(null);
    this.errorPago.set('');
  }

  formatearTarjeta(): void {
    const digits = this.formVisa.numeroTarjeta.replace(/\D/g, '').slice(0, 16);
    this.formVisa.numeroTarjeta = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  formatearVencimiento(): void {
    let v = this.formVisa.vencimiento.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    this.formVisa.vencimiento = v;
  }

  confirmarPagoVisa(): void {
    const cargo = this.cargoPago();
    const studentId = this.hijoId();
    if (!cargo || !studentId) return;

    this.svc.payWithVisa(studentId, cargo.id, {
      numeroTarjeta: this.formVisa.numeroTarjeta.replace(/\D/g, ''),
      nombreTitular: this.formVisa.nombreTitular.trim(),
      vencimiento: this.formVisa.vencimiento,
      cvv: this.formVisa.cvv,
      monto: cargo.saldo,
    }).subscribe({
      next: result => {
        this.cerrarPagoVisa();
        this.vista.set('cuenta');
        this.filtro.set('pendientes');
        this.mostrarToast('success', `Pago registrado · Boleta ${result.numeroBoleta}`);
        this.svc.loadEstadoCuenta(studentId).subscribe();
      },
      error: err => {
        const msg = err?.error?.message;
        this.errorPago.set(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'No se pudo procesar el pago'));
      },
    });
  }

  ultimoPago(cargo: CargoCuenta): PagoRegistrado | null {
    if (!cargo.pagos?.length) return null;
    return cargo.pagos.reduce((a, b) =>
      b.fechaPago.localeCompare(a.fechaPago) > 0 ? b : a,
    );
  }

  verBoleta(paymentId: number, imprimir = false): void {
    const studentId = this.hijoId();
    if (!studentId) return;
    this.imprimirAlCargarBoleta = imprimir;
    this.boleta.set(null);
    this.modalBoleta.set(true);
    this.svc.getBoleta(studentId, paymentId).subscribe({
      next: data => {
        this.boleta.set(data);
        if (this.imprimirAlCargarBoleta) {
          this.imprimirAlCargarBoleta = false;
          setTimeout(() => this.imprimirBoleta(), 300);
        }
      },
      error: () => {
        this.imprimirAlCargarBoleta = false;
        this.modalBoleta.set(false);
        this.mostrarToast('error', 'No se pudo cargar la boleta');
      },
    });
  }

  cerrarBoleta(): void {
    this.modalBoleta.set(false);
    this.boleta.set(null);
    this.imprimirAlCargarBoleta = false;
  }

  imprimirBoleta(): void {
    window.print();
  }

  formatFechaLarga(iso: string): string {
    return format(parseISO(iso), "d 'de' MMMM yyyy", { locale: es });
  }

  private mostrarToast(tipo: 'success' | 'error', mensaje: string): void {
    this.toast.set({ tipo, mensaje });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
