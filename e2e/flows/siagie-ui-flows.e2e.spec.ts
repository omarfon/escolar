import { test, expect } from '@playwright/test';
import { gotoAppRoute } from '../helpers/routing.helper';
import {
  acceptDialog,
  expectBitacoraContains,
  expectFormValidationBlocked,
  feriadoFechaUnica,
  uniqueLetras,
  uniqueSuffix,
  waitForAuditFlush,
} from '../helpers/crud-audit.helper';
import {
  createSalonMaestro,
  ensureAnioEscolarActivo,
  ensureInstitutionAnioEscolarCoherente,
} from '../helpers/maestros-setup.helper';
import {
  fillAngularDate,
  fillAngularInput,
  fillDocenteMinimo,
} from '../helpers/maestros-form.helper';
import { fillEstudianteMinimo, submitEstudianteNuevo } from '../helpers/estudiante-form.helper';
import {
  loginAsSiagie,
  loginAsSiagieWithInstitution,
  expectSiagieStaffNavVisible,
  expectSiagieRouteAccessible,
  getSiagieDefaultInstitutionId,
  SIAGIE_STAFF_ROUTE_GROUPS,
} from '../helpers/siagie.helper';
import { loginApi } from '../helpers/tenant.helper';

const anioEscolar = new Date().getFullYear();

test.describe.configure({ mode: 'serial' });

test.describe('SIAGIE — navegación, CRUD, validación y auditoría', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe('Menú y rutas permitidas', () => {
    test.describe('con IE activa', () => {
      test.beforeEach(async ({ page, request }) => {
        await loginAsSiagieWithInstitution(page, request);
      });

      test('ve módulos staff incl. Instituciones (solo SIAGIE)', async ({ page }) => {
      await gotoAppRoute(page, '/dashboard');
      await expectSiagieStaffNavVisible(page);
      await expect(page.locator('aside nav, app-sidebar nav, nav').first().getByText('Instituciones')).toBeVisible();
    });

      test('smoke — todas las áreas staff', async ({ page }) => {
        const total = Object.values(SIAGIE_STAFF_ROUTE_GROUPS).reduce((n, r) => n + r.length, 0);
        expect(total).toBeGreaterThan(60);
        for (const routes of Object.values(SIAGIE_STAFF_ROUTE_GROUPS)) {
          for (const spec of routes) {
            await expectSiagieRouteAccessible(page, spec);
          }
        }
      });
    });

  });

  test.describe('Operaciones por área', () => {
    test.beforeEach(async ({ page, request }) => {
      await loginAsSiagieWithInstitution(page, request);
    });

  test.describe('Maestros — Cursos (CRUD)', () => {
    test('valida, crea, edita y desactiva curso', async ({ page }) => {
      const nombre = `Siagie Curso ${uniqueSuffix()}`;
      const nombreEditado = `${nombre} Mod`;
      const area = `Area ${uniqueLetras(4)}`;

      await gotoAppRoute(page, '/maestros/cursos');
      await expect(page.locator('h3', { hasText: 'Cursos' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo curso/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo curso' })).toBeVisible();
      await expectFormValidationBlocked(page, /^Crear$/);

      const modal = page.locator('.bg-white.rounded-2xl');
      await modal.getByPlaceholder('Ej. Matemática').fill(nombre);
      await modal.getByPlaceholder('Ej. Comunicación').fill(area);
      await modal
        .locator('label.form-label')
        .filter({ hasText: /^Horas semanales/ })
        .locator('..')
        .locator('input')
        .fill('3');
      await modal.getByRole('button', { name: '1°', exact: true }).click();
      await modal.getByRole('button', { name: /^Crear$/ }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo curso' })).toBeHidden({
        timeout: 15_000,
      });
      await expect(page.locator('table tbody').getByText(nombre)).toBeVisible();

      await page
        .locator('table tbody tr')
        .filter({ hasText: nombre })
        .getByRole('button', { name: 'Editar' })
        .click();
      await modal.getByPlaceholder('Ej. Matemática').fill(nombreEditado);
      await modal.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.locator('table tbody').getByText(nombreEditado)).toBeVisible({
        timeout: 15_000,
      });

      await acceptDialog(page);
      await page
        .locator('table tbody tr')
        .filter({ hasText: nombreEditado })
        .getByRole('button', { name: 'Desactivar' })
        .click();
      await expect(page.getByText(nombreEditado)).toHaveCount(0, { timeout: 15_000 });
    });
  });

  test.describe('Maestros — Feriados (CRUD + bitácora)', () => {
    test('valida, crea, edita, desactiva y registra auditoría', async ({ page, request }) => {
      const siagie = await loginApi(request, 'siagie');
      await ensureAnioEscolarActivo(
        request,
        { ...siagie, institutionId: getSiagieDefaultInstitutionId() },
        anioEscolar,
      );
      const nombre = `Siagie Feriado ${uniqueSuffix()}`;
      const nombreEditado = `${nombre} Editado`;

      await gotoAppRoute(page, '/maestros/feriados');
      await expect(page.locator('h3', { hasText: 'Feriados' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo feriado/i }).click();
      await expectFormValidationBlocked(page, /^Crear$/);

      const modal = page.locator('.bg-white.rounded-2xl');
      let fechaFeriado = feriadoFechaUnica(anioEscolar);
      await modal.locator('input[type="number"]').fill(String(anioEscolar));
      await modal.locator('input[type="date"]').fill(fechaFeriado);
      await modal.getByPlaceholder('Ej. Fiestas Patrias').fill(nombre);
      await modal.locator('select.form-input').selectOption('institucional');
      await modal.getByPlaceholder('Ej. Fiestas Patrias').press('Tab');

      let createResponse = page.waitForResponse(
        (res) => res.url().includes('/maestros/feriados') && res.request().method() === 'POST',
      );
      await modal.getByRole('button', { name: /^Crear$/ }).click();
      let response = await createResponse;
      for (let intento = 0; !response.ok() && intento < 4; intento++) {
        fechaFeriado = feriadoFechaUnica(anioEscolar);
        await modal.locator('input[type="date"]').fill(fechaFeriado);
        createResponse = page.waitForResponse(
          (res) => res.url().includes('/maestros/feriados') && res.request().method() === 'POST',
        );
        await modal.getByRole('button', { name: /^Crear$/ }).click();
        response = await createResponse;
      }
      expect(response.ok()).toBeTruthy();
      await expect(page.getByRole('heading', { name: /Nuevo feriado/i })).toBeHidden({
        timeout: 15_000,
      });
      await expect(page.locator('table tbody').getByText(nombre)).toBeVisible({ timeout: 15_000 });

      await page
        .locator('table tbody tr')
        .filter({ hasText: nombre })
        .getByRole('button', { name: 'Editar' })
        .click();
      await modal.getByPlaceholder('Ej. Fiestas Patrias').fill(nombreEditado);
      await modal.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.locator('table tbody').getByText(nombreEditado)).toBeVisible({
        timeout: 15_000,
      });

      await acceptDialog(page);
      await page
        .locator('table tbody tr')
        .filter({ hasText: nombreEditado })
        .getByRole('button', { name: 'Desactivar' })
        .click();
      await expect(page.getByText(nombreEditado)).toHaveCount(0, { timeout: 15_000 });

      await waitForAuditFlush(page);
      await expectBitacoraContains(page, 'feriado');
    });
  });

  test.describe('Matrícula — validación de formularios', () => {
    test('retiro no registra sin estudiante', async ({ page }) => {
      await gotoAppRoute(page, '/matricula/retiro');
      await expect(page.locator('h2', { hasText: 'Registrar retiro del estudiante' })).toBeVisible();
      await page.getByRole('button', { name: /Registrar retiro/i }).click();
      await expect(page.getByText(/Registrado correctamente|retiro registrado/i)).toHaveCount(0);
    });

    test('reingreso exige datos obligatorios', async ({ page }) => {
      await gotoAppRoute(page, '/matricula/reingreso');
      await expect(page.locator('h2', { hasText: 'Registrar reingreso del estudiante' })).toBeVisible();
      await expectFormValidationBlocked(page, /Registrar reingreso/i);
    });

    test('evaluaciones de matrícula exigen datos obligatorios', async ({ page }) => {
      await gotoAppRoute(page, '/matricula/evaluaciones');
      await expect(page.locator('h2', { hasText: 'Evaluaciones de matrícula' })).toBeVisible();
      await expectFormValidationBlocked(page, /Registrar evaluación/i);
    });
  });

  test.describe('Evaluación — carga de contexto', () => {
    test('notas y promedios cargan sin error de backend', async ({ page }) => {
      await gotoAppRoute(page, '/evaluacion/notas');
      await expect(
        page.getByRole('heading', { name: /Registro de Notas/i }).first(),
      ).toBeVisible({ timeout: 20_000 });
      const errorBackend = page.getByText(/backend esté en ejecución|puerto 3000/i);
      const tabla = page.locator('table tbody tr').first();
      const sinAulas = page.getByText(/No hay currícula|No hay aulas|aulas/i);
      await expect(errorBackend.or(tabla).or(sinAulas).first()).toBeVisible({ timeout: 30_000 });
      await expect(errorBackend).toHaveCount(0);

      await gotoAppRoute(page, '/evaluacion/promedios');
      await expect(
        page.getByRole('heading', { name: /Cálculo de Promedios|Promedios/i }).first(),
      ).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/backend esté en ejecución|puerto 3000/i)).toHaveCount(0);
    });
  });

  test.describe('Maestros — Plan de estudios (áreas)', () => {
    test('valida, registra y desactiva área curricular', async ({ page }) => {
      const nombre = `Area SIAGIE ${uniqueLetras(5)}`;

      await gotoAppRoute(page, '/maestros/plan-estudios-areas');
      await expect(page.locator('h3', { hasText: 'Plan de estudios — Áreas' })).toBeVisible();
      await expect(page.getByText(/Currícula vigente|No hay currícula vigente/i)).toBeVisible({
        timeout: 20_000,
      });
      const nuevaArea = page.getByRole('button', { name: /Nueva área|Registrar primera área/i }).first();
      if (!(await nuevaArea.isEnabled())) {
        await expect(page.getByText(/No hay currícula vigente/i)).toBeVisible();
        return;
      }
      await nuevaArea.click();
      await expect(page.getByRole('heading', { name: 'Nueva área curricular' })).toBeVisible();
      await expectFormValidationBlocked(page, /^Registrar$/);

      const modal = page.locator('[role="dialog"]').first();
      await modal.getByPlaceholder('Ej. Matemática').fill(nombre);
      await modal.locator('input[type="number"]').fill('1');
      await expect(modal.getByRole('button', { name: /^Registrar$/ })).toBeEnabled({ timeout: 10_000 });
      await modal.getByRole('button', { name: /^Registrar$/ }).click();
      await expect(page.getByRole('heading', { name: 'Nueva área curricular' })).toBeHidden({
        timeout: 15_000,
      });
      await expect(page.locator('table tbody').getByText(nombre)).toBeVisible();

      await page
        .locator('table tbody tr')
        .filter({ hasText: nombre })
        .getByRole('button', { name: 'Desactivar' })
        .click();
      await page.locator('[role="dialog"]').filter({ hasText: 'Desactivar área' }).locator('textarea').fill('Cese por prueba E2E SIAGIE');
      await page.getByRole('button', { name: /Confirmar cese/i }).click();
      await expect(page.getByText(nombre)).toHaveCount(0, { timeout: 15_000 });
    });
  });

  test.describe('Maestros — Docentes', () => {
    test('valida, crea, edita y desactiva docente', async ({ page }) => {
      const nombres = `Ana${uniqueLetras(3)}`;
      const apellidos = `SiagieDoc${uniqueLetras(4)}`;
      const dni = `${String(Date.now()).slice(-8)}`;
      const email = `siagie.doc.${uniqueSuffix()}@e2e.test`;
      const apellidosEdit = `${apellidos} Mod`;

      await gotoAppRoute(page, '/maestros/docentes');
      await expect(page.locator('h3', { hasText: 'Docentes' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo docente/i }).click();
      await expectFormValidationBlocked(page, /^Guardar$/);

      await fillDocenteMinimo(page, {
        nombres,
        apellidos,
        dni,
        email,
        password: 'Test1234!',
      });
      const modalDocente = page.locator('.card.max-w-2xl').filter({
        has: page.getByRole('heading', { name: 'Nuevo docente' }),
      });
      await modalDocente.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo docente' })).toBeHidden({ timeout: 20_000 });

      await page.getByPlaceholder(/Nombre, apellido, DNI/i).fill(dni);
      await page.getByRole('button', { name: /Buscar/i }).click();
      await expect(page.locator('table tbody').getByText(nombres).first()).toBeVisible({ timeout: 15_000 });

      await page.locator('table tbody tr').filter({ hasText: dni }).getByRole('button', { name: 'edit' }).click();
      await page
        .locator('.card.max-w-2xl')
        .filter({ has: page.getByRole('heading', { name: 'Editar docente' }) })
        .locator('label.form-label')
        .filter({ hasText: /^Apellidos/ })
        .locator('..')
        .locator('input')
        .fill(apellidosEdit);
      await page.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.getByRole('heading', { name: 'Editar docente' })).toBeHidden({ timeout: 15_000 });

      await acceptDialog(page);
      await page.locator('table tbody tr').filter({ hasText: dni }).getByRole('button', { name: 'person_off' }).click();
      await page.getByPlaceholder(/Nombre, apellido, DNI/i).fill(dni);
      await page.getByRole('button', { name: /Buscar/i }).click();
      await expect(page.locator('table tbody tr').filter({ hasText: dni })).toContainText('inactivo', {
        timeout: 15_000,
      });
    });
  });

  test.describe('Maestros — Salones', () => {
    test('valida formulario y edita aforo de salón existente', async ({ page, request }) => {
      const siagie = await loginApi(request, 'siagie');
      const session = { ...siagie, institutionId: getSiagieDefaultInstitutionId() };
      await ensureAnioEscolarActivo(request, session, anioEscolar);
      const seccion = `S${uniqueSuffix()}`;
      await createSalonMaestro(request, session, {
        anioEscolar,
        nivel: 'Primaria',
        grado: '1',
        seccion,
        aforo: 28,
      });

      await gotoAppRoute(page, '/maestros/salones');
      await expect(page.locator('h3', { hasText: 'Salones' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo salón/i }).click();
      await expectFormValidationBlocked(page, /^Crear salón$/);
      await page.locator('.max-w-xl.bg-white').getByRole('button', { name: /^Cancelar$/ }).click();

      const row = page.locator('table tbody tr').filter({ hasText: seccion });
      await expect(row).toBeVisible({ timeout: 15_000 });
      const aforoActual = (await row.locator('td').nth(3).innerText()).trim();
      const aforoNuevo = String(Number(aforoActual) + 1);

      await row.getByRole('button', { name: /Aforo/i }).click();
      await row.locator('input[type="number"]').fill(aforoNuevo);
      await row.getByRole('button', { name: 'Guardar' }).click();
      await expect(row.locator('td').nth(3)).toContainText(aforoNuevo, { timeout: 15_000 });

      await row.getByRole('button', { name: /Aforo/i }).click();
      await row.locator('input[type="number"]').fill(aforoActual);
      await row.getByRole('button', { name: 'Guardar' }).click();
      await expect(row.locator('td').nth(3)).toContainText(aforoActual, { timeout: 15_000 });
    });
  });

  test.describe('Maestros — Eventos', () => {
    test('valida, crea evento global y lo cancela', async ({ page }) => {
      const titulo = `Siagie Evento ${uniqueSuffix()}`;
      const fecha = `${anioEscolar}-${String(3 + (Date.now() % 8)).padStart(2, '0')}-${String(10 + (Date.now() % 15)).padStart(2, '0')}`;

      await gotoAppRoute(page, '/maestros/eventos');
      await expect(page.locator('h3', { hasText: 'Eventos escolares' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo evento/i }).click();
      const drawer = page.locator('.fixed.right-0').filter({
        has: page.getByRole('heading', { name: 'Nuevo evento' }),
      });
      await expect(drawer).toBeVisible();
      await expectFormValidationBlocked(page, /Crear evento/i);

      await drawer.locator('label.form-label').filter({ hasText: /^Tipo/ }).locator('..').locator('select').selectOption({ index: 1 });
      await fillAngularInput(
        drawer.locator('label.form-label').filter({ hasText: /^Título/ }).locator('..').locator('input'),
        titulo,
      );
      await drawer.getByRole('button', { name: 'Global' }).click();
      await fillAngularDate(
        drawer.locator('label.form-label').filter({ hasText: /^Fecha inicio/ }).locator('..').locator('input[type="date"]'),
        fecha,
      );
      await drawer.getByRole('button', { name: /Crear evento/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo evento' })).toBeHidden({ timeout: 20_000 });
      await expect(page.getByText(titulo).first()).toBeVisible({ timeout: 15_000 });

      const filaEvento = page.locator('tr').filter({ hasText: titulo });
      await filaEvento.locator('select').selectOption({ label: 'Cancelado' });
      await expect(filaEvento.locator('select')).toContainText('Cancelado', { timeout: 15_000 });
    });
  });

  test.describe('Estudiantes — Expedientes', () => {
    test('valida, crea y localiza estudiante en listado', async ({ page, request }) => {
      const siagie = await loginApi(request, 'siagie');
      const session = { ...siagie, institutionId: getSiagieDefaultInstitutionId() };
      const anioInst = await ensureInstitutionAnioEscolarCoherente(request, session, anioEscolar);
      const dni = `${String(Date.now()).slice(-8)}`;
      const nombres = `Siagie${uniqueLetras(3)}`;
      const apellidos = `Alumno${uniqueLetras(4)}`;

      await gotoAppRoute(page, '/estudiantes/expedientes');
      await page.getByRole('button', { name: /Nuevo Estudiante/i }).click();
      await expectFormValidationBlocked(page, /Registrar estudiante/i);

      await fillEstudianteMinimo(page, { nombres, apellidos, dni, anioEscolar: anioInst });
      await submitEstudianteNuevo(page);
      await expect(page.locator('h3', { hasText: 'Nuevo Estudiante' })).toBeHidden({ timeout: 20_000 });

      await page.getByPlaceholder('Buscar por nombre, DNI o codigo...').fill(dni);
      await expect(page.getByText(nombres).first()).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('Matrícula — Nueva matrícula', () => {
    test('wizard completa matrícula con estudiante nuevo', async ({ page, request }) => {
      test.setTimeout(120_000);
      const siagie = await loginApi(request, 'siagie');
      const session = { ...siagie, institutionId: getSiagieDefaultInstitutionId() };
      await ensureInstitutionAnioEscolarCoherente(request, session, anioEscolar);

      const dniAlumno = `${String(Date.now()).slice(-8)}`;
      const nombres = `Diego${uniqueLetras(2)}`;
      const apellidoPaterno = 'Quispe';
      const apellidoMaterno = 'Mamani';

      await gotoAppRoute(page, '/matricula/nueva');
      await expect(page.locator('h2', { hasText: 'Nueva Matrícula' })).toBeVisible();

      await fillAngularInput(page.getByPlaceholder('Ej: Juan Carlos'), nombres);
      await fillAngularInput(page.getByPlaceholder('Ej: García'), apellidoPaterno);
      await fillAngularInput(page.getByPlaceholder('Ej: Pérez'), apellidoMaterno);
      await fillAngularInput(page.locator('input[inputmode="numeric"]').first(), dniAlumno);
      await fillAngularInput(
        page.getByPlaceholder('Av. / Jr. / Calle, N° de vivienda'),
        'Jr. Los Laureles 456, Surco',
      );
      await page.getByRole('button', { name: 'Siguiente' }).click();
      await expect(page.getByRole('heading', { name: 'Apoderados' })).toBeVisible({ timeout: 15_000 });

      await fillAngularInput(page.getByPlaceholder('Ej: Carlos').first(), 'Roberto');
      await fillAngularInput(page.getByPlaceholder('Ej: Vega').first(), 'Quispe');
      await fillAngularInput(page.getByPlaceholder('Ej: Ramos').first(), 'Flores');
      await fillAngularInput(page.getByPlaceholder('00000000'), `${String(Date.now() + 1).slice(-8)}`);
      await fillAngularInput(page.getByPlaceholder('999 999 999').first(), '987654321');
      await page.getByRole('button', { name: 'Siguiente' }).click();
      await expect(page.getByRole('heading', { name: 'Nivel Educativo y Grado' })).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole('button', { name: '5°', exact: true }).click();
      await page.getByRole('button', { name: 'Siguiente' }).click();
      await expect(page.getByRole('heading', { name: /Documentos/ })).toBeVisible({ timeout: 15_000 });

      const finalizar = page.locator('button.btn-primary').filter({ hasText: 'Finalizar' });
      await finalizar.scrollIntoViewIfNeeded();
      await expect(finalizar).toBeEnabled({ timeout: 15_000 });
      const responsePromise = page.waitForResponse(
        (res) => res.url().includes('/students') && res.request().method() === 'POST',
        { timeout: 45_000 },
      );
      await finalizar.click();
      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();

      await expect(page.getByRole('heading', { name: '¡Matrícula completada!' })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(`${nombres} ${apellidoPaterno} ${apellidoMaterno}`, { exact: true })).toBeVisible();
    });
  });

  test.describe('Maestros — Sedes', () => {
    test('valida, crea, edita y elimina sede', async ({ page }) => {
      const nombre = `Sede SIAGIE ${uniqueSuffix()}`;
      const nombreEdit = `${nombre} Ed`;

      await gotoAppRoute(page, '/maestros/sedes');
      await expect(page.locator('h3', { hasText: 'Sedes por Institución' })).toBeVisible();

      await page.getByRole('button', { name: /Nueva sede/i }).click();
      await expectFormValidationBlocked(page, /^Guardar$/);

      const modal = page.locator('.card.max-w-2xl').filter({
        has: page.getByRole('heading', { name: /^(Nueva sede|Editar sede)$/ }),
      });
      await fillAngularInput(modal.getByPlaceholder('Sede Central'), nombre);
      await modal.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.getByRole('heading', { name: 'Nueva sede' })).toBeHidden({ timeout: 15_000 });
      await expect(page.locator('table tbody').getByText(nombre)).toBeVisible();

      await page.locator('table tbody tr').filter({ hasText: nombre }).getByRole('button', { name: 'Editar' }).click();
      await fillAngularInput(modal.getByPlaceholder('Sede Central'), nombreEdit);
      await modal.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.locator('table tbody').getByText(nombreEdit)).toBeVisible({ timeout: 15_000 });

      await acceptDialog(page);
      const filaSede = page.locator('table tbody tr').filter({ hasText: nombreEdit });
      await filaSede.getByRole('button', { name: 'Eliminar' }).click();
      await expect(filaSede).toHaveCount(0, { timeout: 15_000 });
    });
  });

  test.describe('Administración — Usuarios', () => {
    test('formulario nuevo usuario exige datos obligatorios', async ({ page }) => {
      await gotoAppRoute(page, '/administracion/usuarios');
      await expect(page.locator('h2', { hasText: 'Gestion de Usuarios' })).toBeVisible();
      await page.getByRole('button', { name: /Nuevo Usuario/i }).click();
      await expectFormValidationBlocked(page, /Registrar usuario/i);
    });
  });

  test.describe('Tesorería — Conceptos', () => {
    test('formulario nuevo concepto exige datos obligatorios', async ({ page }) => {
      await gotoAppRoute(page, '/tesoreria/conceptos');
      await expect(page.locator('main').getByRole('heading', { name: /Conceptos de Pago/i })).toBeVisible();
      await page.getByRole('button', { name: /Nuevo Concepto/i }).click();
      await expectFormValidationBlocked(page, /Crear concepto/i);
    });
  });

  test.describe('Comunicaciones — Comunicados', () => {
    test('formulario nuevo comunicado exige datos obligatorios', async ({ page }) => {
      await gotoAppRoute(page, '/comunicaciones/comunicados');
      await expect(page.locator('main h2', { hasText: 'Comunicados' })).toBeVisible();
      await page.getByRole('button', { name: /Nuevo Comunicado/i }).click();
      await expectFormValidationBlocked(page, /Crear comunicado/i);
    });
  });

  });

  test('sin IE activa: maestros/cursos muestra aviso y tabla vacía', async ({ page }) => {
    await loginAsSiagie(page);
    await gotoAppRoute(page, '/maestros/cursos');
    await expect(
      page.getByText('Seleccione una institución educativa en la barra superior'),
    ).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(0);
  });
});
