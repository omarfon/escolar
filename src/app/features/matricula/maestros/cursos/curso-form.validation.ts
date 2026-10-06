import { NivelMaestroCurso } from './cursos.model';

export type ErroresCampoCurso = Record<string, string>;

export interface CursoFormValues {
  nombre: string;
  area: string;
  nivel: NivelMaestroCurso;
  horasSemanales: number;
  grados: string[];
}

const NIVELES_VALIDOS: NivelMaestroCurso[] = ['Inicial', 'Primaria', 'Secundaria'];
const GRADOS_POR_NIVEL: Record<NivelMaestroCurso, string[]> = {
  Inicial: ['3 años', '4 años', '5 años'],
  Primaria: ['1°', '2°', '3°', '4°', '5°', '6°'],
  Secundaria: ['1°', '2°', '3°', '4°', '5°'],
};
const CAMPOS_MINIMOS = ['nombre', 'area', 'nivel', 'horasSemanales', 'grados'] as const;
const CAMPOS_FORM = [...CAMPOS_MINIMOS] as const;

function validarCamposMinimos(form: CursoFormValues, errors: ErroresCampoCurso): void {
  const nombre = form.nombre.trim();
  if (!nombre) {
    errors['nombre'] = 'Ingresa el nombre del curso.';
  } else if (nombre.length < 3) {
    errors['nombre'] = 'El nombre debe tener al menos 3 caracteres.';
  } else if (nombre.length > 120) {
    errors['nombre'] = 'El nombre no puede superar 120 caracteres.';
  }

  const area = form.area.trim();
  if (!area) {
    errors['area'] = 'Ingresa el área curricular.';
  } else if (area.length > 80) {
    errors['area'] = 'El área no puede superar 80 caracteres.';
  }

  if (!form.nivel?.trim()) {
    errors['nivel'] = 'Selecciona el nivel educativo.';
  } else if (!NIVELES_VALIDOS.includes(form.nivel)) {
    errors['nivel'] = 'El nivel seleccionado no es válido.';
  }

  if (!Number.isFinite(form.horasSemanales)) {
    errors['horasSemanales'] = 'Ingresa las horas semanales.';
  } else if (!Number.isInteger(form.horasSemanales)) {
    errors['horasSemanales'] = 'Las horas semanales deben ser un número entero.';
  } else if (form.horasSemanales < 0 || form.horasSemanales > 40) {
    errors['horasSemanales'] = 'Las horas semanales deben estar entre 0 y 40.';
  }

  if (!form.grados.length) {
    errors['grados'] = 'Selecciona al menos un grado.';
  }
}

function validarGrados(form: CursoFormValues, errors: ErroresCampoCurso): void {
  if (!form.grados.length) return;

  const permitidos = GRADOS_POR_NIVEL[form.nivel] ?? [];
  const invalidos = form.grados.filter((g) => !permitidos.includes(g));
  if (invalidos.length) {
    errors['grados'] = 'Hay grados que no corresponden al nivel seleccionado.';
  }
}

export function validarCursoFormMinimo(form: CursoFormValues): ErroresCampoCurso {
  const errors: ErroresCampoCurso = {};
  validarCamposMinimos(form, errors);
  return errors;
}

export function cursoFormularioMinimoListo(form: CursoFormValues): boolean {
  return Object.keys(validarCursoFormMinimo(form)).length === 0;
}

export function validarCursoForm(form: CursoFormValues): ErroresCampoCurso {
  const errors = validarCursoFormMinimo(form);
  validarGrados(form, errors);
  return errors;
}

export function validarCampoCurso(form: CursoFormValues, key: string): string | null {
  const errors: ErroresCampoCurso = {};

  if ((CAMPOS_MINIMOS as readonly string[]).includes(key)) {
    validarCamposMinimos(form, errors);
    if (key === 'grados') {
      validarGrados(form, errors);
    }
    return errors[key] ?? null;
  }

  return null;
}

export function primerErrorCurso(errors: ErroresCampoCurso): string | null {
  for (const key of CAMPOS_FORM) {
    if (errors[key]) return errors[key];
  }
  return null;
}

export function gradosPermitidosPorNivel(nivel: NivelMaestroCurso): string[] {
  return [...(GRADOS_POR_NIVEL[nivel] ?? [])];
}
