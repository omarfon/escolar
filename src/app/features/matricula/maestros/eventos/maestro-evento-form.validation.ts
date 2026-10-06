import {
  EventoAudienciaLimitada,
  EventoEstado,
  EventoTipo,
  EventoVisibilidad,
} from '../../../comunicaciones/eventos/eventos.model';
import {
  ErroresCampoEvento,
  primerErrorEvento,
  validarCampoEvento,
  validarEventoForm,
  validarEventoFormMinimo,
} from '../../../comunicaciones/eventos/evento-form.validation';

export type ErroresCampoMaestroEvento = ErroresCampoEvento;

export interface MaestroEventoFormValues {
  titulo: string;
  descripcion: string;
  tipo: EventoTipo;
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  visibilidad: EventoVisibilidad;
  audienciaLimitada: EventoAudienciaLimitada;
  nivel: string;
  grado: string;
  seccion: string;
  responsable: string;
  estado: EventoEstado;
}

const CAMPOS_VISIBILIDAD = ['visibilidad', 'audienciaLimitada', 'nivel', 'grado', 'seccion'] as const;
const CAMPOS_FORM = [
  'titulo',
  'tipo',
  'visibilidad',
  'audienciaLimitada',
  'nivel',
  'grado',
  'seccion',
  'fechaInicio',
  'fechaFin',
  'horaInicio',
  'horaFin',
  'descripcion',
  'lugar',
  'responsable',
] as const;

function toEventoFormValues(form: MaestroEventoFormValues) {
  return {
    titulo: form.titulo,
    descripcion: form.descripcion,
    tipo: form.tipo,
    fechaInicio: form.fechaInicio,
    fechaFin: form.fechaFin,
    horaInicio: form.horaInicio,
    horaFin: form.horaFin,
    lugar: form.lugar,
    destinatarios: form.visibilidad === 'global' ? ('todos' as const) : form.audienciaLimitada,
    nivel: form.nivel,
    responsable: form.responsable,
    estado: form.estado,
  };
}

function requiereSalon(form: MaestroEventoFormValues): boolean {
  return form.visibilidad === 'limitado' && form.audienciaLimitada === 'salon';
}

function validarVisibilidadSalon(form: MaestroEventoFormValues, errors: ErroresCampoMaestroEvento): void {
  if (!requiereSalon(form)) return;

  if (!form.nivel.trim()) {
    errors['nivel'] = 'Selecciona el nivel del salón.';
  }
  if (!form.grado.trim()) {
    errors['grado'] = 'Selecciona el grado del salón.';
  }
  if (!form.seccion.trim()) {
    errors['seccion'] = 'Selecciona la sección del salón.';
  }
}

function validarVisibilidad(form: MaestroEventoFormValues, errors: ErroresCampoMaestroEvento): void {
  if (form.visibilidad !== 'global' && form.visibilidad !== 'limitado') {
    errors['visibilidad'] = 'Selecciona la visibilidad del evento.';
  }

  if (form.visibilidad === 'limitado') {
    const audiencias: EventoAudienciaLimitada[] = ['docentes', 'alumnos', 'padres', 'salon'];
    if (!audiencias.includes(form.audienciaLimitada)) {
      errors['audienciaLimitada'] = 'Selecciona la audiencia del evento.';
    }
  }

  validarVisibilidadSalon(form, errors);
}

export function validarMaestroEventoFormMinimo(form: MaestroEventoFormValues): ErroresCampoMaestroEvento {
  const errors = validarEventoFormMinimo(toEventoFormValues(form));
  validarVisibilidad(form, errors);
  return errors;
}

export function maestroEventoFormularioMinimoListo(form: MaestroEventoFormValues): boolean {
  return Object.keys(validarMaestroEventoFormMinimo(form)).length === 0;
}

export function validarMaestroEventoForm(form: MaestroEventoFormValues): ErroresCampoMaestroEvento {
  const errors = validarEventoForm(toEventoFormValues(form));
  validarVisibilidad(form, errors);
  return errors;
}

export function validarCampoMaestroEvento(
  form: MaestroEventoFormValues,
  key: string,
): string | null {
  if ((CAMPOS_VISIBILIDAD as readonly string[]).includes(key)) {
    const errors: ErroresCampoMaestroEvento = {};
    validarVisibilidad(form, errors);
    return errors[key] ?? null;
  }

  const mapped = toEventoFormValues(form);
  const err = validarCampoEvento(mapped, key);
  if (err) return err;

  if (key === 'nivel' || key === 'grado' || key === 'seccion') {
    const errors: ErroresCampoMaestroEvento = {};
    validarVisibilidadSalon(form, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorMaestroEvento(errors: ErroresCampoMaestroEvento): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return primerErrorEvento(errors);
}
