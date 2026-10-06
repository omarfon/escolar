import { DestCom, PrioCom, TipoCom } from './comunicados.service';

export type ErroresCampoComunicado = Record<string, string>;

export interface ComunicadoFormValues {
  titulo: string;
  cuerpo: string;
  tipo: TipoCom;
  destinatarios: DestCom;
  prioridad: PrioCom;
  fechaPublicacion: string;
  fechaVencimiento: string;
  autor: string;
}

const TIPOS_VALIDOS: TipoCom[] = ['general', 'academico', 'administrativo', 'urgente', 'evento'];
const DESTINATARIOS_VALIDOS: DestCom[] = ['alumnos', 'padres', 'todos', 'docentes'];
const CAMPOS_MINIMOS = ['titulo', 'cuerpo', 'tipo', 'destinatarios', 'fechaPublicacion'] as const;
const CAMPOS_FORM = [...CAMPOS_MINIMOS, 'fechaVencimiento', 'autor'] as const;

function parseFechaDisplay(fecha: string): Date | null {
  const match = fecha.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

export function validarFechaComunicado(fecha: string, requerida = true): string | null {
  const v = fecha.trim();
  if (!v) return requerida ? 'Ingresa la fecha.' : null;
  if (!parseFechaDisplay(v)) return 'Usa el formato DD/MM/AAAA.';
  return null;
}

function validarCamposMinimos(form: ComunicadoFormValues, errors: ErroresCampoComunicado): void {
  const titulo = form.titulo.trim();
  if (!titulo) {
    errors['titulo'] = 'Ingresa el título del comunicado.';
  } else if (titulo.length < 5) {
    errors['titulo'] = 'El título debe tener al menos 5 caracteres.';
  } else if (titulo.length > 120) {
    errors['titulo'] = 'El título no puede superar 120 caracteres.';
  }

  const cuerpo = form.cuerpo.trim();
  if (!cuerpo) {
    errors['cuerpo'] = 'Ingresa el contenido del comunicado.';
  } else if (cuerpo.length < 10) {
    errors['cuerpo'] = 'El contenido debe tener al menos 10 caracteres.';
  }

  if (!form.tipo?.trim()) {
    errors['tipo'] = 'Selecciona el tipo de comunicado.';
  } else if (!TIPOS_VALIDOS.includes(form.tipo)) {
    errors['tipo'] = 'El tipo de comunicado no es válido.';
  }

  if (!form.destinatarios?.trim()) {
    errors['destinatarios'] = 'Selecciona los destinatarios.';
  } else if (!DESTINATARIOS_VALIDOS.includes(form.destinatarios)) {
    errors['destinatarios'] = 'Los destinatarios no son válidos.';
  }

  const fechaPubErr = validarFechaComunicado(form.fechaPublicacion, true);
  if (fechaPubErr) errors['fechaPublicacion'] = fechaPubErr;
}

function validarFechaVencimiento(form: ComunicadoFormValues, errors: ErroresCampoComunicado): void {
  const v = form.fechaVencimiento.trim();
  if (!v) return;

  const fechaErr = validarFechaComunicado(v, false);
  if (fechaErr) {
    errors['fechaVencimiento'] = fechaErr;
    return;
  }

  const pub = parseFechaDisplay(form.fechaPublicacion);
  const ven = parseFechaDisplay(v);
  if (pub && ven && ven < pub) {
    errors['fechaVencimiento'] = 'La fecha de vencimiento no puede ser anterior a la publicación.';
  }
}

function validarAutor(autor: string, errors: ErroresCampoComunicado): void {
  const v = autor.trim();
  if (!v) return;
  if (v.length > 80) {
    errors['autor'] = 'El autor no puede superar 80 caracteres.';
  }
}

export function validarComunicadoFormMinimo(form: ComunicadoFormValues): ErroresCampoComunicado {
  const errors: ErroresCampoComunicado = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function comunicadoFormularioMinimoListo(form: ComunicadoFormValues): boolean {
  return Object.keys(validarComunicadoFormMinimo(form)).length === 0;
}

export function validarComunicadoForm(form: ComunicadoFormValues): ErroresCampoComunicado {
  const errors = validarComunicadoFormMinimo(form);
  validarFechaVencimiento(form, errors);
  validarAutor(form.autor, errors);
  return errors;
}

export function validarCampoComunicado(form: ComunicadoFormValues, key: string): string | null {
  const errors: ErroresCampoComunicado = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'fechaVencimiento') {
    validarFechaVencimiento(form, errors);
    return errors[key] ?? null;
  }

  if (key === 'autor') {
    validarAutor(form.autor, errors);
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorComunicado(errors: ErroresCampoComunicado): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}
