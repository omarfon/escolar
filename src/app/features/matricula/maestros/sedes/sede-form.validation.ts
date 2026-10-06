import { NIVELES_SEDE, TURNOS_SEDE } from './sedes.model';
import { validarEmail } from '../../../estudiantes/shared/identidad-documento';

export type ErroresCampoSede = Record<string, string>;

export interface SedeFormValues {
  nombre: string;
  codigo: string;
  direccion: string;
  distrito: string;
  provincia: string;
  region: string;
  telefono: string;
  email: string;
  director: string;
  niveles: string[];
  turnos: string[];
  estado: 'activo' | 'inactivo';
}

const ESTADOS_VALIDOS: SedeFormValues['estado'][] = ['activo', 'inactivo'];
const CAMPOS_MINIMOS = ['nombre'] as const;
const CAMPOS_FORM = [
  ...CAMPOS_MINIMOS,
  'codigo',
  'direccion',
  'distrito',
  'provincia',
  'region',
  'telefono',
  'email',
  'director',
  'niveles',
  'turnos',
  'estado',
] as const;

function validarCamposMinimos(form: SedeFormValues, errors: ErroresCampoSede): void {
  const nombre = form.nombre.trim();
  if (!nombre) {
    errors['nombre'] = 'Ingresa el nombre de la sede.';
  } else if (nombre.length < 3) {
    errors['nombre'] = 'El nombre debe tener al menos 3 caracteres.';
  } else if (nombre.length > 120) {
    errors['nombre'] = 'El nombre no puede superar 120 caracteres.';
  }
}

function validarCodigo(codigo: string, errors: ErroresCampoSede): void {
  const v = codigo.trim();
  if (!v) return;
  if (v.length > 20) errors['codigo'] = 'El código no puede superar 20 caracteres.';
}

function validarTextoUbicacion(
  value: string,
  key: string,
  label: string,
  max: number,
  errors: ErroresCampoSede,
): void {
  const v = value.trim();
  if (!v) return;
  if (v.length > max) errors[key] = `${label} no puede superar ${max} caracteres.`;
}

function validarTelefono(telefono: string, errors: ErroresCampoSede): void {
  const v = telefono.trim();
  if (!v) return;
  if (v.length > 30) {
    errors['telefono'] = 'El teléfono no puede superar 30 caracteres.';
    return;
  }
  if (!/^[\d\s+\-()]{6,30}$/.test(v)) {
    errors['telefono'] = 'Ingresa un teléfono válido.';
  }
}

function validarCorreo(email: string, errors: ErroresCampoSede): void {
  const v = email.trim();
  if (!v) return;
  const err = validarEmail(v);
  if (err) {
    errors['email'] = err;
  } else if (v.length > 120) {
    errors['email'] = 'El correo no puede superar 120 caracteres.';
  }
}

function validarDirector(director: string, errors: ErroresCampoSede): void {
  const v = director.trim();
  if (!v) return;
  if (v.length > 120) errors['director'] = 'El director no puede superar 120 caracteres.';
}

function validarNiveles(niveles: string[], errors: ErroresCampoSede): void {
  const invalidos = niveles.filter((n) => !NIVELES_SEDE.includes(n));
  if (invalidos.length) errors['niveles'] = 'Hay niveles educativos no válidos.';
}

function validarTurnos(turnos: string[], errors: ErroresCampoSede): void {
  const invalidos = turnos.filter((t) => !TURNOS_SEDE.includes(t));
  if (invalidos.length) errors['turnos'] = 'Hay turnos no válidos.';
}

function validarEstado(estado: SedeFormValues['estado'], errors: ErroresCampoSede): void {
  if (!estado?.trim()) {
    errors['estado'] = 'Selecciona el estado de la sede.';
  } else if (!ESTADOS_VALIDOS.includes(estado)) {
    errors['estado'] = 'El estado seleccionado no es válido.';
  }
}

export function validarSedeFormMinimo(form: SedeFormValues): ErroresCampoSede {
  const errors: ErroresCampoSede = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function sedeFormularioMinimoListo(form: SedeFormValues): boolean {
  return Object.keys(validarSedeFormMinimo(form)).length === 0;
}

export function validarSedeForm(form: SedeFormValues): ErroresCampoSede {
  const errors = validarSedeFormMinimo(form);
  validarCodigo(form.codigo, errors);
  validarTextoUbicacion(form.direccion, 'direccion', 'La dirección', 200, errors);
  validarTextoUbicacion(form.distrito, 'distrito', 'El distrito', 80, errors);
  validarTextoUbicacion(form.provincia, 'provincia', 'La provincia', 80, errors);
  validarTextoUbicacion(form.region, 'region', 'La región', 80, errors);
  validarTelefono(form.telefono, errors);
  validarCorreo(form.email, errors);
  validarDirector(form.director, errors);
  validarNiveles(form.niveles, errors);
  validarTurnos(form.turnos, errors);
  validarEstado(form.estado, errors);
  return errors;
}

export function validarCampoSede(form: SedeFormValues, key: string): string | null {
  const errors: ErroresCampoSede = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'codigo') {
    validarCodigo(form.codigo, errors);
    return errors[key] ?? null;
  }

  if (key === 'direccion') {
    validarTextoUbicacion(form.direccion, 'direccion', 'La dirección', 200, errors);
    return errors[key] ?? null;
  }

  if (key === 'distrito') {
    validarTextoUbicacion(form.distrito, 'distrito', 'El distrito', 80, errors);
    return errors[key] ?? null;
  }

  if (key === 'provincia') {
    validarTextoUbicacion(form.provincia, 'provincia', 'La provincia', 80, errors);
    return errors[key] ?? null;
  }

  if (key === 'region') {
    validarTextoUbicacion(form.region, 'region', 'La región', 80, errors);
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

  if (key === 'director') {
    validarDirector(form.director, errors);
    return errors[key] ?? null;
  }

  if (key === 'niveles') {
    validarNiveles(form.niveles, errors);
    return errors[key] ?? null;
  }

  if (key === 'turnos') {
    validarTurnos(form.turnos, errors);
    return errors[key] ?? null;
  }

  if (key === 'estado') {
    validarEstado(form.estado, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorSede(errors: ErroresCampoSede): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
