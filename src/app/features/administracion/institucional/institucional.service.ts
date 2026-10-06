import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../core/tenant/tenant-http.util';
import {
  ConfigSistema,
  Grado,
  InstitucionData,
  InstitutionConfigResponse,
  ModuloSistema,
  Nivel,
  Periodo,
  Seccion,
  Sede,
} from './institucional.model';

@Injectable({ providedIn: 'root' })
export class InstitucionalService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/institution`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  load(): Observable<InstitutionConfigResponse | null> {
    this.loading.set(true);
    return this.http.get<InstitutionConfigResponse>(this.base, {
      params: withInstitutionParams(this.tenant),
    }).pipe(
      tap(() => this.loading.set(false)),
      catchError(() => {
        this.loading.set(false);
        return of(null);
      }),
    );
  }

  save(payload: {
    inst: InstitucionData;
    periodos: Periodo[];
    config: ConfigSistema;
    modulos: ModuloSistema[];
  }) {
    this.saving.set(true);
    const inst = payload.inst;
    const body: Record<string, unknown> = {
      nombre: inst.nombre,
      siglas: inst.siglas,
      ruc: inst.ruc,
      codigoModular: inst.codigoModular,
      tipoGestion: inst.tipoGestion,
      ugel: inst.ugel,
      dre: inst.dre,
      resolucion: inst.resolucion,
      direccion: inst.direccion,
      distrito: inst.distrito,
      provincia: inst.provincia,
      region: inst.region,
      codigoPostal: inst.codigoPostal,
      telefono: inst.telefono,
      telefono2: inst.telefono2,
      email: inst.email,
      web: inst.web,
      facebook: inst.facebook,
      director: inst.director,
      subdirector: inst.subdirector,
      administrador: inst.administrador,
      anio: inst.anio,
      sistemaEval: inst.sistemaEval,
      tipoPeriodo: inst.tipoPeriodo,
      notaMinima: Number(inst.notaMinima),
      periodos: payload.periodos,
      config: payload.config,
      modulos: payload.modulos,
    };
    if (inst.escalaLogro) {
      body['escalaLogro'] = {
        AD: Number(inst.escalaLogro.AD),
        A: Number(inst.escalaLogro.A),
        B: Number(inst.escalaLogro.B),
      };
    }
    return this.http.patch<InstitutionConfigResponse['institution']>(`${this.base}`, body, {
      params: withInstitutionParams(this.tenant),
    }).pipe(
      tap(() => this.saving.set(false)),
      catchError(err => {
        this.saving.set(false);
        throw err;
      }),
    );
  }

  loadEducationLevels(): Observable<Nivel[]> {
    this.loading.set(true);
    return this.http.get<Nivel[]>(`${this.base}/education-levels`, {
      params: withInstitutionParams(this.tenant),
    }).pipe(
      tap(() => this.loading.set(false)),
      catchError(() => {
        this.loading.set(false);
        return of([]);
      }),
    );
  }

  createEducationLevel(payload: { nombre: string; activo?: boolean }) {
    return this.http.post<Nivel>(`${this.base}/education-levels`, payload);
  }

  updateEducationLevel(id: number, payload: Partial<Pick<Nivel, 'nombre' | 'activo'>>) {
    return this.http.patch<Nivel>(`${this.base}/education-levels/${id}`, payload);
  }

  deleteEducationLevel(id: number) {
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.base}/education-levels/${id}`);
  }

  createGradeLevel(nivelId: number, payload: { nombre: string }) {
    return this.http.post<Grado>(`${this.base}/education-levels/${nivelId}/grades`, payload);
  }

  updateGradeLevel(id: number, payload: { nombre: string }) {
    return this.http.patch<Grado>(`${this.base}/grade-levels/${id}`, payload);
  }

  deleteGradeLevel(id: number) {
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.base}/grade-levels/${id}`);
  }

  createGradeSection(gradoId: number, payload: { nombre: string }) {
    return this.http.post<Seccion>(`${this.base}/grade-levels/${gradoId}/sections`, payload);
  }

  deleteGradeSection(id: number) {
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.base}/grade-sections/${id}`);
  }

  createCampus(payload: Omit<Sede, 'id'>) {
    return this.http.post<Sede>(`${this.base}/campuses`, payload, {
      params: withInstitutionParams(this.tenant),
    });
  }

  updateCampus(id: number, payload: Partial<Sede>) {
    return this.http.patch<Sede>(`${this.base}/campuses/${id}`, payload);
  }

  deleteCampus(id: number) {
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.base}/campuses/${id}`);
  }
}
