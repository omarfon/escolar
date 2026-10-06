export interface MatriculaExcepcionalErrores {
  nombres?: string;
  apellidos?: string;
  dni?: string;
  fechaNac?: string;
  gradoLabel?: string;
  seccion?: string;
  excepcionalMotivo?: string;
  excepcionalSustento?: string;
}

export function validarMatriculaExcepcionalForm(input: {
  nombres: string;
  apellidos: string;
  dni: string;
  fechaNac: string;
  gradoLabel: string;
  seccion: string;
  excepcionalMotivo: string;
  excepcionalSustento: string;
}): MatriculaExcepcionalErrores {
  const errores: MatriculaExcepcionalErrores = {};
  if (!input.nombres.trim()) errores.nombres = 'Indique los nombres del estudiante';
  if (!input.apellidos.trim()) errores.apellidos = 'Indique los apellidos';
  if (!input.dni.trim()) errores.dni = 'Indique el número de documento';
  else if (!/^\d{8,12}$/.test(input.dni.trim())) errores.dni = 'Documento inválido';
  if (!input.fechaNac.trim()) errores.fechaNac = 'Indique la fecha de nacimiento';
  if (!input.gradoLabel.trim()) errores.gradoLabel = 'Seleccione el grado';
  if (!input.seccion.trim()) errores.seccion = 'Indique la sección';
  if (!input.excepcionalMotivo.trim()) errores.excepcionalMotivo = 'Seleccione o indique el motivo';
  if (input.excepcionalSustento.trim().length < 10) {
    errores.excepcionalSustento = 'El sustento debe tener al menos 10 caracteres';
  }
  return errores;
}

export function formularioExcepcionalListo(errores: MatriculaExcepcionalErrores): boolean {
  return Object.keys(errores).length === 0;
}
