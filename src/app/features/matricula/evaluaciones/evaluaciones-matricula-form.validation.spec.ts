import { evaluacionMatriculaFormularioListo, validarEvaluacionMatriculaForm } from './evaluaciones-matricula-form.validation';

describe('evaluaciones-matricula-form.validation', () => {
  it('marca campos obligatorios vacíos', () => {
    const errors = validarEvaluacionMatriculaForm({
      tipoEvaluacion: '',
      fechaEvaluacion: '',
      resultado: '',
      resolucion: '',
    });
    expect(errors.tipoEvaluacion).toBeTruthy();
    expect(errors.fechaEvaluacion).toBeTruthy();
    expect(errors.resultado).toBeTruthy();
    expect(errors.resolucion).toBeTruthy();
    expect(
      evaluacionMatriculaFormularioListo({
        tipoEvaluacion: '',
        fechaEvaluacion: '',
        resultado: '',
        resolucion: '',
      }),
    ).toBe(false);
  });

  it('acepta formulario válido', () => {
    expect(
      evaluacionMatriculaFormularioListo({
        tipoEvaluacion: 'Entrevista con apoderado',
        fechaEvaluacion: '2026-06-15',
        resultado: 'aprobado',
        puntaje: 16,
        resolucion: 'Resolución directoral N.° 001-2026',
        fechaMin: '2026-03-01',
        fechaMax: '2026-12-15',
      }),
    ).toBe(true);
  });
});
