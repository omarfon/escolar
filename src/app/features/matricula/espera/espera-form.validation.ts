import { PrioridadEspera } from './espera.model';
import {
  validarCelular,
  validarEmail,
  validarNumeroDocumento,
} from '../../estudiantes/shared/identidad-documento';
import { validarNombrePersona } from '../../matricula/nueva/nueva-matricula.model';

export type ErroresCampoEspera = Record<string, string>;

export interface EsperaFormValues {
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
  nivel: string;
  grado: string;
  seccionDeseada: string;
  prioridad: PrioridadEspera;
  observacion: string;
}

const CAMPOS_MINIMOS = ['nombres', 'apellidos', 'dni', 'nivel', 'grado'] as const;
const CAMPOS_FORM = [...CAMPOS_MINIMOS, 'telefono', 'email', 'observacion'] as const;

function validarCamposMinimos(form: EsperaFormValues, errors: ErroresCampoEspera): void {
  const nombresErr = validarNombrePersona(form.nombres, 'los nombres');
  if (nombresErr) errors['nombres'] = nombresErr;

  const apellidosErr = validarNombrePersona(form.apellidos, 'los apellidos');
  if (apellidosErr) errors['apellidos'] = apellidosErr;

  const docErr = validarNumeroDocumento('DNI', form.dni);
  if (docErr) errors['dni'] = docErr;

  if (!form.nivel.trim()) {
    errors['nivel'] = 'Selecciona el nivel.';
  }

  if (!form.grado.trim()) {
    errors['grado'] = 'Selecciona el grado.';
  }
}

function validarTelefono(telefono: string, errors: ErroresCampoEspera): void {
  const err = validarCelular(telefono, false);
  if (err) errors['telefono'] = err;
}

function validarCorreo(email: string, errors: ErroresCampoEspera): void {
  const err = validarEmail(email);
  if (err) errors['email'] = err;
}

function validarObservacion(observacion: string, errors: ErroresCampoEspera): void {
  const v = observacion.trim();
  if (!v) return;
  if (v.length > 300) {
    errors['observacion'] = 'La observación no puede superar 300 caracteres.';
  }
}

export function validarEsperaFormMinimo(form: EsperaFormValues): ErroresCampoEspera {
  const errors: ErroresCampoEspera = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function esperaFormularioMinimoListo(form: EsperaFormValues): boolean {
  return Object.keys(validarEsperaFormMinimo(form)).length === 0;
}

export function validarEsperaForm(form: EsperaFormValues): ErroresCampoEspera {
  const errors = validarEsperaFormMinimo(form);
  validarTelefono(form.telefono, errors);
  validarCorreo(form.email, errors);
  validarObservacion(form.observacion, errors);
  return errors;
}

export function validarCampoEspera(form: EsperaFormValues, key: string): string | null {
  const errors: ErroresCampoEspera = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'telefono') {
    validarTelefono(form.telefono, errors);
    return errors[key] ?? null;
  }

  if (key === 'email') {
    validarCorreo(form.email, errors);
    return errors[key] ?? null;
  }

  if (key === 'observacion') {
    validarObservacion(form.observacion, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorEspera(errors: ErroresCampoEspera): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
