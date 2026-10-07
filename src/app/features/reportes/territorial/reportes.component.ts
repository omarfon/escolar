import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/auth/services/auth.service';
import {
  ReporteColumn,
  ReporteFilters,
  ReporteFormato,
  ReporteMeta,
  ReportePagination,
  ReporteRow,
  ReporteTerritorialContext,
} from './reportes.model';
import {
  TerritorialReportesService,
  triggerFileDownload,
} from './reportes.service';

@Component({
  selector: 'app-territorial-reportes',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">UGEL / DRE consolidado</h3>
          @if (context(); as ctx) {
            <p class="text-sm text-gray-500 mt-0.5">{{ ctx.alcance.label }}</p>
            <p class="text-xs text-gray-400 mt-1">
              Matrícula · Asistencia · Evaluación · {{ ctx.alcance.institucionesCount }} IE
            </p>
          }
        </div>
        <div class="flex flex-wrap gap-2">
          @if (puedeExportar()) {
            <button class="btn btn-secondary btn-sm" (click)="exportar('csv')" [disabled]="svc.exporting()">
              <span class="icon icon-sm">download</span> CSV
            </button>
            <button class="btn btn-secondary btn-sm" (click)="exportar('xlsx')" [disabled]="svc.exporting()">
              <span class="icon icon-sm">table_view</span> XLSX
            </button>
            <button class="btn btn-secondary btn-sm" (click)="exportar('pdf')" [disabled]="svc.exporting()">
              <span class="icon icon-sm">picture_as_pdf</span> PDF
            </button>
          }
          <button class="btn btn-primary btn-sm" (click)="cargar()" [disabled]="svc.loading()">
            <span class="icon icon-sm">refresh</span> Generar
          </button>
        </div>
      </div>

      @if (meta(); as m) {
        <div class="card p-4 bg-indigo-50/50 border border-indigo-100 text-sm">
          <div class="flex flex-wrap gap-x-6 gap-y-1 text-gray-600">
            <span><strong>Fecha de corte:</strong> {{ m.fechaCorte | date:'dd/MM/yyyy HH:mm' }}</span>
            <span><strong>Fuente:</strong> {{ m.fuente }}</span>
            <span><strong>Bimestre:</strong> {{ m.bimestre ?? '—' }}</span>
          </div>
          @if (totalesEntries().length) {
            <div class="flex flex-wrap gap-3 mt-3">
              @for (t of totalesEntries(); track t.key) {
                <span class="badge badge-indigo">{{ t.label }}: {{ t.value ?? '—' }}</span>
              }
            </div>
          }
        </div>
      }

      <div class="card p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          @if (mostrarFiltrosTerritoriales()) {
            <div>
              <label class="form-label mb-1 block">DRE</label>
              <select class="form-select" [ngModel]="filtro().dre ?? ''" (ngModelChange)="setTerritorial('dre', $event)">
                <option value="">Todas</option>
                @for (d of dres(); track d) { <option [value]="d">{{ d }}</option> }
              </select>
            </div>
            <div>
              <label class="form-label mb-1 block">UGEL</label>
              <select class="form-select" [ngModel]="filtro().ugel ?? ''" (ngModelChange)="setTerritorial('ugel', $event)">
                <option value="">Todas</option>
                @for (u of ugels(); track u) { <option [value]="u">{{ u }}</option> }
              </select>
            </div>
          }
          <div>
            <label class="form-label mb-1 block">Bimestre</label>
            <select class="form-select" [ngModel]="filtro().bimestre ?? ''" (ngModelChange)="setBimestre($event)">
              @for (b of bimestres(); track b) {
                <option [value]="b">{{ b }}° bimestre</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Mes asistencia</label>
            <input class="form-input" type="month" [ngModel]="filtro().mes" (ngModelChange)="setFiltro('mes', $event)">
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block">Buscar IE</label>
            <input class="form-input" placeholder="Institución, DRE, UGEL..."
              [ngModel]="filtro().busqueda" (ngModelChange)="setFiltro('busqueda', $event)">
          </div>
        </div>
      </div>

      @if (error()) {
        <div class="card p-8 text-center text-red-600" role="alert">{{ error() }}</div>
      } @else if (svc.loading()) {
        <div class="card p-12 text-center text-gray-400">Generando reporte territorial…</div>
      } @else if (!items().length) {
        <div class="card p-16 text-center text-gray-500">
          Pulse <strong>Generar</strong> para consolidar matrícula, asistencia y evaluación por IE.
        </div>
      } @else {
        <div class="card overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                @for (col of columns(); track col.key) {
                  <th class="px-4 py-3 font-semibold">{{ col.label }}</th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (row of items(); track $index) {
                <tr class="hover:bg-gray-50">
                  @for (col of columns(); track col.key) {
                    <td class="px-4 py-2.5 text-gray-700">{{ formatCell(row, col) }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
          @if (pagination(); as p) {
            <div class="px-4 py-3 flex justify-between items-center text-sm border-t">
              <span>Página {{ p.page }} / {{ p.totalPages }} · {{ p.totalItems }} IE(s)</span>
              <div class="flex gap-2">
                <button class="btn btn-secondary btn-sm" [disabled]="p.page <= 1" (click)="irPagina(p.page - 1)">Anterior</button>
                <button class="btn btn-secondary btn-sm" [disabled]="p.page >= p.totalPages" (click)="irPagina(p.page + 1)">Siguiente</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TerritorialReportesComponent implements OnInit {
  readonly svc = inject(TerritorialReportesService);
  private readonly auth = inject(AuthService);

  readonly context = signal<ReporteTerritorialContext | null>(null);
  readonly meta = signal<ReporteMeta | null>(null);
  readonly columns = signal<ReporteColumn[]>([]);
  readonly items = signal<ReporteRow[]>([]);
  readonly pagination = signal<ReportePagination | null>(null);
  readonly error = signal<string | null>(null);

  readonly filtro = signal<ReporteFilters>({
    tipo: 'consolidado_ugel_dre',
    page: 1,
    pageSize: 25,
  });

  readonly bimestres = computed(() => this.context()?.filtros.bimestres ?? []);
  readonly dres = computed(() => this.context()?.filtros.dres ?? []);
  readonly ugels = computed(() => this.context()?.filtros.ugels ?? []);
  readonly mostrarFiltrosTerritoriales = computed(() => {
    const ctx = this.context();
    return ctx?.alcance.nivel === 'MINEDU' || ctx?.alcance.consolidado;
  });

  readonly totalesEntries = computed(() => {
    const totales = this.meta()?.totales ?? {};
    const labels: Record<string, string> = {
      institucionesIncluidas: 'Instituciones',
      alumnosTotal: 'Alumnos total',
      alumnosActivos: 'Matrícula activa',
      asistenciaPromedioPct: '% Asistencia prom.',
      notasRegistradas: 'Notas registradas',
      alumnosConNotas: 'Alumnos con notas',
      evaluacionAvancePct: '% Avance evaluación',
    };
    return Object.entries(totales).map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
      value,
    }));
  });

  ngOnInit(): void {
    this.cargarContexto();
  }

  private cargarContexto(): void {
    const f = this.filtro();
    this.svc.loadContext({ dre: f.dre, ugel: f.ugel }).subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.filtro.update((cur) => ({
          ...cur,
          anio: ctx.anioEscolar,
          bimestre: cur.bimestre ?? ctx.bimestreActual,
          mes: cur.mes ?? ctx.mesActual,
          dre: cur.dre ?? ctx.alcance.dre ?? undefined,
          ugel: cur.ugel ?? ctx.alcance.ugel ?? undefined,
        }));
      },
      error: (err) =>
        this.error.set(err?.error?.message ?? 'No se pudo cargar el contexto territorial'),
    });
  }

  setTerritorial(key: 'dre' | 'ugel', value: string): void {
    this.filtro.update((f) => ({ ...f, [key]: value || undefined, page: 1 }));
    this.cargarContexto();
  }

  setBimestre(value: string): void {
    this.filtro.update((f) => ({
      ...f,
      bimestre: value ? Number(value) : undefined,
      page: 1,
    }));
  }

  setFiltro<K extends keyof ReporteFilters>(key: K, value: ReporteFilters[K]): void {
    this.filtro.update((f) => ({ ...f, [key]: value || undefined, page: 1 }));
  }

  puedeExportar(): boolean {
    return this.auth.hasAnyPermiso('dashboard.reportes', 'admin.reportes');
  }

  cargar(): void {
    this.error.set(null);
    this.svc.load(this.filtro()).subscribe({
      next: (res) => {
        this.meta.set(res.meta);
        this.columns.set(res.columns);
        this.items.set(res.items);
        this.pagination.set(res.pagination);
      },
      error: (err) => {
        this.items.set([]);
        this.error.set(err?.error?.message ?? 'Error al generar el reporte territorial');
      },
    });
  }

  irPagina(page: number): void {
    this.filtro.update((f) => ({ ...f, page }));
    this.cargar();
  }

  exportar(format: ReporteFormato): void {
    this.svc.exportSync(this.filtro(), format).subscribe({
      next: (blob) => triggerFileDownload(blob, `territorial-ugel-dre.${format}`),
      error: (err) => this.error.set(err?.error?.message ?? 'Error al exportar'),
    });
  }

  formatCell(row: ReporteRow, col: ReporteColumn): string {
    const val = row[col.key];
    return val == null || val === '' ? '—' : String(val);
  }
}
