import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoAppRoute } from '../helpers/routing.helper';
import {
  acceptDialog,
  expectFormValidationBlocked,
  uniqueLetras,
  uniqueSuffix,
} from '../helpers/crud-audit.helper';
import { fillAngularDate, fillAngularInput, fillSalonMinimo, selectAngularOption } from '../helpers/maestros-form.helper';
import {
  ensureAnioEscolarActivo,
  resolveFechaDiaClaseAsistencia,
  resolvePeriodoCreacionE2E,
  setAsistenciaRegistroFecha,
} from '../helpers/maestros-setup.helper';
import { loginApi } from '../helpers/tenant.helper';

const anioEscolar = new Date().getFullYear();

test.describe('Módulos adicionales — CRUD, validación y operación', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Maestros — Sedes', () => {
    test('valida, crea, edita y elimina sede', async ({ page }) => {
      const nombre = `Sede E2E ${uniqueSuffix()}`;
      const nombreEdit = `Sede E2E ${uniqueSuffix()} Ed`;

      await gotoAppRoute(page, '/maestros/sedes');
      await expect(page.locator('h3', { hasText: 'Sedes por Institución' })).toBeVisible();

      await page.getByRole('button', { name: /Nueva sede/i }).click();
      await expect(page.getByRole('heading', { name: 'Nueva sede' })).toBeVisible();
      await expectFormValidationBlocked(page, /^Guardar$/);

      const modal = page.locator('.card.max-w-2xl').filter({
        has: page.getByRole('heading', { name: /^(Nueva sede|Editar sede)$/ }),
      });
      await fillAngularInput(modal.getByPlaceholder('Sede Central'), nombre);
      await expect(modal.getByRole('button', { name: /^Guardar$/ })).toBeEnabled({ timeout: 5_000 });
      await modal.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.getByRole('heading', { name: 'Nueva sede' })).toBeHidden({ timeout: 15_000 });
      await expect(page.locator('table tbody').getByText(nombre)).toBeVisible();

      await page.locator('table tbody tr').filter({ hasText: nombre }).getByRole('button', { name: 'Editar' }).click();
      await expect(page.getByRole('heading', { name: 'Editar sede' })).toBeVisible();
      await fillAngularInput(modal.getByPlaceholder('Sede Central'), nombreEdit);
      await expect(modal.getByRole('button', { name: /^Guardar$/ })).toBeEnabled();
      await modal.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.getByRole('heading', { name: 'Editar sede' })).toBeHidden({ timeout: 15_000 });
      await expect(page.locator('table tbody').getByText(nombreEdit)).toBeVisible({ timeout: 15_000 });

      await acceptDialog(page);
      await page.locator('table tbody tr').filter({ hasText: nombreEdit }).getByRole('button', { name: 'Eliminar' }).click();
      await expect(page.getByText(nombreEdit)).toHaveCount(0, { timeout: 15_000 });
    });
  });

  test.describe('Maestros — Períodos académicos', () => {
    test('valida, crea, edita y elimina período', async ({ page, request }) => {
      const admin = await loginApi(request, 'admin');
      const slot = await resolvePeriodoCreacionE2E(request, admin, anioEscolar);

      const nombre = `Periodo E2E ${uniqueSuffix()}`;
      const nombreEdit = `Periodo E2E ${uniqueSuffix()} Ed`;

      await gotoAppRoute(page, '/maestros/periodos-academicos');
      await expect(page.locator('h3', { hasText: 'Períodos Académicos' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo período/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo período académico' })).toBeVisible();
      await expectFormValidationBlocked(page, /^Crear$/);

      const modal = page.locator('aside[aria-labelledby="tituloPeriodoForm"]');
      const fillPeriodoForm = async () => {
        await fillAngularInput(
          modal.locator('label.form-label').filter({ hasText: /^Año escolar/ }).locator('..').locator('input'),
          String(slot.anioEscolar),
        );
        await fillAngularInput(
          modal.locator('label.form-label').filter({ hasText: /^Número/ }).locator('..').locator('input'),
          String(slot.numero),
        );
        await fillAngularInput(modal.getByPlaceholder('Ej. Primer Bimestre'), nombre);
        await selectAngularOption(
          modal.locator('label.form-label').filter({ hasText: /^Tipo/ }).locator('..').locator('select'),
          'bimestre',
        );
        await fillAngularDate(
          modal.locator('label.form-label').filter({ hasText: /^Inicio/ }).locator('..').locator('input[type="date"]'),
          slot.inicio,
        );
        await fillAngularDate(
          modal.locator('label.form-label').filter({ hasText: /^Fin/ }).locator('..').locator('input[type="date"]'),
          slot.fin,
        );
      };

      await fillPeriodoForm();
      await expect(modal.getByRole('button', { name: /^Crear$/ })).toBeEnabled({ timeout: 10_000 });
      const createResponse = page.waitForResponse(
        (res) => res.url().includes('/maestros/periodos-academicos') && res.request().method() === 'POST',
      );
      await modal.getByRole('button', { name: /^Crear$/ }).click();
      const response = await createResponse;
      expect(response.ok()).toBeTruthy();
      await expect(page.getByRole('heading', { name: 'Nuevo período académico' })).toBeHidden({ timeout: 15_000 });

      const filtroAnio = page
        .locator('label.form-label')
        .filter({ hasText: /^Año escolar/ })
        .locator('..')
        .locator('select.form-select');
      await selectAngularOption(filtroAnio, String(slot.anioEscolar));
      await expect(page.locator('table tbody').getByText(nombre)).toBeVisible({ timeout: 15_000 });

      await page.locator('table tbody tr').filter({ hasText: nombre }).getByTitle('Editar').click();
      await fillAngularInput(modal.getByPlaceholder('Ej. Primer Bimestre'), nombreEdit);
      await modal.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.locator('table tbody').getByText(nombreEdit)).toBeVisible({ timeout: 15_000 });

      await acceptDialog(page);
      await page.locator('table tbody tr').filter({ hasText: nombreEdit }).getByTitle('Eliminar').click();
      await expect(page.getByText(nombreEdit)).toHaveCount(0, { timeout: 15_000 });
    });
  });

  test.describe('Maestros — Faltas y reconocimientos', () => {
    test('valida, crea y elimina tipo de conducta', async ({ page }) => {
      const nombre = `Tipo E2E ${uniqueLetras(4)}`;

      await gotoAppRoute(page, '/maestros/faltas-reconocimientos');
      await expect(page.locator('h3', { hasText: 'Faltas y Reconocimientos' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo tipo/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo tipo' })).toBeVisible();
      await expectFormValidationBlocked(page, /^Guardar$/);

      const modal = page.locator('.card.max-w-md').filter({
        has: page.getByRole('heading', { name: 'Nuevo tipo' }),
      });
      await fillAngularInput(modal.getByPlaceholder('Ej. Falta Leve'), nombre);
      await modal.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo tipo' })).toBeHidden({ timeout: 15_000 });
      await expect(page.getByText(nombre, { exact: true })).toBeVisible();

      await acceptDialog(page);
      await page
        .locator('.divide-y > div')
        .filter({ hasText: nombre })
        .getByTitle('Eliminar')
        .click();
      await expect(page.getByText(nombre, { exact: true })).toHaveCount(0, { timeout: 15_000 });
    });
  });

  test.describe('Maestros — Eventos', () => {
    test('valida, crea evento global y lo cancela', async ({ page }) => {
      const titulo = `Evento E2E ${uniqueSuffix()}`;
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

  test.describe('Administración — Roles', () => {
    test('edita permisos de rol Docente y revisa auditoría RBAC', async ({ page }) => {
      const rolNombre = `Rol E2E ${uniqueSuffix()}`;

      await gotoAppRoute(page, '/administracion/roles');
      await expect(page.locator('h2', { hasText: 'Roles' })).toBeVisible();

      await page.getByRole('button', { name: 'Nuevo rol' }).click();
      const crearPanel = page.locator('.w-72 .card').filter({ hasText: 'Rol de esta sede' });
      await crearPanel.getByPlaceholder('Nombre, ej. Secretaría').fill(rolNombre);
      await crearPanel.getByPlaceholder('Descripción').fill('Rol temporal para prueba E2E');
      await crearPanel.locator('select[name="nuevoBasadoEn"]').selectOption('DOCENTE');
      await crearPanel.getByRole('button', { name: /^Crear$/ }).click();
      await expect(page.locator('.w-72 button.card').filter({ hasText: rolNombre })).toBeVisible({
        timeout: 15_000,
      });

      const rolCard = page.locator('.w-72 button.card').filter({ hasText: rolNombre });
      await rolCard.click();
      await expect(page.getByRole('heading', { name: rolNombre, level: 3 })).toBeVisible();
      const permisoEditable = page.locator('input[type="checkbox"]:not(:disabled)').first();
      await expect(permisoEditable).toBeVisible({ timeout: 10_000 });
      if (await permisoEditable.isChecked()) {
        await permisoEditable.click();
      } else {
        await permisoEditable.check();
      }
      await expect(page.getByRole('button', { name: 'Guardar' })).toBeEnabled({ timeout: 5_000 });
      await page.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText(new RegExp(`Permisos guardados para ${rolNombre}`, 'i'))).toBeVisible({ timeout: 15_000 });

      await page.getByRole('button', { name: 'Auditoría RBAC' }).click();
      await expect(
        page.getByText(/Sin eventos RBAC registrados|Permisos de rol|Asignación usuario/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('Asistencia — Registro', () => {
    test('valida filtros y carga alumnos para registrar', async ({ page, request }) => {
      const admin = await loginApi(request, 'admin');
      await ensureAnioEscolarActivo(request, admin, anioEscolar);
      const fechaClase = await resolveFechaDiaClaseAsistencia(request, admin);

      await gotoAppRoute(page, '/asistencia/registro');
      await expect(page.locator('h2', { hasText: 'Registro Diario de Asistencia' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Guardar/i })).toBeDisabled();

      const nivelSelect = page.locator('label.form-label').filter({ hasText: /^Nivel$/ }).locator('..').locator('select');
      await expect(nivelSelect.locator('option')).not.toHaveCount(1, { timeout: 15_000 });
      await selectAngularOption(nivelSelect, 'Primaria');

      const gradoSelect = page.locator('label.form-label').filter({ hasText: /^Grado$/ }).locator('..').locator('select');
      await expect(gradoSelect.locator('option')).not.toHaveCount(1, { timeout: 10_000 });
      const gradoValue = await gradoSelect.locator('option').nth(1).getAttribute('value');
      if (gradoValue) await selectAngularOption(gradoSelect, gradoValue);

      const seccionSelect = page.locator('label.form-label').filter({ hasText: /^Sección$/ }).locator('..').locator('select');
      await expect(seccionSelect.locator('option')).not.toHaveCount(1, { timeout: 10_000 });
      const seccionValue = await seccionSelect.locator('option').nth(1).getAttribute('value');
      if (seccionValue) await selectAngularOption(seccionSelect, seccionValue);

      await page.getByRole('button', { name: /Buscar alumnos/i }).click();
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 });

      await setAsistenciaRegistroFecha(page, fechaClase);

      const guardar = page.getByRole('button', { name: /Guardar/i });
      await expect(guardar).toBeEnabled({ timeout: 15_000 });
    });
  });

  test.describe('Evaluación — Notas', () => {
    test('valida selección de aula y bloqueo sin notas', async ({ page }) => {
      await gotoAppRoute(page, '/evaluacion/notas');
      await expect(page.locator('h2', { hasText: 'Registro de Notas' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Guardar notas/i })).toBeDisabled();

      const aulaSelect = page.locator('label.form-label').filter({ hasText: /^Aula$/ }).locator('..').locator('select');
      const optionCount = await aulaSelect.locator('option').count();
      if (optionCount <= 1) {
        await expect(page.getByText(/No hay aulas con alumnos matriculados|Seleccione un aula/i).first()).toBeVisible();
        return;
      }

      await aulaSelect.selectOption({ index: 1 });
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: /Guardar notas/i }).click();
      await expect(page.getByText(/Ingrese al menos una nota/i)).toBeVisible({ timeout: 10_000 });
    });
  });
});
