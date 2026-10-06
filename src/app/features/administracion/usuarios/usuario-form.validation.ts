import { ESTADOS_VALIDOS } from './usuarios-carga.util';
import { EstadoUsuario, RolUsuario } from './usuarios.model';
import {
  validarCelular,
  validarEmail,
  validarNumeroDocumento,
} from '../../estudiantes/shared/identidad-documento';
import { validarNombrePersona } from '../../matricula/nueva/nueva-matricula.model';

export type ErroresCampoUsuario = Record<string, string>;

export interface UsuarioFormValues {
  esEdicion: boolean;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
  rol: RolUsuario;
  sede: string;
  estado: EstadoUsuario;
  cargo: string;
  password: string;
  password2: string;
}

const CAMPOS_MINIMOS_CREAR = [
  'nombres',
  'apellidos',
  'dni',
  'email',
  'password',
  'password2',
] as const;
const CAMPOS_MINIMOS_EDITAR = ['nombres', 'apellidos', 'dni', 'email'] as const;
const CAMPOS_FORM = [
  'nombres',
  'apellidos',
  'dni',
  'telefono',
  'email',
  'rol',
  'sede',
  'estado',
  'cargo',
  'password',
  'password2',
] as const;

function camposMinimos(esEdicion: boolean): readonly string[] {
  return esEdicion ? CAMPOS_MINIMOS_EDITAR : CAMPOS_MINIMOS_CREAR;
}

function validarCamposMinimos(form: UsuarioFormValues, errors: ErroresCampoUsuario): void {
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

  if (!form.esEdicion) {
    const password = form.password;
    if (!password) {
      errors['password'] = 'Ingresa la contraseña inicial.';
    } else if (password.length < 8) {
      errors['password'] = 'La contraseña debe tener al menos 8 caracteres.';
    } else if (password.length > 100) {
      errors['password'] = 'La contraseña no puede superar 100 caracteres.';
    }

    if (!form.password2) {
      errors['password2'] = 'Confirma la contraseña.';
    } else if (form.password2 !== password) {
      errors['password2'] = 'Las contraseñas no coinciden.';
    }
  }
}

function validarTelefono(telefono: string, errors: ErroresCampoUsuario): void {
  const err = validarCelular(telefono, false);
  if (err) errors['telefono'] = err;
}

function validarSede(sede: string, errors: ErroresCampoUsuario): void {
  const v = sede.trim();
  if (!v) return;
  if (v.length > 80) errors['sede'] = 'La sede no puede superar 80 caracteres.';
}

function validarEstado(estado: EstadoUsuario, errors: ErroresCampoUsuario): void {
  if (!estado?.trim()) {
    errors['estado'] = 'Selecciona el estado del usuario.';
  } else if (!ESTADOS_VALIDOS.includes(estado)) {
    errors['estado'] = 'El estado seleccionado no es válido.';
  }
}

function validarCargo(cargo: string, errors: ErroresCampoUsuario): void {
  const v = cargo.trim();
  if (!v) return;
  if (v.length > 120) errors['cargo'] = 'El cargo no puede superar 120 caracteres.';
}

export function validarUsuarioFormMinimo(form: UsuarioFormValues): ErroresCampoUsuario {
  const errors: ErroresCampoUsuario = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function usuarioFormularioMinimoListo(form: UsuarioFormValues): boolean {
  return Object.keys(validarUsuarioFormMinimo(form)).length === 0;
}

export function validarUsuarioForm(form: UsuarioFormValues): ErroresCampoUsuario {
  const errors = validarUsuarioFormMinimo(form);
  validarTelefono(form.telefono, errors);
  validarSede(form.sede, errors);
  validarEstado(form.estado, errors);
  validarCargo(form.cargo, errors);
  return errors;
}

export function validarCampoUsuario(form: UsuarioFormValues, key: string): string | null {
  const errors: ErroresCampoUsuario = {};

  if (camposMinimos(form.esEdicion).includes(key)) {
    validarCamposMinimos(form, errors);
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

  if (key === 'cargo') {
    validarCargo(form.cargo, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorUsuario(errors: ErroresCampoUsuario): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
