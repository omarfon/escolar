import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  CreateRolePayload,
  RolDto,
  RolesResponse,
  UpdateRolePermissionsPayload,
} from './roles.model';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/roles`;

  readonly loading = signal(false);
  readonly saving = signal(false);

  load(): Observable<RolesResponse> {
    this.loading.set(true);
    return this.http.get<RolesResponse>(this.base).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  crear(payload: CreateRolePayload): Observable<RolDto> {
    this.saving.set(true);
    return this.http.post<RolDto>(this.base, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  instituciones(): Observable<{ id: number; nombre: string }[]> {
    return this.http.get<{ id: number; nombre: string }[]>(`${environment.apiUrl}/institution-directory`);
  }

  updatePermissions(codigo: string, payload: UpdateRolePermissionsPayload): Observable<RolDto> {
    this.saving.set(true);
    return this.http.patch<RolDto>(`${this.base}/${codigo}/permissions`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }
}
