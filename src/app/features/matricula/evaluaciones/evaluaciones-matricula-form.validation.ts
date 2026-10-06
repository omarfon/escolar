export interface ErroresCampoEvaluacionMatricula {
  tipoEvaluacion?: string;
  fechaEvaluacion?: string;
  resultado?: string;
  puntaje?: string;
  resolucion?: string;
}

export function validarEvaluacionMatriculaForm(form: {
  tipoEvaluacion: string;
  fechaEvaluacion: string;
  resultado: string;
  puntaje?: string | number | null;
  resolucion: string;
  fechaMin?: string;
  fechaMax?: string;
}): ErroresCampoEvaluacionMatricula {
  const errors: ErroresCampoEvaluacionMatricula = {};

  if (!form.tipoEvaluacion.trim()) {
    errors.tipoEvaluacion = 'Seleccione un tipo de evaluación';
  }

  if (!form.fechaEvaluacion) {
    errors.fechaEvaluacion = 'La fecha de evaluación es obligatoria';
  } else if (form.fechaMin && form.fechaEvaluacion < form.fechaMin) {
    errors.fechaEvaluacion = `No puede ser anterior a ${form.fechaMin}`;
  } else if (form.fechaMax && form.fechaEvaluacion > form.fechaMax) {
    errors.fechaEvaluacion = `No puede ser posterior a ${form.fechaMax}`;
  }

  if (!form.resultado.trim()) {
    errors.resultado = 'Seleccione un resultado';
  }

  if (form.puntaje !== '' && form.puntaje != null && form.puntaje !== undefined) {
    const n = Number(form.puntaje);
    if (Number.isNaN(n) || n < 0 || n > 20) {
      errors.puntaje = 'El puntaje debe estar entre 0 y 20';
    }
  }

  const resolucion = form.resolucion.trim();
  if (resolucion.length < 10) {
    errors.resolucion = 'La resolución debe tener al menos 10 caracteres';
  } else if (resolucion.length > 800) {
    errors.resolucion = 'La resolución no puede superar 800 caracteres';
  }

  return errors;
}

export function evaluacionMatriculaFormularioListo(form: {
  tipoEvaluacion: string;
  fechaEvaluacion: string;
  resultado: string;
  puntaje?: string | number | null;
  resolucion: string;
  fechaMin?: string;
  fechaMax?: string;
}): boolean {
  return Object.keys(validarEvaluacionMatriculaForm(form)).length === 0;
}
