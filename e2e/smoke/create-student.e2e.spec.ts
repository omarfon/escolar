import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoAppRoute } from '../helpers/routing.helper';
import { fillEstudianteMinimo, submitEstudianteNuevo } from '../helpers/estudiante-form.helper';
import { resolveAnioEscolarInstitucion } from '../helpers/maestros-setup.helper';
import { loginApi } from '../helpers/tenant.helper';

test('crear nuevo estudiante desde expedientes', async ({ page, request }) => {
  const admin = await loginApi(request, 'admin');
  const anioInst = await resolveAnioEscolarInstitucion(request, admin);
  const dni = `${String(Date.now()).slice(-8)}`;
  const nombres = 'Lucia';
  const apellidos = 'Vega Salazar';

  await loginAsAdmin(page);
  await gotoAppRoute(page, '/estudiantes/expedientes');
  await page.getByRole('button', { name: /Nuevo Estudiante/i }).click();
  await expect(page.locator('h3', { hasText: 'Nuevo Estudiante' })).toBeVisible();

  await fillEstudianteMinimo(page, { nombres, apellidos, dni, anioEscolar: anioInst });
  await submitEstudianteNuevo(page);

  await expect(page.locator('h3', { hasText: 'Nuevo Estudiante' })).toBeHidden({
    timeout: 15_000,
  });

  await page.getByPlaceholder('Buscar por nombre, DNI o codigo...').fill(apellidos);
  await expect(page.getByText(nombres).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(dni).first()).toBeVisible();
});
