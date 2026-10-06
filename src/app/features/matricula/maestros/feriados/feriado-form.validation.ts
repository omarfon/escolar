import { MaestroFeriadoTipo } from './feriados.model';

export type ErroresCampoFeriado = Record<string, string>;

export interface FeriadoFormValues {
  anioEscolar: number;
  fecha: string;
  nombre: string;
  tipo: MaestroFeriadoTipo;
  descripcion: string;
}

const TIPOS_VALIDOS: MaestroFeriadoTipo[] = ['nacional', 'local', 'institucional'];
const CAMPOS_MINIMOS = ['anioEscolar', 'fecha', 'nombre', 'tipo'] as const;
const CAMPOS_FORM = [...CAMPOS_MINIMOS, 'descripcion'] as const;

function parseIsoDate(fecha: string): Date | null {
  const v = fecha.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function validarCamposMinimos(form: FeriadoFormValues, errors: ErroresCampoFeriado): void {
  if (!Number.isFinite(form.anioEscolar)) {
    errors['anioEscolar'] = 'Ingresa el año escolar.';
  } else if (!Number.isInteger(form.anioEscolar)) {
    errors['anioEscolar'] = 'El año escolar debe ser un número entero.';
  } else if (form.anioEscolar < 2000) {
    errors['anioEscolar'] = 'El año escolar debe ser 2000 o posterior.';
  }

  const fecha = form.fecha.trim();
  if (!fecha) {
    errors['fecha'] = 'Selecciona la fecha del feriado.';
  } else if (!parseIsoDate(fecha)) {
    errors['fecha'] = 'La fecha no es válida.';
  } else if (Number(fecha.slice(0, 4)) !== form.anioEscolar) {
    errors['fecha'] = 'La fecha debe corresponder al año escolar seleccionado.';
  }

  const nombre = form.nombre.trim();
  if (!nombre) {
    errors['nombre'] = 'Ingresa el nombre del feriado.';
  } else if (nombre.length < 3) {
    errors['nombre'] = 'El nombre debe tener al menos 3 caracteres.';
  } else if (nombre.length > 120) {
    errors['nombre'] = 'El nombre no puede superar 120 caracteres.';
  }

  if (!form.tipo?.trim()) {
    errors['tipo'] = 'Selecciona el tipo de feriado.';
  } else if (!TIPOS_VALIDOS.includes(form.tipo)) {
    errors['tipo'] = 'El tipo de feriado no es válido.';
  }
}

function validarDescripcion(descripcion: string, errors: ErroresCampoFeriado): void {
  const v = descripcion.trim();
  if (!v) return;
  if (v.length > 500) {
    errors['descripcion'] = 'La descripción no puede superar 500 caracteres.';
  }
}

export function validarFeriadoFormMinimo(form: FeriadoFormValues): ErroresCampoFeriado {
  const errors: ErroresCampoFeriado = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function feriadoFormularioMinimoListo(form: FeriadoFormValues): boolean {
  return Object.keys(validarFeriadoFormMinimo(form)).length === 0;
}

export function validarFeriadoForm(form: FeriadoFormValues): ErroresCampoFeriado {
  const errors = validarFeriadoFormMinimo(form);
  validarDescripcion(form.descripcion, errors);
  return errors;
}

export function validarCampoFeriado(form: FeriadoFormValues, key: string): string | null {
  const errors: ErroresCampoFeriado = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'descripcion') {
    validarDescripcion(form.descripcion, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorFeriado(errors: ErroresCampoFeriado): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
