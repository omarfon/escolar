import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import {
  BulkImportUsuariosPayload,
  BulkImportUsuariosResult,
  CreateUsuarioPayload,
  SetRoleAssignmentsPayload,
  UpdateUsuarioPayload,
  UserRoleAssignment,
  Usuario,
} from './usuarios.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly importing = signal(false);

  load(): Observable<Usuario[]> {
    this.loading.set(true);
    return this.http.get<Usuario[]>(this.base).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.loading.set(false)),
    );
  }

  create(payload: CreateUsuarioPayload) {
    this.saving.set(true);
    return this.http.post<Usuario>(this.base, payload).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  update(id: number, payload: UpdateUsuarioPayload) {
    this.saving.set(true);
    return this.http.patch<Usuario>(`${this.base}/${id}`, payload).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }

  toggleEstado(id: number) {
    return this.http.patch<Usuario>(`${this.base}/${id}/toggle-estado`, {});
  }

  delete(id: number) {
    return this.http.delete<{ deleted: boolean; id: number }>(`${this.base}/${id}`);
  }

  loadCampuses() {
    return this.http.get<{ nombre: string }[]>(`${environment.apiUrl}/institution/campuses`);
  }

  bulkImport(payload: BulkImportUsuariosPayload): Observable<BulkImportUsuariosResult> {
    this.importing.set(true);
    return this.http.post<BulkImportUsuariosResult>(`${this.base}/bulk`, payload).pipe(
      catchError((err) => throwError(() => err)),
      finalize(() => this.importing.set(false)),
    );
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/template`, { responseType: 'blob' });
  }

  loadRoleAssignments(userId: number): Observable<UserRoleAssignment[]> {
    return this.http.get<UserRoleAssignment[]>(`${this.base}/${userId}/role-assignments`);
  }

  setRoleAssignments(userId: number, payload: SetRoleAssignmentsPayload) {
    this.saving.set(true);
    return this.http.put<UserRoleAssignment[]>(`${this.base}/${userId}/role-assignments`, payload).pipe(
      catchError(err => throwError(() => err)),
      finalize(() => this.saving.set(false)),
    );
  }
}
