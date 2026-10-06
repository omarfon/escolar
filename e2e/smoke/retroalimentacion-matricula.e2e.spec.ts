import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoAppRoute } from '../helpers/routing.helper';

test('módulo de retroalimentación carga contexto y listado', async ({ page }) => {
  await loginAsAdmin(page);
  await gotoAppRoute(page, '/matricula/retroalimentacion');
  await expect(page.locator('h2', { hasText: 'Retroalimentación de matrícula' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Retroalimentaciones registradas' })).toBeVisible();
});
