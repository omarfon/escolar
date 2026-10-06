import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { HistorialAcademicoListItem } from '../../features/academico/historial-academico/historial-academico.model';

export interface MatriculaHistorialContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel: string;
    dre: string;
    codigoModular: string;
  };
  permisoConsultar: string;
  tiposEvento: Array<{ codigo: string; label: string }>;
}

export interface MatriculaHistorialEvento {
  id: string;
  tipo: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  actorNombre?: string;
  actorRol?: string;
  metadata?: Record<string, unknown>;
}

export interface MatriculaHistorialDetalle {
  estudiante: {
    id: number;
    codigo: string;
    nombres: string;
    apellidos: string;
    dni: string;
    nivel: string;
    gradoActual: string;
    seccionActual: string;
    anioIngreso: string;
    estadoMatricula: string;
    activo: boolean;
  };
  resumen: {
    aniosRegistrados: number;
    eventosTotal: number;
    asistenciaPct: number;
    promedioGeneral: number | null;
  };
  trayectoriaAcademica: Array<{
    anio: string;
    grado: string;
    seccion: string;
    promedio: number;
    estado: string;
  }>;
  eventosMatricula: MatriculaHistorialEvento[];
}

export interface MatriculaHistorialListResponse {
  items: HistorialAcademicoListItem[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class EnrollmentHistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/enrollment-history`;

  getContext(): Observable<MatriculaHistorialContext> {
    return this.http.get<MatriculaHistorialContext>(`${this.base}/context`);
  }

  list(q?: string, page = 1, pageSize = 20): Observable<MatriculaHistorialListResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));
    if (q?.trim()) params = params.set('q', q.trim());
    return this.http.get<MatriculaHistorialListResponse>(this.base, { params });
  }

  getDetalle(studentId: number): Observable<MatriculaHistorialDetalle> {
    return this.http.get<MatriculaHistorialDetalle>(`${this.base}/${studentId}`);
  }
}
