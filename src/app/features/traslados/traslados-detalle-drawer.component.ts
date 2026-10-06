import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { TrasladoContext, TrasladoDetalle } from './traslados.service';
import { TrasladosDetalleComponent } from './traslados-detalle.component';

@Component({
  selector: 'app-traslados-detalle-drawer',
  standalone: true,
  imports: [TrasladosDetalleComponent],
  template: `
@if (abierto) {
  <div
    class="fixed inset-0 bg-black/40 z-[80] backdrop-blur-[1px]"
    (click)="cerrar.emit()"
    aria-hidden="true"
  ></div>
  <aside
    class="fixed inset-y-0 right-0 z-[90] w-full max-w-2xl bg-[#f4f6fb] shadow-2xl border-l border-[#e8eaf0] flex flex-col animate-slide-in-r"
    role="dialog"
    aria-modal="true"
    [attr.aria-label]="tituloDrawer"
  >
    <div class="px-5 py-4 border-b border-[#e8eaf0] flex items-center justify-between shrink-0 bg-white">
      <div class="min-w-0 pr-3">
        <h2 class="font-bold text-[#1a202c] truncate">{{ tituloDrawer }}</h2>
        @if (subtituloDrawer) {
          <p class="text-xs text-[#64748b] mt-0.5 truncate">{{ subtituloDrawer }}</p>
        }
      </div>
      <button type="button" class="btn-icon shrink-0" (click)="cerrar.emit()" aria-label="Cerrar detalle">
        <span class="icon">close</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 sm:p-5">
      @if (cargando) {
        <div class="card p-6 text-sm text-indigo-700" role="status" aria-live="polite">
          Cargando detalle de la solicitud…
        </div>
      } @else if (errorDetalle) {
        <div class="card p-6 text-sm text-red-600 border border-red-200 bg-red-50" role="alert">
          {{ errorDetalle }}
        </div>
      } @else if (detalle; as d) {
        <app-traslados-detalle
          [detalle]="d"
          [context]="context"
          [enDrawer]="true"
          (cerrar)="cerrar.emit()"
          (accion)="accion.emit($event)"
          (actualizado)="actualizado.emit($event)"
        />
      }
    </div>
  </aside>
}
  `,
})
export class TrasladosDetalleDrawerComponent {
  @Input() abierto = false;
  @Input() cargando = false;
  @Input() detalle: TrasladoDetalle | null = null;
  @Input() context: TrasladoContext | null = null;
  @Input() errorDetalle = '';

  @Output() cerrar = new EventEmitter<void>();
  @Output() accion = new EventEmitter<{
    accion: string;
    motivo?: string;
    observacion?: string;
    seccionDestino?: string;
    error?: string;
  }>();
  @Output() actualizado = new EventEmitter<TrasladoDetalle>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto) this.cerrar.emit();
  }

  get tituloDrawer(): string {
    if (this.detalle) return `${this.detalle.codigo} · ${this.detalle.estado}`;
    if (this.cargando) return 'Cargando solicitud…';
    return 'Detalle de traslado';
  }

  get subtituloDrawer(): string {
    if (!this.detalle) return '';
    return `${this.detalle.studentNombre} · ${this.detalle.ieOrigenNombre} → ${this.detalle.ieDestinoNombre}`;
  }
}
