import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const authFile = path.join(__dirname, '.auth', 'admin.json');

async function globalSetup(config: FullConfig): Promise<void> {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:4200';
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/#/auth/login`);
  await page.getByRole('button', { name: 'Administrador' }).click();
  await page.waitForURL('**/#/dashboard**', { timeout: 60_000 });

  await context.storageState({ path: authFile });
  await browser.close();
}

export default globalSetup;
