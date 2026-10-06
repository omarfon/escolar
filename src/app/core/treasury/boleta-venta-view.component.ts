import { DecimalPipe } from '@angular/common';
import { Component, Input, ViewEncapsulation } from '@angular/core';
import {
  BoletaVentaData,
  formatBoletaFecha,
  gradoBoletaLabel,
  metodoPagoBoletaLabel,
} from './boleta-venta.model';
import { montoEnLetras } from './monto-letras.util';

@Component({
  selector: 'app-boleta-venta-view',
  standalone: true,
  imports: [DecimalPipe],
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .boleta-doc {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      color: #111;
      background: #fff;
      max-width: 720px;
      margin: 0 auto;
      border: 2px solid #111;
      padding: 0;
    }

    .boleta-doc__inner {
      padding: 20px 22px 18px;
    }

    .boleta-doc__header {
      text-align: center;
      border-bottom: 1px solid #111;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }

    .boleta-doc__razon {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin: 0 0 4px;
    }

    .boleta-doc__meta {
      font-size: 10px;
      color: #333;
      margin: 1px 0;
    }

    .boleta-doc__tipo {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 14px;
      border: 1.5px solid #111;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .boleta-doc__numero {
      margin-top: 8px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .boleta-doc__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      margin-bottom: 12px;
      font-size: 10px;
    }

    .boleta-doc__field label {
      display: block;
      color: #555;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 1px;
    }

    .boleta-doc__field span {
      font-weight: 600;
    }

    .boleta-doc__field--full {
      grid-column: 1 / -1;
    }

    .boleta-doc__table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 0;
      font-size: 10px;
    }

    .boleta-doc__table th,
    .boleta-doc__table td {
      border: 1px solid #111;
      padding: 5px 6px;
      vertical-align: top;
    }

    .boleta-doc__table th {
      background: #f5f5f5;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.03em;
    }

    .boleta-doc__table .num {
      text-align: right;
      white-space: nowrap;
    }

    .boleta-doc__table .center {
      text-align: center;
    }

    .boleta-doc__totales {
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
    }

    .boleta-doc__totales table {
      border-collapse: collapse;
      font-size: 10px;
      min-width: 260px;
    }

    .boleta-doc__totales td {
      padding: 3px 0 3px 12px;
    }

    .boleta-doc__totales td:first-child {
      color: #444;
      text-align: right;
      padding-right: 10px;
    }

    .boleta-doc__totales td:last-child {
      text-align: right;
      font-weight: 600;
      min-width: 90px;
    }

    .boleta-doc__totales tr.total td {
      font-size: 12px;
      font-weight: 700;
      border-top: 1.5px solid #111;
      padding-top: 6px;
    }

    .boleta-doc__letras {
      margin-top: 12px;
      border: 1px solid #111;
      padding: 8px 10px;
      font-size: 10px;
    }

    .boleta-doc__letras label {
      display: block;
      font-size: 9px;
      color: #555;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .boleta-doc__letras p {
      margin: 0;
      font-weight: 600;
      text-transform: uppercase;
    }

    .boleta-doc__pago {
      margin-top: 10px;
      font-size: 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
    }

    .boleta-doc__pago label {
      display: block;
      font-size: 9px;
      color: #555;
      text-transform: uppercase;
    }

    .boleta-doc__footer {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed #666;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
    }

    .boleta-doc__legal {
      flex: 1;
      font-size: 8.5px;
      color: #444;
      line-height: 1.4;
    }

    .boleta-doc__qr-wrap {
      text-align: center;
      flex-shrink: 0;
    }

    .boleta-doc__qr {
      width: 88px;
      height: 88px;
      border: 1px solid #111;
      padding: 4px;
      background: #fff;
    }

    .boleta-doc__hash {
      margin-top: 4px;
      font-size: 7px;
      font-family: 'Courier New', Courier, monospace;
      word-break: break-all;
      max-width: 120px;
      color: #333;
    }

    @media print {
      .boleta-no-print {
        display: none !important;
      }

      .boleta-modal-overlay {
        position: static !important;
        background: transparent !important;
        backdrop-filter: none !important;
        padding: 0 !important;
      }

      .boleta-modal-panel {
        box-shadow: none !important;
        border-radius: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        width: 100% !important;
        max-width: none !important;
      }

      .boleta-doc {
        border-width: 1.5px;
        max-width: none;
      }
    }
  `],
  template: `
    @if (boleta; as b) {
      <article class="boleta-doc" id="boleta-print">
        <div class="boleta-doc__inner">
          <header class="boleta-doc__header">
            <h1 class="boleta-doc__razon">{{ b.institucion.nombre }}</h1>
            @if (b.institucion.siglas) {
              <p class="boleta-doc__meta">{{ b.institucion.siglas }}</p>
            }
            <p class="boleta-doc__meta">RUC {{ b.institucion.ruc }}</p>
            @if (b.institucion.direccion) {
              <p class="boleta-doc__meta">{{ b.institucion.direccion }}</p>
            }
            @if (b.institucion.codigoModular) {
              <p class="boleta-doc__meta">Código modular: {{ b.institucion.codigoModular }}</p>
            }
            <div class="boleta-doc__tipo">Boleta de venta electrónica</div>
            <div class="boleta-doc__numero">{{ b.serie }}-{{ b.correlativo }}</div>
          </header>

          <div class="boleta-doc__grid">
            <div class="boleta-doc__field">
              <label>Fecha de emisión</label>
              <span>{{ formatFecha(b.fechaEmision) }}</span>
            </div>
            <div class="boleta-doc__field">
              <label>Fecha de pago</label>
              <span>{{ formatFecha(b.fechaPago) }}</span>
            </div>
            <div class="boleta-doc__field boleta-doc__field--full">
              <label>Señor(es)</label>
              <span>{{ cliente(b) }}</span>
            </div>
            <div class="boleta-doc__field">
              <label>Estudiante</label>
              <span>{{ b.estudiante.nombreCompleto }}</span>
            </div>
            <div class="boleta-doc__field">
              <label>Grado / sección</label>
              <span>{{ gradoLabel(b.estudiante) }}</span>
            </div>
            <div class="boleta-doc__field">
              <label>Año escolar</label>
              <span>{{ b.anioEscolar }}</span>
            </div>
            <div class="boleta-doc__field">
              <label>Moneda</label>
              <span>Soles (PEN)</span>
            </div>
          </div>

          <table class="boleta-doc__table">
            <thead>
              <tr>
                <th class="center" style="width:36px">Item</th>
                <th class="center" style="width:44px">Cant.</th>
                <th class="center" style="width:52px">Unidad</th>
                <th>Descripción</th>
                <th class="num" style="width:72px">V. unit.</th>
                <th class="num" style="width:72px">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="center">1</td>
                <td class="center">1</td>
                <td class="center">ZZ</td>
                <td>
                  <strong>{{ b.concepto }}</strong>
                  @if (b.periodoLabel) {
                    <br><span style="color:#444">Periodo: {{ b.periodoLabel }}</span>
                  }
                </td>
                <td class="num">{{ b.monto | number:'1.2-2' }}</td>
                <td class="num">{{ b.monto | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>

          <div class="boleta-doc__totales">
            <table>
              <tr>
                <td>Op. gravada</td>
                <td>S/ {{ 0 | number:'1.2-2' }}</td>
              </tr>
              <tr>
                <td>Op. exonerada</td>
                <td>S/ {{ b.monto | number:'1.2-2' }}</td>
              </tr>
              <tr>
                <td>Op. inafecta</td>
                <td>S/ {{ 0 | number:'1.2-2' }}</td>
              </tr>
              <tr>
                <td>I.G.V. (18%)</td>
                <td>S/ {{ 0 | number:'1.2-2' }}</td>
              </tr>
              <tr class="total">
                <td>Importe total</td>
                <td>S/ {{ b.monto | number:'1.2-2' }}</td>
              </tr>
            </table>
          </div>

          <div class="boleta-doc__letras">
            <label>Importe en letras</label>
            <p>SON: {{ letras(b.monto) }}</p>
          </div>

          <div class="boleta-doc__pago">
            <div>
              <label>Forma de pago</label>
              <span>{{ metodoLabel(b.metodoPago) }}</span>
              @if (b.tarjetaUltimos4) {
                <span> · {{ b.tarjetaMarca || 'Tarjeta' }} **** {{ b.tarjetaUltimos4 }}</span>
              }
            </div>
            @if (b.referencia) {
              <div>
                <label>Referencia / operación</label>
                <span>{{ b.referencia }}</span>
              </div>
            }
          </div>

          <footer class="boleta-doc__footer">
            <div class="boleta-doc__legal">
              <p>
                Representación impresa de la Boleta de Venta Electrónica.
                Consulte el comprobante en el portal institucional o solicítelo en tesorería.
              </p>
              <p style="margin-top:4px">
                Documento generado por el sistema de gestión escolar · ID pago {{ b.id }}
              </p>
            </div>
            <div class="boleta-doc__qr-wrap">
              <svg class="boleta-doc__qr" viewBox="0 0 100 100" aria-hidden="true">
                @for (cell of qrCells(b.id); track cell) {
                  <rect [attr.x]="cell % 10 * 10" [attr.y]="floor(cell / 10) * 10" width="10" height="10" fill="#111"/>
                }
              </svg>
              <div class="boleta-doc__hash">{{ hashDoc(b) }}</div>
            </div>
          </footer>
        </div>
      </article>
    }
  `,
})
export class BoletaVentaViewComponent {
  @Input({ required: true }) boleta!: BoletaVentaData;

  readonly formatFecha = formatBoletaFecha;
  readonly gradoLabel = gradoBoletaLabel;
  readonly metodoLabel = metodoPagoBoletaLabel;
  readonly letras = montoEnLetras;
  readonly floor = Math.floor;

  cliente(b: BoletaVentaData): string {
    return b.apoderado?.trim() || b.estudiante.nombreCompleto;
  }

  hashDoc(b: BoletaVentaData): string {
    const seed = `${b.numeroBoleta}-${b.id}-${b.monto}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    const hex = Math.abs(h).toString(16).toUpperCase().padStart(8, '0');
    return `${hex}${b.correlativo}`.slice(0, 28);
  }

  qrCells(id: number): number[] {
    const cells: number[] = [];
    let n = id * 7919 + 104729;
    for (let i = 0; i < 100; i++) {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      if (n % 3 !== 0) cells.push(i);
    }
    for (let i = 0; i < 10; i++) {
      if (!cells.includes(i)) cells.push(i);
      if (!cells.includes(90 + i)) cells.push(90 + i);
      if (!cells.includes(i * 10)) cells.push(i * 10);
      if (!cells.includes(i * 10 + 9)) cells.push(i * 10 + 9);
    }
    return [...new Set(cells)].sort((a, b) => a - b);
  }
}
