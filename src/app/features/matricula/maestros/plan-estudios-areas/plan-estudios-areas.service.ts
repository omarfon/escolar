import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import {
  Area,
  CreateAreaPayload,
  Curricula,
  NivelCurricula,
  UpdateAreaPayload,
} from '../../../academico/curricula/curricula.model';

export interface PlanEstudiosAreasContext {
  anioEscolar: number;
  niveles: string[];
  curriculas: Curricula[];
  areasPorCurricula: Array<{ curriculum: Curricula; areas: Area[] }>;
}

@Injectable({ providedIn: 'root' })
export class PlanEstudiosAreasService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/curricula`;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  loadContext(anio?: number): Observable<PlanEstudiosAreasContext> {
    this.loading.set(true);
    this.error.set('');
    let params = new HttpParams();
    if (anio) params = params.set('anio', String(anio));
    params = withInstitutionParams(this.tenant, params);
    return this.http.get<PlanEstudiosAreasContext>(`${this.base}/areas/context`, { params }).pipe(
      catchError((err) => {
        this.error.set(err?.error?.message ?? 'No se pudo cargar el contexto del plan de estudios.');
        return throwError(() => err);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  loadAreas(curriculumId: number): Observable<Area[]> {
    const params = withInstitutionParams(
      this.tenant,
      new HttpParams().set('curriculumId', String(curriculumId)),
    );
    return this.http.get<Area[]>(`${this.base}/areas/list`, { params });
  }

  resolveVigente(nivel: NivelCurricula, anio?: number): Observable<Curricula> {
    let params = new HttpParams().set('nivel', nivel);
    if (anio) params = params.set('anio', String(anio));
    params = withInstitutionParams(this.tenant, params);
    return this.http.get<Curricula>(`${this.base}/vigente`, { params });
  }

  createArea(payload: CreateAreaPayload): Observable<Area> {
    this.saving.set(true);
    this.error.set('');
    return this.http.post<Area>(`${this.base}/areas`, payload).pipe(
      catchError((err) => {
        this.error.set(err?.error?.message ?? 'No se pudo registrar el área.');
        return throwError(() => err);
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  updateArea(id: number, payload: UpdateAreaPayload): Observable<Area> {
    this.saving.set(true);
    this.error.set('');
    return this.http.patch<Area>(`${this.base}/areas/${id}`, payload).pipe(
      catchError((err) => {
        this.error.set(err?.error?.message ?? 'No se pudo actualizar el área.');
        return throwError(() => err);
      }),
      finalize(() => this.saving.set(false)),
    );
  }
}
