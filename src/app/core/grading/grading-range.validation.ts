export interface NotaRangeValidationResult {
  valid: boolean;
  message?: string;
}

export function validateNotaInRange(
  nota: number,
  min: number,
  max: number,
): NotaRangeValidationResult {
  if (Number.isNaN(nota) || !Number.isFinite(nota)) {
    return { valid: false, message: 'La nota debe ser un número válido.' };
  }
  if (nota < min || nota > max) {
    return {
      valid: false,
      message: `La nota ${nota} está fuera del rango permitido (${min}–${max}).`,
    };
  }
  return { valid: true };
}

export function isNotaEnRango(
  nota: number | null | undefined,
  min: number,
  max: number,
): boolean {
  if (nota === null || nota === undefined) return true;
  return validateNotaInRange(nota, min, max).valid;
}

export function cellKey(studentId: number, codigo: string): string {
  return `${studentId}:${codigo}`;
}
