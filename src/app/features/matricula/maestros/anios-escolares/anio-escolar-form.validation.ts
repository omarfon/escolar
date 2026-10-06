import type { CreateAnioEscolarPayload } from './anios-escolares.model';

export function validarAnioEnRango(anio: number, inicio: string, fin: string): string | null {
  const iniYear = Number(inicio.slice(0, 4));
  const finYear = Number(fin.slice(0, 4));
  if (anio < iniYear - 1 || anio > finYear) {
    return 'El año escolar debe ser coherente con el rango de fechas indicado.';
  }
  return null;
}

export function validarAnioEscolarForm(body: Partial<CreateAnioEscolarPayload>): string | null {
  if (!body.anio || body.anio < 2000) return 'Indique un año escolar válido (≥ 2000).';
  if (!body.fechaInicio || body.fechaInicio.length < 10) return 'Indique la fecha de inicio.';
  if (!body.fechaFin || body.fechaFin.length < 10) return 'Indique la fecha de fin.';
  if (body.fechaInicio > body.fechaFin) {
    return 'La fecha de inicio debe ser anterior o igual a la de fin.';
  }
  const rango = validarAnioEnRango(body.anio, body.fechaInicio, body.fechaFin);
  if (rango) return rango;
  if (!body.tipoPeriodo) return 'Seleccione el tipo de periodos.';
  return null;
}
