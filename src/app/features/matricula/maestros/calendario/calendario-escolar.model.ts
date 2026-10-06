export type CalendarioRolVista =
  | 'gestion_ie'
  | 'docente'
  | 'padre'
  | 'alumno'
  | 'personal_ie'
  | 'territorial';

export type CalendarioDiaTipo = 'lectivo' | 'no_lectivo' | 'feriado' | 'fin_semana';

export interface CalendarioContext {
  institucion: {
    id: number;
    nombre: string;
    siglas: string;
    anioEscolarActivo: number;
    ugel: string;
    dre: string;
  };
  rolVista: CalendarioRolVista;
  rolVistaLabel: string;
  ambitos: string[];
  permisoVer: string;
  permisoGestionar: string;
  puedeGestionar: boolean;
  anioVigente: {
    id: number;
    anio: number;
    fechaInicio: string;
    fechaFin: string;
    tipoPeriodo: string;
    estado: string;
    publicado: boolean;
    version: number;
  } | null;
  aniosDisponibles: Array<{ anio: number; estado: string; vigente: boolean }>;
}

export interface CalendarioDiaItem {
  fecha: string;
  tipo: CalendarioDiaTipo;
  feriado?: { id: number; nombre: string; tipo: string };
  eventos: Array<{
    id: number;
    titulo: string;
    tipo: string;
    horario: string;
    destinatarios: string;
  }>;
  periodo?: { id: number; nombre: string; numero: number };
}

export interface CalendarioVisualizacion {
  contexto: {
    institucion: {
      id: number;
      nombre: string;
      siglas: string;
      anioEscolarActivo: number;
    };
    anioEscolar: number;
    mes: string;
    desde: string;
    hasta: string;
    rolVista: CalendarioRolVista;
    rolVistaLabel: string;
    puedeGestionar: boolean;
    anioEscolarPublicado: boolean;
    versionCalendario: number | null;
  };
  periodos: Array<{
    id: number;
    numero: number;
    nombre: string;
    tipo: string;
    inicio: string;
    fin: string;
    actual: boolean;
    estado: string;
  }>;
  feriados: Array<{ id: number; fecha: string; nombre: string; tipo: string }>;
  eventos: Array<{
    id: number;
    titulo: string;
    tipo: string;
    fechaInicio: string;
    fechaFin: string | null;
    horario: string;
    destinatarios: string;
    estado: string;
  }>;
  dias: CalendarioDiaItem[];
  resumen: {
    diasLaborables: number;
    feriados: number;
    eventos: number;
    periodos: number;
    diasLectivos: number;
  };
}

export const DIA_TIPO_CFG: Record<
  CalendarioDiaTipo,
  { label: string; badge: string; cell: string }
> = {
  lectivo: {
    label: 'Día lectivo',
    badge: 'badge-green',
    cell: 'bg-white border-gray-100 hover:bg-gray-50',
  },
  feriado: {
    label: 'Feriado',
    badge: 'badge-red',
    cell: 'bg-red-50 border-red-100 hover:bg-red-100/60',
  },
  fin_semana: {
    label: 'Fin de semana',
    badge: 'badge-gray',
    cell: 'bg-gray-50 border-gray-100 text-gray-400',
  },
  no_lectivo: {
    label: 'No lectivo',
    badge: 'badge-orange',
    cell: 'bg-orange-50 border-orange-100',
  },
};

export const MESES_CALENDARIO = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];
