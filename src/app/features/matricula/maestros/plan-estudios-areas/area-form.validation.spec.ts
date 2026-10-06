import {
  areaFormularioMinimoListo,
  normalizeAreaNombre,
  validarAreaForm,
} from './area-form.validation';

describe('area-form.validation', () => {
  it('normaliza espacios', () => {
    expect(normalizeAreaNombre('  Matemática  ')).toBe('Matemática');
  });

  it('rechaza nombre vacío', () => {
    expect(validarAreaForm({ nombre: '', orden: 1 }).nombre).toBeTruthy();
  });

  it('acepta formulario válido', () => {
    expect(
      areaFormularioMinimoListo({ nombre: 'Comunicación', orden: 1 }),
    ).toBe(true);
  });

  it('exige motivo al desactivar', () => {
    const errors = validarAreaForm({
      nombre: 'Comunicación',
      orden: 1,
      desactivar: true,
      motivo: 'ab',
    });
    expect(errors.motivo).toBeTruthy();
  });
});
