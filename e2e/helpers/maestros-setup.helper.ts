import { APIRequestContext, expect } from '@playwright/test';
import { API_V1, ApiAuthSession, authHeaders } from './tenant.helper';

interface AnioEscolarRow {
  id: number;
  anio: number;
  estado?: string;
  vigente?: boolean;
}

interface PeriodoActualRow {
  inicio?: string;
  fin?: string;
}

/** Alinea institution.anio con el calendario actual (validación UI + backend en E2E). */
export async function ensureInstitutionAnioEscolarCoherente(
  request: APIRequestContext,
  session: ApiAuthSession,
  anio = new Date().getFullYear(),
): Promise<number> {
  expect(session.institutionId, 'usuario debe tener IE asignada').toBeTruthy();
  const headers = authHeaders(session.accessToken, session.institutionId);
  const patchRes = await request.patch(`${API_V1}/institution`, {
    headers,
    data: { anio: String(anio) },
  });
  expect(patchRes.ok(), `actualizar año IE → HTTP ${patchRes.status()}`).toBeTruthy();
  return anio;
}

/** Año escolar configurado en la IE (campo institution.anio usado por validación de edad). */
export async function resolveAnioEscolarInstitucion(
  request: APIRequestContext,
  session: ApiAuthSession,
): Promise<number> {
  expect(session.institutionId, 'usuario debe tener IE asignada').toBeTruthy();
  const headers = authHeaders(session.accessToken);
  const res = await request.get(`${API_V1}/institution`, {
    headers,
    params: { institutionId: String(session.institutionId) },
  });
  expect(res.ok(), `config IE → HTTP ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { institution?: { anio?: string } };
  const anio = Number(body.institution?.anio);
  return Number.isFinite(anio) && anio > 2000 ? anio : new Date().getFullYear();
}

/** Garantiza que el año exista en maestros (activo) sin cambiar el vigente de la IE. */
export async function ensureAnioEscolarActivo(
  request: APIRequestContext,
  session: ApiAuthSession,
  anio: number,
): Promise<void> {
  const headers = authHeaders(session.accessToken, session.institutionId);
  const listRes = await request.get(`${API_V1}/maestros/anios-escolares`, { headers });
  expect(listRes.ok(), `listar años escolares → HTTP ${listRes.status()}`).toBeTruthy();

  const list = (await listRes.json()) as { items?: AnioEscolarRow[] };
  const items = list.items ?? [];
  if (items.some((a) => a.anio === anio)) return;

  const createRes = await request.post(`${API_V1}/maestros/anios-escolares`, {
    headers,
    data: {
      anio,
      fechaInicio: `${anio}-03-01`,
      fechaFin: `${anio}-12-20`,
      tipoPeriodo: 'bimestre',
      activar: false,
      generarPeriodos: false,
      motivo: 'Setup E2E',
    },
  });
  if (createRes.ok()) return;
  if (createRes.status() === 409) return;
  expect(createRes.ok(), `crear año ${anio} → HTTP ${createRes.status()}`).toBeTruthy();
}

/** Crea un salón vía API (evita fricción ngModel en el drawer). */
export async function createSalonMaestro(
  request: APIRequestContext,
  session: ApiAuthSession,
  data: { anioEscolar: number; nivel: string; grado: string; seccion: string; aforo: number },
): Promise<void> {
  const headers = authHeaders(session.accessToken, session.institutionId);
  const res = await request.post(`${API_V1}/maestros/salones`, {
    headers,
    data,
  });
  expect(res.ok(), `crear salón → HTTP ${res.status()}`).toBeTruthy();
}

/** Devuelve año, número y fechas libres para crear un periodo E2E. */
export async function resolvePeriodoCreacionE2E(
  request: APIRequestContext,
  session: ApiAuthSession,
  preferAnio: number,
): Promise<{ anioEscolar: number; numero: number; inicio: string; fin: string }> {
  const headers = authHeaders(session.accessToken);

  for (const anioEscolar of [preferAnio, preferAnio + 1]) {
    await ensureAnioEscolarActivo(request, session, anioEscolar);
    const listRes = await request.get(`${API_V1}/maestros/periodos-academicos`, {
      headers,
      params: { anioEscolar: String(anioEscolar) },
    });
    expect(listRes.ok()).toBeTruthy();
    const items = (await listRes.json()) as Array<{ numero: number }>;
    const usados = new Set(items.map((p) => p.numero));
    for (let numero = 1; numero <= 12; numero++) {
      if (usados.has(numero)) continue;
      return {
        anioEscolar,
        numero,
        inicio: `${anioEscolar}-03-05`,
        fin: `${anioEscolar}-03-06`,
      };
    }
  }

  expect(false, 'sin hueco libre para periodo E2E').toBeTruthy();
  return { anioEscolar: preferAnio, numero: 1, inicio: '', fin: '' };
}

function pickWeekdayBetween(inicio: string, fin: string): string {
  const start = new Date(`${inicio}T12:00:00`);
  const end = new Date(`${fin}T12:00:00`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day >= 1 && day <= 5) {
      return d.toISOString().slice(0, 10);
    }
  }
  return inicio;
}

/** Fecha lectiva dentro del periodo académico vigente (asistencia exige esDiaClase). */
export async function resolveFechaDiaClaseAsistencia(
  request: APIRequestContext,
  session: ApiAuthSession,
): Promise<string> {
  const headers = authHeaders(session.accessToken);
  const res = await request.get(`${API_V1}/maestros/periodos-academicos/actual`, { headers });
  expect(res.ok(), `periodo actual → HTTP ${res.status()}`).toBeTruthy();
  const periodo = (await res.json()) as PeriodoActualRow;
  if (periodo.inicio && periodo.fin) {
    return pickWeekdayBetween(periodo.inicio, periodo.fin);
  }
  return new Date().toISOString().slice(0, 10);
}

/** Cambia la fecha del registro diario vía API interna de Angular (dev). */
export async function setAsistenciaRegistroFecha(
  page: import('@playwright/test').Page,
  fecha: string,
): Promise<void> {
  await page.evaluate((isoDate) => {
    const w = window as unknown as {
      ng?: { getComponent: (el: Element) => { setFiltro: (k: string, v: string) => void } };
    };
    const host = document.querySelector('app-asistencia-registro');
    if (!host || !w.ng) {
      throw new Error('No se pudo acceder al componente de asistencia');
    }
    w.ng.getComponent(host).setFiltro('fecha', isoDate);
  }, fecha);
}
