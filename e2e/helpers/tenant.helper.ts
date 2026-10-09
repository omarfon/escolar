import { APIRequestContext, expect } from '@playwright/test';

export const E2E_PASSWORD = 'admin123';
export const TENANT_INSTITUTION_HEADER = 'X-Institution-Id';
export const TENANT_INSTITUTION_STORAGE_KEY = 'tenant_institution_id';

const QA_BASE = process.env.QA_BASE_URL ?? 'http://localhost:4200';
export const API_V1 = `${QA_BASE}/api/v1`;

/** Códigos modulares del seed multi-IE (multi-institution-migration). */
export const IE_CODIGO_SAN_JUAN = '1111111';
export const IE_CODIGO_SANTA_ROSA = '2222222';

export interface ApiAuthSession {
  accessToken: string;
  institutionId: number | null;
  username: string;
}

export interface InstitucionDirectorio {
  id: number;
  nombre: string;
  siglas: string;
  codigoModular: string;
}

export interface MaestroCursoPage {
  items: Array<{ id: number; nombre: string; institutionId?: number }>;
  total: number;
}

export interface AuditLogsPage {
  items: Array<{ id: number; descripcion?: string; institutionId?: number; entidadId?: string | null }>;
  pagination: { totalItems: number };
}

const apiSessionCache = new Map<string, ApiAuthSession>();

export async function loginApi(
  request: APIRequestContext,
  username: string,
  password = E2E_PASSWORD,
): Promise<ApiAuthSession> {
  const cacheKey = `${username}:${password}`;
  const cached = apiSessionCache.get(cacheKey);
  if (cached) return cached;

  let lastStatus = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await request.post(`${API_V1}/auth/login`, {
      data: { username, password },
    });
    lastStatus = res.status();
    if (lastStatus === 429 || lastStatus >= 500) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    expect(res.ok(), `login ${username} → HTTP ${lastStatus}`).toBeTruthy();
    const body = await res.json();
    const session: ApiAuthSession = {
      accessToken: body.accessToken as string,
      institutionId: (body.user?.institutionId ?? null) as number | null,
      username,
    };
    apiSessionCache.set(cacheKey, session);
    return session;
  }

  expect(false, `login ${username} → HTTP ${lastStatus} (reintentos agotados)`).toBeTruthy();
  throw new Error('unreachable');
}

/** Usuarios tenant del seed con IE distintas (admin vs e.ramos). */
export async function resolveCrossTenantUsers(request: APIRequestContext): Promise<{
  admin: ApiAuthSession;
  santaRosa: ApiAuthSession;
  adminInstitutionId: number;
  santaRosaInstitutionId: number;
}> {
  const admin = await loginApi(request, 'admin');
  const santaRosa = await loginApi(request, 'e.ramos');
  expect(admin.institutionId, 'admin debe tener IE asignada').toBeTruthy();
  expect(santaRosa.institutionId, 'e.ramos debe tener IE asignada').toBeTruthy();
  expect(admin.institutionId).not.toBe(santaRosa.institutionId);
  return {
    admin,
    santaRosa,
    adminInstitutionId: admin.institutionId!,
    santaRosaInstitutionId: santaRosa.institutionId!,
  };
}

export function authHeaders(
  token: string,
  institutionId?: number | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (institutionId != null && institutionId > 0) {
    headers[TENANT_INSTITUTION_HEADER] = String(institutionId);
  }
  return headers;
}

export async function fetchInstitutionDirectory(
  request: APIRequestContext,
  siagieToken: string,
): Promise<InstitucionDirectorio[]> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await request.get(`${API_V1}/institution-directory`, {
      headers: authHeaders(siagieToken),
    });
    lastStatus = res.status();
    if (lastStatus === 429 || lastStatus >= 500) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      continue;
    }
    expect(res.ok(), `directorio IE → HTTP ${lastStatus}`).toBeTruthy();
    return res.json();
  }
  expect(false, `directorio IE → HTTP ${lastStatus} (rate limit)`).toBeTruthy();
  throw new Error('unreachable');
}

export async function findInstitutionByCodigoModular(
  request: APIRequestContext,
  siagieToken: string,
  codigoModular: string,
): Promise<InstitucionDirectorio> {
  const list = await fetchInstitutionDirectory(request, siagieToken);
  const found = list.find((ie) => ie.codigoModular === codigoModular);
  expect(found, `IE con código modular ${codigoModular}`).toBeDefined();
  return found!;
}

export async function listCursosApi(
  request: APIRequestContext,
  session: ApiAuthSession,
  institutionId?: number | null,
  pageSize = 100,
): Promise<MaestroCursoPage> {
  const ie = institutionId !== undefined ? institutionId : session.institutionId;
  const res = await request.get(`${API_V1}/maestros/cursos`, {
    headers: authHeaders(session.accessToken, ie),
    params: { page: '1', pageSize: String(pageSize), activo: 'true' },
  });
  expect(res.ok(), `listar cursos (${session.username}) → HTTP ${res.status()}`).toBeTruthy();
  return res.json();
}

export async function createCursoApi(
  request: APIRequestContext,
  session: ApiAuthSession,
  nombre: string,
  institutionId?: number | null,
): Promise<{ id: number; nombre: string }> {
  const ie = institutionId !== undefined ? institutionId : session.institutionId;
  const res = await request.post(`${API_V1}/maestros/cursos`, {
    headers: authHeaders(session.accessToken, ie),
    data: {
      nombre,
      area: 'Tenant E2E',
      nivel: 'Primaria',
      grados: ['1°'],
      horasSemanales: 2,
      activo: true,
    },
  });
  expect(res.ok(), `crear curso "${nombre}" → HTTP ${res.status()}`).toBeTruthy();
  return res.json();
}

export async function deactivateCursoApi(
  request: APIRequestContext,
  session: ApiAuthSession,
  cursoId: number,
  institutionId?: number | null,
): Promise<void> {
  const ie = institutionId !== undefined ? institutionId : session.institutionId;
  const res = await request.delete(`${API_V1}/maestros/cursos/${cursoId}`, {
    headers: authHeaders(session.accessToken, ie),
  });
  expect(res.ok(), `desactivar curso ${cursoId} → HTTP ${res.status()}`).toBeTruthy();
}

export async function listAuditLogsApi(
  request: APIRequestContext,
  session: ApiAuthSession,
  options: { institutionId?: number | null; busqueda?: string } = {},
): Promise<AuditLogsPage> {
  const ie =
    options.institutionId !== undefined ? options.institutionId : session.institutionId;
  const params: Record<string, string> = { pageSize: '20' };
  if (options.busqueda) params.busqueda = options.busqueda;

  const res = await request.get(`${API_V1}/audit-logs`, {
    headers: authHeaders(session.accessToken, ie),
    params,
  });
  expect(res.ok(), `bitácora (${session.username}) → HTTP ${res.status()}`).toBeTruthy();
  return res.json();
}

/** Espera cola batch de auditoría (~200 ms en backend). */
export async function waitForAuditFlush(ms = 900): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}
