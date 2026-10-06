import { expect, Page } from '@playwright/test';

export interface EstudianteFormData {
  nombres: string;
  apellidos: string;
  dni: string;
  fechaNac?: string;
  grado?: string;
  /** Año escolar de la IE (campo `institution.anio`); debe coincidir con el backend. */
  anioEscolar?: number;
}

/** Fecha de nacimiento coherente con edad normativa MINEDU (Primaria) al 31/03 del año escolar. */
export function fechaNacNormativaParaGrado(
  grado: string,
  anioEscolar = new Date().getFullYear(),
): string {
  const num = Number.parseInt(grado.match(/(\d+)/)?.[1] ?? '1', 10);
  const edadEsperada = num + 5;
  // Nacimiento en junio: al 31/03 aún no cumple años → restar un año más.
  const year = anioEscolar - edadEsperada - 1;
  return `${year}-06-15`;
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
}

export async function submitEstudianteNuevo(page: Page): Promise<void> {
  const createResponse = page.waitForResponse(
    (res) => res.url().includes('/students') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /Registrar estudiante/i }).click();
  const response = await createResponse;
  expect(response.ok(), `crear estudiante → HTTP ${response.status()}`).toBeTruthy();
}
