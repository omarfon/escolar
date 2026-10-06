export interface TrasladosNavItem {
  route: string;
  label: string;
  icon: string;
  description: string;
  permisos: string[];
}

export const TRASLADOS_NAV: TrasladosNavItem[] = [
  {
    route: '/traslados/solicitar',
    label: 'Solicitar traslado',
    icon: 'outbound',
    description: 'Registre y envíe solicitudes desde su IE de origen.',
    permisos: ['traslados.solicitar', 'traslados.ver'],
  },
  {
    route: '/traslados/recibidos',
    label: 'Traslados recibidos',
    icon: 'move_to_inbox',
    description: 'Apruebe o rechace solicitudes dirigidas a su IE.',
    permisos: ['traslados.aprobar_destino', 'traslados.ver'],
  },
  {
    route: '/traslados/supervision',
    label: 'Supervisión territorial',
    icon: 'policy',
    description: 'Observe, resuelva y concluya traslados del ámbito UGEL, DRE o MINEDU.',
    permisos: ['traslados.resolver', 'traslados.ver'],
  },
  {
    route: '/traslados/seguimiento',
    label: 'Seguimiento del proceso',
    icon: 'timeline',
    description: 'Consulte etapas, línea de tiempo y auditoría de las solicitudes en curso.',
    permisos: ['traslados.ver', 'traslados.solicitar', 'traslados.resolver', 'traslados.aprobar_destino'],
  },
];
