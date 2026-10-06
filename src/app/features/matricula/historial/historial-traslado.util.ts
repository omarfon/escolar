import type { MatriculaHistorialEvento } from '../../../core/api/enrollment-history-api.service';



export function transferIdDesdeEvento(ev: MatriculaHistorialEvento): number | null {

  const metadata = ev.metadata as { transferRequestId?: number } | undefined;

  const id = metadata?.transferRequestId;

  return typeof id === 'number' && id > 0 ? id : null;

}



export interface RutaTrasladoOpciones {

  puedeAprobarDestino?: boolean;

  codigoModular?: string;

}



/** Enruta al seguimiento unificado del proceso de traslado. */

export function rutaTrasladoDesdeEvento(

  _ev: MatriculaHistorialEvento,

  _opts?: RutaTrasladoOpciones,

): string {

  return '/traslados/seguimiento';

}


