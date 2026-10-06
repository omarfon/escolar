export interface ErroresCampoRetroalimentacion {
  canal?: string;
  fechaRetroalimentacion?: string;
  destinatario?: string;
  mensaje?: string;
}

export function validarRetroalimentacionForm(form: {
  canal: string;
  fechaRetroalimentacion: string;
  destinatario: string;
  mensaje: string;
  fechaMin?: string;
  fechaMax?: string;
}): ErroresCampoRetroalimentacion {
  const errors: ErroresCampoRetroalimentacion = {};
  if (!form.canal.trim()) errors.canal = 'Seleccione un canal';
  if (!form.fechaRetroalimentacion) {
    errors.fechaRetroalimentacion = 'La fecha es obligatoria';
  } else if (form.fechaMin && form.fechaRetroalimentacion < form.fechaMin) {
    errors.fechaRetroalimentacion = `No puede ser anterior a ${form.fechaMin}`;
  } else if (form.fechaMax && form.fechaRetroalimentacion > form.fechaMax) {
    errors.fechaRetroalimentacion = `No puede ser posterior a ${form.fechaMax}`;
  }
  if (!form.destinatario.trim()) errors.destinatario = 'Indique el destinatario';
  const mensaje = form.mensaje.trim();
  if (mensaje.length < 20) errors.mensaje = 'El mensaje debe tener al menos 20 caracteres';
  return errors;
}

export function retroalimentacionFormularioListo(
  form: Parameters<typeof validarRetroalimentacionForm>[0],
): boolean {
  return Object.keys(validarRetroalimentacionForm(form)).length === 0;
}
