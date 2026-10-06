import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import {
  MatriculaNacional,
  TrasladoAlumno,
  TrasladoContext,
  TrasladoDetalle,
  TrasladoInstitucion,
  TrasladoResumen,
  TrasladosService,
  trasladoErrorMessage,
} from './traslados.service';
import type { ApiDocumentoMatricula } from '../../core/api/api.models';
import {
  EvidenciaTrasladoTipo,
  TrasladoFormErrores,
  validarTrasladoForm,
} from './traslados-form.validation';
import { TrasladosDetalleDrawerComponent } from './traslados-detalle-drawer.component';
import { TRASLADO_BADGE } from './traslados.constants';
import { transferIdDesdeQuery } from './traslados-query.util';

@Component({
  selector: 'app-traslados-origen',
  standalone: true,
  imports: [FormsModule, NgClass, TrasladosDetalleDrawerComponent],
  template: `
<div class="space-y-4">
  @if (successMsg()) {
    <div class="p-4 bg-[#dcfce7] border border-green-200 rounded-2xl text-sm text-[#15803d]" role="status">{{ successMsg() }}</div>
  }
  @if (errorMsg()) {
    <div class="p-4 bg-[#fee2e2] border border-red-200 rounded-2xl text-sm text-[#b91c1c]" role="alert">{{ errorMsg() }}</div>
  }

  @if (puedeSolicitar()) {
    <form class="card overflow-hidden" (ngSubmit)="crear()">
      <div class="px-6 py-5 border-b border-[#f1f3f7] flex items-center gap-4 bg-gradient-to-r from-indigo-50 via-indigo-50/50 to-transparent">
        <div class="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
          <span class="icon text-indigo-600" style="font-size:22px">outbound</span>
        </div>
        <div>
          <h2 class="font-bold text-[#1a202c]">Nueva solicitud</h2>
          <p class="text-xs text-[#94a3b8]">Registre el traslado de un estudiante matriculado hacia otra IE. Al concluirse, se cierra la matrícula aquí conservando el historial.</p>
        </div>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="form-label" for="buscar">Estudiante matriculado <span class="text-red-400">*</span></label>
          <div class="flex gap-2">
            <input id="buscar" class="form-input" [ngModel]="busqueda" name="busqueda" (ngModelChange)="busqueda = $event" (blur)="tocar('studentId')" placeholder="DNI, código o apellido" />
            <button type="button" class="btn btn-secondary" (click)="buscarAlumnos()">Buscar</button>
          </div>
          @if (alumnos().length) {
            <div class="mt-2 border border-[#e8eaf0] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              @for (a of alumnos(); track a.id) {
                <button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                  [ngClass]="studentId === a.id ? 'bg-indigo-50 text-indigo-800' : ''"
                  (click)="elegirAlumno(a)">
                  {{ a.apellidos }}, {{ a.nombres }} · {{ a.dni || 'sin documento' }} · {{ a.grado }} {{ a.nivel }} "{{ a.seccion }}"
                </button>
              }
            </div>
          }
          @if (campoError('studentId'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>

        <div>
          <label class="form-label" for="buscarIe">IE de destino <span class="text-red-400">*</span></label>
          <div class="flex gap-2">
            <input id="buscarIe" class="form-input" [ngModel]="busquedaIe" name="buscarIe" (ngModelChange)="busquedaIe = $event" placeholder="Nombre o código modular" />
            <button type="button" class="btn btn-secondary" (click)="buscarInstituciones()">Buscar</button>
          </div>
          @if (instituciones().length) {
            <div class="mt-2 border border-[#e8eaf0] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              @for (ie of instituciones(); track ie.id) {
                <button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                  [ngClass]="ieDestinoCodigoModular === ie.codigoModular ? 'bg-indigo-50 text-indigo-800' : ''"
                  (click)="elegirInstitucion(ie)">
                  {{ ie.nombre }} · {{ ie.codigoModular }} · {{ ie.ugel }} · {{ ie.dre }}
                </button>
              }
            </div>
          }
          @if (ieDestinoNombre) {
            <p class="text-sm text-indigo-800 mt-2">{{ ieDestinoNombre }} · modular {{ ieDestinoCodigoModular }}</p>
          }
          @if (campoError('ieDestinoCodigoModular'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="form-label" for="plazo">Plazo <span class="text-red-400">*</span></label>
            <input id="plazo" type="date" class="form-input" [ngClass]="claseCampo('plazoHasta')" [ngModel]="plazoHasta" name="plazoHasta" (ngModelChange)="plazoHasta = $event; revisar()" (blur)="tocar('plazoHasta')" />
            @if (campoError('plazoHasta'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div class="sm:col-span-2 space-y-3">
            <div>
              <span class="form-label">Evidencia trazable <span class="text-red-400">*</span></span>
              <div class="flex flex-wrap gap-4 mt-1">
                <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="evidenciaTipo" value="referencia" [ngModel]="evidenciaTipo" (ngModelChange)="cambiarEvidenciaTipo($event)" />
                  Referencia administrativa
                </label>
                <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="evidenciaTipo" value="documento" [ngModel]="evidenciaTipo" (ngModelChange)="cambiarEvidenciaTipo($event)" [disabled]="!studentId" />
                  Documento del expediente
                </label>
              </div>
              @if (campoError('evidenciaTipo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
            @if (evidenciaTipo === 'referencia') {
              <div>
                <label class="form-label" for="evidenciaReferencia">Referencia (resolución, informe, etc.) <span class="text-red-400">*</span></label>
                <input id="evidenciaReferencia" class="form-input" [ngClass]="claseCampo('evidenciaReferencia')" [ngModel]="evidenciaReferencia" name="evidenciaReferencia" (ngModelChange)="evidenciaReferencia = $event; revisar()" (blur)="tocar('evidenciaReferencia')" placeholder="Ej. RD N.º 123-2026-UGEL" />
                @if (campoError('evidenciaReferencia'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            }
            @if (evidenciaTipo === 'documento') {
              <div>
                <label class="form-label" for="evidenciaDocumento">Documento con archivo cargado <span class="text-red-400">*</span></label>
                @if (!studentId) {
                  <p class="text-sm text-[#94a3b8]">Seleccione primero un estudiante para listar su expediente.</p>
                } @else if (documentosExpediente().length) {
                  <select id="evidenciaDocumento" class="form-input" [ngClass]="claseCampo('evidenciaDocumentId')" [ngModel]="evidenciaDocumentId" name="evidenciaDocumentId" (ngModelChange)="evidenciaDocumentId = $event ? +$event : null; revisar()" (blur)="tocar('evidenciaDocumentId')">
                    <option [ngValue]="null">Seleccione un documento</option>
                    @for (doc of documentosExpediente(); track doc.id) {
                      <option [ngValue]="doc.id">{{ doc.tipo }} · {{ doc.numero || 'sin número' }} · {{ doc.archivo!.nombreArchivo }}</option>
                    }
                  </select>
                } @else {
                  <p class="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">No hay documentos con archivo en el expediente. Suba uno en matrícula antes de continuar.</p>
                }
                @if (campoError('evidenciaDocumentId'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            }
          </div>
          <div class="sm:col-span-2">
            <label class="form-label" for="motivo">Motivo <span class="text-red-400">*</span></label>
            <textarea id="motivo" class="form-input min-h-[80px]" [ngClass]="claseCampo('motivo')" [ngModel]="motivo" name="motivo" (ngModelChange)="motivo = $event; revisar()" (blur)="tocar('motivo')"></textarea>
            @if (campoError('motivo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
        </div>
        <div class="flex justify-end">
          <button type="submit" class="btn btn-primary" [disabled]="svc.saving()">
            @if (svc.saving()) { Guardando… } @else { Crear solicitud en borrador }
          </button>
        </div>
      </div>
    </form>
  } @else {
    <div class="card p-6 text-sm text-[#64748b]">
      No tiene permiso para solicitar traslados desde esta IE. Consulte el listado o use la sección de traslados recibidos si corresponde.
    </div>
  }

  <details class="card group">
    <summary class="px-6 py-4 cursor-pointer font-medium text-[#1a202c] list-none flex items-center justify-between">
      <span>Consultar matrícula en el país</span>
      <span class="icon text-[#94a3b8] group-open:rotate-180 transition-transform">expand_more</span>
    </summary>
    <div class="px-6 pb-6 space-y-3 border-t border-[#f1f3f7] pt-4">
      <p class="text-xs text-[#94a3b8]">Verifique el estado de matrícula de un alumno en cualquier IE antes de iniciar el traslado.</p>
      <div class="flex gap-2">
        <input class="form-input" placeholder="DNI, código o apellido" [ngModel]="busquedaNacional" name="busquedaNacional" (ngModelChange)="busquedaNacional = $event" />
        <button type="button" class="btn btn-secondary" (click)="buscarMatriculaNacional()">Buscar</button>
      </div>
      @if (matriculaNacional().length) {
        <div class="border border-[#e8eaf0] rounded-lg overflow-hidden">
          @for (a of matriculaNacional(); track a.id) {
            <div class="px-3 py-2 text-sm border-b border-[#f1f3f7] last:border-0">
              <span class="font-medium">{{ a.apellidos }}, {{ a.nombres }}</span>
              · {{ a.dni || 'sin documento' }} · {{ a.grado }} {{ a.nivel }}
              <span class="badge badge-indigo ml-2">{{ a.estadoMatricula }}</span>
              <div class="text-xs text-[#64748b]">{{ a.institucion?.nombre || 'IE no registrada' }} · modular {{ a.institucion?.codigoModular || '—' }}</div>
            </div>
          }
        </div>
      }
    </div>
  </details>

  <div class="card overflow-hidden">
    <div class="px-6 py-4 border-b border-[#f1f3f7] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <p class="text-sm text-[#64748b]">Solicitudes iniciadas desde esta IE.</p>
      <div class="flex gap-2">
        <input class="form-input" placeholder="Código, alumno o IE destino" [ngModel]="filtro" name="filtro" (ngModelChange)="filtro = $event" />
        <button type="button" class="btn btn-secondary btn-sm" (click)="cargar()">Filtrar</button>
      </div>
    </div>
    @if (svc.loading()) {
      <p class="p-6 text-sm text-indigo-700">Cargando solicitudes…</p>
    } @else if (!items().length) {
      <p class="p-6 text-sm text-[#94a3b8]">Aún no hay solicitudes enviadas desde esta IE.</p>
    } @else {
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Estudiante</th>
              <th>IE destino</th>
              <th>Estado</th>
              <th>Plazo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr [class.bg-indigo-50/40]="detalle()?.id === item.id">
                <td class="font-medium text-indigo-700">{{ item.codigo }}</td>
                <td>{{ item.studentNombre }}<div class="text-xs text-[#94a3b8]">{{ item.studentDni }}</div></td>
                <td>
                  {{ item.ieDestinoNombre }}
                  <div class="text-xs text-[#94a3b8]">{{ item.ieDestinoCodigoModular }}</div>
                </td>
                <td><span class="badge" [ngClass]="badge(item.estado)">{{ item.estado }}</span></td>
                <td>{{ item.plazoHasta }}</td>
                <td><button type="button" class="btn btn-ghost btn-sm" (click)="abrir(item)">Ver</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  <app-traslados-detalle-drawer
    [abierto]="detalleCargando() || detalle() !== null"
    [cargando]="detalleCargando()"
    [detalle]="detalle()"
    [context]="context()"
    (cerrar)="cerrarDetalle()"
    (accion)="onAccion($event)"
    (actualizado)="onMotivoRegistrado($event)"
  />
</div>
  `,
})
export class TrasladosOrigenComponent implements OnInit {
  readonly svc = inject(TrasladosService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly context = signal<TrasladoContext | null>(null);
  readonly items = signal<TrasladoResumen[]>([]);
  readonly alumnos = signal<TrasladoAlumno[]>([]);
  readonly instituciones = signal<TrasladoInstitucion[]>([]);
  readonly matriculaNacional = signal<MatriculaNacional[]>([]);
  readonly documentosExpediente = signal<ApiDocumentoMatricula[]>([]);
  readonly detalle = signal<TrasladoDetalle | null>(null);
  readonly detalleCargando = signal(false);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');
  readonly tocados = signal<Partial<Record<keyof TrasladoFormErrores, true>>>({});
  readonly intento = signal(false);
  private readonly revision = signal(0);

  busqueda = '';
  busquedaIe = '';
  busquedaNacional = '';
  filtro = '';
  studentId: number | null = null;
  ieDestinoNombre = '';
  ieDestinoCodigoModular = '';
  ieDestinoUgel = '';
  ieDestinoDre = '';
  motivo = '';
  plazoHasta = '';
  evidenciaTipo: EvidenciaTrasladoTipo = 'referencia';
  evidenciaDocumentId: number | null = null;
  evidenciaReferencia = '';
  private idempotencyKey = crypto.randomUUID();

  readonly puedeSolicitar = computed(() => this.auth.hasAnyPermiso('traslados.solicitar') || this.auth.isAdmin());

  readonly errores = computed(() => {
    this.revision();
    return validarTrasladoForm({
      studentId: this.studentId,
      ieDestinoNombre: this.ieDestinoNombre,
      ieDestinoCodigoModular: this.ieDestinoCodigoModular,
      ieDestinoUgel: this.ieDestinoUgel,
      ieDestinoDre: this.ieDestinoDre,
      motivo: this.motivo,
      plazoHasta: this.plazoHasta,
      evidenciaTipo: this.evidenciaTipo,
      evidenciaDocumentId: this.evidenciaDocumentId,
      evidenciaReferencia: this.evidenciaReferencia,
      codigoModularOrigen: this.context()?.institucion?.codigoModular ?? '',
    });
  });

  ngOnInit(): void {
    const plazo = new Date();
    plazo.setDate(plazo.getDate() + 15);
    this.plazoHasta = `${plazo.getFullYear()}-${String(plazo.getMonth() + 1).padStart(2, '0')}-${String(plazo.getDate()).padStart(2, '0')}`;
    this.cargar();
    this.route.queryParamMap.subscribe((params) => {
      this.cargar();
      const transferId = transferIdDesdeQuery(params);
      if (transferId) this.abrirPorId(transferId);
    });
  }

  cargar(): void {
    this.errorMsg.set('');
    this.svc.getContext().subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.svc.list(1, this.filtro).subscribe({
          next: (page) => {
            const modular = ctx.institucion?.codigoModular ?? '';
            this.items.set(page.items.filter((i) => i.ieOrigenCodigoModular === modular));
          },
          error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cargar el listado')),
        });
      },
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cargar el contexto')),
    });
  }

  badge(estado: string): string {
    return TRASLADO_BADGE[estado] ?? 'badge-gray';
  }

  buscarInstituciones(): void {
    this.svc.searchInstitutions(this.busquedaIe).subscribe({
      next: (rows) => this.instituciones.set(rows),
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo buscar instituciones')),
    });
  }

  elegirInstitucion(ie: TrasladoInstitucion): void {
    this.ieDestinoNombre = ie.nombre;
    this.ieDestinoCodigoModular = ie.codigoModular;
    this.ieDestinoUgel = ie.ugel;
    this.ieDestinoDre = ie.dre;
    this.tocar('ieDestinoCodigoModular');
  }

  buscarMatriculaNacional(): void {
    this.svc.matriculaNacional(this.busquedaNacional).subscribe({
      next: (rows) => this.matriculaNacional.set(rows),
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo consultar la matrícula')),
    });
  }

  buscarAlumnos(): void {
    this.svc.searchStudents(this.busqueda).subscribe({
      next: (rows) => this.alumnos.set(rows),
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo buscar estudiantes')),
    });
  }

  elegirAlumno(alumno: TrasladoAlumno): void {
    this.studentId = alumno.id;
    this.evidenciaDocumentId = null;
    this.cargarDocumentosExpediente(alumno.id);
    this.tocar('studentId');
  }

  cambiarEvidenciaTipo(tipo: EvidenciaTrasladoTipo): void {
    this.evidenciaTipo = tipo;
    if (tipo === 'documento' && this.studentId) {
      this.cargarDocumentosExpediente(this.studentId);
    }
    this.tocar('evidenciaTipo');
    this.revisar();
  }

  cargarDocumentosExpediente(studentId: number): void {
    this.svc.listStudentDocuments(studentId).subscribe({
      next: (res) => {
        this.documentosExpediente.set(
          res.documentos.filter((d) => d.registrado && d.id != null && !!d.archivo?.versionId),
        );
      },
      error: () => this.documentosExpediente.set([]),
    });
  }

  revisar(): void {
    this.revision.update((n) => n + 1);
  }

  tocar(campo: keyof TrasladoFormErrores): void {
    this.tocados.update((t) => ({ ...t, [campo]: true }));
    this.revisar();
  }

  campoError(campo: keyof TrasladoFormErrores): string | null {
    if (!this.tocados()[campo] && !this.intento()) return null;
    return this.errores()[campo] ?? null;
  }

  claseCampo(campo: keyof TrasladoFormErrores): string {
    return this.campoError(campo) ? 'input-error' : '';
  }

  crear(): void {
    this.intento.set(true);
    this.revisar();
    this.errorMsg.set('');
    this.successMsg.set('');
    if (Object.keys(this.errores()).length) return;
    this.svc.create({
      studentId: this.studentId,
      ieDestinoNombre: this.ieDestinoNombre.trim(),
      ieDestinoCodigoModular: this.ieDestinoCodigoModular.trim(),
      ieDestinoUgel: this.ieDestinoUgel.trim(),
      ieDestinoDre: this.ieDestinoDre.trim(),
      motivo: this.motivo.trim(),
      plazoHasta: this.plazoHasta,
      evidenciaTipo: this.evidenciaTipo,
      ...(this.evidenciaTipo === 'documento'
        ? { evidenciaDocumentId: this.evidenciaDocumentId }
        : { evidenciaReferencia: this.evidenciaReferencia.trim() }),
      idempotencyKey: this.idempotencyKey,
    }).subscribe({
      next: (res) => {
        this.successMsg.set(
          res.recuperada ? `Se recuperó la solicitud ${res.codigo}.` : `Solicitud ${res.codigo} creada en borrador.`,
        );
        this.detalle.set(res);
        this.idempotencyKey = crypto.randomUUID();
        this.motivo = '';
        this.evidenciaReferencia = '';
        this.evidenciaDocumentId = null;
        this.evidenciaTipo = 'referencia';
        this.documentosExpediente.set([]);
        this.studentId = null;
        this.tocados.set({});
        this.intento.set(false);
        this.cargar();
      },
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo crear la solicitud')),
    });
  }

  abrir(item: TrasladoResumen): void {
    this.abrirPorId(item.id);
  }

  abrirPorId(id: number): void {
    this.detalleCargando.set(true);
    this.errorMsg.set('');
    this.svc.detail(id).subscribe({
      next: (res) => {
        this.detalle.set(res);
        this.detalleCargando.set(false);
      },
      error: (err) => {
        this.detalleCargando.set(false);
        this.detalle.set(null);
        this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo abrir la solicitud'));
      },
    });
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
    this.detalleCargando.set(false);
  }

  onMotivoRegistrado(res: TrasladoDetalle): void {
    this.detalle.set(res);
    this.successMsg.set('Motivo registrado en el historial.');
    this.cargar();
  }

  onAccion(ev: { accion: string; motivo?: string; seccionDestino?: string; error?: string }): void {
    if (ev.error) {
      this.errorMsg.set(ev.error);
      return;
    }
    const d = this.detalle();
    if (!d) return;
    this.errorMsg.set('');
    this.successMsg.set('');
    this.svc.transition(d.id, ev.accion, ev.motivo, undefined, ev.seccionDestino).subscribe({
      next: (res) => {
        this.detalle.set(res);
        this.successMsg.set(`${res.codigo} pasó a ${res.estado}.`);
        this.cargar();
      },
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cambiar el estado')),
    });
  }
}
