export type EtapaEstado = 'pendiente' | 'en_curso' | 'completado' | 'fallido' | 'omitido';

export const ETAPA_SEGUIMIENTO_CLASE: Record<EtapaEstado, string> = {
  pendiente: 'border-[#e8eaf0] bg-white text-[#94a3b8]',
  en_curso: 'border-indigo-300 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200',
  completado: 'border-green-200 bg-green-50 text-green-900',
  fallido: 'border-red-200 bg-red-50 text-red-900',
  omitido: 'border-[#e8eaf0] bg-[#fafbfc] text-[#cbd5e1] line-through',
};

export const ETAPA_SEGUIMIENTO_ICONO: Record<EtapaEstado, string> = {
  pendiente: 'radio_button_unchecked',
  en_curso: 'pending',
  completado: 'check_circle',
  fallido: 'cancel',
  omitido: 'remove_circle_outline',
};

export const LINEA_TIEMPO_TIPO_CLASE: Record<string, string> = {
  evento: 'bg-indigo-100 text-indigo-800',
  notificacion: 'bg-teal-100 text-teal-800',
  auditoria: 'bg-amber-100 text-amber-800',
};

export const LINEA_TIEMPO_TIPO_ETIQUETA: Record<string, string> = {
  evento: 'Evento',
  notificacion: 'Notificación',
  auditoria: 'Auditoría',
};

export function etiquetaRolVisualizador(rol: string): string {
  if (rol === 'origen') return 'IE de origen';
  if (rol === 'destino') return 'IE de destino';
  return 'Ámbito territorial';
}
