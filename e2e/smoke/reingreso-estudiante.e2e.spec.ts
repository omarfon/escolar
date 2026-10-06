import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoAppRoute } from '../helpers/routing.helper';

test('módulo de reingreso carga contexto y listado', async ({ page }) => {
  await loginAsAdmin(page);
  await gotoAppRoute(page, '/matricula/reingreso');
  await expect(page.locator('h2', { hasText: 'Registrar reingreso del estudiante' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reingresos registrados' })).toBeVisible();
});
