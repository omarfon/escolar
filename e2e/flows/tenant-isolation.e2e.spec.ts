import { test, expect } from '@playwright/test';
import { loginAsUser } from '../helpers/auth.helper';
import { uniqueSuffix } from '../helpers/crud-audit.helper';
import { gotoAppRoute } from '../helpers/routing.helper';
import {
  createCursoApi,
  deactivateCursoApi,
  listAuditLogsApi,
  listCursosApi,
  loginApi,
  resolveCrossTenantUsers,
  TENANT_INSTITUTION_STORAGE_KEY,
  waitForAuditFlush,
} from '../helpers/tenant.helper';

test.describe.configure({ mode: 'serial' });

test.describe('F7 — Aislamiento tenant (multi-institución)', () => {
  test.describe('API — catálogo maestros', () => {
    test('curso creado en IE A no aparece en IE B', async ({ request }) => {
      const { admin, santaRosa } = await resolveCrossTenantUsers(request);
      const nombre = `TenantCurso ${uniqueSuffix()}`;

      const created = await createCursoApi(request, admin, nombre);
      try {
        const listAdmin = await listCursosApi(request, admin);
        expect(listAdmin.items.some((c) => c.nombre === nombre)).toBe(true);

        const listOtraIe = await listCursosApi(request, santaRosa);
        expect(listOtraIe.items.some((c) => c.nombre === nombre)).toBe(false);
      } finally {
        await deactivateCursoApi(request, admin, created.id);
      }
    });

    test('SIAGIE sin IE activa devuelve catálogo vacío', async ({ request }) => {
      const siagie = await loginApi(request, 'siagie');
      const page = await listCursosApi(request, siagie, null);
      expect(page.items).toEqual([]);
      expect(page.total).toBe(0);
    });

    test('SIAGIE con header IE ve solo esa institución', async ({ request }) => {
      const { admin, adminInstitutionId, santaRosaInstitutionId } =
        await resolveCrossTenantUsers(request);
      const siagie = await loginApi(request, 'siagie');
      const nombre = `TenantSiagie ${uniqueSuffix()}`;
      const created = await createCursoApi(request, admin, nombre);

      try {
        const listAdminIe = await listCursosApi(request, siagie, adminInstitutionId);
        expect(listAdminIe.items.some((c) => c.nombre === nombre)).toBe(true);

        const listOtraIe = await listCursosApi(request, siagie, santaRosaInstitutionId);
        expect(listOtraIe.items.some((c) => c.nombre === nombre)).toBe(false);
      } finally {
        await deactivateCursoApi(request, admin, created.id);
      }
    });
  });

  test.describe('API — bitácora', () => {
    test('SIAGIE sin IE activa devuelve bitácora vacía', async ({ request }) => {
      const siagie = await loginApi(request, 'siagie');
      const logs = await listAuditLogsApi(request, siagie, { institutionId: null });
      expect(logs.items).toEqual([]);
      expect(logs.pagination.totalItems).toBe(0);
    });

    test('bitácora acotada por IE (admin vs SIAGIE en otra IE)', async ({ request }) => {
      const { admin, adminInstitutionId, santaRosaInstitutionId } =
        await resolveCrossTenantUsers(request);
      const siagie = await loginApi(request, 'siagie');
      const created = await createCursoApi(request, admin, `Curso Audit ${uniqueSuffix()}`);

      try {
        await waitForAuditFlush();
        const entidadId = String(created.id);

        const logsAdmin = await listAuditLogsApi(request, admin, { busqueda: entidadId });
        expect(logsAdmin.items.some((i) => i.entidadId === entidadId)).toBe(true);

        const logsSiagiePropia = await listAuditLogsApi(request, siagie, {
          institutionId: adminInstitutionId,
          busqueda: entidadId,
        });
        expect(logsSiagiePropia.items.some((i) => i.entidadId === entidadId)).toBe(true);

        const logsSiagieOtra = await listAuditLogsApi(request, siagie, {
          institutionId: santaRosaInstitutionId,
          busqueda: entidadId,
        });
        expect(logsSiagieOtra.items.some((i) => i.entidadId === entidadId)).toBe(false);
      } finally {
        await deactivateCursoApi(request, admin, created.id);
      }
    });
  });

  test.describe('UI — contexto SIAGIE', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('sin IE seleccionada muestra aviso y tabla vacía', async ({ page }) => {
      await page.addInitScript((key) => localStorage.removeItem(key), TENANT_INSTITUTION_STORAGE_KEY);
      await loginAsUser(page, 'siagie');
      await gotoAppRoute(page, '/maestros/cursos');

      await expect(
        page.getByText('Seleccione una institución educativa en la barra superior'),
      ).toBeVisible();
      await expect(page.locator('table tbody tr')).toHaveCount(0);
    });

    test('al elegir IE carga catálogo acotado', async ({ page, request }) => {
      const { admin, adminInstitutionId } = await resolveCrossTenantUsers(request);

      await loginAsUser(page, 'siagie');
      await page.locator('#tenant-ie-select').selectOption(String(adminInstitutionId));
      await gotoAppRoute(page, '/maestros/cursos');

      await expect(
        page.getByText(new RegExp(`Contexto activo:.*#${adminInstitutionId}`)),
      ).toBeVisible();
      await expect(page.getByText('No hay cursos en el catálogo.')).toHaveCount(0);
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 });

      const apiList = await listCursosApi(request, admin);
      expect(apiList.total).toBeGreaterThan(0);
    });
  });
});
