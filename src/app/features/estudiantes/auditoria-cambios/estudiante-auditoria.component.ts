import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { EstudianteAuditoriaService } from './estudiante-auditoria.service';
import {
  ACCIONES_ESTUDIANTE_AUDIT,
  accionEstudianteLabel,
  AuditoriaVista,
  EstudianteAuditoriaContext,
  EstudianteChangeLog,
  SensitiveNotification,
  SensitiveNotificationContext,
} from './estudiante-auditoria.model';

@Component({
  selector: 'app-estudiante-auditoria',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Privacidad y auditoría — Estudiantes</h2>
          @if (context(); as ctx) {
            <p class="text-sm text-gray-500 mt-0.5">{{ ctx.institucion.nombre }} · retención {{ ctx.retencionDias }} días</p>
          }
          @if (studentId()) {
            <p class="text-xs text-indigo-600 mt-1">Filtrado por estudiante #{{ studentId() }}</p>
          }
        </div>
        <div class="flex gap-2">
          @if (vista() === 'cambios') {
            <button class="btn btn-secondary btn-sm" (click)="exportar()" [disabled]="svc.exporting() || svc.loading()">
              <span class="icon icon-sm">download</span> Exportar CSV
            </button>
          }
          <button class="btn btn-secondary btn-sm" (click)="recargarVista()" [disabled]="svc.loading() || svc.loadingNotif()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
        </div>
      </div>

      <div class="flex gap-2 border-b border-gray-200">
        <button type="button" class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
          [class.border-indigo-600]="vista() === 'cambios'"
          [class.text-indigo-600]="vista() === 'cambios'"
          [class.border-transparent]="vista() !== 'cambios'"
          [class.text-gray-500]="vista() !== 'cambios'"
          (click)="setVista('cambios')">
          Historial de cambios
        </button>
        <button type="button" class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
          [class.border-indigo-600]="vista() === 'notificaciones'"
          [class.text-indigo-600]="vista() === 'notificaciones'"
          [class.border-transparent]="vista() !== 'notificaciones'"
          [class.text-gray-500]="vista() !== 'notificaciones'"
          (click)="setVista('notificaciones')">
          Notificaciones sensibles
        </button>
      </div>

      @if (vista() === 'notificaciones') {
        @if (sensitiveContext(); as sc) {
          <p class="text-xs text-gray-500">
            Notificaciones por correo {{ sc.notificacionesActivas ? 'activas' : 'desactivadas' }}
            · {{ sc.camposSensibles.length }} campos clasificados como datos personales
          </p>
        }
        @if (errorNotif()) {
          <div class="card p-8 text-center text-red-600" role="alert">{{ errorNotif() }}</div>
        } @else if (svc.loadingNotif()) {
          <div class="card p-12 text-center text-gray-400">Cargando notificaciones…</div>
        } @else if (!notificaciones().length) {
          <div class="card p-16 text-center text-gray-500">
            <span class="icon icon-2xl text-indigo-300 mb-3 block">mail_lock</span>
            Sin notificaciones de datos personales para los filtros seleccionados.
          </div>
        } @else {
          <div class="card overflow-hidden divide-y divide-gray-100">
            @for (n of notificaciones(); track n.id) {
              <div class="px-4 py-4 flex gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap gap-2 mb-1">
                    <span class="font-semibold text-sm text-gray-900">{{ n.studentNombre }}</span>
                    <span class="badge text-[10px]" [ngClass]="n.correoEnviado ? 'badge-green' : 'badge-amber'">
                      {{ n.correoEnviado ? 'Correo enviado' : 'Sin envío' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-600">{{ n.camposLabels.join(' · ') }}</p>
                  <p class="text-xs text-gray-400 mt-1">
                    {{ n.actorNombre }} · {{ n.fechaDisplay }} {{ n.horaDisplay }}
                    @if (n.correoDestino) { · {{ n.correoDestino }} }
                  </p>
                </div>
              </div>
            }
          </div>
        }
      } @else {
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
            <label class="form-label mb-1 block">Resultado</label>
            <select class="form-select" [ngModel]="filtro().resultado" (ngModelChange)="setFiltro('resultado', $event)">
              <option value="">Todos</option>
              <option value="success">Exitoso</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Desde</label>
            <input type="date" class="form-input" [ngModel]="filtro().desde" (ngModelChange)="setFiltro('desde', $event)">
          </div>
          <div>
            <label class="form-label mb-1 block">Hasta</label>
            <input type="date" class="form-input" [ngModel]="filtro().hasta" (ngModelChange)="setFiltro('hasta', $event)">
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block">Buscar</label>
            <input class="form-input" placeholder="Estudiante, código, motivo..."
              [ngModel]="filtro().busqueda" (ngModelChange)="setFiltro('busqueda', $event)">
          </div>
          <div class="sm:col-span-2">
            <label class="form-label mb-1 block">ID estudiante</label>
            <input class="form-input" type="number" min="1" placeholder="Opcional"
              [ngModel]="filtro().studentId ?? ''" (ngModelChange)="setStudentId($event)">
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
          Sin registros de cambios para los filtros seleccionados.
        </div>
      } @else {
        <div class="card overflow-hidden divide-y divide-gray-100">
          @for (item of items(); track item.id) {
            <button type="button" class="w-full text-left px-4 py-4 hover:bg-gray-50 flex gap-4"
              (click)="detalle.set(item)">
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap gap-2 mb-1">
                  <span class="font-semibold text-sm text-gray-900">{{ item.studentNombre }}</span>
                  <span class="badge text-[10px] badge-indigo">{{ accionEstudianteLabel(item.accion) }}</span>
                  <span class="badge text-[10px]" [ngClass]="item.resultado === 'success' ? 'badge-green' : 'badge-red'">
                    {{ item.resultado === 'success' ? 'OK' : 'Fallido' }}
                  </span>
                </div>
                <p class="text-xs text-gray-500">{{ item.motivo }}</p>
                <p class="text-xs text-gray-400 mt-1">
                  {{ item.actorNombre }} · {{ item.fechaDisplay }} {{ item.horaDisplay }}
                  · {{ camposCambiados(item) }} campo(s)
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
      }
    </div>

    @if (detalle(); as d) {
      <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" (click)="detalle.set(null)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
          (click)="$event.stopPropagation()">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold text-gray-900">{{ d.studentNombre }}</h3>
              <p class="text-sm text-gray-500">{{ accionEstudianteLabel(d.accion) }} · {{ d.fechaDisplay }} {{ d.horaDisplay }}</p>
            </div>
            <button class="text-2xl text-gray-400" (click)="detalle.set(null)">×</button>
          </div>
          <dl class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><dt class="text-gray-400 text-xs">Actor</dt><dd>{{ d.actorNombre }} ({{ d.actorRol || '—' }})</dd></div>
            <div><dt class="text-gray-400 text-xs">Motivo</dt><dd>{{ d.motivo }}</dd></div>
            @if (d.ip) { <div><dt class="text-gray-400 text-xs">IP</dt><dd class="font-mono">{{ d.ip }}</dd></div> }
            @if (d.correlationId) { <div class="col-span-2"><dt class="text-gray-400 text-xs">Correlación</dt><dd class="font-mono text-xs break-all">{{ d.correlationId }}</dd></div> }
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
export class EstudianteAuditoriaComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);
  readonly svc = inject(EstudianteAuditoriaService);

  readonly acciones = ACCIONES_ESTUDIANTE_AUDIT;
  accionEstudianteLabel = accionEstudianteLabel;

  readonly vista = signal<AuditoriaVista>('cambios');
  readonly items = signal<EstudianteChangeLog[]>([]);
  readonly notificaciones = signal<SensitiveNotification[]>([]);
  readonly pagination = signal<{ page: number; pageSize: number; totalItems: number; totalPages: number } | null>(null);
  readonly context = signal<EstudianteAuditoriaContext | null>(null);
  readonly sensitiveContext = signal<SensitiveNotificationContext | null>(null);
  readonly error = signal('');
  readonly errorNotif = signal('');
  readonly detalle = signal<EstudianteChangeLog | null>(null);
  readonly studentId = signal<number | null>(null);

  readonly filtro = signal({
    accion: '',
    resultado: '',
    desde: '',
    hasta: '',
    busqueda: '',
    studentId: null as number | null,
    page: 1,
    pageSize: 50,
  });

  private busquedaTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.layout.setTitle('Auditoría de estudiantes');
    this.route.queryParamMap.subscribe((params) => {
      const sid = params.get('studentId');
      if (sid) {
        const id = +sid;
        this.studentId.set(id);
        this.filtro.update(f => ({ ...f, studentId: id, page: 1 }));
        this.recargarVista();
      }
    });
    this.svc.loadContext().subscribe({
      next: ctx => this.context.set(ctx),
      error: () => this.context.set(null),
    });
    this.svc.loadSensitiveContext().subscribe({
      next: ctx => this.sensitiveContext.set(ctx),
      error: () => this.sensitiveContext.set(null),
    });
    if (!this.studentId()) this.recargarVista();
  }

  setVista(v: AuditoriaVista): void {
    this.vista.set(v);
    this.recargarVista();
  }

  recargarVista(): void {
    if (this.vista() === 'notificaciones') this.cargarNotificaciones();
    else this.cargar();
  }

  cargarNotificaciones(): void {
    const f = this.filtro();
    this.errorNotif.set('');
    this.svc.loadSensitiveNotifications({
      studentId: f.studentId ?? undefined,
      desde: f.desde || undefined,
      hasta: f.hasta || undefined,
      busqueda: f.busqueda || undefined,
      page: f.page,
      pageSize: f.pageSize,
    }).subscribe({
      next: res => this.notificaciones.set(res.items),
      error: (err) => {
        this.notificaciones.set([]);
        this.errorNotif.set(
          err?.status === 403
            ? 'No tiene permiso para consultar notificaciones de datos personales.'
            : 'No se pudieron cargar las notificaciones.',
        );
      },
    });
  }

  cargar(): void {
    const f = this.filtro();
    this.error.set('');
    this.svc.load({
      studentId: f.studentId ?? undefined,
      accion: f.accion || undefined,
      resultado: f.resultado || undefined,
      desde: f.desde || undefined,
      hasta: f.hasta || undefined,
      busqueda: f.busqueda || undefined,
      page: f.page,
      pageSize: f.pageSize,
    }).subscribe({
      next: res => {
        this.items.set(res.items);
        this.pagination.set(res.pagination);
      },
      error: (err) => {
        this.items.set([]);
        this.pagination.set(null);
        this.error.set(
          err?.status === 403
            ? 'No tiene permiso para consultar la auditoría de estudiantes.'
            : 'No se pudo cargar la auditoría.',
        );
      },
    });
  }

  setFiltro(campo: 'accion' | 'resultado' | 'desde' | 'hasta' | 'busqueda', valor: string): void {
    this.filtro.update(f => ({ ...f, [campo]: valor, page: 1 }));
    if (campo === 'busqueda') {
      clearTimeout(this.busquedaTimer);
      this.busquedaTimer = setTimeout(() => this.recargarVista(), 350);
      return;
    }
    this.recargarVista();
  }

  setStudentId(value: string): void {
    const id = value ? +value : null;
    this.studentId.set(id);
    this.filtro.update(f => ({ ...f, studentId: id, page: 1 }));
    this.recargarVista();
  }

  irPagina(page: number): void {
    this.filtro.update(f => ({ ...f, page: Math.max(1, page) }));
    this.recargarVista();
  }

  exportar(): void {
    const f = this.filtro();
    this.svc.exportCsv({
      studentId: f.studentId ?? undefined,
      accion: f.accion || undefined,
      resultado: f.resultado || undefined,
      desde: f.desde || undefined,
      hasta: f.hasta || undefined,
      busqueda: f.busqueda || undefined,
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auditoria_estudiantes.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('No se pudo exportar.'),
    });
  }

  camposCambiados(item: EstudianteChangeLog): number {
    return Object.keys(item.cambios ?? {}).length;
  }

  entriesCambios(item: EstudianteChangeLog) {
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
