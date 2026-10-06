const UNIDADES = [
  '',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISÉIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
];

const DECENAS = [
  '',
  '',
  'VEINTE',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function leerCentenas(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const cent = CENTENAS[c];
  if (!resto) return cent;
  return `${cent} ${leerDecenas(resto)}`.trim();
}

function leerDecenas(n: number): string {
  if (n === 0) return '';
  if (n < 20) return UNIDADES[n];
  if (n < 30) return n === 20 ? 'VEINTE' : `VEINTI${UNIDADES[n - 20].toLowerCase()}`.toUpperCase();
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d];
}

function leerMiles(n: number): string {
  if (n === 0) return '';
  if (n === 1) return 'MIL';
  return `${leerCentenas(Math.floor(n / 1000))} MIL`.replace(/\s+/g, ' ').trim();
}

function numeroALetrasEntero(n: number): string {
  if (n === 0) return 'CERO';
  if (n < 1000) return leerCentenas(n);
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const parteMiles = leerMiles(miles);
  const parteResto = resto ? leerCentenas(resto) : '';
  return `${parteMiles}${parteResto ? ` ${parteResto}` : ''}`.trim();
}

export function montoEnLetras(monto: number): string {
  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const letras = numeroALetrasEntero(entero);
  const cents = centavos.toString().padStart(2, '0');
  return `${letras} CON ${cents}/100 SOLES`;
}
