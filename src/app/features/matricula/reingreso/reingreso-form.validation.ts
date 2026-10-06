export interface ErroresCampoReingreso {
  fechaReingreso?: string;
  motivo?: string;
  autorizacion?: string;
}

export function validarReingresoForm(form: {
  fechaReingreso: string;
  motivo: string;
  autorizacion: string;
  fechaMin?: string;
  fechaMax?: string;
}): ErroresCampoReingreso {
  const errors: ErroresCampoReingreso = {};
  if (!form.fechaReingreso) {
    errors.fechaReingreso = 'La fecha de reingreso es obligatoria';
  } else if (form.fechaMin && form.fechaReingreso < form.fechaMin) {
    errors.fechaReingreso = `No puede ser anterior a ${form.fechaMin}`;
  } else if (form.fechaMax && form.fechaReingreso > form.fechaMax) {
    errors.fechaReingreso = `No puede ser posterior a ${form.fechaMax}`;
  }

  if (!form.motivo.trim()) {
    errors.motivo = 'Seleccione un motivo';
  }

  const autorizacion = form.autorizacion.trim();
  if (autorizacion.length < 10) {
    errors.autorizacion = 'La autorización debe tener al menos 10 caracteres';
  } else if (autorizacion.length > 800) {
    errors.autorizacion = 'La autorización no puede superar 800 caracteres';
  }

  return errors;
}

export function reingresoFormularioListo(form: {
  fechaReingreso: string;
  motivo: string;
  autorizacion: string;
  fechaMin?: string;
  fechaMax?: string;
}): boolean {
  return Object.keys(validarReingresoForm(form)).length === 0;
}
