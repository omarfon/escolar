import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { roleGuard, permisoGuard, staffAreaGuard, dashboardGuard, portalDocenteGuard, portalEstudianteGuard, portalPadreGuard } from './core/auth/guards/role.guard';
import { MainLayoutComponent } from './core/layout/components/main-layout/main-layout.component';
import { trasladosDefaultGuard } from './features/traslados/traslados-default.guard';

export const routes: Routes = [
  // ── Redirección raíz ──────────────────────────────────
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  // ── Auth (sin layout) ─────────────────────────────────
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },

  // ── Sin permiso ───────────────────────────────────────
  {
    path: 'sin-permiso',
    loadComponent: () => import('./features/sin-permiso/sin-permiso.component').then(m => m.SinPermisoComponent)
  },

  // ── Rutas protegidas con layout ───────────────────────
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    runGuardsAndResolvers: 'paramsChange',
    children: [

      // Dashboard
      {
        path: 'dashboard',
        canActivate: [dashboardGuard],
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Cuenta (todos los usuarios autenticados)
      {
        path: 'cuenta/cambiar-contrasena',
        loadComponent: () =>
          import('./features/cuenta/change-password.component').then(m => m.ChangePasswordComponent),
      },

      // ── Administración ─────────────────────────────────
      {
        path: 'administracion',
        canActivate: [staffAreaGuard, permisoGuard('admin.institucional', 'admin.usuarios', 'admin.roles', 'admin.reportes')],
        children: [
          { path: '', redirectTo: 'institucional', pathMatch: 'full' },
          {
            path: 'institucional',
            canActivate: [permisoGuard('admin.institucional')],
            loadComponent: () => import('./features/administracion/institucional/institucional.component').then(m => m.InstitucionalComponent)
          },
          {
            path: 'usuarios',
            canActivate: [permisoGuard('admin.usuarios')],
            loadComponent: () => import('./features/administracion/usuarios/usuarios.component').then(m => m.UsuariosComponent)
          },
          {
            path: 'roles',
            canActivate: [permisoGuard('admin.roles')],
            loadComponent: () => import('./features/administracion/roles/roles.component').then(m => m.RolesComponent)
          },
          {
            path: 'bitacora',
            canActivate: [permisoGuard('admin.reportes')],
            loadComponent: () => import('./features/administracion/bitacora/bitacora.component').then(m => m.BitacoraComponent)
          },
          {
            path: 'correo',
            canActivate: [permisoGuard('admin.institucional')],
            loadComponent: () => import('./features/administracion/correo/correo-config.component').then(m => m.CorreoConfigComponent)
          },
        ]
      },

      // ── Estudiantes ────────────────────────────────────
      {
        path: 'estudiantes',
        canActivate: [staffAreaGuard, permisoGuard('estudiantes.ver')],
        children: [
          { path: '', redirectTo: 'expedientes', pathMatch: 'full' },
          {
            path: 'expedientes',
            loadComponent: () => import('./features/estudiantes/list/estudiantes-list.component').then(m => m.EstudiantesListComponent)
          },
          {
            path: 'documentos',
            loadComponent: () => import('./features/estudiantes/documentos/documentos.component').then(m => m.DocumentosComponent)
          },
          {
            path: 'conducta',
            loadComponent: () => import('./features/estudiantes/conducta/conducta.component').then(m => m.ConductaComponent)
          },
          {
            path: 'auditoria-cambios',
            canActivate: [permisoGuard('estudiantes.expediente', 'admin.reportes')],
            loadComponent: () =>
              import('./features/estudiantes/auditoria-cambios/estudiante-auditoria.component').then(
                m => m.EstudianteAuditoriaComponent,
              ),
          },
          {
            path: 'representante-vinculos',
            canActivate: [
              permisoGuard(
                'estudiantes.representantes',
                'estudiantes.expediente',
                'estudiantes.editar',
              ),
            ],
            loadComponent: () =>
              import('./features/estudiantes/representante-vinculos/representante-vinculos.component').then(
                m => m.RepresentanteVinculosComponent,
              ),
          },
        ]
      },

      // ── Matrícula ──────────────────────────────────────
      {
        path: 'matricula',
        canActivate: [staffAreaGuard, permisoGuard('matricula.ver')],
        children: [
          { path: '', redirectTo: 'matriculados', pathMatch: 'full' },
          {
            path: 'matriculados',
            loadComponent: () => import('./features/matricula/matriculados/matriculados.component').then(m => m.MatriculadosComponent)
          },
          {
            path: 'nueva',
            loadComponent: () => import('./features/matricula/nueva/nueva-matricula.component').then(m => m.NuevaMatriculaComponent)
          },
          {
            path: 'continuidad',
            loadComponent: () => import('./features/matricula/continuidad/continuidad.component').then(m => m.ContinuidadComponent)
          },
          {
            path: 'masiva',
            loadComponent: () => import('./features/matricula/masiva/masiva.component').then(m => m.MasivaComponent)
          },
          {
            path: 'historial-academico',
            loadComponent: () => import('./features/matricula/maestros/historial-academico/historial-academico.component').then(m => m.MaestrosHistorialAcademicoComponent),
          },
          {
            path: 'vacantes',
            loadComponent: () => import('./features/matricula/vacantes/vacantes.component').then(m => m.VacantesComponent)
          },
          {
            path: 'espera',
            loadComponent: () => import('./features/matricula/espera/espera.component').then(m => m.EsperaComponent)
          },
          {
            path: 'cambio-seccion',
            loadComponent: () => import('./features/matricula/cambio-seccion/cambio-seccion.component').then(m => m.CambioSeccionComponent)
          },
          {
            path: 'retiro',
            canActivate: [permisoGuard('matricula.retiro', 'matricula.ver', 'matricula.exportar')],
            loadComponent: () => import('./features/matricula/retiro/retiro.component').then(m => m.RetiroEstudianteComponent)
          },
          {
            path: 'reingreso',
            canActivate: [permisoGuard('matricula.reingreso', 'matricula.ver', 'matricula.exportar')],
            loadComponent: () => import('./features/matricula/reingreso/reingreso.component').then(m => m.ReingresoEstudianteComponent)
          },
          {
            path: 'evaluaciones',
            canActivate: [permisoGuard('matricula.evaluacion', 'matricula.ver', 'matricula.exportar')],
            loadComponent: () => import('./features/matricula/evaluaciones/evaluaciones-matricula.component').then(m => m.EvaluacionesMatriculaComponent)
          },
          {
            path: 'retroalimentacion',
            canActivate: [permisoGuard('matricula.retroalimentacion', 'matricula.ver', 'matricula.exportar')],
            loadComponent: () => import('./features/matricula/retroalimentacion/retroalimentacion-matricula.component').then(m => m.RetroalimentacionMatriculaComponent)
          },
          {
            path: 'historial',
            canActivate: [permisoGuard('matricula.historial', 'matricula.ver', 'matricula.exportar')],
            loadComponent: () => import('./features/matricula/historial/historial-matricula.component').then(m => m.HistorialMatriculaComponent)
          },
          {
            path: 'excepcional',
            canActivate: [permisoGuard('matricula.excepcional', 'matricula.crear')],
            loadComponent: () => import('./features/matricula/excepcional/matricula-excepcional.component').then(m => m.MatriculaExcepcionalComponent)
          },
        ]
      },

      {
        path: 'traslados',
        canActivate: [
          staffAreaGuard,
          permisoGuard('traslados.ver', 'traslados.solicitar', 'traslados.resolver', 'traslados.aprobar_destino'),
        ],
        loadComponent: () =>
          import('./features/traslados/traslados-layout.component').then(m => m.TrasladosLayoutComponent),
        children: [
          {
            path: '',
            pathMatch: 'full',
            canActivate: [trasladosDefaultGuard],
            children: [],
          },
          {
            path: 'solicitar',
            canActivate: [permisoGuard('traslados.solicitar', 'traslados.ver', 'traslados.resolver')],
            loadComponent: () =>
              import('./features/traslados/traslados-origen.component').then(m => m.TrasladosOrigenComponent),
          },
          {
            path: 'recibidos',
            canActivate: [permisoGuard('traslados.aprobar_destino', 'traslados.ver', 'traslados.resolver')],
            loadComponent: () =>
              import('./features/traslados/traslados-destino.component').then(m => m.TrasladosDestinoComponent),
          },
          {
            path: 'supervision',
            canActivate: [permisoGuard('traslados.resolver', 'traslados.ver')],
            loadComponent: () =>
              import('./features/traslados/traslados-supervision.component').then(m => m.TrasladosSupervisionComponent),
          },
          {
            path: 'seguimiento',
            canActivate: [permisoGuard('traslados.ver', 'traslados.solicitar', 'traslados.resolver', 'traslados.aprobar_destino')],
            loadComponent: () =>
              import('./features/traslados/traslados-seguimiento.component').then(m => m.TrasladosSeguimientoComponent),
          },
        ],
      },

      {
        path: 'instituciones',
        canActivate: [roleGuard('SIAGIE')],
        loadComponent: () =>
          import('./features/instituciones/directorio-instituciones.component').then(m => m.DirectorioInstitucionesComponent),
      },

      // ── Maestros ───────────────────────────────────────
      {
        path: 'maestros',
        canActivate: [staffAreaGuard, permisoGuard('matricula.vacantes', 'matricula.ver', 'matricula.crear', 'horarios.ver', 'docentes.ver', 'estudiantes.ver', 'admin.institucional', 'asistencia.ver', 'comunicados.ver', 'evaluacion.ver', 'evaluacion.registrar', 'calendarizacion.ver', 'calendarizacion.gestionar', 'curricula.ver', 'curricula.gestionar')],
        loadComponent: () => import('./features/matricula/maestros/maestros.component').then(m => m.MaestrosComponent),
        children: [
          { path: '', redirectTo: 'salones', pathMatch: 'full' },
          {
            path: 'salones',
            loadComponent: () => import('./features/matricula/maestros/salones/salones.component').then(m => m.SalonesComponent),
          },
          {
            path: 'plan-estudios-areas',
            canActivate: [permisoGuard('curricula.ver', 'curricula.gestionar', 'admin.institucional', 'horarios.ver', 'evaluacion.ver', 'matricula.ver')],
            loadComponent: () =>
              import('./features/matricula/maestros/plan-estudios-areas/plan-estudios-areas.component').then(
                m => m.PlanEstudiosAreasComponent,
              ),
          },
          {
            path: 'sedes',
            loadComponent: () => import('./features/matricula/maestros/sedes/sedes.component').then(m => m.MaestrosSedesComponent),
          },
          {
            path: 'cursos',
            loadComponent: () => import('./features/matricula/maestros/cursos/cursos.component').then(m => m.MaestrosCursosComponent),
          },
          {
            path: 'docentes',
            loadComponent: () => import('./features/matricula/maestros/docentes/docentes.component').then(m => m.MaestrosDocentesComponent),
          },
          {
            path: 'faltas-reconocimientos',
            loadComponent: () => import('./features/matricula/maestros/faltas-reconocimientos/faltas-reconocimientos.component').then(m => m.MaestrosFaltasReconocimientosComponent),
          },
          {
            path: 'calendario',
            canActivate: [permisoGuard('calendarizacion.ver', 'calendarizacion.gestionar', 'admin.institucional', 'horarios.ver', 'evaluacion.ver', 'matricula.ver', 'comunicados.ver', 'asistencia.ver')],
            loadComponent: () => import('./features/matricula/maestros/calendario/calendario-escolar.component').then(m => m.MaestrosCalendarioEscolarComponent),
          },
          {
            path: 'anios-escolares',
            canActivate: [permisoGuard('calendarizacion.ver', 'calendarizacion.gestionar', 'admin.institucional', 'horarios.ver', 'matricula.ver')],
            loadComponent: () => import('./features/matricula/maestros/anios-escolares/anios-escolares.component').then(m => m.MaestrosAniosEscolaresComponent),
          },
          {
            path: 'feriados',
            loadComponent: () => import('./features/matricula/maestros/feriados/feriados.component').then(m => m.MaestrosFeriadosComponent),
          },
          {
            path: 'periodos-academicos',
            canActivate: [permisoGuard('calendarizacion.ver', 'calendarizacion.gestionar', 'admin.institucional', 'horarios.ver', 'evaluacion.ver', 'matricula.ver')],
            loadComponent: () => import('./features/matricula/maestros/periodos-academicos/periodos-academicos.component').then(m => m.MaestrosPeriodosAcademicosComponent),
          },
          {
            path: 'eventos',
            loadComponent: () => import('./features/matricula/maestros/eventos/eventos.component').then(m => m.MaestrosEventosComponent),
          },
          {
            path: 'formulas-evaluacion',
            loadComponent: () => import('./features/matricula/maestros/formulas-evaluacion/formulas-evaluacion.component').then(m => m.MaestrosFormulasEvaluacionComponent),
          },
          {
            path: 'historial-academico',
            loadComponent: () => import('./features/matricula/maestros/historial-academico/historial-academico.component').then(m => m.MaestrosHistorialAcademicoComponent),
          },
        ],
      },
      { path: 'matricula/maestros', redirectTo: 'maestros/salones', pathMatch: 'full' },
      { path: 'matricula/maestros/salones', redirectTo: 'maestros/salones', pathMatch: 'full' },

      // ── Académico ──────────────────────────────────────
      {
        path: 'academico',
        canActivate: [staffAreaGuard, permisoGuard('horarios.ver', 'docentes.ver', 'docentes.horario', 'estudiantes.ver', 'evaluacion.ver')],
        children: [
          { path: '', redirectTo: 'curricula', pathMatch: 'full' },
          {
            path: 'curricula',
            loadComponent: () => import('./features/academico/curricula/curricula.component').then(m => m.CurriculaComponent)
          },
          {
            path: 'asignacion',
            loadComponent: () => import('./features/academico/asignacion/asignacion.component').then(m => m.AsignacionComponent)
          },
          {
            path: 'horarios',
            loadComponent: () => import('./features/academico/horarios/horarios.component').then(m => m.HorariosComponent)
          },
          {
            path: 'historial-academico',
            loadComponent: () => import('./features/academico/historial-academico/historial-academico.component').then(m => m.HistorialAcademicoComponent)
          },
        ]
      },

      // ── Asistencia ─────────────────────────────────────
      {
        path: 'asistencia',
        canActivate: [staffAreaGuard, permisoGuard('asistencia.ver')],
        children: [
          { path: '', redirectTo: 'registro', pathMatch: 'full' },
          {
            path: 'registro',
            loadComponent: () => import('./features/asistencia/registro/asistencia-registro.component').then(m => m.AsistenciaRegistroComponent)
          },
          {
            path: 'control',
            loadComponent: () => import('./features/asistencia/control/control.component').then(m => m.AsistenciaControlComponent)
          },
          {
            path: 'justificaciones',
            loadComponent: () => import('./features/asistencia/justificaciones/justificaciones.component').then(m => m.JustificacionesComponent)
          },
          {
            path: 'alertas',
            loadComponent: () => import('./features/asistencia/alertas/alertas.component').then(m => m.AlertasComponent)
          },
          {
            path: 'reportes',
            loadComponent: () => import('./features/asistencia/reportes/reportes.component').then(m => m.AsistenciaReportesComponent)
          },
        ]
      },

      // ── Evaluación ─────────────────────────────────────
      {
        path: 'evaluacion',
        canActivate: [staffAreaGuard, permisoGuard('evaluacion.ver')],
        children: [
          { path: '', redirectTo: 'notas', pathMatch: 'full' },
          {
            path: 'notas',
            loadComponent: () => import('./features/evaluacion/notas/evaluacion-notas.component').then(m => m.EvaluacionNotasComponent)
          },
          {
            path: 'escala',
            canActivate: [permisoGuard('evaluacion.ver', 'evaluacion.configurar', 'admin.institucional')],
            loadComponent: () =>
              import('./features/evaluacion/escala/escala-evaluacion.component').then(
                m => m.EscalaEvaluacionComponent,
              ),
          },
          {
            path: 'competencias',
            canActivate: [permisoGuard('evaluacion.registrar', 'evaluacion.ver', 'evaluacion.editar')],
            loadComponent: () =>
              import('./features/evaluacion/competencias/competencias.component').then(
                m => m.CompetenciasComponent,
              ),
          },
          {
            path: 'diagnostica',
            canActivate: [permisoGuard('evaluacion.registrar', 'evaluacion.ver', 'evaluacion.editar')],
            loadComponent: () =>
              import('./features/evaluacion/diagnostica/diagnostica.component').then(
                m => m.DiagnosticaComponent,
              ),
          },
          {
            path: 'auditoria-diagnostica',
            canActivate: [permisoGuard('evaluacion.reportes', 'admin.reportes')],
            loadComponent: () =>
              import('./features/evaluacion/auditoria-diagnostica/diagnostic-auditoria.component').then(
                m => m.DiagnosticAuditoriaComponent,
              ),
          },
          {
            path: 'promedios',
            loadComponent: () => import('./features/evaluacion/promedios/promedios.component').then(m => m.PromediosComponent)
          },
          {
            path: 'libretas',
            loadComponent: () => import('./features/evaluacion/libretas/libretas.component').then(m => m.LibretasComponent)
          },
          {
            path: 'actas',
            loadComponent: () => import('./features/evaluacion/actas/actas.component').then(m => m.ActasComponent)
          },
          {
            path: 'rectificacion-notas',
            canActivate: [permisoGuard('evaluacion.rectificar', 'evaluacion.aprobar')],
            loadComponent: () =>
              import('./features/evaluacion/notas/rectificacion-notas.component').then(
                m => m.RectificacionNotasComponent,
              ),
          },
          {
            path: 'auditoria-cambios',
            canActivate: [permisoGuard('evaluacion.reportes', 'admin.reportes')],
            loadComponent: () =>
              import('./features/evaluacion/auditoria-cambios/grade-auditoria.component').then(
                m => m.GradeAuditoriaComponent,
              ),
          },
          {
            path: 'auditoria-competencias',
            canActivate: [permisoGuard('evaluacion.reportes', 'admin.reportes')],
            loadComponent: () =>
              import('./features/evaluacion/auditoria-competencias/competency-auditoria.component').then(
                m => m.CompetencyAuditoriaComponent,
              ),
          },
        ]
      },

      // ── Comunicaciones ─────────────────────────────────
      {
        path: 'comunicaciones',
        canActivate: [staffAreaGuard, permisoGuard('comunicados.ver')],
        children: [
          { path: '', redirectTo: 'comunicados', pathMatch: 'full' },
          {
            path: 'mensajes',
            loadComponent: () => import('./features/comunicaciones/mensajes/mensajes.component').then(m => m.MensajesComponent)
          },
          {
            path: 'comunicados',
            loadComponent: () => import('./features/comunicaciones/comunicados/comunicados.component').then(m => m.ComunicadosComponent)
          },
          {
            path: 'eventos',
            loadComponent: () => import('./features/comunicaciones/eventos/eventos.component').then(m => m.EventosComponent)
          },
          {
            path: 'notificaciones',
            loadComponent: () => import('./features/comunicaciones/notificaciones/notificaciones.component').then(m => m.NotificacionesComponent)
          },
        ]
      },

      // ── Portal Docente ─────────────────────────────────
      {
        path: 'portal-docente',
        canActivate: [portalDocenteGuard],
        children: [
          { path: '', redirectTo: 'inicio', pathMatch: 'full' },
          {
            path: 'inicio',
            loadComponent: () => import('./features/portal-docente/dashboard/dashboard-docente.component').then(m => m.DashboardDocenteComponent),
          },
          {
            path: 'mis-datos',
            loadComponent: () => import('./features/portal-docente/mis-datos/mis-datos.component').then(m => m.MisDatosDocenteComponent)
          },
          {
            path: 'mi-aula',
            loadComponent: () => import('./features/portal-docente/portal-docente.component').then(m => m.PortalDocenteComponent)
          },
          {
            path: 'asistencia',
            loadComponent: () => import('./features/portal-docente/asistencia/asistencia-docente.component').then(m => m.AsistenciaDocenteComponent)
          },
          {
            path: 'notas',
            loadComponent: () => import('./features/portal-docente/notas/notas-docente.component').then(m => m.NotasDocenteComponent)
          },
          {
            path: 'recursos',
            loadComponent: () => import('./features/portal-docente/recursos/recursos.component').then(m => m.RecursosComponent)
          },
          {
            path: 'tareas',
            loadComponent: () => import('./features/portal-docente/tareas/tareas-shell.component').then(m => m.TareasShellComponent)
          },
          {
            path: 'temario',
            loadComponent: () => import('./features/portal-docente/temario/temario-docente.component').then(m => m.TemarioDocenteComponent)
          },
          {
            path: 'comunicados',
            loadComponent: () => import('./features/portal-docente/comunicados/comunicados-docente.component').then(m => m.ComunicadosDocenteComponent)
          },
          {
            path: 'calendario',
            loadComponent: () => import('./features/matricula/maestros/calendario/calendario-escolar.component').then(m => m.MaestrosCalendarioEscolarComponent),
            data: { calendarioVariant: 'docente' },
          },
        ]
      },

      // ── Portal Estudiante ──────────────────────────────
      {
        path: 'portal-estudiante',
        canActivate: [portalEstudianteGuard],
        children: [
          { path: '', redirectTo: 'inicio', pathMatch: 'full' },
          { path: 'inicio', loadComponent: () => import('./features/portal-estudiante/dashboard/dashboard-estudiante.component').then(m => m.DashboardEstudianteComponent) },
          { path: 'dashboard', redirectTo: 'inicio', pathMatch: 'full' },
          { path: 'horarios',   loadComponent: () => import('./features/portal-estudiante/horarios/horarios.component').then(m => m.HorariosEstudianteComponent) },
          { path: 'notas',      loadComponent: () => import('./features/portal-estudiante/notas/notas.component').then(m => m.NotasEstudianteComponent) },
          { path: 'asistencia', loadComponent: () => import('./features/portal-estudiante/asistencia/asistencia.component').then(m => m.AsistenciaEstudianteComponent) },
          { path: 'tareas',        loadComponent: () => import('./features/portal-estudiante/tareas/tareas.component').then(m => m.TareasComponent) },
          { path: 'clases',        loadComponent: () => import('./features/portal-estudiante/clases/clases-estudiante.component').then(m => m.ClasesEstudianteComponent) },
          { path: 'contactos',     loadComponent: () => import('./features/portal-estudiante/contactos/contactos-estudiante.component').then(m => m.ContactosEstudianteComponent) },
          { path: 'perfil',        loadComponent: () => import('./features/portal-estudiante/perfil/perfil-estudiante.component').then(m => m.PerfilEstudianteComponent) },
          { path: 'temario', redirectTo: 'clases', pathMatch: 'full' },
          { path: 'comunicados',   loadComponent: () => import('./features/portal-estudiante/comunicados/comunicados-estudiante.component').then(m => m.ComunicadosEstudianteComponent) },
          {
            path: 'calendario',
            loadComponent: () => import('./features/matricula/maestros/calendario/calendario-escolar.component').then(m => m.MaestrosCalendarioEscolarComponent),
            data: { calendarioVariant: 'alumno' },
          },
        ]
      },

      // ── Portal Padre ───────────────────────────────────
      {
        path: 'portal-padre',
        canActivate: [portalPadreGuard],
        children: [
          { path: '', redirectTo: 'inicio', pathMatch: 'full' },
          { path: 'inicio',       loadComponent: () => import('./features/portal-padre/dashboard/dashboard-padre.component').then(m => m.DashboardPadreComponent) },
          { path: 'seguimiento',  loadComponent: () => import('./features/portal-padre/seguimiento/seguimiento.component').then(m => m.SeguimientoComponent) },
          { path: 'justificaciones', loadComponent: () => import('./features/portal-padre/justificaciones/justificaciones-padre.component').then(m => m.JustificacionesPadreComponent) },
          { path: 'ficha',        loadComponent: () => import('./features/portal-padre/ficha/ficha-hijo.component').then(m => m.FichaHijoComponent) },
          { path: 'horarios',     loadComponent: () => import('./features/portal-padre/horarios/horarios-padre.component').then(m => m.HorariosPadreComponent) },
          { path: 'tareas',       loadComponent: () => import('./features/portal-padre/tareas/tareas-padre.component').then(m => m.TareasPadreComponent) },
          { path: 'clases',       loadComponent: () => import('./features/portal-padre/clases/clases-padre.component').then(m => m.ClasesPadreComponent) },
          { path: 'comunicacion', loadComponent: () => import('./features/portal-padre/comunicacion/comunicacion.component').then(m => m.ComunicacionPadreComponent) },
          { path: 'correo-docentes', loadComponent: () => import('./features/portal-padre/correo-docentes/correo-docentes.component').then(m => m.CorreoDocentesComponent) },
          { path: 'finanzas',     loadComponent: () => import('./features/portal-padre/finanzas/finanzas.component').then(m => m.FinanzasPadreComponent) },
          {
            path: 'calendario',
            loadComponent: () => import('./features/matricula/maestros/calendario/calendario-escolar.component').then(m => m.MaestrosCalendarioEscolarComponent),
            data: { calendarioVariant: 'padre' },
          },
        ]
      },

      // ── Tesorería ──────────────────────────────────────
      {
        path: 'tesoreria',
        canActivate: [staffAreaGuard, permisoGuard('tesoreria.ver')],
        children: [
          { path: '', redirectTo: 'pagos', pathMatch: 'full' },
          {
            path: 'pagos',
            loadComponent: () => import('./features/tesoreria/pagos/tesoreria-pagos.component').then(m => m.TesoreriaPagosComponent)
          },
          {
            path: 'conceptos',
            loadComponent: () => import('./features/tesoreria/conceptos/conceptos.component').then(m => m.ConceptosComponent)
          },
          {
            path: 'morosidad',
            loadComponent: () => import('./features/tesoreria/morosidad/morosidad.component').then(m => m.MorosidadComponent)
          },
          {
            path: 'reportes',
            loadComponent: () => import('./features/tesoreria/reportes/reportes.component').then(m => m.TesoreriaReportesComponent)
          },
        ]
      },

      // ── Biblioteca ─────────────────────────────────────
      {
        path: 'biblioteca',
        canActivate: [staffAreaGuard, permisoGuard('biblioteca.ver')],
        children: [
          { path: '', redirectTo: 'catalogo', pathMatch: 'full' },
          {
            path: 'catalogo',
            loadComponent: () => import('./features/biblioteca/catalogo/catalogo.component').then(m => m.CatalogoComponent)
          },
          {
            path: 'prestamos',
            loadComponent: () => import('./features/biblioteca/prestamos/prestamos.component').then(m => m.PrestamosComponent)
          },
          {
            path: 'inventario',
            loadComponent: () => import('./features/biblioteca/inventario/inventario.component').then(m => m.InventarioComponent)
          },
        ]
      },

    ]
  },

  // ── 404 ───────────────────────────────────────────────
  { path: '**', redirectTo: 'sin-permiso' }
];
