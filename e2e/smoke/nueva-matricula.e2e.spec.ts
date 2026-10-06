import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoAppRoute } from '../helpers/routing.helper';
import { fillAngularInput } from '../helpers/maestros-form.helper';

test('crear nueva matricula desde el wizard', async ({ page }) => {
  test.setTimeout(120_000);
  const dniAlumno = `${String(Date.now()).slice(-8)}`;
  const nombres = 'Diego';
  const apellidoPaterno = 'Quispe';
  const apellidoMaterno = 'Mamani';

  await loginAsAdmin(page);
  await gotoAppRoute(page, '/matricula/nueva');
  await expect(page.locator('h2', { hasText: 'Nueva Matrícula' })).toBeVisible();

  // Paso 1: Estudiante
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

  // Paso 2: Apoderado principal
  await fillAngularInput(page.getByPlaceholder('Ej: Carlos').first(), 'Roberto');
  await fillAngularInput(page.getByPlaceholder('Ej: Vega').first(), 'Quispe');
  await fillAngularInput(page.getByPlaceholder('Ej: Ramos').first(), 'Flores');
  await fillAngularInput(page.getByPlaceholder('00000000'), `${String(Date.now() + 1).slice(-8)}`);
  await fillAngularInput(page.getByPlaceholder('999 999 999').first(), '987654321');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Nivel Educativo y Grado' })).toBeVisible({ timeout: 15_000 });

  // Paso 3: Grado (Primaria 5° Sección B)
  await page.getByRole('button', { name: '5°', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('heading', { name: /Documentos/ })).toBeVisible({ timeout: 15_000 });

  // Paso 4: Documentos (opcional) → Finalizar
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

  // Paso 5: Confirmación
  await expect(page.getByRole('heading', { name: '¡Matrícula completada!' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(`${nombres} ${apellidoPaterno} ${apellidoMaterno}`, { exact: true })).toBeVisible();
  await expect(page.getByText(/Código:/)).toBeVisible();
});
