import { Injectable, inject, signal } from '@angular/core';
import { TenantReloadService } from '../tenant/tenant-reload.service';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, of, tap } from 'rxjs';
import { environment } from '@environments/environment';
import {
  DEFAULT_GRADING_CONFIG,
  GradingConfig,
  EscalaLogroConfig,
  GradingScaleContext,
  GradingScaleHistoryItem,
  GradingScaleNivelItem,
  TipoEscalaCurriculum,
  nivelFromNota,
  nivelBadge,
  promedioColor,
} from './grading-config.model';

@Injectable({ providedIn: 'root' })
export class GradingConfigService {
  private readonly http = inject(HttpClient);
  private readonly reloadBus = inject(TenantReloadService);
  private readonly base = `${environment.apiUrl}/grading-config`;

  constructor() {
    this.reloadBus.registerGlobalReset(() => this.reset());
    this.reloadBus.register(() => {
      if (!this.loaded()) return;
      this.load().subscribe({ error: () => {} });
    });
  }

  readonly config = signal<GradingConfig>(DEFAULT_GRADING_CONFIG);
  readonly loaded = signal(false);
  readonly scaleContext = signal<GradingScaleContext | null>(null);
  readonly scaleSaving = signal(false);

  load(): Observable<GradingConfig> {
    return this.http.get<GradingConfig>(this.base).pipe(
      tap((cfg) => {
        this.config.set(cfg);
        this.loaded.set(true);
      }),
      catchError(() => {
        this.config.set(DEFAULT_GRADING_CONFIG);
        this.loaded.set(true);
        return of(DEFAULT_GRADING_CONFIG);
      }),
    );
  }

  reset(): void {
    this.config.set(DEFAULT_GRADING_CONFIG);
    this.loaded.set(false);
  }

  usesNumeric(): boolean {
    return this.config().usesNumeric;
  }

  usesCompetencias(): boolean {
    return this.config().usesCompetencias;
  }

  notaMinima(): number {
    return this.config().notaMinima;
  }

  notaMaxima(): number {
    return this.config().notaMaxima;
  }

  periodosCount(): number {
    return this.config().periodosCount;
  }

  escala(): EscalaLogroConfig {
    return this.config().escalaLogro;
  }

  nivelDeNota(nota: number): string {
    return nivelFromNota(nota, this.escala());
  }

  badgeNivel(nivel: string | null): string {
    return nivelBadge(nivel);
  }

  colorPromedio(nota: number | null): string {
    return promedioColor(nota, this.config());
  }

  esAprobado(nota: number): boolean {
    return nota >= this.notaMinima();
  }

  labelSistema(): string {
    const s = this.config().sistemaEval;
    if (s === 'literal') return 'Por competencias';
    if (s === 'mixto') return 'Mixto';
    return 'Numérico';
  }

  loadScaleContext(): Observable<GradingScaleContext> {
    return this.http.get<GradingScaleContext>(`${this.base}/context`).pipe(
      tap((ctx) => {
        this.scaleContext.set(ctx);
        this.config.set(ctx.config);
        this.loaded.set(true);
      }),
    );
  }

  updateInstitutionScale(payload: {
    sistemaEval?: string;
    tipoPeriodo?: string;
    notaMinima?: number;
    escalaLogro?: EscalaLogroConfig;
    motivo?: string;
  }): Observable<GradingConfig> {
    this.scaleSaving.set(true);
    return this.http.patch<GradingConfig>(this.base, payload).pipe(
      tap((cfg) => this.config.set(cfg)),
      finalize(() => this.scaleSaving.set(false)),
    );
  }

  updateNivelScale(
    curriculumId: number,
    payload: { tipoEscala: TipoEscalaCurriculum; motivo?: string },
  ): Observable<GradingScaleNivelItem> {
    return this.http.patch<GradingScaleNivelItem>(
      `${this.base}/nivel/${curriculumId}`,
      payload,
    );
  }

  loadScaleHistory(page = 1, pageSize = 10): Observable<{
    items: GradingScaleHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    return this.http.get<{
      items: GradingScaleHistoryItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`${this.base}/history`, {
      params: { page: String(page), pageSize: String(pageSize) },
    });
  }
}
