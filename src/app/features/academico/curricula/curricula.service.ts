import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../core/tenant/tenant-http.util';
import {
  CreateAreaPayload,
  CreateCurriculaPayload,
  CreateCursoPayload,
  Curricula,
  CurriculaCatalog,
  CurriculaDetail,
  MallaCurricular,
  Area,
  Curso,
  NivelCurricula,
  UpdateAreaPayload,
  UpdateCurriculaPayload,
  UpdateCursoPayload,
} from './curricula.model';

@Injectable({ providedIn: 'root' })
export class CurriculaService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/curricula`;

  private scopedParams(params: HttpParams = new HttpParams()): HttpParams {
    return withInstitutionParams(this.tenant, params);
  }

  readonly loading = signal(false);
  readonly mallaLoading = signal(false);
  readonly saving = signal(false);

  loadCatalog(curriculumId?: number, nivel?: string, anio?: number): Observable<CurriculaCatalog> {
    this.loading.set(true);
    let params = new HttpParams();
    if (curriculumId) params = params.set('curriculumId', curriculumId);
    if (nivel) params = params.set('nivel', nivel);
    if (anio) params = params.set('anio', anio);
    return this.http.get<CurriculaCatalog>(`${this.base}/catalog`, { params: this.scopedParams(params) }).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  resolveVigente(nivel: NivelCurricula | string, anio?: number): Observable<Curricula> {
    let params = new HttpParams().set('nivel', nivel);
    if (anio) params = params.set('anio', anio);
    return this.http.get<Curricula>(`${this.base}/vigente`, { params: this.scopedParams(params) });
  }

  loadVigentes(anio?: number): Observable<Curricula[]> {
    let params = new HttpParams();
    if (anio) params = params.set('anio', anio);
    return this.http.get<Curricula[]>(`${this.base}/vigentes`, { params: this.scopedParams(params) });
  }

  loadCatalogVigente(nivel: NivelCurricula | string, anio?: number): Observable<CurriculaCatalog> {
    this.loading.set(true);
    let params = new HttpParams().set('nivel', nivel);
    if (anio) params = params.set('anio', anio);
    return this.http.get<CurriculaCatalog>(`${this.base}/vigente/catalog`, { params: this.scopedParams(params) }).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  loadMallaVigente(nivel: NivelCurricula | string, anio?: number): Observable<MallaCurricular> {
    this.mallaLoading.set(true);
    let params = new HttpParams().set('nivel', nivel);
    if (anio) params = params.set('anio', anio);
    return this.http.get<MallaCurricular>(`${this.base}/vigente/malla`, { params: this.scopedParams(params) }).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.mallaLoading.set(false)),
    );
  }

  loadCurriculas(filters?: {
    anio?: number;
    nivel?: string;
    estado?: string;
  }): Observable<Curricula[]> {
    let params = new HttpParams();
    if (filters?.anio) params = params.set('anio', filters.anio);
    if (filters?.nivel) params = params.set('nivel', filters.nivel);
    if (filters?.estado) params = params.set('estado', filters.estado);
    return this.http.get<Curricula[]>(this.base, { params: this.scopedParams(params) });
  }

  createCurricula(payload: CreateCurriculaPayload): Observable<Curricula> {
    this.saving.set(true);
    return this.http.post<Curricula>(this.base, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  updateCurricula(id: number, payload: UpdateCurriculaPayload): Observable<Curricula> {
    this.saving.set(true);
    return this.http.patch<Curricula>(`${this.base}/${id}`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  loadCurriculaDetail(id: number): Observable<CurriculaDetail> {
    return this.http.get<CurriculaDetail>(`${this.base}/${id}/summary`, {
      params: this.scopedParams(),
    });
  }

  loadMalla(curriculumId: number): Observable<MallaCurricular> {
    this.mallaLoading.set(true);
    return this.http.get<MallaCurricular>(`${this.base}/${curriculumId}/malla`, {
      params: this.scopedParams(),
    }).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.mallaLoading.set(false)),
    );
  }

  activateCurricula(id: number): Observable<Curricula> {
    this.saving.set(true);
    return this.http.patch<Curricula>(`${this.base}/${id}`, { estado: 'activo' }).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  copyCurricula(id: number): Observable<Curricula> {
    this.saving.set(true);
    return this.http.post<Curricula>(`${this.base}/${id}/copy`, {}).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  createArea(payload: CreateAreaPayload): Observable<Area> {
    this.saving.set(true);
    return this.http.post<Area>(`${this.base}/areas`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  updateArea(id: number, payload: UpdateAreaPayload): Observable<Area> {
    this.saving.set(true);
    return this.http.patch<Area>(`${this.base}/areas/${id}`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  createCurso(payload: CreateCursoPayload): Observable<Curso> {
    this.saving.set(true);
    return this.http.post<Curso>(`${this.base}/subjects`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  updateCurso(id: number, payload: UpdateCursoPayload): Observable<Curso> {
    this.saving.set(true);
    return this.http.patch<Curso>(`${this.base}/subjects/${id}`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }
}
