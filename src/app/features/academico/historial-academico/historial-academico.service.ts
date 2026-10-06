import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  HistorialAcademicoDetalle,
  HistorialAcademicoListItem,
} from './historial-academico.model';

@Injectable({ providedIn: 'root' })
export class HistorialAcademicoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/students`;

  readonly loading = signal(false);
  readonly loadingDetalle = signal(false);

  loadList(q?: string, page = 1, pageSize = 20): Observable<{ items: HistorialAcademicoListItem[]; total: number }> {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));
    if (q?.trim()) params = params.set('q', q.trim());
    return this.http
      .get<{ items: HistorialAcademicoListItem[]; total: number; page: number; pageSize: number }>(
        `${this.base}/historial-academico`,
        { params },
      )
      .pipe(
        catchError((err) => throwError(() => new Error(this.extractError(err)))),
        finalize(() => this.loading.set(false)),
      );
  }

  loadDetalle(id: number): Observable<HistorialAcademicoDetalle> {
    this.loadingDetalle.set(true);
    return this.http
      .get<HistorialAcademicoDetalle>(`${this.base}/${id}/historial-academico`)
      .pipe(
        catchError((err) => throwError(() => new Error(this.extractError(err)))),
        finalize(() => this.loadingDetalle.set(false)),
      );
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string' && body) return body;
      if (body?.message) {
        return Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
      }
      return err.message || 'Error al cargar historial académico';
    }
    if (err instanceof Error) return err.message;
    return 'Error al cargar historial académico';
  }
}
