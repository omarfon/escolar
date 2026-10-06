import { EstadoIncidente, TipoIncidente } from './conducta.model';

export type ErroresCampoIncidente = Record<string, string>;

export interface IncidenteFormValues {
  alumnoId: number;
  tipo: TipoIncidente;
  estado: EstadoIncidente;
  descripcion: string;
  fecha: string;
  lugar: string;
  medida: string;
}

const TIPOS_VALIDOS: TipoIncidente[] = [
  'falta_leve',
  'falta_grave',
  'falta_muy_grave',
  'reconocimiento',
];

const CAMPOS_MINIMOS = ['alumnoId', 'tipo', 'descripcion', 'fecha'] as const;
const CAMPOS_FORM = [...CAMPOS_MINIMOS, 'lugar', 'medida'] as const;

export function validarFechaIncidente(fecha: string): string | null {
  const v = fecha.trim();
  if (!v) return 'Ingresa la fecha del incidente.';

  const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return 'Usa el formato DD/MM/AAAA.';

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return 'La fecha no es válida.';
  }

  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  if (d > hoy) return 'La fecha no puede ser futura.';

  return null;
}

function validarAlumno(alumnoId: number, errors: ErroresCampoIncidente): void {
  if (!alumnoId || alumnoId <= 0) {
    errors['alumnoId'] = 'Selecciona un alumno.';
  }
}

function validarTipo(tipo: TipoIncidente, errors: ErroresCampoIncidente): void {
  if (!tipo?.trim()) {
    errors['tipo'] = 'Selecciona el tipo de incidente.';
    return;
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    errors['tipo'] = 'El tipo de incidente no es válido.';
  }
}

function validarDescripcion(descripcion: string, errors: ErroresCampoIncidente): void {
  const v = descripcion.trim();
  if (!v) {
    errors['descripcion'] = 'Ingresa la descripción del incidente.';
    return;
  }
  if (v.length < 10) {
    errors['descripcion'] = 'La descripción debe tener al menos 10 caracteres.';
  }
  if (v.length > 2000) {
    errors['descripcion'] = 'La descripción no puede superar 2000 caracteres.';
  }
}

function validarLugar(lugar: string, errors: ErroresCampoIncidente): void {
  const v = lugar.trim();
  if (!v) errors['lugar'] = 'Selecciona el lugar.';
  else if (v.length > 80) errors['lugar'] = 'El lugar no puede superar 80 caracteres.';
}

function validarMedida(medida: string, errors: ErroresCampoIncidente): void {
  const v = medida.trim();
  if (!v) return;
  if (v.length < 3) {
    errors['medida'] = 'La medida debe ser más descriptiva (mín. 3 caracteres).';
  }
}

function validarCamposMinimos(form: IncidenteFormValues, errors: ErroresCampoIncidente): void {
  validarAlumno(form.alumnoId, errors);
  validarTipo(form.tipo, errors);
  validarDescripcion(form.descripcion, errors);

  const fechaErr = validarFechaIncidente(form.fecha);
  if (fechaErr) errors['fecha'] = fechaErr;
}

export function validarIncidenteFormMinimo(form: IncidenteFormValues): ErroresCampoIncidente {
  const errors: ErroresCampoIncidente = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function incidenteFormularioMinimoListo(form: IncidenteFormValues): boolean {
  return Object.keys(validarIncidenteFormMinimo(form)).length === 0;
}

export function validarIncidenteForm(form: IncidenteFormValues): ErroresCampoIncidente {
  const errors = validarIncidenteFormMinimo(form);
  validarLugar(form.lugar, errors);
  validarMedida(form.medida, errors);
  return errors;
}

export function validarCampoIncidente(
  form: IncidenteFormValues,
  key: string,
): string | null {
  const errors: ErroresCampoIncidente = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'lugar') {
    validarLugar(form.lugar, errors);
    return errors[key] ?? null;
  }

  if (key === 'medida') {
    validarMedida(form.medida, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorIncidente(errors: ErroresCampoIncidente): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
