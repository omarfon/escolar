import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, forkJoin, map, of, tap, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../core/tenant/tenant-http.util';
import { StudentsApiService } from '../../core/api/students-api.service';
import { PagosService } from '../tesoreria/pagos/pagos.service';
import { DocentesPage } from '../matricula/maestros/docentes/docentes.model';
import { VacanteItem } from '../matricula/maestros/salones/salones.model';

export interface DashboardVacante {
  id: number;
  nivel: string;
  grado: string;
  seccion: string;
  label: string;
  capacidad: number;
  matriculados: number;
  disponibles: number;
  estado: 'disponible' | 'completa' | 'sobreocupada';
}

export interface DashboardStats {
  anioEscolar: number;
  estudiantesMatriculados: number;
  docentesActivos: number;
  asistenciaPromedio: number;
  pagosPendientes: number;
  familiasConDeuda: number;
  totalRegistrosAsistencia: number;
  vacantesDisponibles: DashboardVacante[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly studentsApi = inject(StudentsApiService);
  private readonly pagosSvc = inject(PagosService);
  private readonly base = `${environment.apiUrl}/dashboard`;
  private readonly api = environment.apiUrl;

  readonly loading = signal(false);
  readonly stats = signal<DashboardStats | null>(null);

  loadStats(anioEscolar?: number): Observable<DashboardStats> {
    this.loading.set(true);
    let params = withInstitutionParams(this.tenant);
    if (anioEscolar) params = params.set('anioEscolar', String(anioEscolar));

    return this.http.get<DashboardStats>(`${this.base}/stats`, { params }).pipe(
      catchError(err =>
        this.shouldFallback(err)
          ? this.loadStatsFallback(anioEscolar)
          : throwError(() => this.toLoadError(err)),
      ),
      tap(data => this.stats.set({
        ...data,
        vacantesDisponibles: data.vacantesDisponibles ?? [],
      })),
      catchError(err => {
        this.stats.set(null);
        return throwError(() => err);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  private shouldFallback(err: unknown): boolean {
    const status = (err as { status?: number })?.status;
    return status === 0 || status === 404 || (status !== undefined && status >= 500);
  }

  private loadStatsFallback(anioEscolar?: number): Observable<DashboardStats> {
    const anio = anioEscolar ?? new Date().getFullYear();

    return forkJoin({
      stats: this.http
        .get<{ total: number; activos: number; matriculadosActivos: number }>(
          `${this.api}/students/stats`,
        )
        .pipe(catchError(() => of(null))),
      docentes: this.http
        .get<DocentesPage>(`${this.api}/maestros/docentes`, {
          params: new HttpParams()
            .set('page', '1')
            .set('pageSize', '1')
            .set('estado', 'activo'),
        })
        .pipe(catchError(() => of(null))),
      treasury: this.pagosSvc.getSummary(anio).pipe(catchError(() => of(null))),
      vacantes: this.http
        .get<VacanteItem[]>(`${this.api}/maestros/salones/vacancies`, {
          params: new HttpParams().set('anioEscolar', String(anio)),
        })
        .pipe(catchError(() => of([]))),
    }).pipe(
      map(({ stats, docentes, treasury, vacantes }) => {
        const pendiente = treasury?.pendiente ?? 0;
        const vencido = treasury?.vencido ?? 0;

        return {
          anioEscolar: treasury?.anioEscolar ?? anio,
          estudiantesMatriculados:
            stats?.matriculadosActivos ?? stats?.activos ?? stats?.total ?? 0,
          docentesActivos: docentes?.meta?.activos ?? docentes?.total ?? 0,
          asistenciaPromedio: 0,
          pagosPendientes: Math.round((pendiente + vencido) * 100) / 100,
          familiasConDeuda: treasury?.cargosPendientes ?? 0,
          totalRegistrosAsistencia: 0,
          vacantesDisponibles: this.mapVacantes(vacantes),
        } satisfies DashboardStats;
      }),
    );
  }

  private mapVacantes(items: VacanteItem[]): DashboardVacante[] {
    return items
      .filter(v => v.disponibles > 0)
      .sort((a, b) => {
        const byDisp = b.disponibles - a.disponibles;
        if (byDisp !== 0) return byDisp;
        const nivel = a.nivel.localeCompare(b.nivel, 'es');
        if (nivel !== 0) return nivel;
        return a.grado.localeCompare(b.grado, 'es', { numeric: true });
      })
      .map(v => ({
        id: v.id,
        nivel: v.nivel,
        grado: v.grado,
        seccion: v.seccion,
        label: `${v.grado} ${v.nivel} "${v.seccion}"`,
        capacidad: v.aforo,
        matriculados: v.matriculados,
        disponibles: v.disponibles,
        estado: v.estado,
      }));
  }

  private toLoadError(err: unknown): Error {
    const status = (err as { status?: number })?.status;
    const userMessage = (err as { userMessage?: string })?.userMessage;

    if (status === 0) {
      return new Error(
        'No se pudo conectar con el servidor. Verifica que el backend esté activo (puerto 3000).',
      );
    }
    if (status === 403) {
      return new Error(userMessage ?? 'No tienes permiso para ver los indicadores del dashboard.');
    }
    if (status === 404) {
      return new Error('El endpoint del dashboard no está disponible. Reinicia el backend con los últimos cambios.');
    }
    return new Error(userMessage ?? 'No se pudieron cargar los indicadores del dashboard.');
  }
}
