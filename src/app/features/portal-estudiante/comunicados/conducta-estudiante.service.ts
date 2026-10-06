import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { ConductaRegistroPadre, ConductaPadreResponse } from '../../portal-padre/comunicacion/conducta-padre.service';

@Injectable({ providedIn: 'root' })
export class ConductaEstudianteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/students/me/conduct`;

  readonly loading = signal(false);
  readonly conducta = signal<Omit<ConductaPadreResponse, 'estudiante'> | null>(null);

  load(): Observable<Omit<ConductaPadreResponse, 'estudiante'>> {
    this.loading.set(true);
    return this.http.get<Omit<ConductaPadreResponse, 'estudiante'>>(this.base).pipe(
      tap((data) => this.conducta.set(data)),
      catchError((err) => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }
}

export type { ConductaRegistroPadre };
