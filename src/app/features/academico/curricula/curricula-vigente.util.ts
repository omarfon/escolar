import { Curricula, NivelCurricula } from './curricula.model';

/** Orden de preferencia: activa del A.E., luego activa, luego cualquiera; v1.0 antes que v1.1. */
export function pickCurriculaVigente(
  list: Curricula[],
  nivel: NivelCurricula | string,
  anioEscolar?: number | null,
): Curricula | null {
  const delNivel = list.filter((c) => c.nivel === nivel);
  if (!delNivel.length) return null;

  const anio = anioEscolar ?? new Date().getFullYear();
  const byPrioridad = (items: Curricula[]) =>
    [...items].sort(
      (a, b) =>
        (b.anio === anio ? 1 : 0) - (a.anio === anio ? 1 : 0) ||
        b.anio - a.anio ||
        (a.estado === 'activo' ? 1 : 0) - (b.estado === 'activo' ? 1 : 0) ||
        a.version.localeCompare(b.version, undefined, { numeric: true }),
    );

  return (
    byPrioridad(
      delNivel.filter((c) => c.estado === 'activo' && c.anio === anio),
    )[0] ??
    byPrioridad(delNivel.filter((c) => c.estado === 'activo'))[0] ??
    byPrioridad(delNivel)[0] ??
    null
  );
}

export function labelCurriculaVigente(c: Curricula): string {
  return `${c.anio} · v${c.version} (${c.estado})`;
}
