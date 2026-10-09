import { expect, Page } from '@playwright/test';
import { fechaNacNormativaParaGrado } from './enrollment-age.helper';

export interface EstudianteFormData {
  nombres: string;
  apellidos: string;
  dni: string;
  fechaNac?: string;
  grado?: string;
  /** Año escolar de la IE (campo `institution.anio`); debe coincidir con el backend. */
  anioEscolar?: number;
}

export async function fillEstudianteMinimo(page: Page, data: EstudianteFormData): Promise<void> {
  const grado = data.grado ?? '5° Primaria';
  const anioEscolar = data.anioEscolar ?? new Date().getFullYear();
  const fechaNac = data.fechaNac ?? fechaNacNormativaParaGrado(grado, anioEscolar);
  await page.getByPlaceholder('Nombres completos').fill(data.nombres);
  await page.getByPlaceholder('Apellidos').fill(data.apellidos);
  await page.getByPlaceholder('12345678').fill(data.dni);
  await page.locator('input[type="date"]').first().fill(fechaNac);
  await page.locator('label:has-text("Grado")').locator('..').locator('select').selectOption(grado);
  await page.getByPlaceholder('12345678').blur();
}

export async function submitEstudianteNuevo(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /Registrar estudiante/i });
  await expect(btn).toBeEnabled({ timeout: 20_000 });
  const createResponse = page.waitForResponse(
    (res) => res.url().includes('/students') && res.request().method() === 'POST',
  );
  await btn.click();
  const response = await createResponse;
  expect(response.ok(), `crear estudiante → HTTP ${response.status()}`).toBeTruthy();
}
