export interface MaestroNavItem {
  label: string;
  icon: string;
  route: string;
  description: string;
  /** Si se define, el ítem solo se muestra con alguno de estos permisos. */
  permisos?: string[];
}

export const MAESTROS_NAV: MaestroNavItem[] = [
  {
    label: 'Salones',
    icon: 'meeting_room',
    route: 'salones',
    description: 'Aforo por nivel, grado y seccion',
  },
  {
    label: 'Plan de estudios (áreas)',
    icon: 'category',
    route: 'plan-estudios-areas',
    description: 'Registro de áreas curriculares del plan de estudios',
    permisos: ['curricula.ver', 'curricula.gestionar', 'admin.institucional', 'horarios.ver', 'evaluacion.ver', 'matricula.ver'],
  },
  {
    label: 'Sedes',
    icon: 'location_city',
    route: 'sedes',
    description: 'Sedes por institución educativa',
  },
  {
    label: 'Cursos',
    icon: 'menu_book',
    route: 'cursos',
    description: 'Catalogo de cursos para currícula académica',
  },
  {
    label: 'Docentes',
    icon: 'school',
    route: 'docentes',
    description: 'Registro de docentes, especialización y carga horaria',
  },
  {
    label: 'Faltas y Reconocimientos',
    icon: 'gavel',
    route: 'faltas-reconocimientos',
    description: 'Descripciones para incidentes de conducta escolar',
  },
  {
    label: 'Calendario escolar',
    icon: 'calendar_view_month',
    route: 'calendario',
    description: 'Vista unificada por rol: periodos, feriados y actividades',
    permisos: ['calendarizacion.ver', 'calendarizacion.gestionar', 'admin.institucional', 'horarios.ver', 'evaluacion.ver', 'matricula.ver', 'comunicados.ver', 'asistencia.ver'],
  },
  {
    label: 'Años escolares',
    icon: 'calendar_month',
    route: 'anios-escolares',
    description: 'Registro y activación del año lectivo y calendarización',
    permisos: ['calendarizacion.ver', 'calendarizacion.gestionar', 'admin.institucional', 'horarios.ver', 'matricula.ver'],
  },
  {
    label: 'Períodos Académicos',
    icon: 'date_range',
    route: 'periodos-academicos',
    description: 'Bimestres, trimestres y semestres del año lectivo',
    permisos: ['calendarizacion.ver', 'calendarizacion.gestionar', 'admin.institucional', 'horarios.ver', 'evaluacion.ver', 'matricula.ver'],
  },
  {
    label: 'Feriados',
    icon: 'event_busy',
    route: 'feriados',
    description: 'Dias no lectivos del calendario escolar',
  },
  {
    label: 'Eventos',
    icon: 'event',
    route: 'eventos',
    description: 'Calendario maestro de eventos institucionales',
  },
  {
    label: 'Fórmulas de Evaluación',
    icon: 'functions',
    route: 'formulas-evaluacion',
    description: 'Estructura ponderada de calificaciones por nivel/curso',
  },
  {
    label: 'Historial Académico',
    icon: 'history_edu',
    route: 'historial-academico',
    description: 'Carga masiva de trayectoria escolar por alumno y año',
  },
];
