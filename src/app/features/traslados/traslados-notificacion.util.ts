export type EstadoEntregaNotificacion = 'pendiente' | 'enviado' | 'entregado' | 'fallido';

export function etiquetaEstadoEntrega(
  estado: string,
  extra?: { canalEntrega?: string | null; correoSimulado?: boolean },
): string {
  if (estado === 'entregado') {
    if (extra?.canalEntrega === 'email') return 'Entregado (correo)';
    if (extra?.canalEntrega === 'in_app') return 'Entregado (in-app)';
    return 'Entregado';
  }
  if (estado === 'pendiente' && extra?.correoSimulado) {
    return 'Pendiente (in-app)';
  }
  const map: Record<string, string> = {
    pendiente: 'Pendiente de envío',
    enviado: 'Enviado',
    fallido: 'Fallido',
  };
  return map[estado] ?? estado;
}

export function etiquetaCanalEntrega(canal?: string | null): string {
  if (canal === 'email') return 'Correo';
  if (canal === 'in_app') return 'Bandeja in-app';
  return '';
}

export function claseBadgeEntrega(estado: string): string {
  switch (estado) {
    case 'entregado':
      return 'badge badge-green';
    case 'fallido':
      return 'badge badge-red';
    case 'enviado':
      return 'badge badge-indigo';
    default:
      return 'badge badge-gray';
  }
}

export function etiquetaDestinatarioResuelto(n: {
  destinatario: string;
  destinatarioEmail?: string;
  destinatarioRol?: string;
  destinatarioUserId?: number | null;
}): string {
  const partes = [n.destinatario];
  if (n.destinatarioRol) partes.push(n.destinatarioRol);
  if (n.destinatarioEmail) partes.push(n.destinatarioEmail);
  if (n.destinatarioUserId != null) partes.push(`#${n.destinatarioUserId}`);
  return partes.filter(Boolean).join(' · ');
}

export function puedeReintentarNotificacion(n: {
  estadoEntrega: string;
  intentos: number;
  maxIntentos: number;
}): boolean {
  return (
    (n.estadoEntrega === 'fallido' || n.estadoEntrega === 'pendiente') &&
    n.intentos < n.maxIntentos
  );
}
