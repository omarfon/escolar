import { Curso, Docente, EntradaHorario, Nivel, Periodo } from '../models/horario.model';

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
export const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
export const DIAS_SEMANA_CAB = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Grid mensual: días lectivos más anchos, fin de semana compacto */
export const CALENDARIO_MES_GRID =
  'grid grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,0.38fr)_minmax(0,0.38fr)] gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200';

export function esFinDeSemanaCalendario(indice: number): boolean {
  return indice >= 5;
}

const ALL: Nivel[] = ['Inicial', 'Primaria', 'Secundaria'];
const PRI_SEC: Nivel[] = ['Primaria', 'Secundaria'];
const SEC_ONLY: Nivel[] = ['Secundaria'];

export const PERIODOS: Periodo[] = [
  { id: 1, nombre: '1ª Hora', horaInicio: '07:45', horaFin: '08:30', isReceso: false, niveles: ALL },
  { id: 2, nombre: '2ª Hora', horaInicio: '08:30', horaFin: '09:15', isReceso: false, niveles: ALL },
  { id: 3, nombre: '3ª Hora', horaInicio: '09:15', horaFin: '10:00', isReceso: false, niveles: ALL },
  { id: 4, nombre: 'Recreo', horaInicio: '10:00', horaFin: '10:30', isReceso: true, niveles: ALL },
  { id: 5, nombre: '4ª Hora', horaInicio: '10:30', horaFin: '11:15', isReceso: false, niveles: ALL },
  { id: 6, nombre: '5ª Hora', horaInicio: '11:15', horaFin: '12:00', isReceso: false, niveles: ALL },
  { id: 7, nombre: '6ª Hora', horaInicio: '12:00', horaFin: '12:45', isReceso: false, niveles: ALL },
  { id: 8, nombre: '7ª Hora', horaInicio: '12:45', horaFin: '13:30', isReceso: false, niveles: PRI_SEC },
  { id: 9, nombre: '8ª Hora', horaInicio: '13:30', horaFin: '14:15', isReceso: false, niveles: PRI_SEC },
  { id: 10, nombre: '9ª Hora', horaInicio: '14:15', horaFin: '15:00', isReceso: false, niveles: SEC_ONLY },
];

export const CURSOS: Curso[] = [
  { id: 7, nombre: 'Matemática', area: 'Matemática', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', dotClass: 'bg-indigo-500' },
  { id: 8, nombre: 'Comprensión Lectora', area: 'Comunicación', colorClass: 'bg-blue-100 text-blue-800 border-blue-200', dotClass: 'bg-blue-500' },
  { id: 9, nombre: 'Prod. de Textos', area: 'Comunicación', colorClass: 'bg-blue-100 text-blue-800 border-blue-200', dotClass: 'bg-blue-500' },
  { id: 10, nombre: 'Ciencia y Tecnología', area: 'C y T', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', dotClass: 'bg-emerald-500' },
  { id: 11, nombre: 'Historia del Perú', area: 'Ciencias Soc.', colorClass: 'bg-amber-100 text-amber-800 border-amber-200', dotClass: 'bg-amber-500' },
  { id: 13, nombre: 'Arte y Cultura', area: 'Arte', colorClass: 'bg-pink-100 text-pink-800 border-pink-200', dotClass: 'bg-pink-500' },
  { id: 14, nombre: 'Educación Física', area: 'Ed. Física', colorClass: 'bg-lime-100 text-lime-800 border-lime-200', dotClass: 'bg-lime-500' },
  { id: 15, nombre: 'Personal Social', area: 'Personal Social', colorClass: 'bg-green-100 text-green-800 border-green-200', dotClass: 'bg-green-500' },
  { id: 16, nombre: 'Inglés', area: 'Inglés', colorClass: 'bg-sky-100 text-sky-800 border-sky-200', dotClass: 'bg-sky-500' },
  { id: 17, nombre: 'Ed. Religiosa', area: 'Ed. Religiosa', colorClass: 'bg-violet-100 text-violet-800 border-violet-200', dotClass: 'bg-violet-500' },
  { id: 18, nombre: 'Álgebra', area: 'Matemática', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', dotClass: 'bg-indigo-500' },
  { id: 19, nombre: 'Geometría', area: 'Matemática', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', dotClass: 'bg-indigo-500' },
  { id: 22, nombre: 'Comunicación', area: 'Comunicación', colorClass: 'bg-blue-100 text-blue-800 border-blue-200', dotClass: 'bg-blue-500' },
  { id: 25, nombre: 'Biología', area: 'C y T', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', dotClass: 'bg-emerald-500' },
  { id: 27, nombre: 'Historia del Perú', area: 'CCSS e Historia', colorClass: 'bg-amber-100 text-amber-800 border-amber-200', dotClass: 'bg-amber-500' },
  { id: 29, nombre: 'Geografía', area: 'CCSS e Historia', colorClass: 'bg-amber-100 text-amber-800 border-amber-200', dotClass: 'bg-amber-500' },
  { id: 30, nombre: 'Inglés', area: 'Inglés', colorClass: 'bg-sky-100 text-sky-800 border-sky-200', dotClass: 'bg-sky-500' },
  { id: 31, nombre: 'DPCC', area: 'DPCC', colorClass: 'bg-teal-100 text-teal-800 border-teal-200', dotClass: 'bg-teal-500' },
  { id: 32, nombre: 'Arte y Cultura', area: 'Arte', colorClass: 'bg-pink-100 text-pink-800 border-pink-200', dotClass: 'bg-pink-500' },
  { id: 33, nombre: 'Educación Física', area: 'Ed. Física', colorClass: 'bg-lime-100 text-lime-800 border-lime-200', dotClass: 'bg-lime-500' },
  { id: 99, nombre: 'Tutoría', area: 'Tutoría', colorClass: 'bg-gray-100 text-gray-700 border-gray-300', dotClass: 'bg-gray-500' },
];

export const DOCENTES: Docente[] = [
  { id: 1, apellidos: 'Pérez García', nombres: 'Juan Carlos', abrev: 'J. Pérez' },
  { id: 2, apellidos: 'Mendoza Lima', nombres: 'Rosa María', abrev: 'R. Mendoza' },
  { id: 3, apellidos: 'Torres Vega', nombres: 'Carlos Iván', abrev: 'C. Torres' },
  { id: 4, apellidos: 'López Castro', nombres: 'María Elena', abrev: 'M. López' },
  { id: 5, apellidos: 'Sánchez Ruiz', nombres: 'Pedro Luis', abrev: 'P. Sánchez' },
  { id: 6, apellidos: 'Flores Díaz', nombres: 'Ana Patricia', abrev: 'A. Flores' },
  { id: 7, apellidos: 'Vargas Mora', nombres: 'Luis Alberto', abrev: 'L. Vargas' },
  { id: 8, apellidos: 'García Paz', nombres: 'Elena Sofía', abrev: 'E. García' },
  { id: 9, apellidos: 'Quispe Tapia', nombres: 'Roberto', abrev: 'R. Quispe' },
  { id: 10, apellidos: 'Salcedo Vera', nombres: 'Carmen Luz', abrev: 'C. Salcedo' },
];

const e = (
  id: number,
  nivel: Nivel,
  grado: string,
  sec: string,
  dia: number,
  per: number,
  cur: number,
  doc: number,
): EntradaHorario => ({ id, nivel, grado, seccion: sec, dia, periodoId: per, cursoId: cur, docenteId: doc });

export const MOCK_ENTRADAS: EntradaHorario[] = [
  e(1, 'Primaria', '5°', 'A', 0, 1, 7, 1), e(2, 'Primaria', '5°', 'A', 0, 2, 7, 1),
  e(3, 'Primaria', '5°', 'A', 0, 3, 8, 2), e(4, 'Primaria', '5°', 'A', 0, 5, 9, 2),
  e(5, 'Primaria', '5°', 'A', 0, 6, 10, 3),
  e(6, 'Primaria', '5°', 'A', 1, 1, 7, 1), e(7, 'Primaria', '5°', 'A', 1, 2, 16, 5),
  e(8, 'Primaria', '5°', 'A', 1, 3, 16, 5), e(9, 'Primaria', '5°', 'A', 1, 5, 8, 2),
  e(10, 'Primaria', '5°', 'A', 1, 6, 13, 7),
  e(11, 'Primaria', '5°', 'A', 2, 1, 7, 1), e(12, 'Primaria', '5°', 'A', 2, 2, 7, 1),
  e(13, 'Primaria', '5°', 'A', 2, 3, 14, 6), e(14, 'Primaria', '5°', 'A', 2, 5, 8, 2),
  e(15, 'Primaria', '5°', 'A', 2, 6, 13, 7),
  e(16, 'Primaria', '5°', 'A', 3, 1, 16, 5), e(17, 'Primaria', '5°', 'A', 3, 2, 9, 2),
  e(18, 'Primaria', '5°', 'A', 3, 3, 14, 6), e(19, 'Primaria', '5°', 'A', 3, 5, 11, 4),
  e(20, 'Primaria', '5°', 'A', 3, 6, 11, 4),
  e(21, 'Primaria', '5°', 'A', 4, 1, 7, 1), e(22, 'Primaria', '5°', 'A', 4, 2, 17, 8),
  e(23, 'Primaria', '5°', 'A', 4, 3, 10, 3), e(24, 'Primaria', '5°', 'A', 4, 5, 14, 6),
  e(25, 'Primaria', '5°', 'A', 4, 6, 10, 3),
  e(26, 'Primaria', '5°', 'A', 0, 8, 99, 2), e(27, 'Primaria', '5°', 'A', 3, 8, 99, 2),
  e(28, 'Primaria', '5°', 'A', 1, 8, 11, 4), e(29, 'Primaria', '5°', 'A', 2, 8, 10, 3),
  e(30, 'Primaria', '5°', 'A', 4, 8, 7, 1), e(31, 'Primaria', '5°', 'A', 0, 9, 8, 2),
  e(32, 'Primaria', '5°', 'A', 1, 9, 14, 6), e(33, 'Primaria', '5°', 'A', 2, 9, 16, 5),
  e(101, 'Primaria', '5°', 'B', 0, 1, 7, 1), e(102, 'Primaria', '5°', 'B', 0, 2, 7, 9),
  e(103, 'Primaria', '5°', 'B', 0, 3, 8, 10),
  e(104, 'Primaria', '5°', 'B', 1, 1, 7, 9), e(105, 'Primaria', '5°', 'B', 1, 2, 16, 5),
  e(106, 'Primaria', '5°', 'B', 1, 3, 16, 5),
  e(107, 'Primaria', '5°', 'B', 2, 1, 7, 9), e(108, 'Primaria', '5°', 'B', 2, 2, 7, 9),
  e(109, 'Primaria', '5°', 'B', 2, 3, 14, 6),
  e(110, 'Primaria', '5°', 'B', 3, 1, 16, 5), e(111, 'Primaria', '5°', 'B', 3, 2, 9, 10),
  e(112, 'Primaria', '5°', 'B', 3, 3, 14, 6),
  e(113, 'Primaria', '5°', 'B', 4, 1, 7, 9), e(114, 'Primaria', '5°', 'B', 4, 5, 14, 6),
  e(115, 'Primaria', '5°', 'B', 4, 6, 10, 3),
  e(201, 'Secundaria', '3°', 'A', 0, 1, 18, 9), e(202, 'Secundaria', '3°', 'A', 0, 2, 18, 9),
  e(203, 'Secundaria', '3°', 'A', 0, 3, 22, 10), e(204, 'Secundaria', '3°', 'A', 0, 5, 25, 3),
  e(205, 'Secundaria', '3°', 'A', 0, 6, 25, 3), e(206, 'Secundaria', '3°', 'A', 0, 7, 27, 4),
  e(207, 'Secundaria', '3°', 'A', 0, 8, 27, 4),
  e(208, 'Secundaria', '3°', 'A', 1, 1, 18, 9), e(209, 'Secundaria', '3°', 'A', 1, 2, 19, 9),
  e(210, 'Secundaria', '3°', 'A', 1, 3, 22, 10), e(211, 'Secundaria', '3°', 'A', 1, 5, 25, 3),
  e(212, 'Secundaria', '3°', 'A', 1, 6, 29, 4), e(213, 'Secundaria', '3°', 'A', 1, 7, 32, 7),
  e(214, 'Secundaria', '3°', 'A', 1, 8, 32, 7),
  e(215, 'Secundaria', '3°', 'A', 2, 1, 18, 9), e(216, 'Secundaria', '3°', 'A', 2, 2, 19, 9),
  e(217, 'Secundaria', '3°', 'A', 2, 3, 22, 10), e(218, 'Secundaria', '3°', 'A', 2, 5, 30, 5),
  e(219, 'Secundaria', '3°', 'A', 2, 6, 33, 6), e(220, 'Secundaria', '3°', 'A', 2, 7, 33, 6),
  e(221, 'Secundaria', '3°', 'A', 3, 1, 22, 10), e(222, 'Secundaria', '3°', 'A', 3, 2, 30, 5),
  e(223, 'Secundaria', '3°', 'A', 3, 3, 31, 4), e(224, 'Secundaria', '3°', 'A', 3, 5, 30, 5),
  e(225, 'Secundaria', '3°', 'A', 3, 6, 29, 4), e(226, 'Secundaria', '3°', 'A', 3, 7, 33, 6),
  e(227, 'Secundaria', '3°', 'A', 4, 1, 31, 4),
  e(228, 'Secundaria', '3°', 'A', 0, 8, 18, 9), e(229, 'Secundaria', '3°', 'A', 1, 8, 22, 10),
  e(230, 'Secundaria', '3°', 'A', 2, 8, 30, 5), e(231, 'Secundaria', '3°', 'A', 3, 8, 31, 4),
  e(232, 'Secundaria', '3°', 'A', 4, 8, 99, 10),
  e(233, 'Secundaria', '3°', 'A', 0, 9, 19, 9), e(234, 'Secundaria', '3°', 'A', 1, 9, 33, 6),
  e(235, 'Secundaria', '3°', 'A', 2, 9, 27, 4), e(236, 'Secundaria', '3°', 'A', 3, 9, 25, 3),
  e(237, 'Secundaria', '3°', 'A', 4, 10, 18, 9), e(238, 'Secundaria', '3°', 'A', 0, 10, 22, 10),
  e(239, 'Secundaria', '3°', 'A', 1, 10, 30, 5), e(240, 'Secundaria', '3°', 'A', 2, 10, 33, 6),
];

export const CLASES_CONOCIDAS = [
  { nivel: 'Inicial' as Nivel, grado: '5 años', seccion: 'A' },
  { nivel: 'Inicial' as Nivel, grado: '4 años', seccion: 'A' },
  { nivel: 'Primaria' as Nivel, grado: '1°', seccion: 'A' },
  { nivel: 'Primaria' as Nivel, grado: '2°', seccion: 'A' },
  { nivel: 'Primaria' as Nivel, grado: '3°', seccion: 'A' },
  { nivel: 'Primaria' as Nivel, grado: '4°', seccion: 'A' },
  { nivel: 'Primaria' as Nivel, grado: '5°', seccion: 'A' },
  { nivel: 'Primaria' as Nivel, grado: '5°', seccion: 'B' },
  { nivel: 'Primaria' as Nivel, grado: '6°', seccion: 'A' },
  { nivel: 'Secundaria' as Nivel, grado: '1°', seccion: 'A' },
  { nivel: 'Secundaria' as Nivel, grado: '2°', seccion: 'A' },
  { nivel: 'Secundaria' as Nivel, grado: '3°', seccion: 'A' },
  { nivel: 'Secundaria' as Nivel, grado: '4°', seccion: 'A' },
  { nivel: 'Secundaria' as Nivel, grado: '5°', seccion: 'A' },
];

/** Perfil académico demo por usuario autenticado */
export const PERFIL_ESTUDIANTE_POR_USUARIO: Record<string, { nivel: Nivel; grado: string; seccion: string }> = {
  '5': { nivel: 'Primaria', grado: '5°', seccion: 'A' },
};
