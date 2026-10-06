import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import {
  combinarRequisitosConDocumentos,
  DocumentoMatriculaVista,
} from '../shared/documentos-requisitos';
import { Estudiante, ExpedientesService } from '../services/expedientes.service';
import {
  ApiDocumentoArchivo,
  ApiStudentDocumentsResponse,
  StudentDocumentsContext,
} from '../../../core/api/api.models';

@Component({
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Documentos de Estudiantes</h2>
          <p class="text-sm text-gray-500 mt-0.5">
            Busca un alumno y carga los documentos sustentatorios (FUT, identidad, etc.)
          </p>
          @if (context(); as ctx) {
            <p class="text-xs text-gray-400 mt-1">
              Máx. {{ ctx.maxMb }} MB · Formatos: {{ ctx.formatosPermitidos.join(', ') }}
              · Almacén: {{ ctx.storageDriver === 'minio' ? 'MinIO' : 'Local' }}
            </p>
          }
          @if (tenant.requiresSelection()) {
            <p class="text-xs text-amber-600 mt-1">
              Seleccione una institución educativa en el encabezado para ver el padrón.
            </p>
          }
          @if (!loading() && !error() && resultados().length) {
            <p class="text-xs text-teal-600 mt-1">
              {{ resultados().length }} estudiante(s) desde la base de datos
            </p>
          }
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Búsqueda -->
        <div class="lg:col-span-4 space-y-4">
          <div class="card p-4 space-y-3">
            <label class="form-label">Buscar estudiante</label>
            <div class="flex gap-2">
              <input
                class="form-input flex-1"
                [ngModel]="busqueda()"
                (ngModelChange)="onBusquedaChange($event)"
                placeholder="Nombre, DNI, código o email"
              >
              @if (busqueda()) {
                <button class="btn btn-secondary" type="button" (click)="limpiarBusqueda()" title="Limpiar búsqueda">
                  <span class="icon icon-sm">close</span>
                </button>
              }
            </div>
            @if (loading()) {
              <p class="text-xs text-indigo-500">Cargando...</p>
            }
            @if (error()) {
              <p class="text-xs text-red-500">{{ error() }}</p>
            }
          </div>

          <div class="card overflow-hidden">
            <div class="px-4 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              Resultados ({{ resultados().length }})
            </div>
            <div class="max-h-[520px] overflow-y-auto divide-y divide-gray-100">
              @if (loading()) {
                <div class="p-8 text-center text-sm text-indigo-500">
                  Cargando estudiantes desde la base de datos...
                </div>
              } @else if (error()) {
                <div class="p-8 text-center text-sm text-red-500">
                  {{ error() }}
                </div>
              } @else if (!resultados().length) {
                <div class="p-8 text-center text-sm text-gray-400">
                  @if (busqueda().trim()) {
                    Sin resultados para "{{ busqueda() }}"
                  } @else {
                    No hay estudiantes registrados en la base de datos
                  }
                </div>
              }
              @for (e of resultados(); track e.id) {
                <button
                  type="button"
                  class="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors"
                  [class.bg-indigo-50]="seleccionado()?.id === e.id"
                  (click)="seleccionar(e)"
                >
                  <div class="font-medium text-gray-900 text-sm">
                    {{ e.apellidos }}, {{ e.nombres }}
                  </div>
                  <div class="text-xs text-gray-500 mt-0.5">
                    {{ e.codigo }} · DNI {{ e.dni || '—' }} · {{ e.grado }} {{ e.seccion }}
                  </div>
                  <div class="text-xs mt-1"
                    [class.text-green-600]="pctEntregados(e) === 100"
                    [class.text-amber-600]="pctEntregados(e) > 0 && pctEntregados(e) < 100"
                    [class.text-red-500]="pctEntregados(e) === 0">
                    Documentos: {{ docsEntregados(e) }}/{{ docsTotal(e) }} entregados
                  </div>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Panel documentos -->
        <div class="lg:col-span-8">
          @if (!seleccionado()) {
            <div class="card p-16 text-center text-gray-400">
              <span class="icon icon-2xl text-indigo-200 mb-3 block">folder_open</span>
              Selecciona un estudiante para gestionar sus documentos
            </div>
          } @else {
              @if (loadingDocs()) {
                <div class="card p-12 text-center text-sm text-indigo-500">
                  Cargando documentos desde la base de datos...
                </div>
              } @else if (docsError()) {
                <div class="card p-8 text-center text-sm text-red-500">{{ docsError() }}</div>
              } @else {
            <div class="space-y-4">
              <div class="card p-5">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 class="text-lg font-bold text-gray-900">
                      {{ seleccionado()!.apellidos }}, {{ seleccionado()!.nombres }}
                    </h3>
                    <p class="text-sm text-gray-500">
                      {{ seleccionado()!.codigo }} · {{ seleccionado()!.grado }} {{ seleccionado()!.seccion }}
                      · Matrícula {{ seleccionado()!.anioIngreso }}
                    </p>
                  </div>
                  <button
                    class="btn btn-secondary btn-sm"
                    (click)="sincronizarRequisitos()"
                    [disabled]="saving()"
                  >
                    <span class="icon icon-sm">sync</span>
                    Completar requisitos de matrícula
                  </button>
                </div>

                <div class="mt-4">
                  <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>Progreso documental</span>
                    <span class="font-semibold">{{ pctActual() }}%</span>
                  </div>
                  <div class="progress">
                    <div class="progress-bar bg-teal-500 transition-all" [style.width]="pctActual() + '%'"></div>
                  </div>
                  <p class="text-xs text-gray-400 mt-2">
                    {{ entregadosActual() }} de {{ filas().length }} documentos entregados
                    · {{ obligatoriosPendientes() }} obligatorio(s) pendiente(s)
                  </p>
                </div>
              </div>

              @if (mensaje()) {
                <div class="card p-3 text-sm"
                  [class.bg-green-50]="mensajeTipo() === 'ok'"
                  [class.text-green-700]="mensajeTipo() === 'ok'"
                  [class.bg-red-50]="mensajeTipo() === 'error'"
                  [class.text-red-700]="mensajeTipo() === 'error'">
                  {{ mensaje() }}
                </div>
              }

              <div class="card overflow-hidden">
                <div class="px-4 py-3 border-b bg-teal-50 flex items-center gap-2">
                  <span class="icon icon-sm text-teal-600">checklist</span>
                  <span class="text-sm font-semibold text-teal-800">
                    Requisitos para {{ seleccionado()!.grado }}
                  </span>
                </div>

                <div class="divide-y divide-gray-100">
                  @for (doc of filas(); track doc.tipo) {
                    <div class="p-4 flex flex-col sm:flex-row gap-4">
                      <div class="flex items-start gap-3 flex-1 min-w-0">
                        <label class="flex items-center gap-2 cursor-pointer shrink-0 mt-1">
                          <input
                            type="checkbox"
                            class="rounded border-gray-300 text-teal-600"
                            [checked]="doc.estado === 'entregado'"
                            (change)="toggleEntregado(doc, $event)"
                            [disabled]="saving()"
                          >
                        </label>
                        <div class="min-w-0">
                          <div class="font-medium text-gray-800 text-sm">{{ doc.tipo }}</div>
                          <div class="flex flex-wrap items-center gap-2 mt-1">
                            @if (doc.obligatorio) {
                              <span class="badge badge-red text-[10px]">Obligatorio</span>
                            } @else {
                              <span class="badge badge-gray text-[10px]">Opcional</span>
                            }
                            @if (!doc.registrado) {
                              <span class="badge badge-yellow text-[10px]">Sin registrar</span>
                            }
                            @if (doc.archivo) {
                              <span class="badge badge-blue text-[10px]">v{{ doc.archivo.version }}</span>
                            }
                            <span class="badge text-[10px]"
                              [ngClass]="doc.estado === 'entregado' ? 'badge-green' : doc.estado === 'vencido' ? 'badge-red' : 'badge-gray'">
                              {{ doc.estado }}
                            </span>
                          </div>
                          @if (doc.archivo) {
                            <p class="text-[11px] text-gray-400 mt-1 truncate">
                              {{ doc.archivo.nombreArchivo }} · {{ formatBytes(doc.archivo.tamanoBytes) }}
                              · SHA {{ doc.archivo.sha256.slice(0, 8) }}…
                            </p>
                          }
                        </div>
                      </div>

                      <div class="flex flex-col sm:flex-row gap-2 sm:items-center shrink-0">
                        <input
                          class="form-input text-xs w-full sm:w-36"
                          placeholder="N° / código"
                          [ngModel]="doc.numero"
                          (ngModelChange)="doc.numero = $event"
                          (blur)="guardarCampo(doc)"
                        >
                        @if (puedeCargar()) {
                          <label class="btn btn-secondary btn-sm cursor-pointer whitespace-nowrap">
                            <span class="icon icon-sm">{{ doc.archivo ? 'upload_file' : 'upload_file' }}</span>
                            {{ doc.archivo ? 'Nueva versión' : 'Cargar archivo' }}
                            <input type="file" [accept]="acceptTipos()" class="hidden"
                              (change)="onSeleccionArchivo(doc, $event)">
                          </label>
                        }
                        @if (doc.archivo || doc.imagenUrl) {
                          <button class="btn btn-ghost btn-sm" (click)="verDocumento(doc)">
                            <span class="icon icon-sm">visibility</span>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
              }
          }
        </div>
      </div>
    </div>

    @if (uploadDoc()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="card w-full max-w-md p-5 space-y-4" role="dialog" aria-modal="true">
          <h3 class="font-semibold text-gray-900">Confirmar carga — {{ uploadDoc()!.tipo }}</h3>
          <p class="text-sm text-gray-600 truncate">{{ uploadNombreArchivo() }}</p>
          <div>
            <label class="form-label mb-1 block">Motivo *</label>
            <textarea class="form-input min-h-[4rem]" rows="2" [(ngModel)]="uploadMotivo"
              placeholder="Ej: Entrega de FUT firmada en secretaría"></textarea>
          </div>
          <div class="flex gap-2 justify-end">
            <button class="btn btn-secondary" (click)="cancelarUpload()">Cancelar</button>
            <button class="btn btn-primary" [disabled]="uploadMotivo.trim().length < 3 || saving()"
              (click)="confirmarUpload()">
              {{ saving() ? 'Subiendo…' : 'Subir documento' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (visorUrl()) {
      <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" (click)="cerrarVisor()">
        <div class="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-4" (click)="$event.stopPropagation()">
          <div class="flex justify-between mb-3">
            <span class="font-semibold text-sm">{{ visorTitulo() }}</span>
            <button class="btn-icon" (click)="cerrarVisor()"><span class="icon">close</span></button>
          </div>
          @if (visorEsPdf()) {
            <iframe [src]="visorUrl()" class="w-full h-[70vh] border-0" title="documento pdf"></iframe>
          } @else {
            <img [src]="visorUrl()" alt="documento" class="max-w-full mx-auto">
          }
        </div>
      </div>
    }
  `,
})
export class DocumentosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  readonly tenant = inject(TenantContextService);
  private readonly expedientesSvc = inject(ExpedientesService);
  private readonly _tenantReloadReady = setupTenantReload(
    () => this.recargarInstitucion(),
    { onBeforeReload: () => this.limpiarUiInstitucion() },
  );

  readonly loading = this.expedientesSvc.loading;
  readonly error = this.expedientesSvc.error;

  readonly busqueda = signal('');

  readonly loadingDocs = signal(false);
  readonly docsError = signal('');
  readonly documentosAlumno = signal<ApiStudentDocumentsResponse | null>(null);
  readonly seleccionado = signal<Estudiante | null>(null);
  readonly saving = signal(false);
  readonly mensaje = signal('');
  readonly mensajeTipo = signal<'ok' | 'error'>('ok');
  readonly visorUrl = signal('');
  readonly visorTitulo = signal('');
  readonly visorEsPdf = signal(false);
  readonly context = signal<StudentDocumentsContext | null>(null);
  readonly uploadDoc = signal<DocumentoMatriculaVista | null>(null);
  readonly uploadFile = signal<File | null>(null);
  uploadMotivo = '';

  readonly resultados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    return this.expedientesSvc.estudiantes().filter((e) => {
      if (!tokens.length) return true;
      const haystack = [
        e.nombres,
        e.apellidos,
        e.dni,
        e.codigo,
        e.email,
        e.grado,
        `${e.apellidos} ${e.nombres}`,
        `${e.nombres} ${e.apellidos}`,
      ].join(' ').toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  });

  readonly filas = computed(() => {
    const data = this.documentosAlumno();
    if (!data) return [] as DocumentoMatriculaVista[];
    return data.documentos.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      obligatorio: d.obligatorio,
      estado: d.estado,
      numero: d.numero,
      fechaEntrega: d.fechaEntrega,
      imagenUrl: d.imagenUrl,
      registrado: d.registrado,
      archivo: d.archivo ?? null,
    }));
  });

  readonly uploadNombreArchivo = computed(
    () => this.uploadFile()?.name ?? '',
  );

  readonly entregadosActual = computed(() =>
    this.filas().filter((d) => d.estado === 'entregado').length,
  );

  readonly pctActual = computed(() => {
    const total = this.filas().length;
    if (!total) return 0;
    return Math.round((this.entregadosActual() / total) * 100);
  });

  readonly obligatoriosPendientes = computed(() =>
    this.filas().filter((d) => d.obligatorio && d.estado !== 'entregado').length,
  );

  ngOnInit(): void {
    this.layout.setTitle('Documentos');
    if (this.tenant.requiresSelection()) {
      this.limpiarUiInstitucion();
    } else {
      this.recargarInstitucion();
    }
    markTenantReloadReady(this._tenantReloadReady);
  }

  private limpiarUiInstitucion(): void {
    this.busqueda.set('');
    this.seleccionado.set(null);
    this.documentosAlumno.set(null);
    this.docsError.set('');
    this.mensaje.set('');
    this.cancelarUpload();
    this.cerrarVisor();
    this.expedientesSvc.reset();
  }

  private recargarInstitucion(): void {
    this.expedientesSvc.getDocumentsContext().subscribe({
      next: (ctx) => this.context.set(ctx),
      error: () => this.context.set(null),
    });
    this.expedientesSvc.load({ immediate: true });
  }

  puedeCargar(): boolean {
    return this.auth.hasAnyPermiso(
      'estudiantes.documentos',
      'estudiantes.editar',
      'matricula.editar',
    );
  }

  acceptTipos(): string {
    return this.context()?.mimeTypes.join(',') ?? 'image/*,application/pdf';
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onBusquedaChange(value: string): void {
    this.busqueda.set(value);
    const sel = this.seleccionado();
    if (sel && !this.resultados().some((e) => e.id === sel.id)) {
      this.seleccionado.set(null);
      this.documentosAlumno.set(null);
      this.docsError.set('');
    }
  }

  limpiarBusqueda(): void {
    this.busqueda.set('');
  }

  docsEntregados(e: Estudiante): number {
    return combinarRequisitosConDocumentos(e.grado, e.documentos)
      .filter((d) => d.estado === 'entregado').length;
  }

  docsTotal(e: Estudiante): number {
    return combinarRequisitosConDocumentos(e.grado, e.documentos).length;
  }

  pctEntregados(e: Estudiante): number {
    const total = this.docsTotal(e);
    if (!total) return 0;
    return Math.round((this.docsEntregados(e) / total) * 100);
  }

  seleccionar(e: Estudiante): void {
    this.mensaje.set('');
    this.docsError.set('');
    this.seleccionado.set(e);
    this.cargarDocumentos(e.id);
  }

  private cargarDocumentos(studentId: number): void {
    this.loadingDocs.set(true);
    this.documentosAlumno.set(null);
    this.expedientesSvc.loadStudentDocuments(studentId).subscribe({
      next: (data) => {
        this.documentosAlumno.set(data);
        this.loadingDocs.set(false);
      },
      error: () => {
        this.docsError.set('No se pudieron cargar los documentos desde la base de datos.');
        this.loadingDocs.set(false);
      },
    });
  }

  sincronizarRequisitos(): void {
    const e = this.seleccionado();
    if (!e) return;
    this.saving.set(true);
    this.mensaje.set('');
    this.expedientesSvc.syncRequisitosMatricula(e.id).subscribe({
      next: () => {
        this.cargarDocumentos(e.id);
        this.expedientesSvc.refreshOne(e.id).subscribe();
        this.mensajeTipo.set('ok');
        this.mensaje.set('Requisitos de matrícula sincronizados correctamente.');
        this.saving.set(false);
      },
      error: () => {
        this.mensajeTipo.set('error');
        this.mensaje.set('No se pudieron sincronizar los requisitos.');
        this.saving.set(false);
      },
    });
  }

  toggleEntregado(doc: DocumentoMatriculaVista, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    doc.estado = checked ? 'entregado' : 'pendiente';
    if (checked && !doc.fechaEntrega) {
      const hoy = new Date();
      doc.fechaEntrega = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
    }
    this.persistirDocumento(doc);
  }

  guardarCampo(doc: DocumentoMatriculaVista): void {
    this.persistirDocumento(doc);
  }

  onSeleccionArchivo(doc: DocumentoMatriculaVista, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const maxBytes = this.context()?.maxBytes ?? 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.mensajeTipo.set('error');
      this.mensaje.set(`El archivo supera el límite de ${this.formatBytes(maxBytes)}.`);
      return;
    }

    this.uploadDoc.set(doc);
    this.uploadFile.set(file);
    this.uploadMotivo = '';
  }

  cancelarUpload(): void {
    this.uploadDoc.set(null);
    this.uploadFile.set(null);
    this.uploadMotivo = '';
  }

  confirmarUpload(): void {
    const e = this.seleccionado();
    const doc = this.uploadDoc();
    const file = this.uploadFile();
    if (!e || !doc || !file || this.uploadMotivo.trim().length < 3) return;

    const ejecutarUpload = (docId: number) => {
      this.saving.set(true);
      this.expedientesSvc
        .uploadDocumentFile(e.id, docId, file, {
          motivo: this.uploadMotivo.trim(),
          numero: doc.numero,
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.cancelarUpload();
            this.mensajeTipo.set('ok');
            this.mensaje.set(`Documento "${doc.tipo}" cargado correctamente.`);
            this.cargarDocumentos(e.id);
            this.expedientesSvc.refreshOne(e.id).subscribe();
          },
          error: (err) => {
            this.saving.set(false);
            this.mensajeTipo.set('error');
            this.mensaje.set(err?.error?.message ?? 'No se pudo cargar el archivo.');
          },
        });
    };

    if (doc.id) {
      ejecutarUpload(doc.id);
      return;
    }

    this.saving.set(true);
    this.expedientesSvc
      .addDocument(e.id, { tipo: doc.tipo, estado: 'pendiente', numero: doc.numero })
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          ejecutarUpload(created.id);
        },
        error: () => {
          this.saving.set(false);
          this.mensajeTipo.set('error');
          this.mensaje.set('No se pudo registrar el documento antes de la carga.');
        },
      });
  }

  verDocumento(doc: DocumentoMatriculaVista & { archivo?: ApiDocumentoArchivo | null }): void {
    const e = this.seleccionado();
    if (doc.archivo && e?.id && doc.id) {
      this.expedientesSvc
        .downloadDocumentBlob(e.id, doc.id, doc.archivo.versionId)
        .subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            this.visorEsPdf.set(doc.archivo!.mimeType === 'application/pdf');
            this.visorUrl.set(url);
            this.visorTitulo.set(`${doc.tipo} · v${doc.archivo!.version}`);
          },
          error: () => {
            this.mensajeTipo.set('error');
            this.mensaje.set('No se pudo abrir el documento.');
          },
        });
      return;
    }
    if (doc.imagenUrl?.startsWith('data:') || doc.imagenUrl?.startsWith('/uploads')) {
      this.visorEsPdf.set(doc.imagenUrl.includes('pdf'));
      this.visorUrl.set(doc.imagenUrl);
      this.visorTitulo.set(doc.tipo);
    }
  }

  cerrarVisor(): void {
    const url = this.visorUrl();
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    this.visorUrl.set('');
  }

  private persistirDocumento(doc: DocumentoMatriculaVista): void {
    const e = this.seleccionado();
    if (!e) return;

    const payload = {
      tipo: doc.tipo,
      numero: doc.numero,
      estado: doc.estado,
      fechaEntrega: doc.fechaEntrega,
      imagenUrl: doc.imagenUrl,
    };

    this.saving.set(true);
    const req = doc.id
      ? this.expedientesSvc.updateDocument(e.id, doc.id, payload)
      : this.expedientesSvc.addDocument(e.id, payload);

    req.subscribe({
      next: () => {
        this.cargarDocumentos(e.id);
        this.expedientesSvc.refreshOne(e.id).subscribe();
        this.mensajeTipo.set('ok');
        this.mensaje.set(`Documento "${doc.tipo}" actualizado.`);
        this.saving.set(false);
      },
      error: () => {
        this.mensajeTipo.set('error');
        this.mensaje.set('Error al guardar el documento.');
        this.saving.set(false);
      },
    });
  }
}
