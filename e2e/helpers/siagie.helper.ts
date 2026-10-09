import { expect, Page, APIRequestContext } from '@playwright/test';

import { loginAsUser } from './auth.helper';

import { gotoAppRoute } from './routing.helper';

import {
  findInstitutionByCodigoModular,
  IE_CODIGO_SAN_JUAN,
  loginApi,
  TENANT_INSTITUTION_STORAGE_KEY,
} from './tenant.helper';



/** Ítems de menú staff que SIAGIE debe ver (permisos ALL). */

export const SIAGIE_STAFF_NAV_ROOTS = [

  'Dashboard',

  'Reportería',

  'Estudiantes',

  'Matrícula',

  'Traslados',

  'Instituciones',

  'Académico',

  'Asistencia',

  'Evaluación',

  'Comunicaciones',

  'Tesorería',

  'Biblioteca',

  'Administración',

  'Maestros',

] as const;



export type SiagieStaffRouteSpec = {

  route: string;

  heading: RegExp;

};



/** Rutas staff por módulo — smoke de acceso con IE activa. */

export const SIAGIE_STAFF_ROUTE_GROUPS: Record<string, SiagieStaffRouteSpec[]> = {

  dashboard: [{ route: '/dashboard', heading: /Buenos días|Dashboard/i }],

  reporteria: [

    { route: '/reportes/territorial', heading: /Reportería|UGEL \/ DRE/i },

    { route: '/reportes/matricula', heading: /Reportería|Matrícula/i },

    { route: '/reportes/asistencia', heading: /Reportería|Asistencia/i },

    { route: '/reportes/evaluacion', heading: /Reportería|Evaluación/i },

    { route: '/reportes/tesoreria', heading: /Reportería|Tesorería/i },

  ],

  estudiantes: [

    { route: '/estudiantes/expedientes', heading: /Gestion de Estudiantes|Gestión de Estudiantes/i },

    { route: '/estudiantes/documentos', heading: /Documentos de Estudiantes/i },

    { route: '/estudiantes/conducta', heading: /Control de Conducta/i },

    { route: '/estudiantes/auditoria-cambios', heading: /Privacidad y auditoría/i },

    { route: '/estudiantes/representante-vinculos', heading: /Vínculos representante/i },

  ],

  matricula: [

    { route: '/matricula/matriculados', heading: /Alumnos Matriculados/i },

    { route: '/matricula/nueva', heading: /Nueva Matrícula/i },

    { route: '/matricula/excepcional', heading: /Matrícula excepcional/i },

    { route: '/matricula/continuidad', heading: /Matrícula por Continuidad/i },

    { route: '/matricula/masiva', heading: /Matricula Masiva|Matrícula Masiva/i },

    { route: '/matricula/historial-academico', heading: /Historial Académico/i },

    { route: '/matricula/historial', heading: /Historial de matrícula/i },

    { route: '/matricula/vacantes', heading: /Gestión de Vacantes/i },

    { route: '/matricula/espera', heading: /Lista de Espera/i },

    { route: '/matricula/cambio-seccion', heading: /Cambio de Seccion|Cambio de Sección/i },

    { route: '/matricula/retiro', heading: /Registrar retiro del estudiante/i },

    { route: '/matricula/reingreso', heading: /Registrar reingreso del estudiante/i },

    { route: '/matricula/evaluaciones', heading: /Evaluaciones de matrícula/i },

    { route: '/matricula/retroalimentacion', heading: /Retroalimentación de matrícula/i },

  ],

  traslados: [

    { route: '/traslados/solicitar', heading: /Solicitar traslado/i },

    { route: '/traslados/recibidos', heading: /Traslados recibidos/i },

    { route: '/traslados/supervision', heading: /Supervisión territorial/i },

    { route: '/traslados/seguimiento', heading: /Seguimiento del proceso/i },

  ],

  instituciones: [
    {
      route: '/instituciones',
      heading: /Directorio de instituciones|^Instituciones$|I\.E\./i,
    },
  ],

  academico: [

    { route: '/academico/curricula', heading: /Gestión Curricular/i },

    { route: '/academico/asignacion?tab=docentes', heading: /Asignación de Docentes/i },

    { route: '/academico/horarios', heading: /Gestión de Horarios/i },

    { route: '/academico/historial-academico', heading: /Historial Académico/i },

  ],

  asistencia: [

    { route: '/asistencia/registro', heading: /Registro Diario de Asistencia/i },

    { route: '/asistencia/control', heading: /Control de Faltas/i },

    { route: '/asistencia/justificaciones', heading: /Justificación de Faltas/i },

    { route: '/asistencia/alertas', heading: /Alertas de Ausentismo/i },

  ],

  evaluacion: [

    { route: '/evaluacion/notas', heading: /Registro de Notas/i },

    { route: '/evaluacion/competencias', heading: /Evaluación por Competencias|competencias deshabilitada/i },

    { route: '/evaluacion/diagnostica', heading: /Evaluación Diagnóstica/i },

    { route: '/evaluacion/auditoria-diagnostica', heading: /Auditoría de evaluación diagnóstica/i },

    { route: '/evaluacion/escala', heading: /Escala de evaluación/i },

    { route: '/evaluacion/rectificacion-notas', heading: /Rectificación de Notas/i },

    { route: '/evaluacion/auditoria-cambios', heading: /Auditoría de notas/i },

    { route: '/evaluacion/auditoria-competencias', heading: /Auditoría de competencias/i },

    { route: '/evaluacion/promedios', heading: /Cálculo de Promedios|Promedios/i },

    { route: '/evaluacion/libretas', heading: /Libretas de Notas/i },

    { route: '/evaluacion/actas', heading: /Actas de Evaluación/i },

  ],

  comunicaciones: [

    { route: '/comunicaciones/mensajes', heading: /Mensajería Interna/i },

    { route: '/comunicaciones/comunicados', heading: /Comunicados/i },

    { route: '/comunicaciones/eventos', heading: /^Eventos$/i },

    { route: '/comunicaciones/notificaciones', heading: /Notificaciones/i },

  ],

  tesoreria: [

    { route: '/tesoreria/conceptos', heading: /Conceptos de Pago/i },

    { route: '/tesoreria/pagos', heading: /Gestión de Pagos/i },

    { route: '/tesoreria/morosidad', heading: /Control de Morosidad/i },

  ],

  biblioteca: [

    { route: '/biblioteca/catalogo', heading: /Catalogo Bibliografico|Catálogo Bibliográfico/i },

    { route: '/biblioteca/prestamos', heading: /Prestamos|Préstamos/i },

    { route: '/biblioteca/inventario', heading: /Inventario/i },

  ],

  administracion: [

    { route: '/administracion/institucional', heading: /Configuracion Institucional|Configuración Institucional/i },

    { route: '/administracion/correo', heading: /Configuración de Correo/i },

    { route: '/administracion/usuarios', heading: /Gestion de Usuarios|Gestión de Usuarios/i },

    { route: '/administracion/roles', heading: /^Roles$/i },

    { route: '/administracion/bitacora', heading: /Bitácora del Sistema/i },

  ],

  maestros: [

    { route: '/maestros/salones', heading: /^Salones$/i },

    { route: '/maestros/plan-estudios-areas', heading: /Plan de estudios — Áreas/i },

    { route: '/maestros/sedes', heading: /Sedes por Institución/i },

    { route: '/maestros/cursos', heading: /^Cursos$/i },

    { route: '/maestros/docentes', heading: /^Docentes$/i },

    { route: '/maestros/faltas-reconocimientos', heading: /Faltas y Reconocimientos/i },

    { route: '/maestros/anios-escolares', heading: /Años escolares/i },

    { route: '/maestros/feriados', heading: /^Feriados$/i },

    { route: '/maestros/periodos-academicos', heading: /Períodos Académicos/i },

    { route: '/maestros/eventos', heading: /Eventos escolares/i },

    { route: '/maestros/formulas-evaluacion', heading: /Fórmulas de Evaluación/i },

    { route: '/maestros/calendario', heading: /Calendario escolar/i },

    { route: '/maestros/historial-academico', heading: /Historial Académico/i },

  ],

};



/** Lista plana (compatibilidad y recorridos rápidos). */

export const SIAGIE_STAFF_ROUTES: SiagieStaffRouteSpec[] = Object.values(SIAGIE_STAFF_ROUTE_GROUPS).flat();



export async function loginAsSiagie(page: Page): Promise<void> {

  await page.addInitScript((key) => localStorage.removeItem(key), TENANT_INSTITUTION_STORAGE_KEY);

  await loginAsUser(page, 'siagie');

}



let cachedDefaultInstitutionId: number | null = null;

export function getSiagieDefaultInstitutionId(): number {
  expect(cachedDefaultInstitutionId, 'login SIAGIE con IE antes de leer institutionId').toBeTruthy();
  return cachedDefaultInstitutionId!;
}

/** Resuelve IE por API (p. ej. tenant-isolation); en UI preferir selección en header. */
export async function resolveDefaultInstitutionId(request: APIRequestContext): Promise<number> {
  if (cachedDefaultInstitutionId != null) return cachedDefaultInstitutionId;
  const admin = await loginApi(request, 'admin');
  if (admin.institutionId) {
    cachedDefaultInstitutionId = admin.institutionId;
    return admin.institutionId;
  }
  const siagie = await loginApi(request, 'siagie');
  const ie = await findInstitutionByCodigoModular(request, siagie.accessToken, IE_CODIGO_SAN_JUAN);
  cachedDefaultInstitutionId = ie.id;
  return ie.id;
}

export async function selectInstitutionInHeader(page: Page, institutionId: number): Promise<void> {
  const select = page.locator('#tenant-ie-select');
  await expect(select).toBeVisible({ timeout: 15_000 });
  await select.selectOption(String(institutionId));
  await expect(select).toHaveValue(String(institutionId), { timeout: 10_000 });
  await expect(page.getByText('Contexto activo:').first()).toBeVisible({ timeout: 15_000 });
}

/** Elige IE del seed en el combo (texto incluye código modular o nombre San Juan). */
export async function selectInstitutionByCodigoModularInHeader(
  page: Page,
  codigoModular: string,
): Promise<number> {
  const select = page.locator('#tenant-ie-select');
  await expect(select).toBeVisible({ timeout: 15_000 });
  const option = select
    .locator('option')
    .filter({ hasText: new RegExp(`${codigoModular}|San Juan Bautista`, 'i') })
    .first();
  await expect(option).toBeAttached({ timeout: 15_000 });
  const value = await option.getAttribute('value');
  expect(value, `opción IE seed (${codigoModular}) en header`).toBeTruthy();
  const ieId = Number(value);
  await select.selectOption(value!);
  await expect(select).toHaveValue(value!, { timeout: 10_000 });
  await expect(page.getByText('Contexto activo:').first()).toBeVisible({ timeout: 15_000 });
  cachedDefaultInstitutionId = ieId;
  return ieId;
}

async function tryLoadInstitutionOptionsInHeader(
  page: Page,
  timeoutMs = 15_000,
): Promise<boolean> {
  const select = page.locator('#tenant-ie-select');
  await page
    .waitForResponse(
      (res) => res.url().includes('/institution-directory') && res.ok(),
      { timeout: timeoutMs },
    )
    .catch(() => undefined);
  return (await select.locator('option').count()) > 1;
}

async function activateInstitutionViaStorage(
  page: Page,
  institutionId: number,
): Promise<void> {
  await page.evaluate(
    ({ key, id }) => localStorage.setItem(key, String(id)),
    { key: TENANT_INSTITUTION_STORAGE_KEY, id: institutionId },
  );
  await page.reload();
  await gotoAppRoute(page, '/dashboard');
  await expect(page.getByText('Contexto activo:').first()).toBeVisible({ timeout: 20_000 });
}

export async function loginAsSiagieWithInstitution(
  page: Page,
  request: APIRequestContext,
  institutionId?: number,
): Promise<number> {
  const select = page.locator('#tenant-ie-select');
  if (await select.isVisible().catch(() => false)) {
    const current = await select.inputValue();
    if (current && current !== '') {
      const currentId = Number(current);
      if (!institutionId || institutionId === currentId) {
        cachedDefaultInstitutionId = currentId;
        await expect(page.getByText('Contexto activo:').first()).toBeVisible({ timeout: 5_000 });
        return currentId;
      }
    }
  }

  await loginAsSiagie(page);
  await gotoAppRoute(page, '/dashboard');

  if (await tryLoadInstitutionOptionsInHeader(page, 25_000)) {
    if (institutionId != null) {
      await selectInstitutionInHeader(page, institutionId);
      cachedDefaultInstitutionId = institutionId;
      return institutionId;
    }
    return selectInstitutionByCodigoModularInHeader(page, IE_CODIGO_SAN_JUAN);
  }

  const fallbackId = institutionId ?? (await resolveDefaultInstitutionId(request));
  await activateInstitutionViaStorage(page, fallbackId);
  cachedDefaultInstitutionId = fallbackId;
  return fallbackId;
}



export async function expectSiagieStaffNavVisible(page: Page): Promise<void> {

  const nav = page.locator('aside nav, app-sidebar nav, nav').first();

  for (const label of SIAGIE_STAFF_NAV_ROOTS) {

    await expect(nav.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 10_000 });

  }

}



/** Navega a una ruta staff y verifica título, permisos y backend. */

export async function expectSiagieRouteAccessible(page: Page, spec: SiagieStaffRouteSpec): Promise<void> {

  await gotoAppRoute(page, spec.route);

  await expect(page.getByRole('heading', { name: spec.heading }).first()).toBeVisible({

    timeout: 25_000,

  });

  await expect(page.getByRole('heading', { name: 'Acceso Denegado' })).toHaveCount(0);

  await expect(page.getByText(/^403$/)).toHaveCount(0);

  await expect(page.getByText(/backend esté en ejecución|puerto 3000/i)).toHaveCount(0);

}


