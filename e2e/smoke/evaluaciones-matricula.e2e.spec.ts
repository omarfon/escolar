import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoAppRoute } from '../helpers/routing.helper';

test('módulo de evaluaciones de matrícula carga contexto y listado', async ({ page }) => {
  await loginAsAdmin(page);
  await gotoAppRoute(page, '/matricula/evaluaciones');
  await expect(page.locator('h2', { hasText: 'Evaluaciones de matrícula' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evaluaciones registradas' })).toBeVisible();
});
