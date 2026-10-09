import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoAppRoute } from '../helpers/routing.helper';
import {
  acceptDialog,
  expectBitacoraContains,
  expectFormValidationBlocked,
  uniqueLetras,
  uniqueSuffix,
  waitForAuditFlush,
} from '../helpers/crud-audit.helper';
import {
  fillDocenteMinimo,
  fillUsuarioMinimo,
  fillAngularInput,
} from '../helpers/maestros-form.helper';
import { ensureAnioEscolarActivo, createSalonMaestro } from '../helpers/maestros-setup.helper';
import { loginApi } from '../helpers/tenant.helper';

const anioEscolar = new Date().getFullYear();

test.describe('Maestros y administración — CRUD + validación', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Maestros — Cursos', () => {
    test('valida, crea, edita y desactiva curso', async ({ page }) => {
      const nombre = `Curso E2E ${uniqueSuffix()}`;
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
      await modal.locator('label.form-label').filter({ hasText: /^Horas semanales/ }).locator('..').locator('input').fill('3');
      await modal.getByRole('button', { name: '1°', exact: true }).click();
      await modal.getByPlaceholder('Ej. Matemática').press('Tab');

      await modal.getByRole('button', { name: /^Crear$/ }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo curso' })).toBeHidden({ timeout: 15_000 });
      await expect(page.locator('table tbody').getByText(nombre)).toBeVisible();

      await page.locator('table tbody tr').filter({ hasText: nombre }).getByRole('button', { name: 'Editar' }).click();
      await modal.getByPlaceholder('Ej. Matemática').fill(nombreEditado);
      await modal.getByRole('button', { name: /^Guardar$/ }).click();
      await expect(page.locator('table tbody').getByText(nombreEditado)).toBeVisible({ timeout: 15_000 });

      await acceptDialog(page);
      await page
        .locator('table tbody tr')
        .filter({ hasText: nombreEditado })
        .getByRole('button', { name: 'Desactivar' })
        .click();
      await expect(page.getByText(nombreEditado)).toHaveCount(0, { timeout: 15_000 });
    });
  });

  test.describe('Maestros — Docentes', () => {
    test('valida, crea, edita y desactiva docente', async ({ page }) => {
      const nombres = `Ana${uniqueLetras(3)}`;
      const apellidos = `Docente${uniqueLetras(4)}`;
      const dni = `${String(Date.now()).slice(-8)}`;
      const email = `docente.${uniqueSuffix()}@e2e.test`;
      const apellidosEdit = `${apellidos} Mod`;

      await gotoAppRoute(page, '/maestros/docentes');
      await expect(page.locator('h3', { hasText: 'Docentes' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo docente/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo docente' })).toBeVisible();
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
      await expect(page.getByRole('heading', { name: 'Editar docente' })).toBeVisible();
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
      const admin = await loginApi(request, 'admin');
      await ensureAnioEscolarActivo(request, admin, anioEscolar);
      const seccion = `E${uniqueSuffix()}`;
      await createSalonMaestro(request, admin, {
        anioEscolar,
        nivel: 'Primaria',
        grado: '1',
        seccion,
        aforo: 28,
      });

      await gotoAppRoute(page, '/maestros/salones');
      await expect(page.locator('h3', { hasText: 'Salones' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo salón/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo salón' })).toBeVisible();
      await expectFormValidationBlocked(page, /^Crear salón$/);
      await page.locator('.max-w-xl.bg-white').getByRole('button', { name: /^Cancelar$/ }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo salón' })).toBeHidden({ timeout: 10_000 });

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

  test.describe('Maestros — Plan de estudios (áreas)', () => {
    test('valida, registra y desactiva área curricular', async ({ page }) => {
      const nombre = `Area E2E ${uniqueLetras(5)}`;

      await gotoAppRoute(page, '/maestros/plan-estudios-areas');
      await expect(page.locator('h3', { hasText: 'Plan de estudios — Áreas' })).toBeVisible();

      await page.getByRole('button', { name: /Nueva área/i }).click();
      await expect(page.getByRole('heading', { name: 'Nueva área curricular' })).toBeVisible();
      await expectFormValidationBlocked(page, /^Registrar$/);

      const modal = page.locator('[role="dialog"]').first();
      await modal.getByPlaceholder('Ej. Matemática').fill(nombre);
      await modal.locator('input[type="number"]').fill('1');
      await modal.getByPlaceholder('Ej. Matemática').blur();
      await modal.locator('input[type="number"]').blur();
      await expect(modal.getByRole('button', { name: /^Registrar$/ })).toBeEnabled({ timeout: 10_000 });
      await modal.getByRole('button', { name: /^Registrar$/ }).click();
      await expect(page.getByRole('heading', { name: 'Nueva área curricular' })).toBeHidden({ timeout: 15_000 });
      await expect(page.locator('table tbody').getByText(nombre)).toBeVisible();

      await page.locator('table tbody tr').filter({ hasText: nombre }).getByRole('button', { name: 'Desactivar' }).click();
      await page.locator('[role="dialog"]').filter({ hasText: 'Desactivar área' }).locator('textarea').fill('Cese por prueba E2E');
      await page.getByRole('button', { name: /Confirmar cese/i }).click();
      await expect(page.getByText(nombre)).toHaveCount(0, { timeout: 15_000 });
    });
  });

  test.describe('Administración — Usuarios', () => {
    test('valida, crea, edita y elimina usuario', async ({ page }) => {
      const nombres = `Pedro${uniqueLetras(3)}`;
      const apellidos = `Usuario${uniqueLetras(4)}`;
      const dni = `${String(Date.now()).slice(-8)}`;
      const email = `user.${uniqueSuffix()}@e2e.test`;
      const apellidosEdit = `${apellidos} Mod`;

      await gotoAppRoute(page, '/administracion/usuarios');
      await expect(page.locator('h2', { hasText: 'Gestion de Usuarios' })).toBeVisible();

      await page.getByRole('button', { name: /Nuevo Usuario/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo Usuario' })).toBeVisible();
      await expectFormValidationBlocked(page, /Registrar usuario/i);

      await fillUsuarioMinimo(page, { nombres, apellidos, dni, email, password: 'Test1234!' });
      await page.getByRole('button', { name: /Registrar usuario/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo Usuario' })).toBeHidden({ timeout: 20_000 });

      await gotoAppRoute(page, '/administracion/usuarios');
      await fillAngularInput(page.getByPlaceholder('Buscar por nombre, email, DNI...'), email);
      await expect(page.locator('table tbody').getByText(email)).toBeVisible({ timeout: 20_000 });

      await page.locator('table tbody tr').filter({ hasText: email }).getByRole('button', { name: 'edit' }).click();
      await expect(page.getByRole('heading', { name: 'Editar Usuario' })).toBeVisible();
      await page.getByPlaceholder('Ej: Perez Torres').fill(apellidosEdit);
      await page.getByRole('button', { name: /Guardar cambios/i }).click();
      await expect(page.getByRole('heading', { name: 'Editar Usuario' })).toBeHidden({ timeout: 15_000 });

      await waitForAuditFlush(page);
      await expectBitacoraContains(page, 'Usuario');

      await gotoAppRoute(page, '/administracion/usuarios');
      await fillAngularInput(page.getByPlaceholder('Buscar por nombre, email, DNI...'), email);
      await acceptDialog(page);
      await page.locator('table tbody tr').filter({ hasText: email }).getByRole('button', { name: 'delete_outline' }).click();
      await page.waitForTimeout(1500);
      await fillAngularInput(page.getByPlaceholder('Buscar por nombre, email, DNI...'), email);
      await expect(page.getByText(email)).toHaveCount(0, { timeout: 15_000 });
    });
  });
});
