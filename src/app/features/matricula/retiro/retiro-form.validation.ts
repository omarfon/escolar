export interface ErroresCampoRetiro {
  fechaRetiro?: string;
  motivo?: string;
  sustento?: string;
}

export function validarRetiroForm(form: {
  fechaRetiro: string;
  motivo: string;
  sustento: string;
  fechaMin?: string;
  fechaMax?: string;
}): ErroresCampoRetiro {
  const errors: ErroresCampoRetiro = {};
  if (!form.fechaRetiro) {
    errors.fechaRetiro = 'La fecha de retiro es obligatoria';
  } else if (form.fechaMin && form.fechaRetiro < form.fechaMin) {
    errors.fechaRetiro = `No puede ser anterior a ${form.fechaMin}`;
  } else if (form.fechaMax && form.fechaRetiro > form.fechaMax) {
    errors.fechaRetiro = `No puede ser posterior a ${form.fechaMax}`;
  }

  if (!form.motivo.trim()) {
    errors.motivo = 'Seleccione un motivo';
  }

  const sustento = form.sustento.trim();
  if (sustento.length < 10) {
    errors.sustento = 'El sustento debe tener al menos 10 caracteres';
  } else if (sustento.length > 800) {
    errors.sustento = 'El sustento no puede superar 800 caracteres';
  }

  return errors;
}

export function retiroFormularioListo(form: {
  fechaRetiro: string;
  motivo: string;
  sustento: string;
  fechaMin?: string;
  fechaMax?: string;
}): boolean {
  return Object.keys(validarRetiroForm(form)).length === 0;
}
