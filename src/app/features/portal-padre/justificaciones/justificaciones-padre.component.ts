import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { HijoSelectorComponent } from '../shared/hijo-selector.component';
import { SeguimientoService } from '../seguimiento/seguimiento.service';
import { JustificacionesPadreService } from './justificaciones-padre.service';
import { OverlayPortalDirective } from '../../../core/overlay/overlay-portal.directive';
import {
  JustificacionItem,
  MOTIVOS_JUSTIFICACION,
  PendienteJustificacion,
  DIAS_PLAZO_JUSTIFICACION,
  justificacionAdjuntoUrl,
} from '../../asistencia/justificaciones/justificaciones.model';

@Component({
  standalone: true,
  imports: [FormsModule, NgClass, HijoSelectorComponent, OverlayPortalDirective],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Justificar inasistencias</h2>
          <p class="text-sm text-gray-400 mt-0.5">
            {{ auth.nombreCompleto() }} · Plazo: {{ diasPlazo }} días desde la falta · Sube el sustento y la falta pasará a estado justificada
          </p>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" (click)="recargar()"
          [disabled]="justSvc.loading() || justSvc.saving() || !studentId()">
          <span class="icon icon-sm">refresh</span> Actualizar
        </button>
      </div>

      <app-hijo-selector (hijoChange)="onHijoChange($event.studentId)" />

      @if (!studentId()) {
        <div class="card p-12 text-center text-gray-400 text-sm">
          Selecciona un hijo para ver faltas pendientes de justificar.
        </div>
      } @else if (justSvc.loading()) {
        <div class="card p-12 flex flex-col items-center text-gray-400">
          <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
          <p class="text-sm">Cargando faltas…</p>
        </div>
      } @else {
        @if (pendienteActual(); as p) {
          <div class="card p-4 border-l-4 border-l-red-400 bg-red-50/40">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p class="font-semibold text-gray-900 flex items-center gap-2">
                  <span class="icon text-red-500">event_busy</span>
                  Faltas sin justificar
                </p>
                <p class="text-sm text-gray-600 mt-1">
                  {{ p.faltasSinJustificar }} falta(s) dentro del plazo
                  @if (p.ultimaFalta) { · última: {{ p.ultimaFalta }} }
                </p>
                @if (p.faltasFueraDePlazo) {
                  <p class="text-xs text-amber-700 mt-1">
                    {{ p.faltasFueraDePlazo }} falta(s) ya no pueden justificarse (plazo de {{ diasPlazo }} días vencido).
                  </p>
                }
              </div>
              <button type="button" class="btn btn-primary btn-sm shrink-0"
                (click)="abrirModalJustificar(p)" [disabled]="justSvc.saving()">
                <span class="icon icon-sm">upload_file</span> Subir justificación
              </button>
            </div>
          </div>

          <div class="card overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
              Faltas registradas (estado F)
            </div>
            <div class="divide-y divide-gray-50">
              @for (f of p.faltasPendientes; track f.id) {
                <div class="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-gray-800">{{ f.fechaLabel }}</p>
                    @if (f.diasRestantes !== undefined) {
                      <p class="text-[11px] mt-0.5"
                        [ngClass]="f.diasRestantes === 0 ? 'text-amber-600 font-medium' : 'text-gray-400'">
                        @if (f.diasRestantes === 0) { Último día para justificar }
                        @else if (f.diasRestantes === 1) { 1 día restante }
                        @else { {{ f.diasRestantes }} días restantes }
                      </p>
                    }
                    @if (f.observacion) {
                      <p class="text-xs text-gray-500 mt-0.5">{{ f.observacion }}</p>
                    }
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm"
                    (click)="abrirModalJustificar(p, [f.id])" [disabled]="justSvc.saving()">
                    Justificar
                  </button>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="card p-4 bg-emerald-50/50 border border-emerald-100">
            <p class="text-sm text-emerald-800 flex items-center gap-2">
              <span class="icon icon-sm">check_circle</span>
              No hay faltas pendientes de justificar para el alumno seleccionado.
            </p>
          </div>
        }

        @if (historialJustificaciones().length) {
          <div class="card overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
              Justificaciones enviadas
            </div>
            <div class="divide-y divide-gray-50">
              @for (j of historialJustificaciones(); track j.id) {
                <div class="px-4 py-3">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p class="text-sm font-medium text-gray-900">{{ j.motivo }}</p>
                      <p class="text-xs text-gray-500 mt-0.5">
                        {{ j.cantidad }} falta(s) · {{ j.fechas.join(', ') }}
                      </p>
                      @if (j.observacion) {
                        <p class="text-xs text-gray-400 mt-1">{{ j.observacion }}</p>
                      }
                      @if (j.adjuntos?.length) {
                        <div class="flex flex-wrap gap-2 mt-2">
                          @for (a of j.adjuntos; track a.url) {
                            <a [href]="justificacionAdjuntoUrl(a.url)" target="_blank" rel="noopener"
                              class="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">
                              <span class="icon icon-sm">attach_file</span>{{ a.nombreArchivo }}
                            </a>
                          }
                        </div>
                      }
                    </div>
                    <span class="text-[11px] text-gray-400 whitespace-nowrap">{{ j.fechaRegistro }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div class="card p-4 bg-slate-50 border border-slate-100 text-xs text-slate-600">
          <p class="font-semibold text-slate-700 mb-1">¿Qué ocurre al enviar?</p>
          <p>
            La justificación queda registrada con sus adjuntos. Las faltas seleccionadas pasan de
            <strong>F</strong> a <strong>J (justificada)</strong> en asistencia, reportes del alumno y panel administrativo.
            Solo puedes justificar faltas hasta <strong>{{ diasPlazo }} días</strong> después de ocurridas.
          </p>
        </div>
      }
    </div>

    @if (modalJustificar()) {
      <div appOverlayPortal class="fixed inset-0 z-[80]">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" (click)="cerrarModalJustificar()"></div>
        <aside class="absolute inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r"
          (click)="$event.stopPropagation()">
          <div class="shrink-0 bg-gradient-to-br from-indigo-600 to-violet-700 text-white px-5 py-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase tracking-wider text-indigo-100 font-semibold">Nueva justificación</p>
                <h3 class="font-bold text-lg">{{ hijoNombre() }}</h3>
              </div>
              <button type="button" class="btn-icon text-white/80 hover:text-white" (click)="cerrarModalJustificar()">
                <span class="icon">close</span>
              </button>
            </div>
            <p class="text-xs text-indigo-100 mt-2">
              Seleccionadas: {{ faltasSeleccionadas().length }} falta(s)
            </p>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0">
            <section>
              <h4 class="text-sm font-semibold text-gray-800 mb-2">Faltas a justificar</h4>
              <div class="space-y-2">
                @for (f of pendienteActual()?.faltasPendientes ?? []; track f.id) {
                  <label class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer"
                    [ngClass]="faltasSeleccionadas().includes(f.id) ? 'border-indigo-300 bg-indigo-50/80' : 'border-gray-200 bg-gray-50/50'">
                    <input type="checkbox" class="mt-1 accent-indigo-600"
                      [checked]="faltasSeleccionadas().includes(f.id)"
                      (change)="toggleFaltaJustificar(f.id)">
                    <div>
                      <span class="font-semibold text-gray-900">{{ f.fechaLabel }}</span>
                      @if (f.diasRestantes !== undefined) {
                        <p class="text-[11px] mt-0.5"
                          [ngClass]="f.diasRestantes === 0 ? 'text-amber-600' : 'text-gray-400'">
                          @if (f.diasRestantes === 0) { Último día de plazo }
                          @else { {{ f.diasRestantes }} día(s) restante(s) }
                        </p>
                      }
                      @if (f.observacion) {
                        <p class="text-xs text-gray-500 mt-1">{{ f.observacion }}</p>
                      }
                    </div>
                  </label>
                }
              </div>
            </section>

            <section>
              <h4 class="text-sm font-semibold text-gray-800 mb-2">Motivo <span class="text-red-500">*</span></h4>
              <select class="form-select mb-2" [(ngModel)]="formJustificar.motivo">
                <option value="">Selecciona un motivo</option>
                @for (m of motivosJustificacion; track m) {
                  <option [value]="m">{{ m }}</option>
                }
              </select>
              @if (formJustificar.motivo === 'Otro') {
                <input class="form-input" placeholder="Describe el motivo..." [(ngModel)]="formJustificar.motivoOtro">
              }
            </section>

            <section>
              <h4 class="text-sm font-semibold text-gray-800 mb-2">Documentos de sustento</h4>
              <label class="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/80 hover:border-indigo-300 cursor-pointer">
                <span class="icon text-3xl text-indigo-400">cloud_upload</span>
                <span class="text-sm text-gray-600">PDF, imágenes u Office · máx. 5 · 10 MB c/u</span>
                <input type="file" class="hidden" multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt,.zip"
                  (change)="onAdjuntosChange($event)">
              </label>
              @if (adjuntos().length) {
                <ul class="mt-3 space-y-2">
                  @for (f of adjuntos(); track f.name + f.size) {
                    <li class="flex items-center gap-2 p-2 rounded-lg border text-sm">
                      <span class="flex-1 truncate">{{ f.name }}</span>
                      <button type="button" class="btn-icon text-red-500" (click)="quitarAdjunto(f)">
                        <span class="icon icon-sm">close</span>
                      </button>
                    </li>
                  }
                </ul>
              }
            </section>

            <section>
              <h4 class="text-sm font-semibold text-gray-800 mb-2">Observaciones</h4>
              <textarea class="form-input min-h-[80px] resize-none" rows="3"
                placeholder="Detalle del certificado o constancia..."
                [(ngModel)]="formJustificar.observacion"></textarea>
            </section>

            @if (errorJustificar()) {
              <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{{ errorJustificar() }}</div>
            }
          </div>

          <div class="shrink-0 px-5 py-4 border-t bg-gray-50 flex gap-3">
            <button type="button" class="btn btn-secondary flex-1"
              (click)="cerrarModalJustificar()" [disabled]="justSvc.saving()">Cancelar</button>
            <button type="button" class="btn btn-primary flex-1"
              (click)="confirmarJustificacion()"
              [disabled]="justSvc.saving() || !motivoValido() || faltasSeleccionadas().length === 0">
              @if (justSvc.saving()) { Enviando… } @else { Enviar justificación }
            </button>
          </div>
        </aside>
      </div>
    }

    @if (toast()) {
      <div appOverlayPortal class="fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg z-[100] text-white flex items-center gap-2"
        [ngClass]="toast()!.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'">
        <span class="icon icon-sm">{{ toast()!.tipo === 'success' ? 'check_circle' : 'error' }}</span>
        {{ toast()!.mensaje }}
      </div>
    }
  `,
})
export class JustificacionesPadreComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly segSvc = inject(SeguimientoService);
  readonly justSvc = inject(JustificacionesPadreService);

  readonly motivosJustificacion = MOTIVOS_JUSTIFICACION;
  readonly diasPlazo = DIAS_PLAZO_JUSTIFICACION;
  readonly justificacionAdjuntoUrl = justificacionAdjuntoUrl;

  readonly studentId = signal<number | null>(null);
  readonly pendienteActual = signal<PendienteJustificacion | null>(null);
  readonly historialJustificaciones = signal<JustificacionItem[]>([]);
  readonly faltasSeleccionadas = signal<number[]>([]);
  readonly adjuntos = signal<File[]>([]);
  readonly modalJustificar = signal(false);
  readonly errorJustificar = signal('');
  readonly toast = signal<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);

  formJustificar = { motivo: '', motivoOtro: '', observacion: '' };

  readonly hijoNombre = computed(() => {
    const id = this.studentId();
    return this.segSvc.hijos().find(h => h.studentId === id)?.nombreCompleto ?? 'Alumno';
  });

  ngOnInit(): void {
    this.layout.setTitle('Justificaciones');
    this.segSvc.loadHijos().subscribe({
      next: hijos => {
        this.segSvc.hijos.set(hijos);
        const first = hijos[0]?.studentId ?? null;
        if (first) this.onHijoChange(first);
      },
    });
  }

  onHijoChange(studentId: number): void {
    this.studentId.set(studentId);
    const faltaId = Number(this.route.snapshot.queryParamMap.get('faltaId'));
    this.justSvc.loadPending(studentId).subscribe({
      next: items => {
        const p = items[0] ?? null;
        this.pendienteActual.set(p);
        if (faltaId && p?.faltasPendientes?.some(f => f.id === faltaId)) {
          this.abrirModalJustificar(p, [faltaId]);
        }
      },
      error: () => this.pendienteActual.set(null),
    });
    this.justSvc.loadHistorial(studentId).subscribe({
      next: items => this.historialJustificaciones.set(items),
      error: () => this.historialJustificaciones.set([]),
    });
  }

  recargar(): void {
    const id = this.studentId();
    if (!id) return;
    this.onHijoChange(id);
  }

  abrirModalJustificar(p: PendienteJustificacion, ids?: number[]): void {
    this.pendienteActual.set(p);
    this.faltasSeleccionadas.set(ids?.length ? ids : p.faltasPendientes?.map(f => f.id) ?? []);
    this.adjuntos.set([]);
    this.formJustificar = { motivo: '', motivoOtro: '', observacion: '' };
    this.errorJustificar.set('');
    this.modalJustificar.set(true);
  }

  cerrarModalJustificar(force = false): void {
    if (!force && this.justSvc.saving()) return;
    this.modalJustificar.set(false);
    this.errorJustificar.set('');
  }

  toggleFaltaJustificar(id: number): void {
    this.faltasSeleccionadas.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id],
    );
  }

  onAdjuntosChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const nuevos = Array.from(input.files ?? []);
    this.adjuntos.update(list => [...list, ...nuevos].slice(0, 5));
    input.value = '';
  }

  quitarAdjunto(file: File): void {
    this.adjuntos.update(list => list.filter(f => f !== file));
  }

  motivoValido(): boolean {
    if (!this.formJustificar.motivo) return false;
    if (this.formJustificar.motivo === 'Otro') {
      return this.formJustificar.motivoOtro.trim().length >= 2;
    }
    return true;
  }

  confirmarJustificacion(): void {
    const studentId = this.studentId();
    const attendanceIds = this.faltasSeleccionadas();
    if (!studentId || !this.motivoValido() || !attendanceIds.length) return;

    const motivo = this.formJustificar.motivo === 'Otro'
      ? this.formJustificar.motivoOtro.trim()
      : this.formJustificar.motivo;

    this.errorJustificar.set('');
    this.justSvc.create(studentId, {
      cantidad: attendanceIds.length,
      motivo,
      observacion: this.formJustificar.observacion.trim() || undefined,
      attendanceIds,
      adjuntos: this.adjuntos(),
    }).subscribe({
      next: () => {
        this.cerrarModalJustificar(true);
        this.toast.set({
          mensaje: 'Justificación enviada correctamente. Las faltas ahora aparecen como justificadas.',
          tipo: 'success',
        });
        setTimeout(() => this.toast.set(null), 5000);
        this.recargar();
      },
      error: (err: Error) => this.errorJustificar.set(err.message),
    });
  }
}
