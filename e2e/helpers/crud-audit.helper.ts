import { expect, Page } from '@playwright/test';
import { gotoAppRoute } from './routing.helper';

export async function expectFormValidationBlocked(
  page: Page,
  submitLabel: RegExp,
): Promise<void> {
  const submit = page.getByRole('button', { name: submitLabel });
  await expect(submit).toBeDisabled();
}

export async function expectFormErrorVisible(page: Page, text: RegExp | string): Promise<void> {
  await expect(page.locator('.form-error, .text-red-600, .text-red-700').filter({ hasText: text }).first()).toBeVisible();
}

export async function acceptDialog(page: Page): Promise<void> {
  page.once('dialog', (dialog) => dialog.accept());
}

export async function openBitacora(page: Page): Promise<void> {
  await gotoAppRoute(page, '/administracion/bitacora');
  await expect(page.locator('h2', { hasText: 'Bitácora del Sistema' })).toBeVisible();
}

export async function openEstudianteAuditoria(page: Page, studentId?: number): Promise<void> {
  const path =
    studentId != null
      ? `/estudiantes/auditoria-cambios?studentId=${studentId}`
      : '/estudiantes/auditoria-cambios';
  await gotoAppRoute(page, path);
  await expect(
    page.locator('h2', { hasText: 'Privacidad y auditoría — Estudiantes' }),
  ).toBeVisible();
}

/** Espera a que la cola de auditoría del backend persista (P2 batch ~200ms). */
export async function waitForAuditFlush(page: Page, ms = 800): Promise<void> {
  await page.waitForTimeout(ms);
}

export async function expectBitacoraContains(page: Page, text: string): Promise<void> {
  await openBitacora(page);
  await waitForAuditFlush(page);
  await page.getByRole('button', { name: 'refresh Actualizar' }).click();
  const search = page.getByPlaceholder('Descripción, entidad o ID...');
  if (await search.isVisible()) {
    await search.fill(text.slice(0, 40));
    await page.waitForTimeout(400);
  }
  await expect(
    page.locator('main .divide-y').getByText(text, { exact: false }).first(),
  ).toBeVisible({
    timeout: 20_000,
  });
}

export async function expectEstudianteAuditoriaContains(
  page: Page,
  text: string,
  studentId?: number,
): Promise<void> {
  await openEstudianteAuditoria(page, studentId);
  await page.getByPlaceholder('Estudiante, código, motivo...').fill(text.slice(0, 40));
  await page.waitForTimeout(400);
  await expect(page.locator('tbody, .card, ul').getByText(text, { exact: false }).first()).toBeVisible({
    timeout: 15_000,
  });
}

export function uniqueSuffix(): string {
  return `${Date.now()}`.slice(-6);
}

/** Sufijo alfabético para nombres (validación solo letras). */
export function uniqueLetras(length = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  let seed = Date.now();
  for (let i = 0; i < length; i++) {
    out += chars[seed % chars.length];
    seed = Math.floor(seed / chars.length) + i + 1;
  }
  return out;
}

/** Fecha ISO única para pruebas de feriados (evita colisión con feriados nacionales). */
export function feriadoFechaUnica(anioEscolar: number): string {
  const n = Date.now() + Math.floor(Math.random() * 10_000);
  const month = String(1 + (Math.floor(n / 1000) % 11)).padStart(2, '0');
  const day = String(1 + (n % 28)).padStart(2, '0');
  return `${anioEscolar}-${month}-${day}`;
}
