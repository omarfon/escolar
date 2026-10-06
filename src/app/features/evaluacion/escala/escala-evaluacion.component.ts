import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { GradingConfigService } from '../../../core/grading/grading-config.service';
import {
  GradingScaleHistoryItem,
  GradingScaleNivelItem,
  sistemaEvalLabel,
  TipoEscalaCurriculum,
} from '../../../core/grading/grading-config.model';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';

@Component({
  selector: 'app-escala-evaluacion',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, DatePipe],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Escala de evaluación</h2>
          <p class="text-sm text-gray-500 mt-0.5">
            Configuración cualitativa y cuantitativa según currículo, periodo y trayectoria del estudiante.
          </p>
          @if (ctx()?.institucion; as ie) {
            <p class="text-xs text-gray-400 mt-1">{{ ie.siglas }} · {{ ie.nombre }} · Año {{ ie.anioEscolar }}</p>
          }
        </div>
        <button class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="loading()">
          <span class="icon icon-sm">refresh</span> Actualizar
        </button>
      </div>

      @if (error()) {
        <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{{ error() }}</div>
      }

      @if (ctx(); as context) {
        <div class="card p-5 border-l-4 border-indigo-400">
          <h3 class="font-semibold text-gray-900 flex items-center gap-2 mb-1">
            <span class="icon text-indigo-500">tune</span> Escala institucional (global IE)
          </h3>
          <p class="text-xs text-gray-500 mb-4">
            Modalidad vigente: <strong>{{ context.config.modalidadLabel }}</strong>.
            Los umbrales numéricos se convierten a niveles de logro (AD/A/B/C).
          </p>

          @if (context.permisos.configurar) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label class="form-label mb-1 block">Sistema de evaluación</label>
                <select class="form-select" [(ngModel)]="form.sistemaEval">
                  <option value="numerico">Cuantitativa (numérico 0–20)</option>
                  <option value="literal">Cualitativa (competencias)</option>
                  <option value="mixto">Mixta</option>
                </select>
              </div>
              <div>
                <label class="form-label mb-1 block">Tipo de periodo</label>
                <select class="form-select" [(ngModel)]="form.tipoPeriodo">
                  <option value="bimestre">Bimestre (4)</option>
                  <option value="trimestre">Trimestre (3)</option>
                  <option value="semestre">Semestre (2)</option>
                </select>
              </div>
              <div>
                <label class="form-label mb-1 block">Nota mínima aprobatoria</label>
                <input type="number" class="form-input" min="0" max="20" [(ngModel)]="form.notaMinima">
              </div>
              <div>
                <label class="form-label mb-1 block">Motivo del cambio</label>
                <input class="form-input" [(ngModel)]="form.motivo" placeholder="Opcional">
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3 mt-3 max-w-xl">
                <div>
                  <label class="form-label mb-1 block">Umbral AD</label>
                  <input type="number" class="form-input" step="0.5" min="0" max="20" [(ngModel)]="form.escalaLogro.AD">
                </div>
                <div>
                  <label class="form-label mb-1 block">Umbral A</label>
                  <input type="number" class="form-input" step="0.5" min="0" max="20" [(ngModel)]="form.escalaLogro.A">
                </div>
                <div>
                  <label class="form-label mb-1 block">Umbral B</label>
                  <input type="number" class="form-input" step="0.5" min="0" max="20" [(ngModel)]="form.escalaLogro.B">
                </div>
              </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button class="btn btn-primary btn-sm" (click)="guardarInstitucional()"
                [disabled]="gradingSvc.scaleSaving()">
                {{ gradingSvc.scaleSaving() ? 'Guardando...' : 'Guardar escala institucional' }}
              </button>
              <a routerLink="/administracion/institucional" class="btn btn-secondary btn-sm">
                Configuración institucional completa
              </a>
            </div>
          } @else {
            <div class="text-sm text-gray-600">
              {{ sistemaEvalLabel(context.config.sistemaEval) }} · Mínima {{ context.config.notaMinima }} ·
              Periodos: {{ context.config.periodosCount }}
            </div>
          }
        </div>

        <div class="card p-5">
          <h3 class="font-semibold text-gray-900 mb-3">Escala por nivel educativo (currícula vigente)</h3>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nivel</th>
                  <th>Estado currícula</th>
                  <th>Versión</th>
                  <th>Modalidad</th>
                  <th>Tipo de escala</th>
                </tr>
              </thead>
              <tbody>
                @for (n of context.escalasPorNivel; track n.curriculumId) {
                  <tr>
                    <td class="font-medium">{{ n.nivel }}</td>
                    <td><span class="badge text-[11px]" [ngClass]="estadoBadge(n.estado)">{{ n.estado }}</span></td>
                    <td class="text-sm text-gray-600">{{ n.version }}</td>
                    <td class="text-sm capitalize">{{ n.modalidad }}</td>
                    <td>
                      @if (context.permisos.configurar && n.editable) {
                        <select class="form-select form-select-sm"
                          [ngModel]="n.tipoEscala"
                          (ngModelChange)="cambiarNivel(n, $event)">
                          <option value="numerica">Cuantitativa (0–20)</option>
                          <option value="competencia">Cualitativa (competencias)</option>
                          <option value="literal">Cualitativa (literal)</option>
                        </select>
                      } @else {
                        <span class="text-sm">{{ n.tipoEscalaLabel }}</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="py-8 text-center text-gray-400 text-sm">
                      No hay currículas registradas para el año escolar actual.
                      <a routerLink="/academico/curricula" class="text-indigo-600 underline ml-1">Ir a currícula</a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="card p-5">
          <h3 class="font-semibold text-gray-900 mb-3">Historial de cambios</h3>
          @if (historial().length) {
            <div class="overflow-x-auto">
              <table class="data-table text-sm">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Ámbito</th>
                    <th>Nivel</th>
                    <th>Actor</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  @for (h of historial(); track h.id) {
                    <tr>
                      <td class="text-gray-500 whitespace-nowrap">{{ h.createdAt | date:'short' }}</td>
                      <td>{{ h.alcance }}</td>
                      <td>{{ h.nivel || '—' }}</td>
                      <td>{{ h.actorNombre || '—' }}</td>
                      <td class="max-w-[240px] truncate" [title]="h.motivo">{{ h.motivo }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="text-sm text-gray-400 py-4 text-center">Sin cambios registrados aún.</p>
          }
        </div>
      } @else if (loading()) {
        <div class="py-16 text-center text-gray-400">Cargando configuración de escala...</div>
      }
    </div>

    @if (toast(); as t) {
      <div class="fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg z-50 text-white flex items-center gap-2"
        [ngClass]="t.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'">
        <span class="icon">{{ t.tipo === 'success' ? 'check_circle' : 'error' }}</span>
        {{ t.mensaje }}
      </div>
    }
  `,
})
export class EscalaEvaluacionComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly gradingSvc = inject(GradingConfigService);
  readonly sistemaEvalLabel = sistemaEvalLabel;

  private readonly _tenantReloadReady = setupTenantReload(() => this.cargar());

  readonly ctx = this.gradingSvc.scaleContext;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly historial = signal<GradingScaleHistoryItem[]>([]);
  readonly toast = signal<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);

  form = {
    sistemaEval: 'numerico' as 'numerico' | 'literal' | 'mixto',
    tipoPeriodo: 'bimestre' as 'bimestre' | 'trimestre' | 'semestre',
    notaMinima: 11,
    escalaLogro: { AD: 17.5, A: 14, B: 11 },
    motivo: '',
  };

  ngOnInit(): void {
    this.layout.setTitle('Escala de evaluación');
    this.cargar();
    markTenantReloadReady(this._tenantReloadReady);
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');
    this.gradingSvc.loadScaleContext().subscribe({
      next: (ctx) => {
        this.syncForm(ctx.config);
        this.cargarHistorial();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'No se pudo cargar la configuración de escala');
        this.loading.set(false);
      },
    });
  }

  guardarInstitucional(): void {
    if (this.form.escalaLogro.AD <= this.form.escalaLogro.A || this.form.escalaLogro.A <= this.form.escalaLogro.B) {
      this.mostrarToast('Los umbrales AD, A y B deben ser decrecientes', 'error');
      return;
    }
    this.gradingSvc.updateInstitutionScale({ ...this.form }).subscribe({
      next: () => {
        this.cargar();
        this.mostrarToast('Escala institucional actualizada');
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.mostrarToast(Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo guardar', 'error');
      },
    });
  }

  cambiarNivel(nivel: GradingScaleNivelItem, tipoEscala: TipoEscalaCurriculum): void {
    this.gradingSvc.updateNivelScale(nivel.curriculumId, { tipoEscala }).subscribe({
      next: () => {
        this.cargar();
        this.mostrarToast(`Escala de ${nivel.nivel} actualizada`);
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.mostrarToast(Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo actualizar', 'error');
      },
    });
  }

  private cargarHistorial(): void {
    this.gradingSvc.loadScaleHistory(1, 10).subscribe({
      next: (res) => this.historial.set(res.items),
      error: () => this.historial.set([]),
    });
  }

  private syncForm(config: {
    sistemaEval: 'numerico' | 'literal' | 'mixto';
    tipoPeriodo: 'bimestre' | 'trimestre' | 'semestre';
    notaMinima: number;
    escalaLogro: { AD: number; A: number; B: number };
  }): void {
    this.form = {
      sistemaEval: config.sistemaEval,
      tipoPeriodo: config.tipoPeriodo,
      notaMinima: config.notaMinima,
      escalaLogro: { ...config.escalaLogro },
      motivo: '',
    };
  }

  estadoBadge(estado: string): string {
    return { activo: 'badge-green', borrador: 'badge-yellow', inactivo: 'badge-gray' }[estado] ?? 'badge-gray';
  }

  private mostrarToast(mensaje: string, tipo: 'success' | 'error' = 'success'): void {
    this.toast.set({ mensaje, tipo });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
