import { NivelConcepto, Periodicidad, TipoConcepto } from './conceptos.model';

export type ErroresCampoConcepto = Record<string, string>;

export interface ConceptoFormValues {
  nombre: string;
  descripcion: string;
  monto: number;
  tipo: TipoConcepto;
  periodicidad: Periodicidad;
  nivel: NivelConcepto;
}

const TIPOS_VALIDOS: TipoConcepto[] = ['obligatorio', 'voluntario', 'eventual'];
const PERIODICIDADES_VALIDAS: Periodicidad[] = ['mensual', 'bimestral', 'anual', 'único'];
const NIVELES_VALIDOS: NivelConcepto[] = ['Todos', 'Inicial', 'Primaria', 'Secundaria'];
const CAMPOS_MINIMOS = ['nombre', 'monto', 'tipo', 'periodicidad'] as const;
const CAMPOS_FORM = [...CAMPOS_MINIMOS, 'descripcion', 'nivel'] as const;

function tieneMaxDosDecimales(monto: number): boolean {
  return Math.abs(monto * 100 - Math.round(monto * 100)) < 1e-9;
}

function validarCamposMinimos(form: ConceptoFormValues, errors: ErroresCampoConcepto): void {
  const nombre = form.nombre.trim();
  if (!nombre) {
    errors['nombre'] = 'Ingresa el nombre del concepto.';
  } else if (nombre.length < 3) {
    errors['nombre'] = 'El nombre debe tener al menos 3 caracteres.';
  } else if (nombre.length > 120) {
    errors['nombre'] = 'El nombre no puede superar 120 caracteres.';
  }

  if (!Number.isFinite(form.monto) || form.monto <= 0) {
    errors['monto'] = 'Ingresa un monto mayor a cero.';
  } else if (form.monto < 0.01) {
    errors['monto'] = 'El monto mínimo es S/ 0.01.';
  } else if (!tieneMaxDosDecimales(form.monto)) {
    errors['monto'] = 'Usa como máximo 2 decimales.';
  }

  if (!form.tipo?.trim()) {
    errors['tipo'] = 'Selecciona el tipo de concepto.';
  } else if (!TIPOS_VALIDOS.includes(form.tipo)) {
    errors['tipo'] = 'El tipo de concepto no es válido.';
  }

  if (!form.periodicidad?.trim()) {
    errors['periodicidad'] = 'Selecciona la periodicidad.';
  } else if (!PERIODICIDADES_VALIDAS.includes(form.periodicidad)) {
    errors['periodicidad'] = 'La periodicidad no es válida.';
  }
}

function validarDescripcion(descripcion: string, errors: ErroresCampoConcepto): void {
  const v = descripcion.trim();
  if (!v) return;
  if (v.length > 2000) {
    errors['descripcion'] = 'La descripción no puede superar 2000 caracteres.';
  }
}

function validarNivel(nivel: NivelConcepto, errors: ErroresCampoConcepto): void {
  if (!nivel?.trim()) {
    errors['nivel'] = 'Selecciona el nivel educativo.';
  } else if (!NIVELES_VALIDOS.includes(nivel)) {
    errors['nivel'] = 'El nivel educativo no es válido.';
  }
}

export function validarConceptoFormMinimo(form: ConceptoFormValues): ErroresCampoConcepto {
  const errors: ErroresCampoConcepto = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function conceptoFormularioMinimoListo(form: ConceptoFormValues): boolean {
  return Object.keys(validarConceptoFormMinimo(form)).length === 0;
}

export function validarConceptoForm(form: ConceptoFormValues): ErroresCampoConcepto {
  const errors = validarConceptoFormMinimo(form);
  validarDescripcion(form.descripcion, errors);
  validarNivel(form.nivel, errors);
  return errors;
}

export function validarCampoConcepto(form: ConceptoFormValues, key: string): string | null {
  const errors: ErroresCampoConcepto = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'descripcion') {
    validarDescripcion(form.descripcion, errors);
    return errors[key] ?? null;
  }

  if (key === 'nivel') {
    validarNivel(form.nivel, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorConcepto(errors: ErroresCampoConcepto): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
