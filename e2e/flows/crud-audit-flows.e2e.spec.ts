import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoAppRoute } from '../helpers/routing.helper';
import {
  acceptDialog,
  expectBitacoraContains,
  expectEstudianteAuditoriaContains,
  expectFormValidationBlocked,
  feriadoFechaUnica,
  uniqueLetras,
  uniqueSuffix,
  waitForAuditFlush,
} from '../helpers/crud-audit.helper';
import { fillEstudianteMinimo, submitEstudianteNuevo } from '../helpers/estudiante-form.helper';
import { ensureAnioEscolarActivo, resolveAnioEscolarInstitucion } from '../helpers/maestros-setup.helper';
import { loginApi } from '../helpers/tenant.helper';

const anioEscolar = new Date().getFullYear();

test.describe('CRUD + validación + auditoría', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Maestros — Feriados', () => {
    test('valida formulario, crea, edita y desactiva feriado', async ({ page, request }) => {
      const admin = await loginApi(request, 'admin');
      await ensureAnioEscolarActivo(request, admin, anioEscolar);

      const nombre = `Prueba Feriado ${uniqueSuffix()}`;
      const nombreEditado = `${nombre} Editado`;

      await gotoAppRoute(page, '/maestros/feriados');
      await expect(page.locator('h3', { hasText: 'Feriados' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo feriado/i }).click();
      await expect(page.getByRole('heading', { name: /Nuevo feriado/i })).toBeVisible();
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

      await page.locator('table tbody tr').filter({ hasText: nombre }).getByRole('button', { name: 'Editar' }).click();
      await modal.getByPlaceholder('Ej. Fiestas Patrias').fill(nombreEditado);
      await modal.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.locator('table tbody').getByText(nombreEditado)).toBeVisible({ timeout: 15_000 });

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

  test.describe('Estudiantes — Expedientes', () => {
    test('valida, crea, edita con motivo de auditoría y elimina estudiante', async ({ page, request }) => {
      const admin = await loginApi(request, 'admin');
      const anioInst = await resolveAnioEscolarInstitucion(request, admin);
      const dni = `${String(Date.now()).slice(-8)}`;
      const nombres = `Lucia${uniqueLetras(3)}`;
      const apellidos = `Prueba${uniqueLetras(4)}`;
      const apellidosEdit = `${apellidos} Mod`;

      await gotoAppRoute(page, '/estudiantes/expedientes');
      await page.getByRole('button', { name: /Nuevo Estudiante/i }).click();
      await expect(page.locator('h3', { hasText: 'Nuevo Estudiante' })).toBeVisible();
      await expectFormValidationBlocked(page, /Registrar estudiante/i);

      await fillEstudianteMinimo(page, { nombres, apellidos, dni, anioEscolar: anioInst });
      await submitEstudianteNuevo(page);
      await expect(page.locator('h3', { hasText: 'Nuevo Estudiante' })).toBeHidden({
        timeout: 20_000,
      });

      await page.getByPlaceholder('Buscar por nombre, DNI o codigo...').fill(dni);
      await expect(page.getByText(nombres).first()).toBeVisible({ timeout: 15_000 });

      await page.locator('table tbody tr').filter({ hasText: dni }).getByRole('button', { name: 'edit' }).click();
      await expect(page.locator('h3', { hasText: 'Editar Estudiante' })).toBeVisible();
      await page.getByPlaceholder('Apellidos').fill(apellidosEdit);
      await page.getByRole('button', { name: /Guardar cambios/i }).click();
      await expect(
        page.getByPlaceholder('Ej: Corrección de domicilio solicitada por apoderado'),
      ).toBeVisible();

      await page
        .getByPlaceholder('Ej: Corrección de domicilio solicitada por apoderado')
        .fill('Corrección registrada en prueba E2E automatizada');
      await page.getByRole('button', { name: /Guardar cambios/i }).click();
      await expect(page.locator('h3', { hasText: 'Editar Estudiante' })).toBeHidden({
        timeout: 20_000,
      });

      await waitForAuditFlush(page);
      await expectEstudianteAuditoriaContains(page, 'Corrección registrada');

      await gotoAppRoute(page, '/estudiantes/expedientes');
      await page.getByPlaceholder('Buscar por nombre, DNI o codigo...').fill(dni);
      await page.locator('table tbody tr').filter({ hasText: dni }).getByRole('button', { name: 'delete_outline' }).click();
      await page.waitForTimeout(1500);
      await page.getByPlaceholder('Buscar por nombre, DNI o codigo...').fill(dni);
      await expect(page.getByText(nombres)).toHaveCount(0, { timeout: 15_000 });
    });
  });

  test.describe('Matrícula SIAGIE — Validación de formularios', () => {
    test('retiro no registra sin estudiante seleccionado', async ({ page }) => {
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

    test('retroalimentación exige selección y campos', async ({ page }) => {
      await gotoAppRoute(page, '/matricula/retroalimentacion');
      await expect(page.locator('h2', { hasText: 'Retroalimentación de matrícula' })).toBeVisible();
      const btn = page.getByRole('button', { name: /Registrar retroalimentación/i });
      if (await btn.isVisible()) {
        await expect(btn).toBeDisabled();
      }
    });

    test('historial de matrícula carga listado paginado', async ({ page }) => {
      await gotoAppRoute(page, '/matricula/historial');
      await expect(page.getByRole('main').getByRole('heading', { name: 'Historial de matrícula' })).toBeVisible();
      await expect(page.getByPlaceholder(/Buscar por nombre, DNI o código/i)).toBeVisible();
    });
  });

  test.describe('Administración — Bitácora', () => {
    test('bitácora carga resumen y listado o estado vacío', async ({ page }) => {
      await gotoAppRoute(page, '/administracion/bitacora');
      await expect(page.locator('h2', { hasText: 'Bitácora del Sistema' })).toBeVisible();
      await page.getByRole('button', { name: 'refresh Actualizar' }).click();
      await expect(page.getByText('Total registros')).toBeVisible();
      await expect(
        page
          .locator('main .divide-y button')
          .first()
          .or(page.getByRole('heading', { name: 'Sin registros' })),
      ).toBeVisible({ timeout: 20_000 });
    });
  });
});
