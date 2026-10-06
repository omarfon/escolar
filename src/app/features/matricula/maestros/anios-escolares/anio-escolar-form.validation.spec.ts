import { validarAnioEnRango, validarAnioEscolarForm } from './anio-escolar-form.validation';

describe('validarAnioEscolarForm', () => {
  it('acepta un año coherente con las fechas', () => {
    expect(
      validarAnioEscolarForm({
        anio: 2026,
        fechaInicio: '2026-03-01',
        fechaFin: '2026-12-20',
        tipoPeriodo: 'bimestre',
      }),
    ).toBeNull();
  });

  it('rechaza año fuera del rango de fechas', () => {
    expect(validarAnioEnRango(2028, '2026-03-01', '2026-12-20')).toMatch(/coherente/);
    expect(
      validarAnioEscolarForm({
        anio: 2028,
        fechaInicio: '2026-03-01',
        fechaFin: '2026-12-20',
        tipoPeriodo: 'bimestre',
      }),
    ).toMatch(/coherente/);
  });

  it('rechaza fechas invertidas', () => {
    expect(
      validarAnioEscolarForm({
        anio: 2026,
        fechaInicio: '2026-12-20',
        fechaFin: '2026-03-01',
        tipoPeriodo: 'bimestre',
      }),
    ).toMatch(/inicio debe ser anterior/);
  });
});
