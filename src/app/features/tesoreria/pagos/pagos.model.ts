export type CargoEstado = 'pendiente' | 'parcial' | 'pagado' | 'vencido';
export type MetodoPagoStaff = 'efectivo' | 'transferencia' | 'deposito' | 'visa';

export interface CargoPago {
  id: number;
  studentId: number;
  alumno: string;
  codigoAlumno: string;
  grado: string;
  seccion: string;
  nivel: string;
  concepto: string;
  codigoConcepto: string;
  periodoLabel: string;
  monto: number;
  montoPagado: number;
  saldo: number;
  fechaVencimiento: string;
  estado: CargoEstado;
  anioEscolar: number;
  ultimoPagoId?: number | null;
  numeroBoleta?: string;
}

export interface ResumenTesoreria {
  anioEscolar: number;
  recaudado: number;
  pendiente: number;
  vencido: number;
  recaudadoMes: number;
  totalCargos: number;
  cargosPendientes: number;
}

export interface RegistrarPagoPayload {
  monto: number;
  metodoPago: 'efectivo' | 'transferencia' | 'deposito';
  referencia?: string;
  fechaPago?: string;
}

export interface PayVisaPayload {
  numeroTarjeta: string;
  nombreTitular: string;
  vencimiento: string;
  cvv: string;
  monto?: number;
}

export interface PagoResultado {
  paymentId: number;
  numeroBoleta: string;
  monto: number;
  chargeId: number;
  estado: string;
  saldoRestante: number;
}

export interface BoletaVenta {
  id: number;
  numeroBoleta: string;
  serie: string;
  correlativo: string;
  fechaEmision: string;
  fechaPago: string;
  estudiante: {
    id: number;
    nombreCompleto: string;
    nivel: string;
    grado: string;
    seccion: string;
  };
  apoderado: string;
  concepto: string;
  periodoLabel: string;
  anioEscolar: number;
  monto: number;
  metodoPago: string;
  referencia: string;
  tarjetaMarca: string;
  tarjetaUltimos4: string;
  institucion: {
    nombre: string;
    siglas: string;
    ruc: string;
    codigoModular: string;
    direccion: string;
  };
}

export function estadoBadge(estado: CargoEstado): string {
  const map: Record<CargoEstado, string> = {
    pagado: 'badge-green',
    pendiente: 'badge-yellow',
    vencido: 'badge-red',
    parcial: 'badge-orange',
  };
  return map[estado] ?? 'badge-gray';
}

export function estadoLabel(estado: CargoEstado): string {
  const map: Record<CargoEstado, string> = {
    pagado: 'Pagado',
    pendiente: 'Pendiente',
    vencido: 'Vencido',
    parcial: 'Parcial',
  };
  return map[estado] ?? estado;
}

export function metodoPagoLabel(metodo: string): string {
  const map: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    deposito: 'Depósito',
    visa: 'Tarjeta Visa',
  };
  return map[metodo] ?? metodo;
}

export function formatFecha(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function gradoLabel(c: CargoPago): string {
  const g = c.grado?.trim();
  const s = c.seccion?.trim();
  if (!g) return '—';
  return s ? `${g} "${s}"` : g;
}
