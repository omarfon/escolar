import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { environment } from '@environments/environment';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { withInstitutionParams } from '../../../../core/tenant/tenant-http.util';
import type { CalendarioContext, CalendarioVisualizacion } from './calendario-escolar.model';

@Injectable({ providedIn: 'root' })
export class CalendarioEscolarService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantContextService);
  private readonly base = `${environment.apiUrl}/maestros/calendario`;

  readonly loading = signal(false);

  getContext(): Observable<CalendarioContext> {
    return this.http.get<CalendarioContext>(`${this.base}/context`, {
      params: withInstitutionParams(this.tenant),
    });
  }

  getVisualizacion(query: {
    anioEscolar?: number;
    mes?: string;
  }): Observable<CalendarioVisualizacion> {
    this.loading.set(true);
    let params = new HttpParams();
    if (query.anioEscolar) params = params.set('anioEscolar', query.anioEscolar);
    if (query.mes) params = params.set('mes', query.mes);
    params = withInstitutionParams(this.tenant, params);
    return this.http
      .get<CalendarioVisualizacion>(this.base, { params })
      .pipe(finalize(() => this.loading.set(false)));
  }
}
