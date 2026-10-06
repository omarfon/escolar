import { expect, Page } from '@playwright/test';

export interface DocenteFormData {
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  password: string;
}

export interface UsuarioFormData {
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  password: string;
}

export async function fillDocenteMinimo(page: Page, data: DocenteFormData): Promise<void> {
  const modal = page.locator('.card.max-w-2xl').filter({
    has: page.getByRole('heading', { name: /docente/i }),
  });
  await modal.locator('label.form-label').filter({ hasText: /^Nombres/ }).locator('..').locator('input').fill(data.nombres);
  await modal.locator('label.form-label').filter({ hasText: /^Apellidos/ }).locator('..').locator('input').fill(data.apellidos);
  await modal.locator('label.form-label').filter({ hasText: /^DNI/ }).locator('..').locator('input').fill(data.dni);
  await modal.locator('label.form-label').filter({ hasText: /^Email/ }).locator('..').locator('input').fill(data.email);
  await modal.locator('label.form-label').filter({ hasText: /Contraseña/ }).locator('..').locator('input[type="password"]').fill(data.password);
  await modal.locator('label.form-label').filter({ hasText: /^Especialización/ }).locator('..').locator('select').selectOption({ index: 1 });
}

export async function fillUsuarioMinimo(page: Page, data: UsuarioFormData): Promise<void> {
  const drawer = page.locator('.max-w-lg.bg-white').filter({
    has: page.getByRole('heading', { name: /Usuario/i }),
  });
  await drawer.getByPlaceholder('Ej: Juan Carlos').fill(data.nombres);
  await drawer.getByPlaceholder('Ej: Perez Torres').fill(data.apellidos);
  await drawer.getByPlaceholder('12345678').fill(data.dni);
  await drawer.getByPlaceholder('usuario@colegio.edu.pe').fill(data.email);
  await drawer.getByPlaceholder('Minimo 8 caracteres').fill(data.password);
  await drawer.getByPlaceholder('Repite la contrasena').fill(data.password);
}

/** Dispara change/input en selects Angular (ngModel). */
export async function selectAngularOption(
  select: import('@playwright/test').Locator,
  value: string,
): Promise<void> {
  await syncAngularSelect(select, value);
}

/** Dispara input/change para sincronizar ngModel en Angular. */
async function dispatchAngularInputEvents(
  input: import('@playwright/test').Locator,
): Promise<void> {
  await input.evaluate((el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/** Sincroniza inputs Angular (ngModel) con fill + eventos. */
export async function fillAngularInput(
  input: import('@playwright/test').Locator,
  value: string,
): Promise<void> {
  await input.click();
  await input.fill(value);
  await dispatchAngularInputEvents(input);
  await input.press('Tab');
}

/** Fechas ISO en inputs type="date". */
export async function fillAngularDate(
  input: import('@playwright/test').Locator,
  value: string,
): Promise<void> {
  await input.fill(value);
  await dispatchAngularInputEvents(input);
  await input.press('Tab');
}

/** Sincroniza un <select> con ngModel + handler ngModelChange en Angular. */
async function syncAngularSelect(
  select: import('@playwright/test').Locator,
  value: string,
): Promise<void> {
  await select.evaluate((el, val) => {
    const selectEl = el as HTMLSelectElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      'value',
    )?.set;
    setter?.call(selectEl, val);
    selectEl.dispatchEvent(new Event('input', { bubbles: true }));
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

export async function fillSalonMinimo(
  page: Page,
  opts: { nivel: string; grado?: string; seccion: string; aforo?: number },
): Promise<void> {
  const drawer = page.locator('.max-w-xl.bg-white').filter({
    has: page.getByRole('heading', { name: 'Nuevo salón' }),
  });
  const nivelSelect = drawer
    .locator('label.form-label')
    .filter({ hasText: /^Nivel/ })
    .locator('..')
    .locator('select');
  const gradoSelect = drawer
    .locator('label.form-label')
    .filter({ hasText: /^Grado/ })
    .locator('..')
    .locator('select');

  await expect(nivelSelect.locator('option')).not.toHaveCount(1, { timeout: 15_000 });
  await syncAngularSelect(nivelSelect, opts.nivel);
  await expect(gradoSelect.locator('option')).not.toHaveCount(1, { timeout: 10_000 });

  if (opts.grado) {
    await syncAngularSelect(gradoSelect, opts.grado);
  } else {
    const gradoValue = await gradoSelect.locator('option').nth(1).getAttribute('value');
    if (gradoValue) {
      await syncAngularSelect(gradoSelect, gradoValue);
    } else {
      await gradoSelect.selectOption({ index: 1 });
      await dispatchAngularInputEvents(gradoSelect);
    }
  }

  await drawer.getByPlaceholder('Ej. A, B, C').fill(opts.seccion);
  if (opts.aforo != null) {
    await drawer
      .locator('label.form-label')
      .filter({ hasText: /^Aforo/ })
      .locator('..')
      .locator('input[type="number"]')
      .fill(String(opts.aforo));
  }
}
