export interface AlertSettings {
  diasAlertaAusentismo: number;
  diasAlertaCritica: number;
  porcentajeUmbral?: number;
  periodoTipo?: 'mes' | 'bimestre' | 'rolling30';
  nivelEducativo?: string;
  modalidad?: 'todos' | 'presencial' | 'virtual';
  institutionId?: number | null;
}

export type NivelAlerta = 'normal' | 'alerta' | 'critico';

export interface AlertaAusentismo {
  studentId: number;
  estudiante: string;
  nivel: string;
  grado: string;
  seccion: string;
  faltasInjustificadas: number;
  faltasJustificadas: number;
  diasConsecutivos: number;
  ultimaFalta: string | null;
  nivelAlerta: NivelAlerta;
  motivoAlerta: string;
  totalRegistrosBd?: number;
  fechasInasistencia?: string[];
  apoderadoNotificado?: boolean;
  notificadoAt?: string | null;
  notificadoPor?: string | null;
}

export interface AlertasResumen {
  totalAlumnos: number;
  alumnosConFaltasInjustificadas: number;
  totalFaltasInjustificadas: number;
  totalRegistrosAsistencia: number;
  alumnosEnAlerta: number;
  alumnosEnCritico: number;
}

export interface AlertasResponse {
  settings: AlertSettings;
  alerts: AlertaAusentismo[];
  conFaltas: AlertaAusentismo[];
  resumen: AlertasResumen;
  mes: string | null;
  mesLabel: string | null;
}

export interface AlertaFilters {
  nivel?: string;
  grado?: string;
  mes?: string;
  busqueda?: string;
  soloCriticos?: boolean;
}

export type RecurrentAlertEstado = 'abierta' | 'atendida' | 'derivada' | 'cerrada';

export interface RecurrentAlertItem {
  id: number;
  institutionId: number;
  studentId: number;
  estudiante: string;
  nivel: string;
  grado: string;
  seccion: string;
  periodoKey: string;
  periodoLabel: string;
  periodoTipo: string;
  estado: RecurrentAlertEstado;
  nivelRiesgo: string;
  faltasInjustificadas: number;
  diasConsecutivos: number;
  porcentajeInasistencia: number;
  motivoObservacion: string;
  derivadoARol: string;
  derivadoAUsuario: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface RecurrentAlertsListResponse {
  items: RecurrentAlertItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RecurrentAlertsContext {
  institucion: {
    id: number;
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel: string;
    dre: string;
  } | null;
  settings: AlertSettings;
  permisos: {
    consultar: boolean;
    gestionar: boolean;
    exportar: boolean;
  };
  alcance: 'IE' | 'SIAGIE' | 'UGEL' | 'DRE' | 'MINEDU';
}

export interface ScanRecurrentAlertsResult {
  creadas: number;
  actualizadas: number;
  omitidas: number;
}
