import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { CompetencyAuditoriaService } from './competency-auditoria.service';
import {
  ACCIONES_COMPETENCY_AUDIT,
  accionCompetencyLabel,
  CompetencyAuditoriaContext,
  CompetencyChangeLog,
  nivelLogroLabel,
} from './competency-auditoria.model';

@Component({
  selector: 'app-competency-auditoria',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Auditoría de competencias</h2>
          @if (context(); as ctx) {
            <p class="text-sm text-gray-500 mt-0.5">
              {{ ctx.institucion.nombre }} · retención {{ ctx.retencionDias }} días
            </p>
          }
          <p class="text-xs text-gray-400 mt-1">
            Historial de cambios en niveles de logro (AD / A / B / C) por competencia
          </p>
        </div>
        <div class="flex gap-2">
          <a class="btn btn-secondary btn-sm" routerLink="/evaluacion/competencias">
            <span class="icon icon-sm">stars</span> Ir a competencias
          </a>
          <button class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="svc.loading()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
        </div>
      </div>

      <div class="card p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label class="form-label mb-1 block">Acción</label>
            <select class="form-select" [ngModel]="filtro().accion" (ngModelChange)="setFiltro('accion', $event)">
              @for (a of acciones; track a.value) {
                <option [value]="a.value">{{ a.label }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Bimestre</label>
            <input class="form-input" type="number" min="1" max="4"
              [ngModel]="filtro().bimestre ?? ''" (ngModelChange)="setBimestre($event)">
          </div>
          <div>
            <label class="form-label mb-1 block">ID estudiante</label>
            <input class="form-input" type="number" min="1"
              [ngModel]="filtro().studentId ?? ''" (ngModelChange)="setStudentId($event)">
          </div>
          <div>
            <label class="form-label mb-1 block">ID competencia</label>
            <input class="form-input" type="number" min="1"
              [ngModel]="filtro().competenciaId ?? ''" (ngModelChange)="setCompetenciaId($event)">
          </div>
        </div>
      </div>

      @if (error()) {
        <div class="card p-8 text-center text-red-600" role="alert">{{ error() }}</div>
      } @else if (svc.loading()) {
        <div class="card p-12 text-center text-gray-400">
          <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
          Cargando auditoría…
        </div>
      } @else if (!items().length) {
        <div class="card p-16 text-center text-gray-500">
          <span class="icon icon-2xl text-indigo-300 mb-3 block">history_edu</span>
          Sin registros de cambios en competencias para los filtros seleccionados.
          <p class="text-xs text-gray-400 mt-2">
            Los registros aparecen al guardar calificaciones en
            <a routerLink="/evaluacion/competencias" class="text-indigo-600 underline">Competencias</a>.
          </p>
        </div>
      } @else {
        <div class="card overflow-hidden divide-y divide-gray-100">
          @for (item of items(); track item.id) {
            <button type="button" class="w-full text-left px-4 py-4 hover:bg-gray-50 flex gap-4"
              (click)="detalle.set(item)">
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap gap-2 mb-1">
                  <span class="font-semibold text-sm text-gray-900">{{ item.studentNombre }}</span>
                  <span class="badge text-[10px] badge-indigo">Comp. #{{ item.competenciaId }}</span>
                  <span class="badge text-[10px] badge-gray">{{ accionCompetencyLabel(item.accion) }}</span>
                </div>
                <p class="text-xs text-gray-500">
                  Nivel: {{ nivelLogroLabel(item.cambios) }} · Bim. {{ item.bimestre }} · A.E. {{ item.anio }}
                </p>
                <p class="text-xs text-gray-400 mt-1 truncate">{{ item.motivo }}</p>
                <p class="text-xs text-gray-400 mt-1">
                  {{ item.actorNombre }} · {{ item.fechaDisplay }} {{ item.horaDisplay }}
                </p>
              </div>
            </button>
          }
          @if (pagination(); as p) {
            <div class="px-4 py-3 flex justify-between items-center text-sm text-gray-500">
              <span>Página {{ p.page }} / {{ p.totalPages }} · {{ p.totalItems }} registro(s)</span>
              <div class="flex gap-2">
                <button class="btn btn-secondary btn-sm" [disabled]="p.page <= 1" (click)="irPagina(p.page - 1)">Anterior</button>
                <button class="btn btn-secondary btn-sm" [disabled]="p.page >= p.totalPages" (click)="irPagina(p.page + 1)">Siguiente</button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (detalle(); as d) {
      <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" (click)="detalle.set(null)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
          (click)="$event.stopPropagation()">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold text-gray-900">{{ d.studentNombre }}</h3>
              <p class="text-sm text-gray-500">
                {{ accionCompetencyLabel(d.accion) }} · Competencia #{{ d.competenciaId }} · {{ d.fechaDisplay }} {{ d.horaDisplay }}
              </p>
            </div>
            <button class="text-2xl text-gray-400" (click)="detalle.set(null)">×</button>
          </div>
          <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><dt class="text-gray-400 text-xs">Bimestre</dt><dd>{{ d.bimestre }}° · A.E. {{ d.anio }}</dd></div>
            <div><dt class="text-gray-400 text-xs">Evaluación ID</dt><dd>{{ d.evaluationId ?? '—' }}</dd></div>
            <div><dt class="text-gray-400 text-xs">Actor</dt><dd>{{ d.actorNombre }} ({{ d.actorRol || '—' }})</dd></div>
            <div><dt class="text-gray-400 text-xs">Motivo</dt><dd>{{ d.motivo }}</dd></div>
          </dl>
          <p class="text-xs font-semibold text-gray-500 uppercase mb-2">Cambios registrados</p>
          <div class="space-y-2">
            @for (entry of entriesCambios(d); track entry.campo) {
              <div class="bg-gray-50 rounded-lg p-3 text-xs">
                <p class="font-semibold text-gray-700 mb-1">{{ entry.campo }}</p>
                @if (entry.anterior !== undefined) {
                  <p class="text-red-600"><span class="text-gray-400">Antes:</span> {{ formatValor(entry.anterior) }}</p>
                }
                @if (entry.nuevo !== undefined) {
                  <p class="text-emerald-700"><span class="text-gray-400">Después:</span> {{ formatValor(entry.nuevo) }}</p>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class CompetencyAuditoriaComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);
  readonly svc = inject(CompetencyAuditoriaService);

  readonly acciones = ACCIONES_COMPETENCY_AUDIT;
  accionCompetencyLabel = accionCompetencyLabel;
  nivelLogroLabel = nivelLogroLabel;

  readonly items = signal<CompetencyChangeLog[]>([]);
  readonly pagination = signal<{
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  } | null>(null);
  readonly context = signal<CompetencyAuditoriaContext | null>(null);
  readonly error = signal('');
  readonly detalle = signal<CompetencyChangeLog | null>(null);

  readonly filtro = signal({
    accion: '',
    bimestre: null as number | null,
    studentId: null as number | null,
    competenciaId: null as number | null,
    page: 1,
    pageSize: 50,
  });

  ngOnInit(): void {
    this.layout.setTitle('Auditoría de competencias');
    this.route.queryParamMap.subscribe((params) => {
      const updates: Partial<ReturnType<typeof this.filtro>> = { page: 1 };
      if (params.get('bimestre')) updates.bimestre = +params.get('bimestre')!;
      if (params.get('studentId')) updates.studentId = +params.get('studentId')!;
      if (params.get('competenciaId')) updates.competenciaId = +params.get('competenciaId')!;
      if (Object.keys(updates).length > 1) {
        this.filtro.update((f) => ({ ...f, ...updates }));
        this.cargar();
      }
    });
    this.svc.loadContext().subscribe({
      next: (ctx) => this.context.set(ctx),
      error: () => this.context.set(null),
    });
    this.cargar();
  }

  cargar(): void {
    const f = this.filtro();
    this.error.set('');
    this.svc
      .load({
        studentId: f.studentId ?? undefined,
        competenciaId: f.competenciaId ?? undefined,
        bimestre: f.bimestre ?? undefined,
        accion: f.accion || undefined,
        page: f.page,
        pageSize: f.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.pagination.set(res.pagination);
        },
        error: (err) => {
          this.items.set([]);
          this.pagination.set(null);
          this.error.set(
            err?.status === 403
              ? 'No tiene permiso para consultar la auditoría de competencias.'
              : 'No se pudo cargar la auditoría.',
          );
        },
      });
  }

  setFiltro(campo: 'accion', valor: string): void {
    this.filtro.update((f) => ({ ...f, [campo]: valor, page: 1 }));
    this.cargar();
  }

  setStudentId(value: string): void {
    this.filtro.update((f) => ({ ...f, studentId: value ? +value : null, page: 1 }));
    this.cargar();
  }

  setCompetenciaId(value: string): void {
    this.filtro.update((f) => ({ ...f, competenciaId: value ? +value : null, page: 1 }));
    this.cargar();
  }

  setBimestre(value: string): void {
    this.filtro.update((f) => ({ ...f, bimestre: value ? +value : null, page: 1 }));
    this.cargar();
  }

  irPagina(page: number): void {
    this.filtro.update((f) => ({ ...f, page: Math.max(1, page) }));
    this.cargar();
  }

  entriesCambios(item: CompetencyChangeLog) {
    return Object.entries(item.cambios ?? {}).map(([campo, v]) => ({
      campo,
      anterior: v.anterior,
      nuevo: v.nuevo,
    }));
  }

  formatValor(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
