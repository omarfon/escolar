export type EvidenciaTrasladoTipo = 'documento' | 'referencia';

export interface TrasladoFormErrores {
  studentId?: string;
  ieDestinoNombre?: string;
  ieDestinoCodigoModular?: string;
  ieDestinoUgel?: string;
  ieDestinoDre?: string;
  motivo?: string;
  plazoHasta?: string;
  evidenciaTipo?: string;
  evidenciaDocumentId?: string;
  evidenciaReferencia?: string;
}

export function validarTrasladoForm(input: {
  studentId: number | null;
  ieDestinoNombre: string;
  ieDestinoCodigoModular: string;
  ieDestinoUgel: string;
  ieDestinoDre: string;
  motivo: string;
  plazoHasta: string;
  evidenciaTipo: EvidenciaTrasladoTipo | '';
  evidenciaDocumentId: number | null;
  evidenciaReferencia: string;
  codigoModularOrigen: string;
}): TrasladoFormErrores {
  const errores: TrasladoFormErrores = {};
  if (!input.studentId) errores.studentId = 'Seleccione un estudiante con matrícula vigente';
  if (!input.ieDestinoNombre.trim()) errores.ieDestinoNombre = 'Indique el nombre de la IE de destino';
  if (!/^\d{6,8}$/.test(input.ieDestinoCodigoModular.trim())) {
    errores.ieDestinoCodigoModular = 'El código modular debe tener 6 a 8 dígitos';
  } else if (
    input.codigoModularOrigen &&
    input.ieDestinoCodigoModular.trim() === input.codigoModularOrigen.trim()
  ) {
    errores.ieDestinoCodigoModular = 'La IE de destino debe ser distinta de la de origen';
  }
  if (input.ieDestinoUgel.trim().length < 2) errores.ieDestinoUgel = 'Indique la UGEL de destino';
  if (input.ieDestinoDre.trim().length < 2) errores.ieDestinoDre = 'Indique la DRE de destino';
  if (input.motivo.trim().length < 10) errores.motivo = 'El motivo debe tener al menos 10 caracteres';
  if (!input.plazoHasta) errores.plazoHasta = 'Indique el plazo';
  if (!input.evidenciaTipo) {
    errores.evidenciaTipo = 'Seleccione el tipo de evidencia';
  } else if (input.evidenciaTipo === 'documento') {
    if (!input.evidenciaDocumentId) {
      errores.evidenciaDocumentId = 'Seleccione un documento del expediente con archivo cargado';
    }
  } else if (input.evidenciaReferencia.trim().length < 5) {
    errores.evidenciaReferencia = 'Indique la referencia administrativa (mínimo 5 caracteres)';
  }
  return errores;
}
