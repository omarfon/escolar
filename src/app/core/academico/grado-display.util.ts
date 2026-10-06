/** Clave canónica de grado (5, 5°, 5° Secundaria → 5°). */
export function normalizeGradoMatriculaKey(grado: string): string {
  let t = (grado ?? '').trim();
  const withNivel = t.match(/^(.+?)\s+(Inicial|Primaria|Secundaria)$/i);
  if (withNivel) t = withNivel[1].trim();
  if (/^\d+\s*°?$/.test(t)) {
    return `${t.replace(/[^\d]/g, '')}°`;
  }
  const num = t.match(/^(\d+)/);
  if (num) return `${num[1]}°`;
  return t;
}

/** Etiqueta legible: "5° Secundaria", "3 años", etc. */
export function etiquetaGradoConNivel(nivel: string, grado: string): string {
  const n = (nivel ?? '').trim();
  const g = (grado ?? '').trim();
  if (!g) return n;
  if (/primaria|secundaria|inicial/i.test(g)) return g;

  if (n === 'Inicial') {
    if (/año|anos/i.test(g)) return g;
    const num = g.match(/(\d+)/)?.[1];
    return num ? `${num} años` : g;
  }

  const num = g.replace(/°/g, '').match(/(\d+)/)?.[1] ?? g.replace(/°/g, '');
  if (n === 'Secundaria') return `${num}° Secundaria`;
  if (n === 'Primaria') return `${num}° Primaria`;
  return `${g} ${n}`.trim();
}

export function etiquetaGradoSeccion(nivel: string, grado: string, seccion: string): string {
  const base = etiquetaGradoConNivel(nivel, grado);
  const sec = (seccion ?? '').trim().toUpperCase();
  return sec ? `${base} · Sec. ${sec}` : base;
}
