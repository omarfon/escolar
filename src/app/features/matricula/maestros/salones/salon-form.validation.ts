export type ErroresCampoSalon = Record<string, string>;

export interface SalonFormValues {
  anioEscolar: number;
  nivel: string;
  grado: string;
  seccion: string;
  aforo: number;
}

const NIVELES_VALIDOS = ['Inicial', 'Primaria', 'Secundaria'];
const CAMPOS_MINIMOS = ['anioEscolar', 'nivel', 'grado', 'seccion', 'aforo'] as const;
const CAMPOS_FORM = [...CAMPOS_MINIMOS] as const;

function validarCamposMinimos(form: SalonFormValues, errors: ErroresCampoSalon): void {
  if (!Number.isFinite(form.anioEscolar)) {
    errors['anioEscolar'] = 'Ingresa el año escolar.';
  } else if (!Number.isInteger(form.anioEscolar)) {
    errors['anioEscolar'] = 'El año escolar debe ser un número entero.';
  } else if (form.anioEscolar < 2000) {
    errors['anioEscolar'] = 'El año escolar debe ser 2000 o posterior.';
  }

  const nivel = form.nivel.trim();
  if (!nivel) {
    errors['nivel'] = 'Selecciona el nivel.';
  } else if (nivel.length < 2) {
    errors['nivel'] = 'El nivel no es válido.';
  }

  const grado = form.grado.trim();
  if (!grado) {
    errors['grado'] = 'Selecciona el grado.';
  }

  const seccion = form.seccion.trim();
  if (!seccion) {
    errors['seccion'] = 'Ingresa la sección del salón.';
  } else if (seccion.length > 10) {
    errors['seccion'] = 'La sección no puede superar 10 caracteres.';
  } else if (!/^[A-Za-z0-9-]+$/.test(seccion)) {
    errors['seccion'] = 'Usa letras, números o guiones (ej. A, B, 1).';
  }

  if (!Number.isFinite(form.aforo)) {
    errors['aforo'] = 'Ingresa el aforo del salón.';
  } else if (!Number.isInteger(form.aforo)) {
    errors['aforo'] = 'El aforo debe ser un número entero.';
  } else if (form.aforo < 1) {
    errors['aforo'] = 'El aforo debe ser al menos 1.';
  } else if (form.aforo > 999) {
    errors['aforo'] = 'El aforo no puede superar 999.';
  }
}

export function defaultAforoSalon(nivel: string): number {
  if (nivel === 'Inicial') return 25;
  if (nivel === 'Secundaria') return 35;
  return 30;
}

export function validarSalonFormMinimo(form: SalonFormValues): ErroresCampoSalon {
  const errors: ErroresCampoSalon = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function salonFormularioMinimoListo(form: SalonFormValues): boolean {
  return Object.keys(validarSalonFormMinimo(form)).length === 0;
}

export function validarSalonForm(form: SalonFormValues): ErroresCampoSalon {
  const errors = validarSalonFormMinimo(form);
  const nivel = form.nivel.trim();
  if (nivel && !NIVELES_VALIDOS.includes(nivel)) {
    errors['nivel'] = 'El nivel seleccionado no es válido.';
  }
  return errors;
}

export function validarCampoSalon(form: SalonFormValues, key: string): string | null {
  const errors = validarSalonFormMinimo(form);
  if (key === 'nivel') {
    const nivel = form.nivel.trim();
    if (nivel && !NIVELES_VALIDOS.includes(nivel)) {
      errors['nivel'] = 'El nivel seleccionado no es válido.';
    }
  }
  return errors[key] ?? null;
}

export function primerErrorSalon(errors: ErroresCampoSalon): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
