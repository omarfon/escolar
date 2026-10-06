import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, switchMap, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { MaestrosPeriodosAcademicosService } from '../../matricula/maestros/periodos-academicos/periodos-academicos.service';
import {
  DocenteMisSalonesResponse,
  DocenteSalonAsignado,
} from './asistencia-docente.model';

function salonDedupeKey(
  s: Pick<DocenteSalonAsignado, 'nivel' | 'grado' | 'seccion'>,
): string {
  const gradoRaw = s.grado.trim();
  const grado = /^\d+°?$/.test(gradoRaw)
    ? `${gradoRaw.replace(/[^\d]/g, '')}°`
    : gradoRaw;
  return `${s.nivel.trim()}|${grado}|${s.seccion.trim().toUpperCase()}`;
}

function dedupeSalones(salones: DocenteSalonAsignado[]): DocenteSalonAsignado[] {
  const byKey = new Map<string, DocenteSalonAsignado>();

  for (const salon of salones) {
    const key = salonDedupeKey(salon);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...salon,
        cursos: [...new Set(salon.cursos ?? [])],
      });
      continue;
    }

    existing.cursos = [...new Set([...existing.cursos, ...(salon.cursos ?? [])])];
    existing.totalAlumnos = Math.max(existing.totalAlumnos, salon.totalAlumnos);
    if (!existing.aforo && salon.aforo) existing.aforo = salon.aforo;
  }

  return [...byKey.values()];
}

@Injectable({ providedIn: 'root' })
export class AsistenciaDocenteService {
  private readonly http = inject(HttpClient);
  private readonly periodos = inject(MaestrosPeriodosAcademicosService);
  private readonly base = `${environment.apiUrl}/maestros/docentes/me/salones`;

  readonly loading = signal(false);

  loadMisSalones(anioEscolar?: number): Observable<DocenteMisSalonesResponse> {
    const anio$ = anioEscolar != null
      ? of(anioEscolar)
      : this.periodos.resolveAnioEscolarActual();

    return anio$.pipe(
      switchMap((anio) => {
        this.loading.set(true);
        const params = new HttpParams().set('anioEscolar', String(anio));
        return this.http.get<DocenteMisSalonesResponse>(this.base, { params }).pipe(
          map((res) => ({ ...res, salones: dedupeSalones(res.salones ?? []) })),
          catchError((err) => throwError(() => err)),
          finalize(() => this.loading.set(false)),
        );
      }),
    );
  }
}
