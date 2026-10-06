import { Page } from '@playwright/test';
import { gotoAppRoute } from './routing.helper';

/** Sesión admin vía storageState (global-setup). Revalida shell si hace falta. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await gotoAppRoute(page, '/dashboard');
  if (page.url().includes('/auth/login')) {
    await page.getByRole('button', { name: 'Administrador' }).click();
    await page.waitForURL('**/#/dashboard**', { timeout: 60_000 });
  } else {
    await page.locator('app-main-layout, .min-h-screen').first().waitFor({ state: 'visible' });
  }
}

export async function waitForAppShell(page: Page): Promise<void> {
  await page.locator('app-main-layout, .min-h-screen').first().waitFor({ state: 'visible' });
}

/** Login manual (sin botón demo). Útil para SIAGIE o usuarios multi-IE. */
export async function loginAsUser(
  page: Page,
  username: string,
  password = 'admin123',
): Promise<void> {
  await gotoAppRoute(page, '/auth/login');
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  try {
    await page.waitForURL('**/#/dashboard**', { timeout: 60_000 });
  } catch {
    await waitForAppShell(page);
  }
}
