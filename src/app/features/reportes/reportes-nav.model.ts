export interface ReporteNavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  permisos: string[];
}

/** Catálogo central de reportes — usado por menú, shell y guard de redirección. */
export const REPORTES_NAV_ITEMS: ReporteNavItem[] = [
  {
    id: 'territorial',
    label: 'UGEL / DRE',
    icon: 'analytics',
    route: '/reportes/territorial',
    permisos: ['dashboard.reportes', 'admin.reportes'],
  },
  {
    id: 'matricula',
    label: 'Matrícula',
    icon: 'how_to_reg',
    route: '/reportes/matricula',
    permisos: ['matricula.reportes', 'admin.reportes'],
  },
  {
    id: 'asistencia',
    label: 'Asistencia',
    icon: 'fact_check',
    route: '/reportes/asistencia',
    permisos: ['asistencia.reportes', 'admin.reportes'],
  },
  {
    id: 'evaluacion',
    label: 'Evaluación',
    icon: 'grading',
    route: '/reportes/evaluacion',
    permisos: ['evaluacion.reportes', 'admin.reportes'],
  },
  {
    id: 'tesoreria',
    label: 'Tesorería',
    icon: 'account_balance',
    route: '/reportes/tesoreria',
    permisos: ['tesoreria.reportes', 'tesoreria.ver'],
  },
];

export const REPORTES_PERMISOS_ACCESO = [
  'dashboard.reportes',
  'matricula.reportes',
  'asistencia.reportes',
  'evaluacion.reportes',
  'tesoreria.reportes',
  'admin.reportes',
] as const;
