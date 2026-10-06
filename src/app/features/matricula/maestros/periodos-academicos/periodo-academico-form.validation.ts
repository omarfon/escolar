import { PeriodoAcademicoTipo } from './periodos-academicos.model';

export type ErroresCampoPeriodoAcademico = Record<string, string>;

export interface PeriodoAcademicoFormValues {
  anioEscolar: number;
  numero: number;
  nombre: string;
  tipo: PeriodoAcademicoTipo;
  inicio: string;
  fin: string;
  descripcion: string;
}

const TIPOS_VALIDOS: PeriodoAcademicoTipo[] = ['bimestre', 'trimestre', 'semestre'];
const CAMPOS_MINIMOS = ['anioEscolar', 'numero', 'nombre', 'tipo', 'inicio', 'fin'] as const;
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

function anioEnRangoEscolar(anio: number, anioEscolar: number): boolean {
  return anio >= anioEscolar && anio <= anioEscolar + 1;
}

function validarCamposMinimos(form: PeriodoAcademicoFormValues, errors: ErroresCampoPeriodoAcademico): void {
  if (!Number.isFinite(form.anioEscolar)) {
    errors['anioEscolar'] = 'Ingresa el año escolar.';
  } else if (!Number.isInteger(form.anioEscolar)) {
    errors['anioEscolar'] = 'El año escolar debe ser un número entero.';
  } else if (form.anioEscolar < 2000) {
    errors['anioEscolar'] = 'El año escolar debe ser 2000 o posterior.';
  }

  if (!Number.isFinite(form.numero)) {
    errors['numero'] = 'Ingresa el número del período.';
  } else if (!Number.isInteger(form.numero)) {
    errors['numero'] = 'El número debe ser un entero.';
  } else if (form.numero < 1) {
    errors['numero'] = 'El número debe ser al menos 1.';
  } else if (form.numero > 12) {
    errors['numero'] = 'El número no puede superar 12.';
  }

  const nombre = form.nombre.trim();
  if (!nombre) {
    errors['nombre'] = 'Ingresa el nombre del período.';
  } else if (nombre.length < 3) {
    errors['nombre'] = 'El nombre debe tener al menos 3 caracteres.';
  } else if (nombre.length > 80) {
    errors['nombre'] = 'El nombre no puede superar 80 caracteres.';
  }

  if (!form.tipo?.trim()) {
    errors['tipo'] = 'Selecciona el tipo de período.';
  } else if (!TIPOS_VALIDOS.includes(form.tipo)) {
    errors['tipo'] = 'El tipo de período no es válido.';
  }

  const inicio = form.inicio.trim();
  if (!inicio) {
    errors['inicio'] = 'Selecciona la fecha de inicio.';
  } else if (!parseIsoDate(inicio)) {
    errors['inicio'] = 'La fecha de inicio no es válida.';
  } else if (
    Number.isInteger(form.anioEscolar) &&
    form.anioEscolar >= 2000 &&
    !anioEnRangoEscolar(Number(inicio.slice(0, 4)), form.anioEscolar)
  ) {
    errors['inicio'] = 'La fecha de inicio debe corresponder al año escolar seleccionado.';
  }

  const fin = form.fin.trim();
  if (!fin) {
    errors['fin'] = 'Selecciona la fecha de fin.';
  } else if (!parseIsoDate(fin)) {
    errors['fin'] = 'La fecha de fin no es válida.';
  } else if (
    Number.isInteger(form.anioEscolar) &&
    form.anioEscolar >= 2000 &&
    !anioEnRangoEscolar(Number(fin.slice(0, 4)), form.anioEscolar)
  ) {
    errors['fin'] = 'La fecha de fin debe corresponder al año escolar seleccionado.';
  }
}

function validarRangoFechas(form: PeriodoAcademicoFormValues, errors: ErroresCampoPeriodoAcademico): void {
  const inicio = parseIsoDate(form.inicio.trim());
  const fin = parseIsoDate(form.fin.trim());
  if (!inicio || !fin) return;
  if (fin < inicio) {
    errors['fin'] = 'La fecha de fin no puede ser anterior a la de inicio.';
  }
}

function validarDescripcion(descripcion: string, errors: ErroresCampoPeriodoAcademico): void {
  const v = descripcion.trim();
  if (!v) return;
  if (v.length > 500) {
    errors['descripcion'] = 'La descripción no puede superar 500 caracteres.';
  }
}

export function validarPeriodoAcademicoFormMinimo(form: PeriodoAcademicoFormValues): ErroresCampoPeriodoAcademico {
  const errors: ErroresCampoPeriodoAcademico = {};
  validarCamposMinimos(form, errors);
  validarRangoFechas(form, errors);
  return errors;
}

export function periodoAcademicoFormularioMinimoListo(form: PeriodoAcademicoFormValues): boolean {
  return Object.keys(validarPeriodoAcademicoFormMinimo(form)).length === 0;
}

export function validarPeriodoAcademicoForm(form: PeriodoAcademicoFormValues): ErroresCampoPeriodoAcademico {
  const errors = validarPeriodoAcademicoFormMinimo(form);
  validarDescripcion(form.descripcion, errors);
  return errors;
}

export function validarCampoPeriodoAcademico(
  form: PeriodoAcademicoFormValues,
  key: string,
): string | null {
  const errors: ErroresCampoPeriodoAcademico = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    if (key === 'inicio' || key === 'fin') {
      validarRangoFechas(form, errors);
    }
    return errors[key] ?? null;
  }

  if (key === 'descripcion') {
    validarDescripcion(form.descripcion, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorPeriodoAcademico(errors: ErroresCampoPeriodoAcademico): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
