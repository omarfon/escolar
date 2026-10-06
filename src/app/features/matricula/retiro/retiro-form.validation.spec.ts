import { retiroFormularioListo, validarRetiroForm } from './retiro-form.validation';

describe('retiro-form.validation', () => {
  it('exige fecha, motivo y sustento', () => {
    const errors = validarRetiroForm({ fechaRetiro: '', motivo: '', sustento: '' });
    expect(errors.fechaRetiro).toBeTruthy();
    expect(errors.motivo).toBeTruthy();
    expect(errors.sustento).toBeTruthy();
    expect(retiroFormularioListo({ fechaRetiro: '', motivo: '', sustento: '' })).toBe(false);
  });

  it('valida ventana de fechas', () => {
    const errors = validarRetiroForm({
      fechaRetiro: '2026-01-01',
      motivo: 'Decisión familiar',
      sustento: 'Sustento suficiente',
      fechaMin: '2026-03-01',
      fechaMax: '2026-09-28',
    });
    expect(errors.fechaRetiro).toContain('anterior');
  });

  it('acepta formulario válido', () => {
    expect(
      retiroFormularioListo({
        fechaRetiro: '2026-09-10',
        motivo: 'Decisión familiar',
        sustento: 'Sustento suficiente',
        fechaMin: '2026-03-01',
        fechaMax: '2026-09-28',
      }),
    ).toBe(true);
  });
});
