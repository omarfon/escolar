import { retroalimentacionFormularioListo, validarRetroalimentacionForm } from './retroalimentacion-form.validation';

describe('retroalimentacion-form.validation', () => {
  it('marca campos obligatorios', () => {
    const errors = validarRetroalimentacionForm({
      canal: '',
      fechaRetroalimentacion: '',
      destinatario: '',
      mensaje: '',
    });
    expect(errors.canal).toBeTruthy();
    expect(retroalimentacionFormularioListo({ canal: '', fechaRetroalimentacion: '', destinatario: '', mensaje: '' })).toBe(false);
  });

  it('acepta formulario válido', () => {
    expect(
      retroalimentacionFormularioListo({
        canal: 'Presencial',
        fechaRetroalimentacion: '2026-06-20',
        destinatario: 'María Pérez',
        mensaje: 'Se comunica el resultado favorable de la evaluación de admisión.',
      }),
    ).toBe(true);
  });
});
