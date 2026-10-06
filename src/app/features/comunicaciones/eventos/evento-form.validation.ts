import {
  EventoDestinatario,
  EventoEstado,
  EventoTipo,
} from './eventos.model';

export type ErroresCampoEvento = Record<string, string>;

export interface EventoFormValues {
  titulo: string;
  descripcion: string;
  tipo: EventoTipo;
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  destinatarios: EventoDestinatario;
  nivel: string;
  responsable: string;
  estado: EventoEstado;
}

const TIPOS_VALIDOS: EventoTipo[] = [
  'academico',
  'deportivo',
  'cultural',
  'reunion',
  'feriado',
  'otro',
];
const DESTINATARIOS_VALIDOS: EventoDestinatario[] = [
  'alumnos',
  'padres',
  'todos',
  'docentes',
  'salon',
];
const CAMPOS_MINIMOS = ['titulo', 'tipo', 'destinatarios', 'fechaInicio'] as const;
const CAMPOS_FORM = [
  ...CAMPOS_MINIMOS,
  'descripcion',
  'fechaFin',
  'horaInicio',
  'horaFin',
  'lugar',
  'responsable',
] as const;

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

function validarFechaIso(fecha: string, requerida = true): string | null {
  const v = fecha.trim();
  if (!v) return requerida ? 'Selecciona la fecha.' : null;
  if (!parseIsoDate(v)) return 'La fecha no es válida.';
  return null;
}

function validarHora(hora: string, requerida = false): string | null {
  const v = hora.trim();
  if (!v) return requerida ? 'Ingresa la hora.' : null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) {
    return 'Usa el formato HH:MM (24 horas).';
  }
  return null;
}

function minutosDesdeMedianoche(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function validarCamposMinimos(form: EventoFormValues, errors: ErroresCampoEvento): void {
  const titulo = form.titulo.trim();
  if (!titulo) {
    errors['titulo'] = 'Ingresa el título del evento.';
  } else if (titulo.length < 3) {
    errors['titulo'] = 'El título debe tener al menos 3 caracteres.';
  } else if (titulo.length > 150) {
    errors['titulo'] = 'El título no puede superar 150 caracteres.';
  }

  if (!form.tipo?.trim()) {
    errors['tipo'] = 'Selecciona el tipo de evento.';
  } else if (!TIPOS_VALIDOS.includes(form.tipo)) {
    errors['tipo'] = 'El tipo de evento no es válido.';
  }

  if (!form.destinatarios?.trim()) {
    errors['destinatarios'] = 'Selecciona los destinatarios.';
  } else if (!DESTINATARIOS_VALIDOS.includes(form.destinatarios)) {
    errors['destinatarios'] = 'Los destinatarios no son válidos.';
  }

  const fechaInicioErr = validarFechaIso(form.fechaInicio, true);
  if (fechaInicioErr) errors['fechaInicio'] = fechaInicioErr;
}

function validarFechaFin(form: EventoFormValues, errors: ErroresCampoEvento): void {
  const v = form.fechaFin.trim();
  if (!v) return;

  const fechaErr = validarFechaIso(v, false);
  if (fechaErr) {
    errors['fechaFin'] = fechaErr;
    return;
  }

  const inicio = parseIsoDate(form.fechaInicio);
  const fin = parseIsoDate(v);
  if (inicio && fin && fin < inicio) {
    errors['fechaFin'] = 'La fecha de fin no puede ser anterior a la de inicio.';
  }
}

function validarHoras(form: EventoFormValues, errors: ErroresCampoEvento): void {
  const horaInicioErr = validarHora(form.horaInicio, false);
  if (horaInicioErr) {
    errors['horaInicio'] = horaInicioErr;
  }

  const horaFinErr = validarHora(form.horaFin, false);
  if (horaFinErr) {
    errors['horaFin'] = horaFinErr;
    return;
  }

  const hi = form.horaInicio.trim();
  const hf = form.horaFin.trim();
  if (!hi || !hf) return;

  const finDia = form.fechaFin.trim() || form.fechaInicio.trim();
  if (finDia !== form.fechaInicio.trim()) return;

  if (minutosDesdeMedianoche(hf) <= minutosDesdeMedianoche(hi)) {
    errors['horaFin'] = 'La hora de fin debe ser posterior a la de inicio.';
  }
}

function validarDescripcion(descripcion: string, errors: ErroresCampoEvento): void {
  const v = descripcion.trim();
  if (!v) return;
  if (v.length > 2000) {
    errors['descripcion'] = 'La descripción no puede superar 2000 caracteres.';
  }
}

function validarLugar(lugar: string, errors: ErroresCampoEvento): void {
  const v = lugar.trim();
  if (!v) return;
  if (v.length > 120) {
    errors['lugar'] = 'El lugar no puede superar 120 caracteres.';
  }
}

function validarResponsable(responsable: string, errors: ErroresCampoEvento): void {
  const v = responsable.trim();
  if (!v) return;
  if (v.length > 120) {
    errors['responsable'] = 'El responsable no puede superar 120 caracteres.';
  }
}

export function validarEventoFormMinimo(form: EventoFormValues): ErroresCampoEvento {
  const errors: ErroresCampoEvento = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function eventoFormularioMinimoListo(form: EventoFormValues): boolean {
  return Object.keys(validarEventoFormMinimo(form)).length === 0;
}

export function validarEventoForm(form: EventoFormValues): ErroresCampoEvento {
  const errors = validarEventoFormMinimo(form);
  validarDescripcion(form.descripcion, errors);
  validarFechaFin(form, errors);
  validarHoras(form, errors);
  validarLugar(form.lugar, errors);
  validarResponsable(form.responsable, errors);
  return errors;
}

export function validarCampoEvento(form: EventoFormValues, key: string): string | null {
  const errors: ErroresCampoEvento = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'descripcion') {
    validarDescripcion(form.descripcion, errors);
    return errors[key] ?? null;
  }

  if (key === 'fechaFin') {
    validarFechaFin(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'horaInicio' || key === 'horaFin') {
    validarHoras(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'lugar') {
    validarLugar(form.lugar, errors);
    return errors[key] ?? null;
  }

  if (key === 'responsable') {
    validarResponsable(form.responsable, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorEvento(errors: ErroresCampoEvento): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
