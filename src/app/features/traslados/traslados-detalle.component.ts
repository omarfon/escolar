import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { ExpedientesApiService } from '../../core/api/expedientes-api.service';
import {
  TrasladoContext,
  TrasladoDetalle,
  TrasladoVacanteDestino,
  TrasladosService,
  trasladoErrorMessage,
} from './traslados.service';
import {
  ESTADOS_TRASLADO_TERMINALES,
  accionExigeMotivo,
  etiquetaMotivoAccion,
} from './traslados-motivo.util';
import {
  claseBadgeEntrega,
  etiquetaCanalEntrega,
  etiquetaDestinatarioResuelto,
  etiquetaEstadoEntrega,
  puedeReintentarNotificacion,
} from './traslados-notificacion.util';
import { TrasladosTransparenciaSnapshotComponent } from './traslados-transparencia-snapshot.component';

@Component({
  selector: 'app-traslados-detalle',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, TrasladosTransparenciaSnapshotComponent],
  template: `
@if (detalle; as d) {
  <div [class]="enDrawer ? 'card p-4 sm:p-5 space-y-4' : 'card p-6 space-y-4'">
    <div class="flex items-start justify-between gap-3">
      <div>
        @if (!enDrawer) {
          <h2 class="font-bold text-[#1a202c]">{{ d.codigo }} · {{ d.estado }}</h2>
        }
        <p class="text-sm text-[#64748b]">Fecha de solicitud {{ d.createdAt | date:'dd/MM/yyyy' }}</p>
        <p class="text-sm text-[#64748b]">{{ d.ieOrigenNombre }} → {{ d.ieDestinoNombre }}</p>
        <div class="mt-2 text-sm">
          <span class="font-medium text-[#1a202c]">Motivo de la solicitud:</span>
          <p class="text-[#64748b] mt-0.5">{{ d.motivo }}</p>
          @if (d.observacion) {
            <span class="font-medium text-[#1a202c] mt-2 block">Observación vigente:</span>
            <p class="text-[#64748b] mt-0.5">{{ d.observacion }}</p>
          }
          <span class="font-medium text-[#1a202c] mt-2 block">Evidencia:</span>
          <p class="text-[#64748b] mt-0.5">{{ d.evidencia }}</p>
          @if (d.evidenciaTipo === 'referencia' && d.evidenciaReferencia) {
            <p class="text-xs text-[#94a3b8]">Referencia: {{ d.evidenciaReferencia }}</p>
          }
          @if (d.seccionDestino) {
            <p class="text-xs text-teal-700 mt-1">Sección asignada en destino: {{ d.seccionDestino }}</p>
          }
          @if (d.estado === 'concluida' && d.matriculaDestino; as md) {
            <p class="text-xs text-teal-800 mt-2">
              Matrícula activa en {{ md.codigoModular }} · sección {{ md.seccion }}.
              <a
                class="inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline ml-1"
                routerLink="/estudiantes/documentos"
                [queryParams]="{ studentId: md.studentId }"
              >
                Ver expediente en destino
              </a>
            </p>
          }
          @if (d.evidenciaTipo === 'documento' && d.evidenciaDocumento; as doc) {
            <p class="text-xs text-[#94a3b8]">
              Documento: {{ doc.tipo }} · {{ doc.numero || 'sin número' }}
              @if (doc.versionId) {
                ·
                <button type="button" class="text-indigo-700 hover:underline font-medium" [disabled]="descargandoEvidencia()" (click)="descargarEvidencia(d)">
                  @if (descargandoEvidencia()) { Descargando… } @else { Descargar archivo }
                </button>
              } @else if (!doc.tieneArchivo) {
                · sin archivo cargado
              }
            </p>
          }
        </div>
        @if (esDestino(d)) {
          <span class="badge badge-indigo mt-2">IE de destino</span>
        } @else if (esOrigen(d)) {
          <span class="badge badge-gray mt-2">IE de origen</span>
        }
        @if (d.historialAcademico?.estudiante; as est) {
          <p class="text-sm text-[#64748b] mt-2">
            Matrícula {{ est.estadoMatricula }} · {{ est.grado }} {{ est.nivel }} "{{ est.seccion }}" · ingreso {{ est.anioIngreso }}
          </p>
        }
        <a
          class="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline mt-2"
          routerLink="/matricula/historial"
          [queryParams]="{ studentId: d.studentId }"
        >
          <span class="icon text-[14px]">timeline</span>
          Ver en historial de matrícula
        </a>
      </div>
      @if (!enDrawer) {
        <button type="button" class="btn-icon" (click)="cerrar.emit()" aria-label="Cerrar detalle">
          <span class="icon">close</span>
        </button>
      }
    </div>

    @if (d.transparencia) {
      <app-traslados-transparencia-snapshot [transparencia]="d.transparencia" />
    }

    @if (d.notificaciones.length) {
      <div class="border border-indigo-100 rounded-xl overflow-hidden" role="region" aria-label="Notificaciones de estado">
        <div class="flex items-center justify-between gap-2 bg-indigo-50 px-4 py-2 border-b border-indigo-100">
          <h3 class="text-sm font-bold text-indigo-900">Notificaciones de estado</h3>
          @if (hayFallidas(d)) {
            <button type="button" class="btn btn-secondary btn-xs" [disabled]="svc.saving()" (click)="reintentarFallidas(d)">
              Reintentar fallidas
            </button>
          }
        </div>
        <ul class="divide-y divide-indigo-50">
          @for (n of d.notificaciones; track n.id) {
            <li class="px-4 py-3 text-sm space-y-1" [class.bg-slate-50]="n.leida">
              <div class="flex flex-wrap items-center gap-2">
                <span [class]="claseBadgeEntrega(n.estadoEntrega)">{{ etiquetaEstadoEntrega(n.estadoEntrega, n) }}</span>
                @if (etiquetaCanalEntrega(n.canalEntrega)) {
                  <span class="badge badge-gray">{{ etiquetaCanalEntrega(n.canalEntrega) }}</span>
                }
                @if (n.leida) {
                  <span class="badge badge-gray">Leída</span>
                }
                <span class="text-xs text-[#64748b]">{{ n.ambito }} · {{ etiquetaDestinatarioResuelto(n) }}</span>
              </div>
              <p class="text-[#1a202c]">{{ n.mensaje }}</p>
              <p class="text-xs text-[#94a3b8]">
                {{ n.estadoAnterior || '—' }} → {{ n.estadoNuevo }}
                · intentos {{ n.intentos }}/{{ n.maxIntentos }}
                @if (n.entregadoAt) { · entregado {{ n.entregadoAt | date:'dd/MM/yyyy HH:mm' }} }
              </p>
              @if (n.ultimoError) {
                <p class="text-xs text-red-600" role="alert">{{ n.ultimoError }}</p>
              }
              <div class="flex gap-2 pt-1">
                @if (!n.leida && puedeMarcarLeida(n, d)) {
                  <button type="button" class="btn btn-secondary btn-xs" (click)="marcarLeida(d, n.id)">
                    Marcar leída
                  </button>
                }
                @if (puedeReintentarNotificacion(n)) {
                  <button type="button" class="btn btn-secondary btn-xs" [disabled]="svc.saving()" (click)="reintentarUna(d, n.id)">
                    Reintentar
                  </button>
                }
              </div>
            </li>
          }
        </ul>
        @if (notificacionError()) {
          <p class="px-4 py-2 text-sm text-red-600 border-t border-indigo-100" role="alert">{{ notificacionError() }}</p>
        }
      </div>
    }

    @if (d.historialAcademico?.trayectoria?.length) {
      <div>
        <h3 class="text-sm font-bold text-[#1a202c] mb-2">Historial académico</h3>
        <table class="data-table">
          <thead>
            <tr><th>Año</th><th>Grado</th><th>Sección</th><th>Promedio</th><th>Estado</th></tr>
          </thead>
          <tbody>
            @for (h of d.historialAcademico!.trayectoria; track h.anio) {
              <tr>
                <td>{{ h.anio }}</td>
                <td>{{ h.grado }}</td>
                <td>{{ h.seccion }}</td>
                <td>{{ h.promedio }}</td>
                <td>{{ h.estado }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div>
      <h3 class="text-sm font-bold text-[#1a202c] mb-2">Historial de motivos y acciones</h3>
      <ol class="space-y-2">
        @for (e of d.eventos; track e.id) {
          <li class="text-sm border border-[#e8eaf0] rounded-lg px-3 py-2">
            <span class="font-medium text-indigo-700">{{ etiquetaAccion(e.accion) }}</span>
            · {{ e.estadoAnterior || '—' }} → {{ e.estadoNuevo }}
            · {{ e.actorNombre }}
            <div class="text-[#64748b] mt-1">{{ e.motivo }}</div>
          </li>
        }
      </ol>
    </div>

    @if (puedeRegistrarMotivo(d)) {
      <div class="border border-[#e8eaf0] rounded-xl p-4 space-y-3 bg-[#fafbfc]">
        <h3 class="text-sm font-bold text-[#1a202c]">Registrar motivo u observación</h3>
        <p class="text-xs text-[#94a3b8]">Queda en el historial sin cambiar el estado de la solicitud.</p>
        <div>
          <label class="form-label" for="motivoRegistro">Motivo <span class="text-red-400">*</span></label>
          <textarea id="motivoRegistro" class="form-input min-h-[72px]" [ngModel]="motivoRegistro" name="motivoRegistro" (ngModelChange)="motivoRegistro = $event"></textarea>
        </div>
        <div>
          <label class="form-label" for="observacionRegistro">Observación (actualiza la vigente)</label>
          <textarea id="observacionRegistro" class="form-input min-h-[56px]" [ngModel]="observacionRegistro" name="observacionRegistro" (ngModelChange)="observacionRegistro = $event"></textarea>
        </div>
        @if (registroExito()) {
          <p class="text-sm text-emerald-700" role="status">{{ registroExito() }}</p>
        }
        @if (registroError()) {
          <p class="form-error" role="alert">{{ registroError() }}</p>
        }
        <div class="flex justify-end">
          <button type="button" class="btn btn-secondary btn-sm" [disabled]="svc.saving()" (click)="registrarMotivo(d)">
            @if (svc.saving()) { Guardando… } @else { Registrar motivo }
          </button>
        </div>
      </div>
    }

    @if (mostrarVacanteAprobacion(d)) {
      <div class="border border-teal-100 rounded-xl overflow-hidden" role="region" aria-label="Vacantes en IE destino">
        <div class="bg-teal-50 px-4 py-2 border-b border-teal-100">
          <h3 class="text-sm font-bold text-teal-900">Vacantes en destino · {{ vacanteDestino()?.grado }} {{ vacanteDestino()?.nivel }}</h3>
        </div>
        <div class="px-4 py-3 text-sm space-y-2">
          @if (vacanteCargando()) {
            <p class="text-[#64748b]">Consultando cupos…</p>
          } @else if (vacanteError()) {
            <p class="text-red-600" role="alert">{{ vacanteError() }}</p>
          } @else if (vacanteDestino(); as v) {
            @if (!v.vacanteDisponible) {
              <p class="text-red-700 font-medium">No hay vacantes disponibles. No puede aprobar este traslado.</p>
            } @else {
              <p class="text-[#64748b]">Total disponible: {{ v.vacantesDisponibles }} · origen sección {{ v.seccionOrigen }}</p>
              <table class="data-table text-xs">
                <thead><tr><th>Sección</th><th>Matriculados</th><th>Aforo</th><th>Disponibles</th></tr></thead>
                <tbody>
                  @for (s of v.secciones; track s.seccion) {
                    <tr [class.bg-teal-50]="seccionDestino === s.seccion">
                      <td>{{ s.seccion }}</td>
                      <td>{{ s.matriculados }}</td>
                      <td>{{ s.capacidad }}</td>
                      <td>{{ s.disponibles }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              @if (seccionesConCupo(v).length > 1) {
                <div>
                  <label class="form-label" for="seccionDestino">Sección de destino <span class="text-red-400">*</span></label>
                  <select id="seccionDestino" class="form-input" [ngModel]="seccionDestino" name="seccionDestino" (ngModelChange)="seccionDestino = $event">
                    <option value="">Seleccione sección</option>
                    @for (s of seccionesConCupo(v); track s.seccion) {
                      <option [value]="s.seccion">{{ s.seccion }} ({{ s.disponibles }} vacantes)</option>
                    }
                  </select>
                </div>
              }
            }
          }
        </div>
      </div>
    }

    @if (mostrarAcciones && accionesDisponibles(d).length) {
      <div class="border-t border-[#e8eaf0] pt-4 space-y-3">
        <h3 class="text-sm font-bold text-[#1a202c]">Cambiar estado</h3>
        <div>
          <label class="form-label" for="motivoAccion">
            {{ etiquetaMotivoAccion(accionSeleccionada() || 'enviar') }}
            @if (accionSeleccionada() && accionExigeMotivo(accionSeleccionada()!)) {
              <span class="text-red-400">*</span>
            }
          </label>
          <textarea id="motivoAccion" class="form-input min-h-[72px]" [ngModel]="motivoAccion" name="motivoAccion" (ngModelChange)="motivoAccion = $event" [attr.placeholder]="placeholderMotivo()"></textarea>
        </div>
        @if (accionError()) {
          <p class="form-error" role="alert">{{ accionError() }}</p>
        }
        <div class="flex flex-wrap gap-2">
          @for (a of accionesDisponibles(d); track a.accion) {
            <button type="button"
              [class]="a.primaria ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'"
              [disabled]="svc.saving() || accionBloqueada(d, a.accion)"
              (click)="prepararAccion(a.accion); emitir(a.accion, a.exigeMotivo)">
              {{ a.etiqueta }}
            </button>
          }
        </div>
      </div>
    }
  </div>
}
  `,
})
export class TrasladosDetalleComponent implements OnChanges {
  readonly svc = inject(TrasladosService);
  private readonly auth = inject(AuthService);
  private readonly expedientesApi = inject(ExpedientesApiService);

  @Input({ required: true }) detalle!: TrasladoDetalle;
  @Input() context: TrasladoContext | null = null;
  @Input() mostrarAcciones = true;
  @Input() enDrawer = false;

  @Output() cerrar = new EventEmitter<void>();
  @Output() accion = new EventEmitter<{
    accion: string;
    motivo?: string;
    observacion?: string;
    seccionDestino?: string;
    error?: string;
  }>();
  @Output() actualizado = new EventEmitter<TrasladoDetalle>();

  motivoAccion = '';
  motivoRegistro = '';
  observacionRegistro = '';
  readonly accionSeleccionada = signal<string | null>(null);
  readonly accionError = signal('');
  readonly registroError = signal('');
  readonly registroExito = signal('');
  readonly descargandoEvidencia = signal(false);
  readonly vacanteDestino = signal<TrasladoVacanteDestino | null>(null);
  readonly vacanteCargando = signal(false);
  readonly vacanteError = signal('');
  seccionDestino = '';
  private idempotencyKey = crypto.randomUUID();

  readonly accionExigeMotivo = accionExigeMotivo;
  readonly etiquetaMotivoAccion = etiquetaMotivoAccion;

  etiquetaAccion(accion: string): string {
    if (accion === 'registrar_motivo') return 'Registro de motivo';
    return accion;
  }

  placeholderMotivo(): string {
    const a = this.accionSeleccionada();
    if (a && accionExigeMotivo(a)) return 'Mínimo 5 caracteres';
    return 'Opcional';
  }

  puedeSolicitar(): boolean {
    return this.auth.hasAnyPermiso('traslados.solicitar') || this.auth.isAdmin();
  }

  puedeResolver(): boolean {
    if (this.auth.isAdmin()) return true;
    if (!this.auth.hasAnyPermiso('traslados.resolver')) return false;
    const ambitos = this.auth.currentUser()?.ambitos ?? [];
    return ambitos.some((a) => a === 'UGEL' || a === 'DRE' || a === 'MINEDU');
  }

  esOrigen(item: { ieOrigenCodigoModular: string }): boolean {
    const modular = this.context?.institucion?.codigoModular ?? '';
    return !!modular && item.ieOrigenCodigoModular === modular;
  }

  esDestino(item: { ieDestinoCodigoModular: string; ieOrigenCodigoModular: string }): boolean {
    const modular = this.context?.institucion?.codigoModular ?? '';
    return !!modular && item.ieDestinoCodigoModular === modular && item.ieOrigenCodigoModular !== modular;
  }

  puedeAprobarDestino(item: { ieDestinoCodigoModular: string; ieOrigenCodigoModular: string }): boolean {
    if (this.auth.isAdmin()) return this.esDestino(item);
    if (!this.auth.hasAnyPermiso('traslados.aprobar_destino')) return false;
    const ambitos = this.auth.currentUser()?.ambitos ?? [];
    if (!ambitos.includes('IE')) return false;
    return this.esDestino(item);
  }

  puedeRegistrarMotivo(d: TrasladoDetalle): boolean {
    if (ESTADOS_TRASLADO_TERMINALES.includes(d.estado)) return false;
    return (
      this.puedeResolver() ||
      (this.puedeSolicitar() && this.esOrigen(d)) ||
      this.puedeAprobarDestino(d)
    );
  }

  accionesDisponibles(d: TrasladoDetalle): Array<{ accion: string; etiqueta: string; primaria: boolean; exigeMotivo: boolean }> {
    const acciones: Array<{ accion: string; etiqueta: string; primaria: boolean; exigeMotivo: boolean }> = [];
    if (this.puedeSolicitar() && this.esOrigen(d)) {
      if (d.estado === 'borrador' || d.estado === 'observada') {
        acciones.push({ accion: 'enviar', etiqueta: 'Enviar', primaria: true, exigeMotivo: false });
      }
      if (d.estado === 'borrador' || d.estado === 'enviada' || d.estado === 'observada') {
        acciones.push({ accion: 'cancelar', etiqueta: 'Cancelar', primaria: false, exigeMotivo: true });
      }
    }
    if (this.puedeResolver()) {
      if (d.estado === 'enviada') {
        acciones.push({ accion: 'observar', etiqueta: 'Observar', primaria: false, exigeMotivo: true });
      }
      if (d.estado === 'aprobada') {
        acciones.push({ accion: 'concluir', etiqueta: 'Concluir', primaria: true, exigeMotivo: true });
      }
    }
    if ((this.puedeResolver() || this.puedeAprobarDestino(d)) && (d.estado === 'enviada' || d.estado === 'observada')) {
      acciones.push({ accion: 'aprobar', etiqueta: 'Aprobar', primaria: true, exigeMotivo: true });
      acciones.push({ accion: 'rechazar', etiqueta: 'Rechazar', primaria: false, exigeMotivo: true });
    }
    return acciones;
  }

  ngOnChanges(): void {
    this.cargarVacanteDestino();
  }

  mostrarVacanteAprobacion(d: TrasladoDetalle): boolean {
    return (
      (d.estado === 'enviada' || d.estado === 'observada') &&
      (this.puedeAprobarDestino(d) || this.puedeResolver()) &&
      this.accionesDisponibles(d).some((a) => a.accion === 'aprobar')
    );
  }

  seccionesConCupo(v: TrasladoVacanteDestino) {
    return v.secciones.filter((s) => s.disponibles > 0);
  }

  accionBloqueada(d: TrasladoDetalle, accion: string): boolean {
    if (accion !== 'aprobar') return false;
    const v = this.vacanteDestino();
    if (this.vacanteCargando() || this.vacanteError()) return true;
    if (!v?.vacanteDisponible) return true;
    if (this.seccionesConCupo(v).length > 1 && !this.seccionDestino.trim()) return true;
    return false;
  }

  cargarVacanteDestino(): void {
    const d = this.detalle;
    if (!d || !this.mostrarVacanteAprobacion(d)) {
      this.vacanteDestino.set(null);
      this.seccionDestino = d?.seccionDestino ?? '';
      return;
    }
    this.vacanteCargando.set(true);
    this.vacanteError.set('');
    this.svc.vacanteDestino(d.id).subscribe({
      next: (res) => {
        this.vacanteDestino.set(res);
        this.seccionDestino =
          res.seccionDestinoAsignada ??
          res.seccionSugerida ??
          (this.seccionesConCupo(res).length === 1 ? this.seccionesConCupo(res)[0]!.seccion : '');
        this.vacanteCargando.set(false);
      },
      error: (err) => {
        this.vacanteCargando.set(false);
        this.vacanteDestino.set(null);
        this.vacanteError.set(trasladoErrorMessage(err, 'No se pudo consultar vacantes'));
      },
    });
  }

  prepararAccion(accion: string): void {
    this.accionSeleccionada.set(accion);
    this.accionError.set('');
  }

  emitir(accion: string, exigeMotivo = false): void {
    this.prepararAccion(accion);
    const motivo = this.motivoAccion.trim();
    if ((exigeMotivo || accionExigeMotivo(accion)) && motivo.length < 5) {
      const msg = 'Indique el motivo (mínimo 5 caracteres).';
      this.accionError.set(msg);
      this.accion.emit({ accion, error: msg });
      return;
    }
    if (accion === 'aprobar') {
      const v = this.vacanteDestino();
      if (!v?.vacanteDisponible) {
        const msg = 'No hay vacantes disponibles en la IE de destino.';
        this.accionError.set(msg);
        this.accion.emit({ accion, error: msg });
        return;
      }
      const conCupo = v ? this.seccionesConCupo(v) : [];
      const seccion = this.seccionDestino.trim() || (conCupo.length === 1 ? conCupo[0]!.seccion : '');
      if (conCupo.length > 1 && !seccion) {
        const msg = 'Seleccione la sección de destino con vacantes.';
        this.accionError.set(msg);
        this.accion.emit({ accion, error: msg });
        return;
      }
      this.accionError.set('');
      this.accion.emit({ accion, motivo: motivo || undefined, seccionDestino: seccion || undefined });
      return;
    }
    this.accionError.set('');
    this.accion.emit({ accion, motivo: motivo || undefined });
  }

  readonly claseBadgeEntrega = claseBadgeEntrega;
  readonly etiquetaEstadoEntrega = etiquetaEstadoEntrega;
  readonly etiquetaDestinatarioResuelto = etiquetaDestinatarioResuelto;
  readonly etiquetaCanalEntrega = etiquetaCanalEntrega;
  readonly puedeReintentarNotificacion = puedeReintentarNotificacion;
  notificacionError = signal('');

  hayFallidas(d: TrasladoDetalle): boolean {
    return d.notificaciones.some((n) => puedeReintentarNotificacion(n));
  }

  puedeMarcarLeida(
    n: { ambito: string; destinatarioUserId?: number | null },
    d: { ieOrigenCodigoModular: string; ieDestinoCodigoModular: string },
  ): boolean {
    const actorId = Number(this.auth.currentUser()?.id);
    if (n.destinatarioUserId != null && Number.isFinite(actorId)) {
      return n.destinatarioUserId === actorId;
    }
    const modular = this.context?.institucion?.codigoModular ?? '';
    if (n.ambito === 'IE_ORIGEN') return modular === d.ieOrigenCodigoModular;
    if (n.ambito === 'IE_DESTINO') return modular === d.ieDestinoCodigoModular;
    return this.puedeResolver();
  }

  marcarLeida(d: TrasladoDetalle, notificationId: number): void {
    this.notificacionError.set('');
    this.svc.markNotificationRead(d.id, notificationId).subscribe({
      next: () => {
        this.svc.detail(d.id).subscribe({
          next: (res) => this.actualizado.emit(res),
          error: (err) => this.notificacionError.set(trasladoErrorMessage(err, 'No se pudo actualizar')),
        });
      },
      error: (err) => this.notificacionError.set(trasladoErrorMessage(err, 'No se pudo marcar como leída')),
    });
  }

  reintentarUna(d: TrasladoDetalle, notificationId: number): void {
    this.notificacionError.set('');
    this.svc.retryNotifications(d.id, notificationId).subscribe({
      next: () => {
        this.svc.detail(d.id).subscribe({
          next: (res) => this.actualizado.emit(res),
          error: (err) => this.notificacionError.set(trasladoErrorMessage(err, 'No se pudo actualizar')),
        });
      },
      error: (err) => this.notificacionError.set(trasladoErrorMessage(err, 'No se pudo reintentar')),
    });
  }

  reintentarFallidas(d: TrasladoDetalle): void {
    this.notificacionError.set('');
    this.svc.retryNotifications(d.id).subscribe({
      next: () => {
        this.svc.detail(d.id).subscribe({
          next: (res) => this.actualizado.emit(res),
          error: (err) => this.notificacionError.set(trasladoErrorMessage(err, 'No se pudo actualizar')),
        });
      },
      error: (err) => this.notificacionError.set(trasladoErrorMessage(err, 'No se pudo reintentar')),
    });
  }

  descargarEvidencia(d: TrasladoDetalle): void {
    const doc = d.evidenciaDocumento;
    if (!doc?.versionId || !d.evidenciaDocumentId) return;
    this.descargandoEvidencia.set(true);
    this.expedientesApi.downloadDocumentBlob(d.studentId, d.evidenciaDocumentId, doc.versionId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${doc.tipo}-${doc.numero || doc.id}`.replace(/\s+/g, '_');
        anchor.click();
        URL.revokeObjectURL(url);
        this.descargandoEvidencia.set(false);
      },
      error: () => this.descargandoEvidencia.set(false),
    });
  }

  registrarMotivo(d: TrasladoDetalle): void {
    this.registroError.set('');
    this.registroExito.set('');
    const motivo = this.motivoRegistro.trim();
    if (motivo.length < 5) {
      this.registroError.set('Indique el motivo (mínimo 5 caracteres).');
      return;
    }
    this.svc.registerMotivo(d.id, {
      motivo,
      observacion: this.observacionRegistro.trim() || undefined,
      idempotencyKey: this.idempotencyKey,
    }).subscribe({
      next: (res) => {
        this.motivoRegistro = '';
        this.observacionRegistro = '';
        this.idempotencyKey = crypto.randomUUID();
        this.registroExito.set(
          res.recuperada
            ? 'El motivo ya estaba registrado; se recuperó la solicitud.'
            : 'Motivo registrado correctamente en el historial.',
        );
        this.actualizado.emit(res);
      },
      error: (err) => this.registroError.set(trasladoErrorMessage(err, 'No se pudo registrar el motivo')),
    });
  }
}
