import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiAttendance } from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/services/auth.service';
import { PerfilEstudiante } from '../../academico/horarios/models/horario.model';
import { PortalEstudianteService } from '../../portal-estudiante/services/portal-estudiante.service';
import {
  EstadoAsistencia,
  RegistroAsistenciaAlumno,
  ResumenAsistenciaAlumno,
} from '../models/asistencia-estudiante.model';

@Injectable({ providedIn: 'root' })
export class AsistenciaEstudianteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly portal = inject(PortalEstudianteService);
  private readonly base = `${environment.apiUrl}/attendances`;

  readonly anioActual = new Date().getFullYear();

  private readonly _registros = signal<RegistroAsistenciaAlumno[]>([]);
  readonly registros = this._registros.asReadonly();
  readonly loading = signal(false);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);

    const request$ = this.auth.isPortalEstudiante()
      ? this.portal.ensureLoaded().pipe(
          switchMap((perfil) => {
            const studentId = perfil?.studentId;
            if (!studentId) return of([] as ApiAttendance[]);
            const params = new HttpParams()
              .set('studentId', String(studentId))
              .set('anioEscolar', String(this.anioActual));
            return this.http.get<ApiAttendance[]>(this.base, { params });
          }),
        )
      : this.http.get<ApiAttendance[]>(this.base, {
          params: new HttpParams()
            .set('studentId', this.getEstudianteId())
            .set('anioEscolar', String(this.anioActual)),
        });

    request$
      .pipe(
        map(items => items.map(item => this.mapRegistro(item))),
        tap(registros => this._registros.set(registros)),
        catchError(() => {
          this._registros.set([]);
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }

  getEstudianteId(): string {
    return this.portal.getStudentIdString();
  }

  getPerfil(): PerfilEstudiante {
    const perfil = this.portal.getPerfilOrNull();
    if (perfil) {
      return {
        nivel: perfil.nivel,
        grado: perfil.grado,
        seccion: perfil.seccion,
        aulaLabel: perfil.aulaLabel,
      };
    }
    return {
      nivel: 'Primaria',
      grado: '—',
      seccion: '—',
      aulaLabel: '—',
    };
  }

  getRegistros(): RegistroAsistenciaAlumno[] {
    return this._registros()
      .slice()
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  filtrarRegistros(
    registros: RegistroAsistenciaAlumno[],
    estado: EstadoAsistencia | 'TODOS',
  ): RegistroAsistenciaAlumno[] {
    if (estado === 'TODOS') return registros;
    return registros.filter((r) => r.estado === estado);
  }

  filtrarPorMes(
    registros: RegistroAsistenciaAlumno[],
    mes: string,
  ): RegistroAsistenciaAlumno[] {
    return registros.filter((r) => r.fecha.startsWith(mes));
  }

  obtenerMesesDisponibles(registros: RegistroAsistenciaAlumno[]): string[] {
    const meses = new Set(registros.map((r) => r.fecha.slice(0, 7)));
    return Array.from(meses).sort((a, b) => b.localeCompare(a));
  }

  mesActual(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  calcularResumen(registros: RegistroAsistenciaAlumno[]): ResumenAsistenciaAlumno {
    const totalDias = registros.length;
    const presentes = registros.filter((r) => r.estado === 'P').length;
    const faltas = registros.filter((r) => r.estado === 'F').length;
    const tardanzas = registros.filter((r) => r.estado === 'T').length;
    const justificadas = registros.filter((r) => r.estado === 'J').length;
    const inasistenciasNetas = Math.max(faltas - justificadas, 0);
    const asistenciaPct = totalDias ? Math.round((presentes / totalDias) * 100) : 0;
    return {
      totalDias,
      presentes,
      faltas,
      tardanzas,
      justificadas,
      inasistenciasNetas,
      asistenciaPct,
    };
  }

  estadoLabel(estado: EstadoAsistencia): string {
    return {
      P: 'Presente',
      F: 'Falta',
      T: 'Tardanza',
      J: 'Justificada',
    }[estado];
  }

  estadoBadge(estado: EstadoAsistencia): string {
    return {
      P: 'badge-green',
      F: 'badge-red',
      T: 'badge-yellow',
      J: 'badge-blue',
    }[estado];
  }

  formatFecha(fechaISO: string): string {
    return format(parseISO(fechaISO), 'dd/MM/yyyy', { locale: es });
  }

  formatDia(fechaISO: string): string {
    return format(parseISO(fechaISO), 'EEEE', { locale: es });
  }

  formatMes(mesISO: string): string {
    return format(parseISO(`${mesISO}-01`), 'MMMM yyyy', { locale: es });
  }

  private mapRegistro(r: ApiAttendance): RegistroAsistenciaAlumno {
    return {
      id: r.id,
      estudianteId: String(r.studentId),
      fecha: r.fecha.slice(0, 10),
      estado: r.estado,
      observacion: r.observacion,
    };
  }
}
