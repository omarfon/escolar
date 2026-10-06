import { Estudiante, Representante } from '../services/expedientes.service';
import {
  TipoDocumentoIdentidad,
  validarCelular,
  validarEmail,
  validarNumeroDocumento,
} from './identidad-documento';
import {
  primerErrorMatricula,
  validarFechaNacimiento,
  validarNombrePersona,
} from '../../matricula/nueva/nueva-matricula.model';

export type ErroresCampoEstudiante = Record<string, string>;

function representanteTieneDatos(rep: Representante): boolean {
  return !!(
    rep.nombres.trim() ||
    rep.apellidos.trim() ||
    rep.dni.trim() ||
    rep.telefono.trim() ||
    rep.email.trim()
  );
}

const CAMPOS_ESTUDIANTE = ['nombres', 'apellidos', 'dni', 'fechaNac', 'grado'] as const;
const CAMPOS_REPRESENTANTE = ['nombres', 'apellidos', 'dni', 'telefono', 'email'] as const;
type CampoRepresentante = (typeof CAMPOS_REPRESENTANTE)[number];
type PrefijoRepresentante = 'padre' | 'madre' | 'apoderado';

function repCampoConValor(rep: Representante, field: CampoRepresentante): boolean {
  switch (field) {
    case 'nombres':
      return !!rep.nombres.trim();
    case 'apellidos':
      return !!rep.apellidos.trim();
    case 'dni':
      return !!rep.dni.trim();
    case 'telefono':
      return !!rep.telefono.trim();
    case 'email':
      return !!rep.email.trim();
  }
}

function validarCampoRepresentante(
  rep: Representante,
  prefix: PrefijoRepresentante,
  field: CampoRepresentante,
  errors: ErroresCampoEstudiante,
): void {
  if (!representanteTieneDatos(rep) && !repCampoConValor(rep, field)) return;

  const key = `${prefix}-${field}`;
  const obligatorio = representanteTieneDatos(rep);

  switch (field) {
    case 'nombres': {
      const err = validarNombrePersona(rep.nombres, 'los nombres', obligatorio);
      if (err) errors[key] = err;
      break;
    }
    case 'apellidos': {
      const err = validarNombrePersona(rep.apellidos, 'los apellidos', obligatorio);
      if (err) errors[key] = err;
      break;
    }
    case 'dni': {
      const err = validarNumeroDocumento(
        (rep.tipoDocumento || 'DNI') as TipoDocumentoIdentidad,
        rep.dni,
      );
      if (err) errors[key] = err;
      break;
    }
    case 'telefono': {
      const err = validarCelular(rep.telefono, false);
      if (err) errors[key] = err;
      break;
    }
    case 'email': {
      const err = validarEmail(rep.email);
      if (err) errors[key] = err;
      break;
    }
  }
}

function validarRepresentante(
  rep: Representante,
  prefix: PrefijoRepresentante,
  errors: ErroresCampoEstudiante,
): void {
  if (!representanteTieneDatos(rep)) return;
  for (const field of CAMPOS_REPRESENTANTE) {
    validarCampoRepresentante(rep, prefix, field, errors);
  }
}

function validarEstudianteCamposObligatorios(
  form: Estudiante,
  errors: ErroresCampoEstudiante,
): void {
  const nombresErr = validarNombrePersona(form.nombres, 'los nombres');
  if (nombresErr) errors['nombres'] = nombresErr;

  const apellidosErr = validarNombrePersona(form.apellidos, 'los apellidos');
  if (apellidosErr) errors['apellidos'] = apellidosErr;

  const docErr = validarNumeroDocumento(
    (form.tipoDocumento || 'DNI') as TipoDocumentoIdentidad,
    form.dni,
  );
  if (docErr) errors['dni'] = docErr;

  if (!form.fechaNac.trim()) {
    errors['fechaNac'] = 'Ingresa la fecha de nacimiento.';
  } else {
    const fechaErr = validarFechaNacimiento(form.fechaNac);
    if (fechaErr) errors['fechaNac'] = fechaErr;
  }

  if (!form.grado.trim()) {
    errors['grado'] = 'Selecciona el grado.';
  }
}

/** Solo campos obligatorios del estudiante (para habilitar guardar). */
export function validarEstudianteFormMinimo(form: Estudiante): ErroresCampoEstudiante {
  const errors: ErroresCampoEstudiante = {};
  validarEstudianteCamposObligatorios(form, errors);
  return errors;
}

export function validarEstudianteFormMinimoSinDocumento(
  form: Estudiante,
): ErroresCampoEstudiante {
  const errors: ErroresCampoEstudiante = {};
  const nombresErr = validarNombrePersona(form.nombres, 'los nombres');
  if (nombresErr) errors['nombres'] = nombresErr;
  const apellidosErr = validarNombrePersona(form.apellidos, 'los apellidos');
  if (apellidosErr) errors['apellidos'] = apellidosErr;
  if (!form.fechaNac.trim()) {
    errors['fechaNac'] = 'Ingresa la fecha de nacimiento.';
  } else {
    const fechaErr = validarFechaNacimiento(form.fechaNac);
    if (fechaErr) errors['fechaNac'] = fechaErr;
  }
  if (!form.grado.trim()) {
    errors['grado'] = 'Selecciona el grado.';
  }
  return errors;
}

export function estudianteFormularioMinimoListo(
  form: Estudiante,
  sinDocumento = false,
): boolean {
  const errors = sinDocumento
    ? validarEstudianteFormMinimoSinDocumento(form)
    : validarEstudianteFormMinimo(form);
  return Object.keys(errors).length === 0;
}

export function validarEstudianteForm(form: Estudiante): ErroresCampoEstudiante {
  const errors = validarEstudianteFormMinimo(form);

  validarRepresentante(form.padre, 'padre', errors);
  validarRepresentante(form.madre, 'madre', errors);
  validarRepresentante(form.apoderado, 'apoderado', errors);

  return errors;
}

export function primerErrorEstudiante(errors: ErroresCampoEstudiante): string | null {
  return primerErrorMatricula(errors);
}

/** Valida un solo campo del formulario (estudiante o representante). */
export function validarCampoEstudiante(form: Estudiante, key: string): string | null {
  const errors: ErroresCampoEstudiante = {};

  if ((CAMPOS_ESTUDIANTE as readonly string[]).includes(key)) {
    validarEstudianteCamposObligatorios(form, errors);
    return errors[key] ?? null;
  }

  const repKey = key.match(/^(padre|madre|apoderado)-(.+)$/);
  if (repKey) {
    const prefix = repKey[1] as PrefijoRepresentante;
    const field = repKey[2] as CampoRepresentante;
    if (!(CAMPOS_REPRESENTANTE as readonly string[]).includes(field)) return null;
    validarCampoRepresentante(form[prefix], prefix, field, errors);
    return errors[key] ?? null;
  }

  return null;
}
