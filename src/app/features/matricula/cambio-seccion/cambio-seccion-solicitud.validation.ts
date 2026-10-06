import { MotivoCambioSeccion } from './cambio-seccion.model';

export type ErroresCampoSolicitudCambio = Record<string, string>;

export interface SolicitudCambioFormValues {
  studentId: number;
  seccionDeseada: string;
  motivo: MotivoCambioSeccion;
  autorizadoPor: string;
  observacion: string;
}

const CAMPOS_MINIMOS = ['studentId', 'motivo', 'autorizadoPor'] as const;
const CAMPOS_FORM = [...CAMPOS_MINIMOS, 'seccionDeseada', 'observacion'] as const;

function validarCamposMinimos(
  form: SolicitudCambioFormValues,
  errors: ErroresCampoSolicitudCambio,
): void {
  if (!form.studentId || form.studentId <= 0) {
    errors['studentId'] = 'Selecciona un alumno.';
  }

  if (!form.motivo?.trim()) {
    errors['motivo'] = 'Selecciona el motivo del cambio.';
  }

  const autorizado = form.autorizadoPor.trim();
  if (!autorizado) {
    errors['autorizadoPor'] = 'Indica la persona autorizada.';
  } else if (autorizado.length < 5) {
    errors['autorizadoPor'] = 'El nombre del autorizador debe ser más descriptivo.';
  }
}

function validarObservacion(
  form: SolicitudCambioFormValues,
  errors: ErroresCampoSolicitudCambio,
): void {
  const v = form.observacion.trim();
  if (form.motivo === 'otro' && !v) {
    errors['observacion'] = 'Detalla el motivo cuando seleccionas "Otro".';
    return;
  }
  if (v.length > 300) {
    errors['observacion'] = 'La observación no puede superar 300 caracteres.';
  }
}

function validarSeccionDeseada(
  form: SolicitudCambioFormValues,
  seccionActual: string,
  errors: ErroresCampoSolicitudCambio,
): void {
  const dest = form.seccionDeseada.trim().toUpperCase();
  if (!dest) return;
  if (dest === seccionActual.trim().toUpperCase()) {
    errors['seccionDeseada'] = 'La sección deseada debe ser diferente a la actual.';
  }
}

export function validarSolicitudCambioFormMinimo(
  form: SolicitudCambioFormValues,
): ErroresCampoSolicitudCambio {
  const errors: ErroresCampoSolicitudCambio = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function solicitudCambioFormularioMinimoListo(form: SolicitudCambioFormValues): boolean {
  return Object.keys(validarSolicitudCambioFormMinimo(form)).length === 0;
}

export function validarSolicitudCambioForm(
  form: SolicitudCambioFormValues,
  seccionActual = '',
): ErroresCampoSolicitudCambio {
  const errors = validarSolicitudCambioFormMinimo(form);
  validarSeccionDeseada(form, seccionActual, errors);
  validarObservacion(form, errors);
  return errors;
}

export function validarCampoSolicitudCambio(
  form: SolicitudCambioFormValues,
  key: string,
  seccionActual = '',
): string | null {
  const errors: ErroresCampoSolicitudCambio = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'seccionDeseada') {
    validarSeccionDeseada(form, seccionActual, errors);
    return errors[key] ?? null;
  }

  if (key === 'observacion') {
    validarObservacion(form, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorSolicitudCambio(errors: ErroresCampoSolicitudCambio): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
