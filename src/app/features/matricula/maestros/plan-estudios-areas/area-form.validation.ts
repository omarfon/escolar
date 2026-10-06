export interface AreaFormValues {
  nombre: string;
  orden: number;
  motivo?: string;
  desactivar?: boolean;
}

export type ErroresCampoArea = Partial<Record<'nombre' | 'orden' | 'motivo', string>>;

export function normalizeAreaNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ');
}

export function validarCampoArea(campo: keyof AreaFormValues, form: AreaFormValues): string | null {
  if (campo === 'nombre') {
    const n = normalizeAreaNombre(form.nombre);
    if (!n) return 'Ingrese el nombre del área.';
    if (n.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    if (n.length > 120) return 'El nombre no puede superar 120 caracteres.';
    return null;
  }
  if (campo === 'orden') {
    if (!Number.isFinite(form.orden) || form.orden < 1) {
      return 'El orden debe ser un número mayor a 0.';
    }
    return null;
  }
  if (campo === 'motivo' && form.desactivar) {
    const m = (form.motivo ?? '').trim();
    if (m.length < 3) return 'Indique el motivo del cese (mínimo 3 caracteres).';
  }
  return null;
}

export function validarAreaForm(form: AreaFormValues): ErroresCampoArea {
  const errors: ErroresCampoArea = {};
  for (const campo of ['nombre', 'orden'] as const) {
    const err = validarCampoArea(campo, form);
    if (err) errors[campo] = err;
  }
  if (form.desactivar) {
    const err = validarCampoArea('motivo', form);
    if (err) errors.motivo = err;
  }
  return errors;
}

export function areaFormularioMinimoListo(form: AreaFormValues): boolean {
  return Object.keys(validarAreaForm(form)).length === 0;
}

export function primerErrorArea(errors: ErroresCampoArea): string {
  return errors.nombre ?? errors.orden ?? errors.motivo ?? 'Revise los campos del formulario.';
}
