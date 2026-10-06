import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import {
  ReporteColumn,
  ReporteContext,
  ReporteFilters,
  ReporteFormato,
  ReporteJob,
  ReporteMeta,
  ReportePagination,
  ReporteRow,
  ReporteTipo,
  TIPOS_REPORTE,
  tipoReporteLabel,
} from './reportes.model';
import { ReportesService, triggerFileDownload } from './reportes.service';

@Component({
  selector: 'app-evaluacion-reportes',
  standalone: true,
  imports: [FormsModule, DatePipe, UpperCasePipe],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Reportes de evaluación</h2>
          @if (context(); as ctx) {
            <p class="text-sm text-gray-500 mt-0.5">{{ ctx.alcance.label }}</p>
            <p class="text-xs text-gray-400 mt-1">
              Ruta: <span class="font-mono">/evaluacion/reportes</span>
              · Menú: Evaluación → Reportes
              · Año {{ ctx.anioEscolar }} · B{{ ctx.bimestreActual }}
            </p>
            @if (ctx.alcance.consolidado) {
              <p class="text-xs text-indigo-600 mt-1 font-medium">
                Vista consolidada · {{ ctx.alcance.institucionesCount }} institución(es)
                · Ámbito {{ ctx.alcance.nivel }}
              </p>
            }
          }
        </div>
        <div class="flex flex-wrap gap-2">
          @if (puedeExportar()) {
            <button class="btn btn-secondary btn-sm" (click)="exportar('csv')" [disabled]="svc.exporting() || !puedeConsultar()">
              <span class="icon icon-sm">download</span> CSV
            </button>
            <button class="btn btn-secondary btn-sm" (click)="exportar('xlsx')" [disabled]="svc.exporting() || !puedeConsultar()">
              <span class="icon icon-sm">table_view</span> XLSX
            </button>
            <button class="btn btn-secondary btn-sm" (click)="exportar('pdf')" [disabled]="svc.exporting() || !puedeConsultar()">
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
            <span><strong>Tipo:</strong> {{ tipoReporteLabel(m.tipo) }}</span>
            <span><strong>Fuente:</strong> {{ m.fuente }}</span>
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
                @for (d of dres(); track d) {
                  <option [value]="d">{{ d }}</option>
                }
              </select>
            </div>
            <div>
              <label class="form-label mb-1 block">UGEL</label>
              <select class="form-select" [ngModel]="filtro().ugel ?? ''" (ngModelChange)="setTerritorial('ugel', $event)">
                <option value="">Todas</option>
                @for (u of ugels(); track u) {
                  <option [value]="u">{{ u }}</option>
                }
              </select>
            </div>
          }
          <div>
            <label class="form-label mb-1 block">Tipo de reporte</label>
            <select class="form-select" [ngModel]="filtro().tipo" (ngModelChange)="setTipo($event)">
              @for (t of tipos; track t.value) {
                <option [value]="t.value">{{ t.label }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Nivel</label>
            <select class="form-select" [ngModel]="filtro().nivel" (ngModelChange)="setFiltro('nivel', $event)">
              <option value="">— Seleccionar —</option>
              @for (n of niveles(); track n) {
                <option [value]="n">{{ n }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Grado</label>
            <select class="form-select" [ngModel]="filtro().grado" (ngModelChange)="setFiltro('grado', $event)">
              <option value="">— Seleccionar —</option>
              @for (g of grados(); track g) {
                <option [value]="g">{{ g }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Sección</label>
            <select class="form-select" [ngModel]="filtro().seccion" (ngModelChange)="setFiltro('seccion', $event)">
              <option value="">— Seleccionar —</option>
              @for (s of secciones(); track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Bimestre</label>
            <select class="form-select" [ngModel]="filtro().bimestre ?? ''" (ngModelChange)="setBimestre($event)">
              <option value="">Todos</option>
              @for (b of bimestres(); track b) {
                <option [value]="b">{{ b }}° bimestre</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Curso / área</label>
            <input class="form-input" placeholder="Opcional"
              [ngModel]="filtro().curso" (ngModelChange)="setFiltro('curso', $event)">
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block">Buscar</label>
            <input class="form-input" placeholder="Estudiante, curso..."
              [ngModel]="filtro().busqueda" (ngModelChange)="setFiltro('busqueda', $event)">
          </div>
        </div>
      </div>

      @if (puedeExportar() && jobs().length) {
        <div class="card p-4">
          <h3 class="text-sm font-semibold text-gray-800 mb-3">Exportaciones en cola</h3>
          <div class="space-y-2">
            @for (job of jobs(); track job.id) {
              <div class="flex flex-wrap items-center justify-between gap-2 text-sm border border-gray-100 rounded-lg px-3 py-2">
                <div>
                  <span class="font-medium">#{{ job.id }}</span>
                  · {{ job.reportType }} · {{ job.format | uppercase }}
                  · {{ jobStatusLabel(job.status) }}
                  @if (job.totalFilas) { · {{ job.totalFilas }} filas }
                </div>
                @if (job.status === 'completed') {
                  <button class="btn btn-secondary btn-sm" (click)="descargarJob(job)">
                    <span class="icon icon-sm">download</span> Descargar
                  </button>
                }
                @if (job.status === 'failed') {
                  <span class="text-red-600 text-xs">{{ job.errorMensaje }}</span>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (jobMensaje()) {
        <div class="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm" role="status">
          {{ jobMensaje() }}
        </div>
      }

      @if (error()) {
        <div class="card p-8 text-center text-red-600" role="alert">{{ error() }}</div>
      } @else if (svc.loading()) {
        <div class="card p-12 text-center text-gray-400">
          <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
          Generando reporte…
        </div>
      } @else if (!items().length) {
        <div class="card p-16 text-center text-gray-500">
          <span class="icon icon-2xl text-indigo-300 mb-3 block">bar_chart</span>
          Configure los filtros y pulse <strong>Generar</strong> para consultar el reporte.
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
            <div class="px-4 py-3 flex justify-between items-center text-sm text-gray-500 border-t">
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
  `,
})
export class EvaluacionReportesComponent implements OnInit {
  readonly svc = inject(ReportesService);
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);

  readonly tipos = TIPOS_REPORTE;
  readonly tipoReporteLabel = tipoReporteLabel;

  readonly context = signal<ReporteContext | null>(null);
  readonly meta = signal<ReporteMeta | null>(null);
  readonly columns = signal<ReporteColumn[]>([]);
  readonly items = signal<ReporteRow[]>([]);
  readonly pagination = signal<ReportePagination | null>(null);
  readonly error = signal<string | null>(null);
  readonly jobMensaje = signal<string | null>(null);
  readonly jobs = signal<ReporteJob[]>([]);

  readonly filtro = signal<ReporteFilters>({
    tipo: 'promedios',
    page: 1,
    pageSize: 25,
  });

  readonly niveles = computed(() => this.context()?.filtros.niveles ?? []);
  readonly grados = computed(() => this.context()?.filtros.grados ?? []);
  readonly secciones = computed(() => this.context()?.filtros.secciones ?? []);
  readonly bimestres = computed(() => this.context()?.filtros.bimestres ?? []);
  readonly dres = computed(() => this.context()?.filtros.dres ?? []);
  readonly ugels = computed(() => this.context()?.filtros.ugels ?? []);
  readonly mostrarFiltrosTerritoriales = computed(() => {
    const ctx = this.context();
    if (!ctx) return false;
    return ctx.alcance.nivel === 'MINEDU' || ctx.alcance.consolidado;
  });

  readonly totalesEntries = computed(() => {
    const totales = this.meta()?.totales ?? {};
    const labels: Record<string, string> = {
      totalAlumnos: 'Alumnos',
      totalRegistros: 'Registros',
      promedioAula: 'Promedio aula',
      aprobados: 'Aprobados',
      desaprobados: 'Desaprobados',
      enRiesgo: 'En riesgo',
      destacados: 'Destacados',
      promedioNotas: 'Promedio notas',
      alumnosUnicos: 'Alumnos únicos',
      institucionesIncluidas: 'Instituciones',
    };
    return Object.entries(totales).map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
      value,
    }));
  });

  ngOnInit(): void {
    this.layout.setTitle('Reportes de evaluación');
    this.cargarContexto();
    if (this.puedeExportar()) {
      this.refrescarJobs();
    }
  }

  private cargarContexto(): void {
    const f = this.filtro();
    this.svc.loadContext({ dre: f.dre, ugel: f.ugel }).subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.filtro.set({
          ...f,
          anio: ctx.anioEscolar,
          dre: f.dre ?? ctx.alcance.dre ?? (ctx.institucion.dre || undefined),
          ugel: f.ugel ?? ctx.alcance.ugel ?? (ctx.institucion.ugel || undefined),
          nivel: f.nivel ?? ctx.filtros.niveles[0],
          grado: f.grado ?? ctx.filtros.grados[0],
          seccion: f.seccion ?? ctx.filtros.secciones[0],
        });
      },
      error: () => this.error.set('No se pudo cargar el contexto institucional'),
    });
  }

  setTerritorial(key: 'dre' | 'ugel', value: string): void {
    this.filtro.update((f) => ({ ...f, [key]: value || undefined, page: 1 }));
    this.cargarContexto();
  }

  refrescarJobs(): void {
    const f = this.filtro();
    this.svc.listJobs({ dre: f.dre, ugel: f.ugel }).subscribe({
      next: (list) => this.jobs.set(list),
    });
  }

  jobStatusLabel(status: ReporteJob['status']): string {
    const map: Record<ReporteJob['status'], string> = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Listo',
      failed: 'Fallido',
    };
    return map[status];
  }

  descargarJob(job: ReporteJob): void {
    const f = this.filtro();
    this.svc.downloadJob(job.id, { dre: f.dre, ugel: f.ugel }).subscribe({
      next: (blob) =>
        triggerFileDownload(blob, job.archivoNombre ?? `reporte-${job.id}.${job.format}`),
      error: () => this.error.set('Error al descargar el archivo'),
    });
  }

  puedeExportar(): boolean {
    return this.auth.hasAnyPermiso('evaluacion.exportar', 'admin.reportes');
  }

  puedeConsultar(): boolean {
    return !!this.filtro().nivel && !!this.filtro().grado && !!this.filtro().seccion;
  }

  setTipo(tipo: ReporteTipo): void {
    this.filtro.update((f) => ({ ...f, tipo, page: 1 }));
  }

  setFiltro<K extends keyof ReporteFilters>(key: K, value: ReporteFilters[K]): void {
    this.filtro.update((f) => ({ ...f, [key]: value || undefined, page: 1 }));
  }

  setBimestre(value: string): void {
    this.filtro.update((f) => ({
      ...f,
      bimestre: value ? Number(value) : undefined,
      page: 1,
    }));
  }

  cargar(): void {
    if (!this.puedeConsultar()) {
      this.error.set('Seleccione nivel, grado y sección');
      return;
    }
    this.error.set(null);
    this.jobMensaje.set(null);
    this.svc.load(this.filtro()).subscribe({
      next: (res) => {
        this.meta.set(res.meta);
        this.columns.set(res.columns);
        this.items.set(res.items);
        this.pagination.set(res.pagination);
      },
      error: (err) => {
        this.items.set([]);
        this.error.set(err?.error?.message ?? 'Error al generar el reporte');
      },
    });
  }

  irPagina(page: number): void {
    this.filtro.update((f) => ({ ...f, page }));
    this.cargar();
  }

  exportar(format: ReporteFormato): void {
    if (!this.puedeConsultar()) return;
    this.error.set(null);
    this.jobMensaje.set(null);

    const total = this.pagination()?.totalItems ?? 0;
    if (total > 500) {
      this.svc.createJob(this.filtro(), format).subscribe({
        next: (res) => {
          if (res.async && res.jobId) {
            this.jobMensaje.set(
              `Exportación encolada (job #${res.jobId}). Se notificará cuando esté lista.`,
            );
            this.pollJob(res.jobId, format);
            this.refrescarJobs();
          } else {
            this.jobMensaje.set(res.message ?? 'Use exportación directa');
            this.exportarSync(format);
          }
        },
        error: (err) =>
          this.error.set(err?.error?.message ?? 'No se pudo encolar la exportación'),
      });
      return;
    }

    this.exportarSync(format);
  }

  private exportarSync(format: ReporteFormato): void {
    this.svc.exportSync(this.filtro(), format).subscribe({
      next: (blob) => {
        triggerFileDownload(blob, `reporte-${this.filtro().tipo}.${format}`);
      },
      error: (err) =>
        this.error.set(err?.error?.message ?? 'Error al exportar el reporte'),
    });
  }

  private pollJob(jobId: number, format: ReporteFormato, intentos = 0): void {
    if (intentos > 30) {
      this.jobMensaje.set('La exportación está tardando. Consulte más tarde.');
      return;
    }
    setTimeout(() => {
      this.svc.getJob(jobId, {
        dre: this.filtro().dre,
        ugel: this.filtro().ugel,
      }).subscribe({
        next: (job) => {
          if (job.status === 'completed') {
            this.refrescarJobs();
            this.svc.downloadJob(jobId, {
              dre: this.filtro().dre,
              ugel: this.filtro().ugel,
            }).subscribe({
              next: (blob) =>
                triggerFileDownload(
                  blob,
                  job.archivoNombre ?? `reporte.${format}`,
                ),
              error: () => this.error.set('Error al descargar el archivo generado'),
            });
          } else if (job.status === 'failed') {
            this.refrescarJobs();
            this.error.set(job.errorMensaje ?? 'La exportación falló');
          } else {
            this.pollJob(jobId, format, intentos + 1);
          }
        },
      });
    }, 2000);
  }

  formatCell(row: ReporteRow, col: ReporteColumn): string {
    const val = row[col.key];
    return val == null || val === '' ? '—' : String(val);
  }
}
