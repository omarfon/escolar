export interface HijoResumen {
  studentId: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  nivel: string;
  grado: string;
  seccion: string;
  aulaLabel: string;
  parentesco: string;
}

export interface CursoSeguimiento {
  curso: string;
  promedio: number | null;
  nivel: string | null;
  b1: number | null;
  b2: number | null;
  b3: number | null;
  b4: number | null;
  b1Nivel?: string | null;
  b2Nivel?: string | null;
  b3Nivel?: string | null;
  b4Nivel?: string | null;
  ultimasNotas: {
    id: number;
    descripcion: string;
    nota: number;
    fecha: string;
    bimestre: number;
    tipo: string;
  }[];
}

export interface AsistenciaSeguimiento {
  asistenciaPct: number;
  totalDias: number;
  presentes: number;
  faltas: number;
  tardanzas: number;
  justificadas: number;
  inasistenciasNetas: number;
  reciente: {
    id: number;
    fecha: string;
    estado: string;
    observacion?: string;
  }[];
}

export interface TareaSeguimiento {
  id: number;
  titulo: string;
  curso: string;
  fechaEntrega: string;
  estado: 'PENDING' | 'SUBMITTED' | 'OVERDUE' | 'GRADED';
  prioridad: 'alta' | 'media' | 'baja';
  comentarioEntrega?: string;
  archivoEntregaUrl?: string | null;
  archivoEntregaNombre?: string | null;
  archivoEntregaMime?: string | null;
  fechaEntregaReal?: string | null;
  nota?: number | null;
  retroalimentacion?: string;
  calificadoAt?: string | null;
}

export interface AlertaAusentismoPadre {
  id: number;
  mes: string;
  mesLabel: string;
  faltasInjustificadas: number;
  diasConsecutivos: number;
  nivelAlerta: 'normal' | 'alerta' | 'critico' | string;
  motivoAlerta: string;
  notificadoAt: string;
  notificadoPor: string;
  correoEnviado: boolean;
  leidoEnPortal: boolean;
}

export interface SeguimientoAcademico {
  estudiante: HijoResumen;
  promedioGeneral: number | null;
  nivelGeneral: string | null;
  asistencia: AsistenciaSeguimiento;
  alertasAusentismo?: AlertaAusentismoPadre[];
  tareasPendientes: number;
  tareasVencidas: number;
  tareasEntregadas: number;
  tareasCalificadas: number;
  cursos: CursoSeguimiento[];
  tareas: TareaSeguimiento[];
}

import { environment } from '@environments/environment';

export type SeguimientoVista = 'resumen' | 'notas' | 'asistencia' | 'tareas';

export const CURSO_STYLE: Record<string, { emoji: string; colorClass: string }> = {
  Matemática: { emoji: '🔢', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  Comunicación: { emoji: '✍️', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Comprensión Lectora': { emoji: '📖', colorClass: 'bg-sky-100 text-sky-800 border-sky-200' },
  'Ciencia y Tecnología': { emoji: '🔬', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  Razonamiento: { emoji: '🧠', colorClass: 'bg-purple-100 text-purple-800 border-purple-200' },
};

export const DEFAULT_CURSO_STYLE = { emoji: '📚', colorClass: 'bg-gray-100 text-gray-800 border-gray-200' };

export function cursoStyle(curso: string) {
  return CURSO_STYLE[curso] ?? DEFAULT_CURSO_STYLE;
}

export function nivelBadge(nivel: string | null): string {
  const map: Record<string, string> = {
    AD: 'badge-indigo',
    A: 'badge-green',
    B: 'badge-yellow',
    C: 'badge-red',
  };
  return map[nivel ?? ''] ?? 'badge-gray';
}

export function notaColor(nota: number | null): string {
  if (nota === null) return 'text-gray-400';
  if (nota >= 14) return 'text-emerald-600';
  if (nota >= 11) return 'text-amber-600';
  return 'text-red-600';
}

export function estadoAsistenciaLabel(estado: string): string {
  return { P: 'Presente', F: 'Falta', T: 'Tardanza', J: 'Justificada' }[estado] ?? estado;
}

export function estadoAsistenciaBadge(estado: string): string {
  return { P: 'badge-green', F: 'badge-red', T: 'badge-yellow', J: 'badge-blue' }[estado] ?? 'badge-gray';
}

export function estadoAsistenciaIcon(estado: string): string {
  return { P: 'check_circle', F: 'cancel', T: 'schedule', J: 'verified' }[estado] ?? 'help';
}

export function estadoAsistenciaIconBg(estado: string): string {
  return {
    P: 'text-emerald-700 bg-emerald-100',
    F: 'text-red-700 bg-red-100',
    T: 'text-amber-700 bg-amber-100',
    J: 'text-blue-700 bg-blue-100',
  }[estado] ?? 'text-gray-600 bg-gray-100';
}

export function estadoAsistenciaDot(estado: string): string {
  return {
    P: 'bg-emerald-500',
    F: 'bg-red-500',
    T: 'bg-amber-400',
    J: 'bg-blue-500',
  }[estado] ?? 'bg-gray-400';
}

export function estadoAsistenciaRowBg(estado: string): string {
  return {
    P: 'border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/40',
    F: 'border-red-100 bg-red-50/30 hover:bg-red-50/50',
    T: 'border-amber-100 bg-amber-50/20 hover:bg-amber-50/40',
    J: 'border-blue-100 bg-blue-50/20 hover:bg-blue-50/40',
  }[estado] ?? 'border-gray-100 bg-white hover:bg-gray-50/80';
}

export function asistenciaPctColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-600';
  if (pct >= 75) return 'text-amber-600';
  return 'text-red-600';
}

export function asistenciaPctConic(pct: number): string {
  const color = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
  const safe = Math.min(100, Math.max(0, pct));
  return `conic-gradient(${color} ${safe}%, #e5e7eb ${safe}%)`;
}

export function asistenciaPctMensaje(pct: number): string {
  if (pct >= 95) return 'Excelente asistencia';
  if (pct >= 90) return 'Muy buena asistencia';
  if (pct >= 75) return 'Asistencia regular';
  return 'Requiere atención';
}

export interface AsistenciaSegmento {
  key: string;
  label: string;
  count: number;
  color: string;
  textColor: string;
  icon: string;
  pct: number;
}

export function asistenciaSegmentos(a: AsistenciaSeguimiento): AsistenciaSegmento[] {
  const total = Math.max(a.totalDias, 1);
  return [
    {
      key: 'presentes',
      label: 'Presentes',
      count: a.presentes,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      icon: 'check_circle',
      pct: (a.presentes / total) * 100,
    },
    {
      key: 'tardanzas',
      label: 'Tardanzas',
      count: a.tardanzas,
      color: 'bg-amber-400',
      textColor: 'text-amber-700',
      icon: 'schedule',
      pct: (a.tardanzas / total) * 100,
    },
    {
      key: 'faltas',
      label: 'Faltas',
      count: a.faltas,
      color: 'bg-red-500',
      textColor: 'text-red-700',
      icon: 'cancel',
      pct: (a.faltas / total) * 100,
    },
    {
      key: 'justificadas',
      label: 'Justificadas',
      count: a.justificadas,
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      icon: 'verified',
      pct: (a.justificadas / total) * 100,
    },
  ];
}

export function tareaEstadoLabel(estado: TareaSeguimiento['estado']): string {
  return { PENDING: 'Pendiente', SUBMITTED: 'Entregada', OVERDUE: 'Vencida', GRADED: 'Calificada' }[estado];
}

export function tareaEstadoBadge(estado: TareaSeguimiento['estado']): string {
  return { PENDING: 'badge-yellow', SUBMITTED: 'badge-green', OVERDUE: 'badge-red', GRADED: 'badge-indigo' }[estado];
}

export function taskFileUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function parentescoLabel(parentesco: string): string {
  const map: Record<string, string> = {
    padre: 'Padre',
    madre: 'Madre',
    tutor: 'Tutor',
    apoderado: 'Apoderado',
  };
  return map[parentesco] ?? parentesco;
}

export function alertaAusentismoLabel(nivel: string): string {
  return { critico: 'Alerta crítica', alerta: 'Alerta temprana', normal: 'Informativa' }[nivel] ?? 'Alerta';
}

export function alertaAusentismoBadge(nivel: string): string {
  return { critico: 'badge-red', alerta: 'badge-yellow', normal: 'badge-gray' }[nivel] ?? 'badge-yellow';
}
