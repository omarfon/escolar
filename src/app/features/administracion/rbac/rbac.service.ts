import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  EffectiveAuthPreview,
  RbacAuditResponse,
  RbacContext,
} from './rbac.model';

@Injectable({ providedIn: 'root' })
export class RbacService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/rbac`;

  readonly loadingAudit = signal(false);

  loadContext(): Observable<RbacContext> {
    return this.http.get<RbacContext>(`${this.base}/context`);
  }

  loadAudit(filters?: {
    entidad?: string;
    usuario?: string;
    desde?: string;
    hasta?: string;
    page?: number;
    pageSize?: number;
  }): Observable<RbacAuditResponse> {
    this.loadingAudit.set(true);
    let params = new HttpParams();
    if (filters?.entidad) params = params.set('entidad', filters.entidad);
    if (filters?.usuario) params = params.set('usuario', filters.usuario);
    if (filters?.desde) params = params.set('desde', filters.desde);
    if (filters?.hasta) params = params.set('hasta', filters.hasta);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));

    return this.http.get<RbacAuditResponse>(`${this.base}/audit`, { params }).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.loadingAudit.set(false)),
    );
  }

  loadEffectiveAuth(userId: number): Observable<EffectiveAuthPreview> {
    return this.http.get<EffectiveAuthPreview>(`${this.base}/users/${userId}/effective-auth`);
  }
}
