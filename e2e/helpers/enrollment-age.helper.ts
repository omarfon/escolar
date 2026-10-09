/** Réplica mínima de enrollment-age.util.ts (backend) para datos E2E coherentes. */

function edadNormativaEsperada(nivel: string, grado: string): number | null {
  const match = grado.trim().match(/(\d+)/);
  const num = match ? Number.parseInt(match[1], 10) : null;
  if (num == null || num < 1) return null;
  const n = nivel.trim().toLowerCase();
  if (n === 'inicial') return num + 2;
  if (n === 'primaria') return num + 5;
  if (n === 'secundaria') return num + 11;
  return null;
}

function splitGradoLabel(label: string): { nivel: string; grado: string } {
  const trimmed = label.trim();
  if (trimmed.endsWith(' Secundaria')) {
    return { nivel: 'Secundaria', grado: trimmed.replace(/\s+Secundaria$/, '').trim() };
  }
  if (trimmed.endsWith(' Primaria')) {
    return { nivel: 'Primaria', grado: trimmed.replace(/\s+Primaria$/, '').trim() };
  }
  if (trimmed.endsWith(' Inicial')) {
    return { nivel: 'Inicial', grado: trimmed.replace(/\s+Inicial$/, '').trim() };
  }
  return { nivel: 'Primaria', grado: trimmed };
}

/**
 * Fecha de nacimiento que cumple edad normativa exacta al 31/03 del año escolar
 * (misma convención que el backend: cumpleaños después del corte).
 */
export function fechaNacNormativaParaGrado(
  gradoLabel: string,
  anioEscolar: number,
): string {
  const { nivel, grado } = splitGradoLabel(gradoLabel);
  const edadEsperada = edadNormativaEsperada(nivel, grado);
  if (edadEsperada == null) {
    const year = anioEscolar - 12;
    return `${year}-06-15`;
  }
  const year = anioEscolar - edadEsperada - 1;
  return `${year}-06-15`;
}
