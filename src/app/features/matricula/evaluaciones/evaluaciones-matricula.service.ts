import { Injectable, inject, signal } from '@angular/core';
import {
  CreateEnrollmentEvaluationPayload,
  EnrollmentEvaluationsApiService,
} from '../../../core/api/enrollment-evaluations-api.service';

@Injectable({ providedIn: 'root' })
export class EvaluacionesMatriculaService {
  private readonly api = inject(EnrollmentEvaluationsApiService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  loadContext() {
    this.loading.set(true);
    this.error.set(null);
    return this.api.getContext();
  }

  list(filters?: {
    busqueda?: string;
    resultado?: string;
    tipoEvaluacion?: string;
    page?: number;
    pageSize?: number;
  }) {
    this.loading.set(true);
    this.error.set(null);
    return this.api.list(filters);
  }

  get(id: number) {
    return this.api.get(id);
  }

  waitlistEligibility(waitlistEntryId: number) {
    return this.api.getWaitlistEligibility(waitlistEntryId);
  }

  studentEligibility(studentId: number) {
    return this.api.getStudentEligibility(studentId);
  }

  register(payload: CreateEnrollmentEvaluationPayload, key: string) {
    this.saving.set(true);
    this.error.set(null);
    return this.api.register(payload, key);
  }
}

export function httpErrorMessage(err: unknown, fallback: string): string {
  const e = err as { error?: { message?: string | string[] }; message?: string };
  const msg = e?.error?.message ?? e?.message;
  if (Array.isArray(msg)) return msg.join('. ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}
