import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { BoletaVentaViewComponent } from '../../../core/treasury/boleta-venta-view.component';
import { PagosService } from './pagos.service';
import {
  BoletaVenta,
  CargoPago,
  estadoBadge,
  estadoLabel,
  formatFecha,
  gradoLabel,
  metodoPagoLabel,
  ResumenTesoreria,
} from './pagos.model';

type MetodoModal = 'efectivo' | 'transferencia' | 'deposito' | 'visa';

@Component({
  selector: 'app-tesoreria-pagos',
  standalone: true,
  imports: [FormsModule, NgClass, DecimalPipe, BoletaVentaViewComponent],
  template: `
<div class="space-y-5 animate-fade-in">

  @if (toast()) {
    <div class="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border animate-slide-in-r bg-white"
      [ngClass]="toast()!.tipo === 'ok' ? 'border-emerald-300' : 'border-red-300'">
      <span>{{ toast()!.tipo === 'ok' ? '✅' : '⚠️' }}</span>
      <span class="text-sm text-gray-700 font-medium">{{ toast()!.msg }}</span>
      <button type="button" (click)="toast.set(null)" class="text-gray-400 hover:text-gray-600 ml-2">×</button>
    </div>
  }

  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h2 class="text-xl font-bold text-gray-800">Gestión de Pagos</h2>
      <p class="text-sm text-gray-500 mt-0.5">Registro de cobros · A.E. {{ anioEscolar() }}</p>
    </div>
    <button type="button" class="btn btn-secondary" (click)="cargar()" [disabled]="svc.loading()">
      <span class="icon icon-sm">refresh</span> Actualizar
    </button>
  </div>

  @if (loadError()) {
    <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ loadError() }}
    </div>
  }

  <!-- KPIs -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    @for (k of kpis(); track k.label) {
      <div class="card p-4">
        <div class="text-xs text-gray-500 mb-1">{{ k.label }}</div>
        <div class="text-xl font-bold" [ngClass]="k.color">S/ {{ k.value | number:'1.2-2' }}</div>
      </div>
    }
  </div>

  <!-- Filtros -->
  <div class="card p-4 flex flex-wrap gap-3 items-center">
    <input type="text" class="form-input w-56" placeholder="Buscar alumno o concepto…"
      [ngModel]="filtroTexto()" (ngModelChange)="onFiltroTexto($event)">
    <select class="form-select w-44" [ngModel]="filtroEstado()" (ngModelChange)="onFiltroEstado($event)">
      <option value="">Todos los estados</option>
      <option value="pagado">Pagado</option>
      <option value="pendiente">Pendiente</option>
      <option value="parcial">Parcial</option>
      <option value="vencido">Vencido</option>
    </select>
    <select class="form-select w-36" [ngModel]="anioEscolar()" (ngModelChange)="onAnioChange(+$event)">
      @for (a of aniosDisponibles; track a) {
        <option [ngValue]="a">{{ a }}</option>
      }
    </select>
    <span class="text-sm text-gray-500 ml-auto">
      {{ cargosFiltrados().length }} cargos
      @if (cargosFiltrados().length > POR_PAGINA) {
        · pág. {{ paginaActual() }}/{{ totalPaginas() }}
      }
    </span>
  </div>

  <!-- Tabla -->
  <div class="card overflow-hidden">
    @if (svc.loading()) {
      <div class="py-16 text-center text-gray-400 text-sm">Cargando cargos…</div>
    } @else {
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Grado</th>
              <th>Concepto</th>
              <th class="text-right">Monto</th>
              <th class="text-right">Saldo</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th class="text-center w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (c of cargosVista(); track c.id) {
              <tr>
                <td>
                  <div class="font-medium text-sm">{{ c.alumno }}</div>
                  <div class="text-xs text-gray-400">{{ c.codigoAlumno || '—' }}</div>
                </td>
                <td class="text-sm">{{ gradoLabel(c) }}</td>
                <td>
                  <div class="text-sm">{{ c.concepto }}</div>
                  <div class="text-xs text-gray-400">{{ c.periodoLabel }}</div>
                </td>
                <td class="text-right font-semibold">S/ {{ c.monto | number:'1.2-2' }}</td>
                <td class="text-right font-bold" [ngClass]="c.saldo > 0 ? 'text-amber-700' : 'text-gray-400'">
                  S/ {{ c.saldo | number:'1.2-2' }}
                </td>
                <td class="text-sm">{{ formatFecha(c.fechaVencimiento) }}</td>
                <td>
                  <span class="badge" [ngClass]="estadoBadge(c.estado)">{{ estadoLabel(c.estado) }}</span>
                </td>
                <td>
                  <div class="flex items-center justify-center gap-1">
                    @if (c.saldo > 0) {
                      <button type="button" class="btn btn-primary btn-sm" title="Registrar pago"
                        (click)="abrirModal(c)">
                        <span class="icon icon-sm">payments</span>
                      </button>
                    } @else if (ultimoPagoId(c); as pid) {
                      <button type="button" class="btn btn-ghost btn-icon text-indigo-600" title="Ver boleta"
                        (click)="verBoleta(pid)">
                        <span class="icon icon-sm">visibility</span>
                      </button>
                      <button type="button" class="btn btn-ghost btn-icon text-emerald-600" title="Descargar / imprimir boleta"
                        (click)="verBoleta(pid, true)">
                        <span class="icon icon-sm">download</span>
                      </button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="text-center py-12 text-gray-400 text-sm">
                  No hay cargos con los filtros aplicados.
                  @if (!resumen()) {
                    <p class="text-xs mt-2">Ejecuta el seed de tesorería si aún no hay datos demo.</p>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (cargosFiltrados().length > 0) {
        <div class="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 bg-gray-50">
          <span>{{ inicio() + 1 }}–{{ fin() }} de {{ cargosFiltrados().length }}</span>
          <div class="flex items-center gap-4">
            <span>Pendiente filtrado: <strong class="text-amber-700">S/ {{ totalSaldoFiltrado() | number:'1.2-2' }}</strong></span>
            @if (cargosFiltrados().length > POR_PAGINA) {
              <div class="flex items-center gap-1">
                <button class="btn-icon" [disabled]="paginaActual() === 1" (click)="paginaActual.update(p => p - 1)">
                  <span class="icon icon-sm">chevron_left</span>
                </button>
                @for (p of paginas(); track p) {
                  <button class="w-8 h-8 rounded-lg text-sm font-medium"
                          [ngClass]="p === paginaActual() ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
                          (click)="paginaActual.set(p)">{{ p }}</button>
                }
                <button class="btn-icon" [disabled]="paginaActual() === totalPaginas()" (click)="paginaActual.update(p => p + 1)">
                  <span class="icon icon-sm">chevron_right</span>
                </button>
              </div>
            }
          </div>
        </div>
      }
    }
  </div>
</div>

<!-- Modal registrar pago -->
@if (modalAbierto()) {
  <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    (click)="cerrarModal()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg" (click)="$event.stopPropagation()">
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h3 class="font-bold text-gray-900">Registrar pago</h3>
          @if (cargoSeleccionado(); as c) {
            <p class="text-xs text-gray-500">{{ c.alumno }} · {{ c.periodoLabel }}</p>
            <p class="text-sm font-semibold text-indigo-700 mt-0.5">Saldo: S/ {{ c.saldo | number:'1.2-2' }}</p>
          }
        </div>
        <button type="button" class="btn-icon text-gray-400" (click)="cerrarModal()">
          <span class="icon">close</span>
        </button>
      </div>

      <div class="px-6 py-4 space-y-4">
        <div class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 flex-wrap gap-0.5">
          @for (m of metodos; track m.id) {
            <button type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
              [ngClass]="metodo() === m.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-800'"
              (click)="metodo.set(m.id)">
              {{ m.label }}
            </button>
          }
        </div>

        @if (metodo() !== 'visa') {
          <div>
            <label class="form-label">Monto (S/)</label>
            <input type="number" class="form-input mt-1" min="0.01" step="0.01"
              [(ngModel)]="formManual.monto">
          </div>
          <div>
            <label class="form-label">Referencia / N° operación</label>
            <input class="form-input mt-1" placeholder="Opcional"
              [(ngModel)]="formManual.referencia">
          </div>
          <div>
            <label class="form-label">Fecha de pago</label>
            <input type="date" class="form-input mt-1" [(ngModel)]="formManual.fechaPago">
          </div>
        } @else {
          <div class="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
            <div class="w-12 h-8 rounded bg-[#1A1F71] text-white text-xs font-bold flex items-center justify-center">VISA</div>
            <p class="text-xs text-blue-800">Pago simulado. Tarjeta Visa válida (16 dígitos, inicia con 4).</p>
          </div>
          <div>
            <label class="form-label">Monto (S/) — dejar vacío para saldo total</label>
            <input type="number" class="form-input mt-1" min="0.01" step="0.01"
              [(ngModel)]="formVisa.montoOpcional" placeholder="Saldo completo">
          </div>
          <div>
            <label class="form-label">Número de tarjeta</label>
            <input class="form-input mt-1 font-mono tracking-wider" maxlength="19"
              placeholder="4111 1111 1111 1111" [(ngModel)]="formVisa.numeroTarjeta" (input)="formatearTarjeta()">
          </div>
          <div>
            <label class="form-label">Nombre del titular</label>
            <input class="form-input mt-1 uppercase" [(ngModel)]="formVisa.nombreTitular">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Vencimiento</label>
              <input class="form-input mt-1 font-mono" maxlength="5" placeholder="MM/YY"
                [(ngModel)]="formVisa.vencimiento" (input)="formatearVencimiento()">
            </div>
            <div>
              <label class="form-label">CVV</label>
              <input class="form-input mt-1 font-mono" maxlength="4" type="password"
                [(ngModel)]="formVisa.cvv">
            </div>
          </div>
        }

        @if (errorModal()) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ errorModal() }}</div>
        }
      </div>

      <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="cerrarModal()">Cancelar</button>
        <button type="button" class="btn btn-primary" (click)="confirmarPago()" [disabled]="svc.saving()">
          {{ svc.saving() ? 'Procesando…' : 'Confirmar pago' }}
        </button>
      </div>
    </div>
  </div>
}

<!-- Modal boleta -->
@if (modalBoleta()) {
  <div class="boleta-modal-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" (click)="cerrarBoleta()">
    <div class="boleta-modal-panel bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto" (click)="$event.stopPropagation()">
      @if (svc.loadingBoleta()) {
        <div class="p-12 text-center text-gray-400 text-sm">Cargando boleta…</div>
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
  `,
})
export class TesoreriaPagosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly svc = inject(PagosService);

  readonly POR_PAGINA = 10;
  readonly aniosDisponibles = [2026, 2025, 2024];

  readonly estadoBadge = estadoBadge;
  readonly estadoLabel = estadoLabel;
  readonly formatFecha = formatFecha;
  readonly gradoLabel = gradoLabel;
  readonly metodoPagoLabel = metodoPagoLabel;

  readonly metodos: { id: MetodoModal; label: string }[] = [
    { id: 'efectivo', label: 'Efectivo' },
    { id: 'transferencia', label: 'Transferencia' },
    { id: 'deposito', label: 'Depósito' },
    { id: 'visa', label: 'Tarjeta Visa' },
  ];

  readonly anioEscolar = signal(new Date().getFullYear());
  readonly cargos = signal<CargoPago[]>([]);
  readonly resumen = signal<ResumenTesoreria | null>(null);
  readonly loadError = signal('');
  readonly filtroTexto = signal('');
  readonly filtroEstado = signal('');
  readonly paginaActual = signal(1);
  readonly modalAbierto = signal(false);
  readonly modalBoleta = signal(false);
  readonly cargoSeleccionado = signal<CargoPago | null>(null);
  readonly metodo = signal<MetodoModal>('efectivo');
  readonly errorModal = signal('');
  readonly toast = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  readonly boleta = signal<BoletaVenta | null>(null);
  readonly pagosPorCargo = signal<Map<number, number>>(new Map());
  private imprimirAlCargarBoleta = false;

  formManual = { monto: 0, referencia: '', fechaPago: new Date().toISOString().slice(0, 10) };
  formVisa = {
    numeroTarjeta: '',
    nombreTitular: '',
    vencimiento: '',
    cvv: '',
    montoOpcional: null as number | null,
  };

  readonly cargosFiltrados = computed(() => {
    const q = this.filtroTexto().trim().toLowerCase();
    const est = this.filtroEstado();
    return this.cargos().filter((c) => {
      if (est && c.estado !== est) return false;
      if (!q) return true;
      const hay = `${c.alumno} ${c.concepto} ${c.periodoLabel} ${c.codigoAlumno}`.toLowerCase();
      return hay.includes(q);
    });
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.cargosFiltrados().length / this.POR_PAGINA)),
  );
  readonly inicio = computed(() => (this.paginaActual() - 1) * this.POR_PAGINA);
  readonly fin = computed(() =>
    Math.min(this.inicio() + this.POR_PAGINA, this.cargosFiltrados().length),
  );
  readonly cargosVista = computed(() =>
    this.cargosFiltrados().slice(this.inicio(), this.fin()),
  );
  readonly paginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const ini = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    return Array.from({ length: fin - ini + 1 }, (_, i) => ini + i);
  });

  readonly totalSaldoFiltrado = computed(() =>
    this.cargosFiltrados().reduce((s, c) => s + c.saldo, 0),
  );

  readonly kpis = computed(() => {
    const r = this.resumen();
    return [
      { label: 'Recaudado (año)', value: r?.recaudado ?? 0, color: 'text-green-600' },
      { label: 'Pendiente', value: r?.pendiente ?? 0, color: 'text-yellow-600' },
      { label: 'Vencido', value: r?.vencido ?? 0, color: 'text-red-600' },
      { label: 'Recaudado (mes)', value: r?.recaudadoMes ?? 0, color: 'text-indigo-600' },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle('Gestión de Pagos');
    this.cargar();
  }

  cargar(): void {
    this.loadError.set('');
    const anio = this.anioEscolar();
    this.svc.getSummary(anio).subscribe({
      next: (r) => this.resumen.set(r),
      error: () => this.resumen.set(null),
    });
    this.svc.listCharges({ anioEscolar: anio }).subscribe({
      next: (rows) => {
        this.cargos.set(rows);
        this.paginaActual.set(1);
      },
      error: (err: Error) => this.loadError.set(err.message),
    });
  }

  onFiltroTexto(v: string): void {
    this.filtroTexto.set(v);
    this.paginaActual.set(1);
  }

  onFiltroEstado(v: string): void {
    this.filtroEstado.set(v);
    this.paginaActual.set(1);
  }

  onAnioChange(anio: number): void {
    this.anioEscolar.set(anio);
    this.cargar();
  }

  abrirModal(cargo: CargoPago): void {
    this.cargoSeleccionado.set(cargo);
    this.metodo.set('efectivo');
    this.errorModal.set('');
    this.formManual = {
      monto: cargo.saldo,
      referencia: '',
      fechaPago: new Date().toISOString().slice(0, 10),
    };
    this.formVisa = {
      numeroTarjeta: '',
      nombreTitular: '',
      vencimiento: '',
      cvv: '',
      montoOpcional: null,
    };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.cargoSeleccionado.set(null);
  }

  confirmarPago(): void {
    const cargo = this.cargoSeleccionado();
    if (!cargo) return;

    if (this.metodo() === 'visa') {
      this.confirmarVisa(cargo);
      return;
    }

    const monto = Number(this.formManual.monto);
    if (!monto || monto <= 0) {
      this.errorModal.set('Ingrese un monto válido');
      return;
    }
    if (monto > cargo.saldo + 0.001) {
      this.errorModal.set(`El monto no puede superar S/ ${cargo.saldo.toFixed(2)}`);
      return;
    }

    this.errorModal.set('');
    this.svc
      .registerPayment(cargo.id, {
        monto,
        metodoPago: this.metodo() as 'efectivo' | 'transferencia' | 'deposito',
        referencia: this.formManual.referencia.trim() || undefined,
        fechaPago: this.formManual.fechaPago || undefined,
      })
      .subscribe({
        next: (res) => this.onPagoOk(cargo, res),
        error: (err: Error) => this.errorModal.set(err.message),
      });
  }

  confirmarVisa(cargo: CargoPago): void {
    const digits = this.formVisa.numeroTarjeta.replace(/\D/g, '');
    if (digits.length !== 16) {
      this.errorModal.set('Ingrese los 16 dígitos de la tarjeta');
      return;
    }
    if (!this.formVisa.nombreTitular.trim()) {
      this.errorModal.set('Ingrese el nombre del titular');
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(this.formVisa.vencimiento)) {
      this.errorModal.set('Vencimiento inválido (MM/YY)');
      return;
    }
    if (!/^\d{3,4}$/.test(this.formVisa.cvv)) {
      this.errorModal.set('CVV inválido');
      return;
    }

    this.errorModal.set('');
    const payload = {
      numeroTarjeta: digits,
      nombreTitular: this.formVisa.nombreTitular.trim(),
      vencimiento: this.formVisa.vencimiento,
      cvv: this.formVisa.cvv,
      monto: this.formVisa.montoOpcional ?? undefined,
    };

    this.svc.payWithVisa(cargo.id, payload).subscribe({
      next: (res) => this.onPagoOk(cargo, res),
      error: (err: Error) => this.errorModal.set(err.message),
    });
  }

  onPagoOk(cargo: CargoPago, res: { paymentId: number; numeroBoleta: string; saldoRestante: number }): void {
    this.pagosPorCargo.update((m) => {
      const next = new Map(m);
      next.set(cargo.id, res.paymentId);
      return next;
    });
    this.mostrarToast(`Pago registrado · Boleta ${res.numeroBoleta}`, 'ok');
    this.cerrarModal();
    this.cargar();
  }

  ultimoPagoId(c: CargoPago): number | null {
    return this.pagosPorCargo().get(c.id) ?? c.ultimoPagoId ?? null;
  }

  verBoleta(paymentId: number, imprimir = false): void {
    this.imprimirAlCargarBoleta = imprimir;
    this.boleta.set(null);
    this.modalBoleta.set(true);
    this.svc.getReceipt(paymentId).subscribe({
      next: (b) => {
        this.boleta.set(b);
        if (this.imprimirAlCargarBoleta) {
          this.imprimirAlCargarBoleta = false;
          setTimeout(() => this.imprimirBoleta(), 300);
        }
      },
      error: (err: Error) => {
        this.imprimirAlCargarBoleta = false;
        this.modalBoleta.set(false);
        this.mostrarToast(err.message, 'err');
      },
    });
  }

  imprimirBoleta(): void {
    window.print();
  }

  cerrarBoleta(): void {
    this.modalBoleta.set(false);
    this.boleta.set(null);
    this.imprimirAlCargarBoleta = false;
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

  mostrarToast(msg: string, tipo: 'ok' | 'err'): void {
    this.toast.set({ msg, tipo });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
