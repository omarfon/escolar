import { reingresoFormularioListo, validarReingresoForm } from './reingreso-form.validation';

describe('reingreso-form.validation', () => {
  it('marca campos obligatorios vacíos', () => {
    const errors = validarReingresoForm({ fechaReingreso: '', motivo: '', autorizacion: '' });
    expect(errors.fechaReingreso).toBeTruthy();
    expect(errors.motivo).toBeTruthy();
    expect(errors.autorizacion).toBeTruthy();
    expect(reingresoFormularioListo({ fechaReingreso: '', motivo: '', autorizacion: '' })).toBe(false);
  });

  it('acepta formulario válido', () => {
    expect(
      reingresoFormularioListo({
        fechaReingreso: '2026-09-10',
        motivo: 'Retorno a la institución educativa',
        autorizacion: 'Resolución directoral N.° 001-2026',
        fechaMin: '2026-06-15',
        fechaMax: '2026-12-15',
      }),
    ).toBe(true);
  });
});
