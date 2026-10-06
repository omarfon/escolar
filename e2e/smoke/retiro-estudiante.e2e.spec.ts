import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoAppRoute } from '../helpers/routing.helper';

test('módulo de retiro carga contexto y listado', async ({ page }) => {
  await loginAsAdmin(page);
  await gotoAppRoute(page, '/matricula/retiro');
  await expect(page.locator('h2', { hasText: 'Registrar retiro del estudiante' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Retiros registrados' })).toBeVisible();
});
