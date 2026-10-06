import { Injectable, signal, computed } from '@angular/core';
import type { EvalNavMode } from '../../grading/grading-config.model';

export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  queryParams?: Record<string, string>;
  children?: NavItem[];
  roles?: string[];
  permisos?: string[];
  badge?: number;
  exact?: boolean;
  /** staff = módulos administrativos; portal-* = portales por rol */
  zone?: 'staff' | 'portal-docente' | 'portal-estudiante' | 'portal-padre' | 'shared';
  /** Solo el superusuario SIAGIE ve este ítem. El administrador de sede no. */
  soloSiagie?: boolean;
  /** Filtra ítems según sistema de calificación institucional */
  evalMode?: EvalNavMode;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly _miniMode  = signal(false);
  private readonly _mobileOpen = signal(false);
  private readonly _isMobile  = signal(false);
  private readonly _isPhone   = signal(false);
  private readonly _pageTitle = signal('Dashboard');

  readonly miniMode    = this._miniMode.asReadonly();
  readonly mobileOpen  = this._mobileOpen.asReadonly();
  readonly isMobile    = this._isMobile.asReadonly();
  /** Teléfono (< md / 768px): menú app inferior del portal estudiante */
  readonly isPhone     = this._isPhone.asReadonly();
  readonly pageTitle   = this._pageTitle.asReadonly();

  readonly sidebarVisible = computed(() =>
    this._isMobile() ? this._mobileOpen() : true
  );
  readonly sidebarWidth = computed(() =>
    this._miniMode() && !this._isMobile() ? '72px' : '260px'
  );

  toggle(): void {
    if (this._isMobile()) this._mobileOpen.update(v => !v);
    else                  this._miniMode.update(v => !v);
  }

  closeMobile(): void  { this._mobileOpen.set(false); }
  setMobile(v: boolean): void {
    this._isMobile.set(v);
    if (v) this._mobileOpen.set(false);
  }
  setPhone(v: boolean): void { this._isPhone.set(v); }
  setTitle(t: string): void { this._pageTitle.set(t); }

  /** Navegación lateral plana del portal docente */
  readonly docenteSidebarNav: NavItem[] = [
    { label: 'Inicio', icon: 'home', route: '/portal-docente/inicio', exact: true },
    { label: 'Mis Aulas', icon: 'class', route: '/portal-docente/mi-aula' },
    { label: 'Asistencia', icon: 'fact_check', route: '/portal-docente/asistencia' },
    { label: 'Notas', icon: 'grading', route: '/portal-docente/notas' },
    { label: 'Tareas', icon: 'assignment', route: '/portal-docente/tareas' },
    { label: 'Recursos', icon: 'folder', route: '/portal-docente/recursos' },
    { label: 'Comunicados', icon: 'campaign', route: '/portal-docente/comunicados' },
    { label: 'Calendario escolar', icon: 'calendar_view_month', route: '/portal-docente/calendario' },
    { label: 'Temario', icon: 'calendar_month', route: '/portal-docente/temario' },
  ];

  /** Navegación lateral plana del portal padre (Inicio primero) */
  readonly padreSidebarNav: NavItem[] = [
    { label: 'Inicio', icon: 'home', route: '/portal-padre/inicio', exact: true },
    { label: 'Seguimiento', icon: 'insights', route: '/portal-padre/seguimiento' },
    { label: 'Justificaciones', icon: 'fact_check', route: '/portal-padre/justificaciones' },
    { label: 'Ficha del alumno', icon: 'badge', route: '/portal-padre/ficha' },
    { label: 'Tareas', icon: 'assignment', route: '/portal-padre/tareas' },
    { label: 'Clases', icon: 'menu_book', route: '/portal-padre/clases' },
    { label: 'Horarios', icon: 'schedule', route: '/portal-padre/horarios' },
    { label: 'Calendario escolar', icon: 'calendar_view_month', route: '/portal-padre/calendario' },
    { label: 'Comunicados', icon: 'campaign', route: '/portal-padre/comunicacion' },
    { label: 'Correo a docentes', icon: 'mail', route: '/portal-padre/correo-docentes' },
    { label: 'Estado de Cuenta', icon: 'account_balance_wallet', route: '/portal-padre/finanzas' },
  ];

  /** Navegación lateral plana del portal estudiante (Inicio primero) */
  readonly studentSidebarNav: NavItem[] = [
    { label: 'Inicio', icon: 'home', route: '/portal-estudiante/inicio', exact: true },
    { label: 'Mis Horarios', icon: 'schedule', route: '/portal-estudiante/horarios' },
    { label: 'Mis Notas', icon: 'grading', route: '/portal-estudiante/notas' },
    { label: 'Asistencia', icon: 'fact_check', route: '/portal-estudiante/asistencia' },
    { label: 'Tareas', icon: 'assignment', route: '/portal-estudiante/tareas' },
    { label: 'Clases', icon: 'menu_book', route: '/portal-estudiante/clases' },
    { label: 'Comunicados', icon: 'campaign', route: '/portal-estudiante/comunicados' },
    { label: 'Calendario escolar', icon: 'calendar_view_month', route: '/portal-estudiante/calendario' },
    { label: 'Contactos', icon: 'contacts', route: '/portal-estudiante/contactos' },
    { label: 'Mi ficha', icon: 'badge', route: '/portal-estudiante/perfil' },
  ];

  /** Navegación principal tipo app móvil del portal estudiante */
  readonly studentAppNav: NavItem[] = [
    { label: 'Inicio', icon: 'home', route: '/portal-estudiante/inicio', exact: true },
    { label: 'Mis cursos', icon: 'menu_book', route: '/portal-estudiante/clases' },
    { label: 'Notificaciones', icon: 'notifications', route: '/portal-estudiante/comunicados' },
    { label: 'Tareas', icon: 'assignment', route: '/portal-estudiante/tareas' },
  ];

  readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', permisos: ['dashboard.ver'], zone: 'shared' },
    {
      label: 'Estudiantes', icon: 'school', zone: 'staff',
      permisos: ['estudiantes.ver'],
      children: [
        { label: 'Expedientes', icon: 'folder_open',  route: '/estudiantes/expedientes', permisos: ['estudiantes.ver'] },
        { label: 'Documentos',  icon: 'description',  route: '/estudiantes/documentos',  permisos: ['estudiantes.ver'] },
        { label: 'Conducta',    icon: 'gavel',         route: '/estudiantes/conducta',    permisos: ['estudiantes.ver'] },
        { label: 'Auditoría de cambios', icon: 'history_edu', route: '/estudiantes/auditoria-cambios', permisos: ['estudiantes.expediente', 'admin.reportes'] },
        { label: 'Vínculos representante', icon: 'family_restroom', route: '/estudiantes/representante-vinculos', permisos: ['estudiantes.representantes', 'estudiantes.expediente', 'estudiantes.editar'] },
      ]
    },
    {
      label: 'Matrícula', icon: 'how_to_reg', zone: 'staff',
      permisos: ['matricula.ver'],
      children: [
        { label: 'Alumnos Matriculados', icon: 'list_alt',           route: '/matricula/matriculados',   permisos: ['matricula.ver'] },
        { label: 'Nueva Matrícula',      icon: 'person_add',        route: '/matricula/nueva',          permisos: ['matricula.crear', 'matricula.ver'] },
        { label: 'Matrícula excepcional', icon: 'priority_high',   route: '/matricula/excepcional',    permisos: ['matricula.excepcional', 'matricula.crear'] },
        { label: 'Continuidad',      icon: 'autorenew',         route: '/matricula/continuidad',    permisos: ['matricula.ver'] },
        { label: 'Matrícula Masiva', icon: 'group_add',         route: '/matricula/masiva',         permisos: ['matricula.ver'] },
        { label: 'Carga historial académico', icon: 'upload_file', route: '/matricula/historial-academico', permisos: ['matricula.ver', 'matricula.crear', 'estudiantes.ver', 'estudiantes.editar', 'evaluacion.ver', 'horarios.ver'] },
        { label: 'Historial de matrícula', icon: 'history', route: '/matricula/historial', permisos: ['matricula.historial', 'matricula.ver'] },
        { label: 'Vacantes',         icon: 'event_seat',        route: '/matricula/vacantes',       permisos: ['matricula.vacantes', 'matricula.ver'] },
        { label: 'Lista de Espera',  icon: 'hourglass_empty',   route: '/matricula/espera',         permisos: ['matricula.ver'] },
        { label: 'Cambio de Sección',icon: 'compare_arrows',    route: '/matricula/cambio-seccion', permisos: ['matricula.editar', 'matricula.ver'] },
        { label: 'Retiro de estudiante', icon: 'person_off', route: '/matricula/retiro', permisos: ['matricula.retiro', 'matricula.ver'] },
        { label: 'Reingreso de estudiante', icon: 'person_add', route: '/matricula/reingreso', permisos: ['matricula.reingreso', 'matricula.ver'] },
        { label: 'Evaluaciones de matrícula', icon: 'fact_check', route: '/matricula/evaluaciones', permisos: ['matricula.evaluacion', 'matricula.ver'] },
        { label: 'Retroalimentación', icon: 'forum', route: '/matricula/retroalimentacion', permisos: ['matricula.retroalimentacion', 'matricula.ver'] },
      ]
    },
    {
      label: 'Traslados', icon: 'swap_horiz', zone: 'staff',
      permisos: ['traslados.ver', 'traslados.solicitar', 'traslados.resolver', 'traslados.aprobar_destino'],
      children: [
        {
          label: 'Solicitar traslado',
          icon: 'outbound',
          route: '/traslados/solicitar',
          permisos: ['traslados.solicitar', 'traslados.ver'],
        },
        {
          label: 'Traslados recibidos',
          icon: 'move_to_inbox',
          route: '/traslados/recibidos',
          permisos: ['traslados.aprobar_destino', 'traslados.ver'],
        },
        {
          label: 'Supervisión territorial',
          icon: 'policy',
          route: '/traslados/supervision',
          permisos: ['traslados.resolver', 'traslados.ver'],
        },
      ],
    },
    {
      label: 'Instituciones', icon: 'account_balance', route: '/instituciones', zone: 'staff',
      soloSiagie: true,
    },
    {
      label: 'Académico', icon: 'menu_book', zone: 'staff',
      permisos: ['horarios.ver', 'docentes.ver', 'docentes.horario'],
      children: [
        { label: 'Currícula',         icon: 'library_books',  route: '/academico/curricula',  permisos: ['horarios.ver', 'docentes.ver'] },
        { label: 'Asignación Docente',icon: 'assignment_ind', route: '/academico/asignacion', queryParams: { tab: 'docentes' }, permisos: ['docentes.horario', 'docentes.ver'] },
        { label: 'Horarios',          icon: 'schedule',       route: '/academico/horarios',   permisos: ['horarios.ver'] },
        { label: 'Historial Académico', icon: 'timeline',     route: '/academico/historial-academico', permisos: ['estudiantes.ver', 'evaluacion.ver', 'horarios.ver'] },
      ]
    },
    {
      label: 'Asistencia', icon: 'fact_check', zone: 'staff',
      permisos: ['asistencia.ver'],
      children: [
        { label: 'Registro Diario',   icon: 'today',                    route: '/asistencia/registro',         permisos: ['asistencia.registrar', 'asistencia.ver'] },
        { label: 'Control de Faltas', icon: 'cancel_presentation',      route: '/asistencia/control',          permisos: ['asistencia.ver'] },
        { label: 'Justificaciones',   icon: 'assignment_turned_in',     route: '/asistencia/justificaciones',  permisos: ['asistencia.ver'] },
        { label: 'Alertas',           icon: 'notification_important',   route: '/asistencia/alertas',          permisos: ['asistencia.ver'] },
        { label: 'Reportes',          icon: 'bar_chart',                route: '/asistencia/reportes',         permisos: ['asistencia.reportes', 'asistencia.ver'] },
      ]
    },
    {
      label: 'Evaluación', icon: 'grading', zone: 'staff',
      permisos: ['evaluacion.ver'],
      children: [
        { label: 'Calificaciones', icon: 'grading', route: '/evaluacion/notas', permisos: ['evaluacion.registrar', 'evaluacion.ver'] },
        { label: 'Competencias', icon: 'stars', route: '/evaluacion/competencias', permisos: ['evaluacion.registrar', 'evaluacion.ver', 'evaluacion.editar'] },
        { label: 'Evaluación diagnóstica', icon: 'fact_check', route: '/evaluacion/diagnostica', permisos: ['evaluacion.registrar', 'evaluacion.ver', 'evaluacion.editar'] },
        { label: 'Auditoría diagnóstica', icon: 'history_edu', route: '/evaluacion/auditoria-diagnostica', permisos: ['evaluacion.reportes', 'admin.reportes'] },
        { label: 'Escala de evaluación', icon: 'tune', route: '/evaluacion/escala', permisos: ['evaluacion.ver', 'evaluacion.configurar', 'admin.institucional'] },
        { label: 'Rectificación de notas', icon: 'edit_note', route: '/evaluacion/rectificacion-notas', permisos: ['evaluacion.rectificar', 'evaluacion.aprobar'] },
        { label: 'Auditoría de notas', icon: 'history_edu', route: '/evaluacion/auditoria-cambios', permisos: ['evaluacion.reportes', 'admin.reportes'] },
        { label: 'Auditoría de competencias', icon: 'history_edu', route: '/evaluacion/auditoria-competencias', permisos: ['evaluacion.reportes', 'admin.reportes'] },
        { label: 'Reportes',          icon: 'bar_chart',      route: '/evaluacion/reportes',    permisos: ['evaluacion.reportes', 'admin.reportes'] },
        { label: 'Promedios',         icon: 'calculate',      route: '/evaluacion/promedios',   permisos: ['evaluacion.reportes', 'evaluacion.ver'] },
        { label: 'Libretas',          icon: 'picture_as_pdf', route: '/evaluacion/libretas',    permisos: ['evaluacion.ver'] },
        { label: 'Actas',             icon: 'article',        route: '/evaluacion/actas',       permisos: ['evaluacion.aprobar', 'evaluacion.ver'] },
      ]
    },
    {
      label: 'Comunicaciones', icon: 'forum', zone: 'staff',
      permisos: ['comunicados.ver'],
      children: [
        { label: 'Mensajería',     icon: 'message',       route: '/comunicaciones/mensajes',       permisos: ['comunicados.ver'] },
        { label: 'Comunicados',    icon: 'campaign',      route: '/comunicaciones/comunicados',    permisos: ['comunicados.ver'] },
        { label: 'Eventos',        icon: 'event',         route: '/comunicaciones/eventos',        permisos: ['comunicados.ver'] },
        { label: 'Notificaciones', icon: 'notifications', route: '/comunicaciones/notificaciones', permisos: ['comunicados.ver'] },
      ]
    },
    {
      label: 'Portal Docente', icon: 'co_present', zone: 'portal-docente', roles: ['DOCENTE'],
      children: [
        { label: 'Inicio',       icon: 'home',         route: '/portal-docente/inicio', exact: true },
        { label: 'Mis Aulas',    icon: 'class',      route: '/portal-docente/mi-aula'    },
        { label: 'Asistencia', icon: 'fact_check', route: '/portal-docente/asistencia' },
        { label: 'Notas',      icon: 'grading',    route: '/portal-docente/notas'      },
        { label: 'Tareas',     icon: 'assignment', route: '/portal-docente/tareas' },
        { label: 'Recursos',   icon: 'folder',     route: '/portal-docente/recursos'   },
        { label: 'Calendario escolar', icon: 'calendar_view_month', route: '/portal-docente/calendario' },
        { label: 'Temario',    icon: 'calendar_month', route: '/portal-docente/temario' },
      ]
    },
    {
      label: 'Portal Estudiante', icon: 'person', zone: 'portal-estudiante', roles: ['ESTUDIANTE'],
      children: [
        { label: 'Inicio',       icon: 'home',         route: '/portal-estudiante/inicio', exact: true },
        { label: 'Mis Horarios', icon: 'schedule',   route: '/portal-estudiante/horarios'   },
        { label: 'Mis Notas',    icon: 'grading',    route: '/portal-estudiante/notas'      },
        { label: 'Asistencia',   icon: 'fact_check', route: '/portal-estudiante/asistencia' },
        { label: 'Tareas',       icon: 'assignment', route: '/portal-estudiante/tareas'     },
        { label: 'Clases',       icon: 'menu_book',  route: '/portal-estudiante/clases'     },
        { label: 'Calendario escolar', icon: 'calendar_view_month', route: '/portal-estudiante/calendario' },
        { label: 'Contactos',    icon: 'contacts',   route: '/portal-estudiante/contactos'  },
        { label: 'Mi ficha',     icon: 'badge',      route: '/portal-estudiante/perfil'     },
      ]
    },
    {
      label: 'Portal Padre', icon: 'family_restroom', zone: 'portal-padre', roles: ['PADRE'],
      children: [
        { label: 'Inicio',        icon: 'home',                   route: '/portal-padre/inicio', exact: true },
        { label: 'Seguimiento',   icon: 'insights',               route: '/portal-padre/seguimiento'  },
        { label: 'Justificaciones', icon: 'fact_check',           route: '/portal-padre/justificaciones' },
        { label: 'Ficha del alumno', icon: 'badge',               route: '/portal-padre/ficha'        },
        { label: 'Tareas',        icon: 'assignment',             route: '/portal-padre/tareas'       },
        { label: 'Clases',        icon: 'menu_book',              route: '/portal-padre/clases'       },
        { label: 'Horarios',      icon: 'schedule',               route: '/portal-padre/horarios'     },
        { label: 'Calendario escolar', icon: 'calendar_view_month', route: '/portal-padre/calendario' },
        { label: 'Comunicados', icon: 'campaign', route: '/portal-padre/comunicacion' },
        { label: 'Correo a docentes', icon: 'mail',               route: '/portal-padre/correo-docentes' },
        { label: 'Estado de Cuenta', icon: 'account_balance_wallet', route: '/portal-padre/finanzas'  },
      ]
    },
    {
      label: 'Tesorería', icon: 'account_balance', zone: 'staff',
      permisos: ['tesoreria.ver'],
      children: [
        { label: 'Conceptos de Pago', icon: 'receipt',     route: '/tesoreria/conceptos', permisos: ['tesoreria.conceptos', 'tesoreria.ver'] },
        { label: 'Registro de Pagos', icon: 'payment',     route: '/tesoreria/pagos',     permisos: ['tesoreria.registrar', 'tesoreria.ver'] },
        { label: 'Morosidad',         icon: 'money_off',   route: '/tesoreria/morosidad', permisos: ['tesoreria.ver'] },
        { label: 'Reportes',          icon: 'bar_chart',   route: '/tesoreria/reportes',  permisos: ['tesoreria.reportes', 'tesoreria.ver'] },
      ]
    },
    {
      label: 'Biblioteca', icon: 'local_library', zone: 'staff',
      permisos: ['biblioteca.ver'],
      children: [
        { label: 'Catálogo',    icon: 'menu_book',  route: '/biblioteca/catalogo',   permisos: ['biblioteca.ver'] },
        { label: 'Préstamos',   icon: 'swap_horiz', route: '/biblioteca/prestamos',  permisos: ['biblioteca.gestionar', 'biblioteca.ver'] },
        { label: 'Inventario',  icon: 'inventory',  route: '/biblioteca/inventario', permisos: ['biblioteca.gestionar', 'biblioteca.ver'] },
      ]
    },
    {
      label: 'Administración', icon: 'admin_panel_settings', zone: 'staff',
      permisos: ['admin.institucional', 'admin.usuarios', 'admin.roles', 'admin.reportes'],
      children: [
        { label: 'Configuración Institucional', icon: 'business',        route: '/administracion/institucional', permisos: ['admin.institucional'] },
        { label: 'Correo electrónico',          icon: 'mail',            route: '/administracion/correo',        permisos: ['admin.institucional'] },
        { label: 'Usuarios',                    icon: 'manage_accounts', route: '/administracion/usuarios',      permisos: ['admin.usuarios'] },
        { label: 'Roles y Permisos',            icon: 'security',        route: '/administracion/roles',         permisos: ['admin.roles'] },
        { label: 'Bitácora',                    icon: 'history',         route: '/administracion/bitacora',      permisos: ['admin.reportes'] },
      ]
    },
    {
      label: 'Maestros', icon: 'tune', zone: 'staff',
      permisos: ['matricula.vacantes', 'matricula.ver', 'matricula.crear', 'horarios.ver', 'docentes.ver', 'estudiantes.ver', 'admin.institucional', 'comunicados.ver', 'evaluacion.ver', 'asistencia.ver', 'calendarizacion.ver', 'calendarizacion.gestionar', 'curricula.ver', 'curricula.gestionar'],
      children: [
        { label: 'Salones', icon: 'meeting_room', route: '/maestros/salones', permisos: ['matricula.vacantes', 'matricula.ver'] },
        { label: 'Plan de estudios (áreas)', icon: 'category', route: '/maestros/plan-estudios-areas', permisos: ['curricula.ver', 'curricula.gestionar', 'admin.institucional', 'horarios.ver', 'evaluacion.ver', 'matricula.ver'] },
        { label: 'Sedes', icon: 'location_city', route: '/maestros/sedes', permisos: ['admin.institucional', 'matricula.ver', 'matricula.vacantes', 'horarios.ver', 'docentes.ver', 'estudiantes.ver'] },
        { label: 'Cursos', icon: 'menu_book', route: '/maestros/cursos', permisos: ['horarios.ver', 'docentes.ver', 'matricula.ver'] },
        { label: 'Docentes', icon: 'school', route: '/maestros/docentes', permisos: ['docentes.ver', 'docentes.crear', 'docentes.editar', 'horarios.ver', 'matricula.ver', 'matricula.vacantes'] },
        { label: 'Faltas y Reconocimientos', icon: 'gavel', route: '/maestros/faltas-reconocimientos', permisos: ['estudiantes.ver', 'matricula.ver', 'matricula.vacantes', 'horarios.ver', 'docentes.ver'] },
        { label: 'Años escolares', icon: 'calendar_month', route: '/maestros/anios-escolares', permisos: ['calendarizacion.ver', 'calendarizacion.gestionar', 'admin.institucional', 'horarios.ver', 'matricula.ver'] },
        { label: 'Feriados', icon: 'event_busy', route: '/maestros/feriados', permisos: ['asistencia.ver', 'matricula.ver', 'horarios.ver'] },
        { label: 'Períodos Académicos', icon: 'date_range', route: '/maestros/periodos-academicos', permisos: ['horarios.ver', 'evaluacion.ver', 'matricula.ver'] },
        { label: 'Eventos', icon: 'event', route: '/maestros/eventos', permisos: ['comunicados.ver', 'matricula.ver', 'horarios.ver'] },
        { label: 'Fórmulas de Evaluación', icon: 'functions', route: '/maestros/formulas-evaluacion', permisos: ['evaluacion.registrar', 'evaluacion.ver', 'admin.institucional'] },
        { label: 'Historial Académico', icon: 'history_edu', route: '/matricula/historial-academico', permisos: ['estudiantes.ver', 'estudiantes.editar', 'matricula.ver', 'matricula.crear', 'evaluacion.ver', 'horarios.ver'] },
      ]
    },
  ];
}
