import { Injectable, inject, signal } from '@angular/core';
import {
  CreateStudentWithdrawalPayload,
  StudentWithdrawalsApiService,
} from '../../../core/api/student-withdrawals-api.service';

@Injectable({ providedIn: 'root' })
export class RetiroService {
  private readonly api = inject(StudentWithdrawalsApiService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  loadContext() {
    this.loading.set(true);
    this.error.set(null);
    return this.api.getContext();
  }

  list(filters?: { busqueda?: string; page?: number; pageSize?: number; anioEscolar?: number }) {
    this.loading.set(true);
    this.error.set(null);
    return this.api.list(filters);
  }

  eligibility(studentId: number) {
    return this.api.getEligibility(studentId);
  }

  register(studentId: number, payload: CreateStudentWithdrawalPayload, key: string) {
    this.saving.set(true);
    this.error.set(null);
    return this.api.register(studentId, payload, key);
  }
}

export function httpErrorMessage(err: unknown, fallback: string): string {
  const e = err as { error?: { message?: string | string[] }; message?: string };
  const msg = e?.error?.message ?? e?.message;
  if (Array.isArray(msg)) return msg.join('. ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}
