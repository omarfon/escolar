export interface BoletaVentaData {
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

export function metodoPagoBoletaLabel(metodo: string): string {
  const map: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia bancaria',
    deposito: 'Depósito bancario',
    visa: 'Tarjeta de crédito / débito',
    tarjeta: 'Tarjeta de crédito / débito',
  };
  return map[metodo] ?? metodo;
}

export function formatBoletaFecha(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function gradoBoletaLabel(est: BoletaVentaData['estudiante']): string {
  const parts = [est.nivel, est.grado].filter(Boolean);
  const base = parts.join(' ').trim();
  const sec = est.seccion?.trim();
  if (!base) return '—';
  return sec ? `${base} "${sec}"` : base;
}
