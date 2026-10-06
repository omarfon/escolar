/** Acciones de transición que exigen motivo explícito (mín. 5 caracteres). */
export const ACCIONES_MOTIVO_OBLIGATORIO = [
  'cancelar',
  'observar',
  'rechazar',
  'aprobar',
  'concluir',
] as const;

export const ESTADOS_TRASLADO_TERMINALES = ['rechazada', 'cancelada', 'concluida'];

export function accionExigeMotivo(accion: string): boolean {
  return (ACCIONES_MOTIVO_OBLIGATORIO as readonly string[]).includes(accion);
}

export function etiquetaMotivoAccion(accion: string): string {
  const map: Record<string, string> = {
    cancelar: 'Motivo de la cancelación',
    observar: 'Motivo de la observación',
    rechazar: 'Motivo del rechazo',
    aprobar: 'Motivo de la aprobación',
    concluir: 'Motivo de la conclusión',
    enviar: 'Comentario al enviar (opcional)',
  };
  return map[accion] ?? 'Motivo de la acción';
}
