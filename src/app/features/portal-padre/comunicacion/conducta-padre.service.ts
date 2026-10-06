import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { AuthService } from '../../../core/auth/services/auth.service';
import { HijoResumen } from '../seguimiento/seguimiento.model';

export interface ConductaRegistroPadre {
  id: number;
  tipo: string;
  descripcion: string;
  fecha: string;
  lugar: string;
  reportadoPor: string;
  estado: string;
  medida: string;
  observaciones: string;
}

export interface ConductaPadreResponse {
  estudiante: HijoResumen;
  conductaNota: string;
  resumen: {
    leves: number;
    graves: number;
    muyGraves: number;
    reconocimientos: number;
    totalDemeritos: number;
    nivel: string;
  };
  meritos: ConductaRegistroPadre[];
  demeritos: ConductaRegistroPadre[];
}

@Injectable({ providedIn: 'root' })
export class ConductaPadreService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiUrl}/parents`;

  readonly loading = signal(false);
  readonly conducta = signal<ConductaPadreResponse | null>(null);

  load(studentId: number): Observable<ConductaPadreResponse> {
    this.loading.set(true);
    const params = new HttpParams().set('email', this.parentEmail());

    return this.http
      .get<ConductaPadreResponse>(`${this.base}/children/${studentId}/conduct`, { params })
      .pipe(
        tap((data) => this.conducta.set(data)),
        catchError((err) => throwError(() => err)),
        finalize(() => this.loading.set(false)),
      );
  }

  private parentEmail(): string {
    return this.auth.currentUser()?.email ?? 'padre@escolar.pe';
  }
}
