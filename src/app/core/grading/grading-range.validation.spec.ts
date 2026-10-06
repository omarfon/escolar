import { isNotaEnRango, validateNotaInRange } from './grading-range.validation';

describe('grading-range.validation', () => {
  it('acepta notas válidas', () => {
    expect(validateNotaInRange(15, 0, 20).valid).toBe(true);
    expect(isNotaEnRango(null, 0, 20)).toBe(true);
  });

  it('rechaza notas fuera de rango', () => {
    expect(validateNotaInRange(21, 0, 20).valid).toBe(false);
    expect(isNotaEnRango(-1, 0, 20)).toBe(false);
  });
});
