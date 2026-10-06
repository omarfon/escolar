import { MaestroConductaCategoria } from './faltas-reconocimientos.model';

export type ErroresCampoConductaTipo = Record<string, string>;

export interface ConductaTipoFormValues {
  nombre: string;
  categoria: MaestroConductaCategoria;
  icon: string;
  orden: number;
}

const CATEGORIAS_VALIDAS: MaestroConductaCategoria[] = ['falta', 'reconocimiento'];
const CAMPOS_MINIMOS = ['nombre', 'categoria'] as const;
const CAMPOS_FORM = [...CAMPOS_MINIMOS, 'icon', 'orden'] as const;

function validarCamposMinimos(form: ConductaTipoFormValues, errors: ErroresCampoConductaTipo): void {
  const nombre = form.nombre.trim();
  if (!nombre) {
    errors['nombre'] = 'Ingresa el nombre del tipo.';
  } else if (nombre.length < 3) {
    errors['nombre'] = 'El nombre debe tener al menos 3 caracteres.';
  } else if (nombre.length > 80) {
    errors['nombre'] = 'El nombre no puede superar 80 caracteres.';
  }

  if (!form.categoria?.trim()) {
    errors['categoria'] = 'Selecciona la categoría.';
  } else if (!CATEGORIAS_VALIDAS.includes(form.categoria)) {
    errors['categoria'] = 'La categoría no es válida.';
  }
}

function validarIcono(icon: string, errors: ErroresCampoConductaTipo): void {
  const v = icon.trim();
  if (!v) return;
  if (v.length > 40) {
    errors['icon'] = 'El icono no puede superar 40 caracteres.';
  } else if (!/^[a-z0-9_]+$/i.test(v)) {
    errors['icon'] = 'Usa solo letras, números y guiones bajos (ej. warning, emoji_events).';
  }
}

function validarOrden(orden: number, errors: ErroresCampoConductaTipo): void {
  if (!Number.isFinite(orden)) {
    errors['orden'] = 'Ingresa un orden válido.';
    return;
  }
  if (!Number.isInteger(orden)) {
    errors['orden'] = 'El orden debe ser un número entero.';
    return;
  }
  if (orden < 0) {
    errors['orden'] = 'El orden no puede ser negativo.';
  }
}

export function validarConductaTipoFormMinimo(form: ConductaTipoFormValues): ErroresCampoConductaTipo {
  const errors: ErroresCampoConductaTipo = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function conductaTipoFormularioMinimoListo(form: ConductaTipoFormValues): boolean {
  return Object.keys(validarConductaTipoFormMinimo(form)).length === 0;
}

export function validarConductaTipoForm(form: ConductaTipoFormValues): ErroresCampoConductaTipo {
  const errors = validarConductaTipoFormMinimo(form);
  validarIcono(form.icon, errors);
  validarOrden(form.orden, errors);
  return errors;
}

export function validarCampoConductaTipo(form: ConductaTipoFormValues, key: string): string | null {
  const errors: ErroresCampoConductaTipo = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'icon') {
    validarIcono(form.icon, errors);
    return errors[key] ?? null;
  }

  if (key === 'orden') {
    validarOrden(form.orden, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorConductaTipo(errors: ErroresCampoConductaTipo): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
