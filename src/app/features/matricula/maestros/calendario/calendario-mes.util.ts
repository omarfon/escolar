import type { CalendarioDiaItem } from './calendario-escolar.model';

export interface CeldaCalendarioMes {
  key: string;
  dia: number | null;
  iso: string;
  diaData?: CalendarioDiaItem;
  hoy: boolean;
}

export function buildCeldasCalendarioMes(
  mes: string,
  dias: CalendarioDiaItem[],
  hoyIso = new Date().toISOString().slice(0, 10),
): CeldaCalendarioMes[] {
  const [y, m] = mes.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));

  const celdas: CeldaCalendarioMes[] = [];
  for (let i = 0; i < startPad; i++) {
    celdas.push({ key: `pad-${i}`, dia: null, iso: '', hoy: false });
  }
  for (let d = 1; d <= lastDay; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    celdas.push({
      key: iso,
      dia: d,
      iso,
      diaData: porFecha.get(iso),
      hoy: iso === hoyIso,
    });
  }
  return celdas;
}

export function mesAnterior(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const dt = new Date(y, m - 2, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export function mesSiguiente(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const dt = new Date(y, m, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export function mesActualIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
