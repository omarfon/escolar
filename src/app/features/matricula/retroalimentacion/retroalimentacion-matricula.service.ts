import { Injectable, inject, signal } from '@angular/core';
import {
  CreateEnrollmentFeedbackPayload,
  EnrollmentFeedbacksApiService,
} from '../../../core/api/enrollment-feedbacks-api.service';

@Injectable({ providedIn: 'root' })
export class RetroalimentacionMatriculaService {
  private readonly api = inject(EnrollmentFeedbacksApiService);
  readonly loading = signal(false);
  readonly saving = signal(false);

  loadContext() {
    this.loading.set(true);
    return this.api.getContext();
  }

  list(filters?: { busqueda?: string; page?: number; pageSize?: number }) {
    this.loading.set(true);
    return this.api.list(filters);
  }

  eligibility(evaluationId: number) {
    return this.api.getEligibility(evaluationId);
  }

  register(payload: CreateEnrollmentFeedbackPayload, key: string) {
    this.saving.set(true);
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
