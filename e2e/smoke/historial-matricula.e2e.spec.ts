import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoAppRoute } from '../helpers/routing.helper';

test('módulo de historial de matrícula carga listado', async ({ page }) => {
  await loginAsAdmin(page);
  await gotoAppRoute(page, '/matricula/historial');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Historial de matrícula' })).toBeVisible();
  await expect(page.getByPlaceholder(/Buscar por nombre, DNI o código/i)).toBeVisible();
});
