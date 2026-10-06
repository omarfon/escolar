import { DocenteEstado, ESPECIALIDADES_DOCENTE } from './docentes.model';
import {
  validarCelular,
  validarEmail,
  validarNumeroDocumento,
} from '../../../estudiantes/shared/identidad-documento';
import { validarNombrePersona } from '../../nueva/nueva-matricula.model';

export type ErroresCampoDocente = Record<string, string>;

export interface DocenteFormValues {
  esEdicion: boolean;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
  sede: string;
  estado: DocenteEstado;
  especialidad: string;
  especialidadCustom: string;
  password: string;
}

const ESTADOS_VALIDOS: DocenteEstado[] = ['activo', 'inactivo', 'bloqueado'];
const CAMPOS_MINIMOS_CREAR = [
  'nombres',
  'apellidos',
  'dni',
  'email',
  'especialidad',
  'password',
] as const;
const CAMPOS_MINIMOS_EDITAR = [
  'nombres',
  'apellidos',
  'dni',
  'email',
  'especialidad',
] as const;
const CAMPOS_FORM = [
  'nombres',
  'apellidos',
  'dni',
  'email',
  'telefono',
  'sede',
  'estado',
  'especialidad',
  'especialidadCustom',
  'password',
] as const;

function camposMinimos(esEdicion: boolean): readonly string[] {
  return esEdicion ? CAMPOS_MINIMOS_EDITAR : CAMPOS_MINIMOS_CREAR;
}

export function resolverEspecialidadDocente(form: DocenteFormValues): string {
  if (form.especialidad === 'Otra especialidad') {
    return form.especialidadCustom.trim();
  }
  return form.especialidad.trim();
}

function validarCamposMinimos(form: DocenteFormValues, errors: ErroresCampoDocente): void {
  const nombresErr = validarNombrePersona(form.nombres, 'los nombres');
  if (nombresErr) {
    errors['nombres'] = nombresErr;
  } else if (form.nombres.trim().length > 80) {
    errors['nombres'] = 'Los nombres no pueden superar 80 caracteres.';
  }

  const apellidosErr = validarNombrePersona(form.apellidos, 'los apellidos');
  if (apellidosErr) {
    errors['apellidos'] = apellidosErr;
  } else if (form.apellidos.trim().length > 80) {
    errors['apellidos'] = 'Los apellidos no pueden superar 80 caracteres.';
  }

  const dniErr = validarNumeroDocumento('DNI', form.dni);
  if (dniErr) errors['dni'] = dniErr;

  const email = form.email.trim();
  if (!email) {
    errors['email'] = 'Ingresa el correo electrónico.';
  } else {
    const emailErr = validarEmail(email);
    if (emailErr) {
      errors['email'] = emailErr;
    } else if (email.length > 120) {
      errors['email'] = 'El correo no puede superar 120 caracteres.';
    }
  }

  validarEspecialidad(form, errors);
  validarPassword(form, errors);
}

function validarEspecialidad(form: DocenteFormValues, errors: ErroresCampoDocente): void {
  if (form.especialidad === 'Otra especialidad') {
    const custom = form.especialidadCustom.trim();
    if (!custom) {
      errors['especialidadCustom'] = 'Describe la especialidad del docente.';
      errors['especialidad'] = 'Describe la especialidad del docente.';
      return;
    }
    if (custom.length < 3) {
      errors['especialidadCustom'] = 'La especialidad debe tener al menos 3 caracteres.';
      return;
    }
    if (custom.length > 120) {
      errors['especialidadCustom'] = 'La especialidad no puede superar 120 caracteres.';
    }
    return;
  }

  if (!form.especialidad.trim()) {
    errors['especialidad'] = 'Selecciona la especialización.';
  } else if (!ESPECIALIDADES_DOCENTE.includes(form.especialidad)) {
    errors['especialidad'] = 'La especialización no es válida.';
  }
}

function validarPassword(form: DocenteFormValues, errors: ErroresCampoDocente): void {
  const password = form.password;
  if (!form.esEdicion) {
    if (!password) {
      errors['password'] = 'Ingresa la contraseña inicial.';
    } else if (password.length < 8) {
      errors['password'] = 'La contraseña debe tener al menos 8 caracteres.';
    } else if (password.length > 100) {
      errors['password'] = 'La contraseña no puede superar 100 caracteres.';
    }
    return;
  }

  if (!password) return;
  if (password.length < 8) {
    errors['password'] = 'La contraseña debe tener al menos 8 caracteres.';
  } else if (password.length > 100) {
    errors['password'] = 'La contraseña no puede superar 100 caracteres.';
  }
}

function validarTelefono(telefono: string, errors: ErroresCampoDocente): void {
  const err = validarCelular(telefono, false);
  if (err) errors['telefono'] = err;
}

function validarSede(sede: string, errors: ErroresCampoDocente): void {
  const v = sede.trim();
  if (!v) return;
  if (v.length > 80) errors['sede'] = 'La sede no puede superar 80 caracteres.';
}

function validarEstado(estado: DocenteEstado, errors: ErroresCampoDocente): void {
  if (!estado?.trim()) {
    errors['estado'] = 'Selecciona el estado del docente.';
  } else if (!ESTADOS_VALIDOS.includes(estado)) {
    errors['estado'] = 'El estado seleccionado no es válido.';
  }
}

export function validarDocenteFormMinimo(form: DocenteFormValues): ErroresCampoDocente {
  const errors: ErroresCampoDocente = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function docenteFormularioMinimoListo(form: DocenteFormValues): boolean {
  return Object.keys(validarDocenteFormMinimo(form)).length === 0;
}

export function validarDocenteForm(form: DocenteFormValues): ErroresCampoDocente {
  const errors = validarDocenteFormMinimo(form);
  validarTelefono(form.telefono, errors);
  validarSede(form.sede, errors);
  validarEstado(form.estado, errors);
  return errors;
}

export function validarCampoDocente(form: DocenteFormValues, key: string): string | null {
  const errors: ErroresCampoDocente = {};

  if (camposMinimos(form.esEdicion).includes(key)) {
    validarCamposMinimos(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'especialidad' || key === 'especialidadCustom') {
    validarEspecialidad(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'password') {
    validarPassword(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'telefono') {
    validarTelefono(form.telefono, errors);
    return errors[key] ?? null;
  }

  if (key === 'sede') {
    validarSede(form.sede, errors);
    return errors[key] ?? null;
  }

  if (key === 'estado') {
    validarEstado(form.estado, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorDocente(errors: ErroresCampoDocente): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
