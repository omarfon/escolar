import { Injectable, inject, signal } from '@angular/core';
import { TenantReloadService } from '../../../core/tenant/tenant-reload.service';
import { catchError, debounceTime, finalize, map, switchMap, tap } from 'rxjs/operators';
import { Observable, Subject, Subscription, forkJoin, of } from 'rxjs';
import { ApiExpediente, ApiStudentDocumentsResponse, StudentsStats } from '../../../core/api/api.models';
import {
  DocumentoPayload,
  ExpedientePayload,
  ExpedientesApiService,
  ExpedientesPageQuery,
} from '../../../core/api/expedientes-api.service';

export interface Representante {
  nombres: string;
  apellidos: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  tipoDocumento: string;
  dni: string;
  telefono: string;
  email: string;
  trabajo: string;
}

export interface HistorialAcademico {
  anio: string;
  grado: string;
  seccion: string;
  promedio: number;
  estado: string;
}

export interface Documento {
  id?: number;
  tipo: string;
  numero: string;
  estado: 'entregado' | 'pendiente' | 'vencido';
  fechaEntrega: string;
  imagenUrl?: string;
}

export interface Estudiante {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  tipoDocumento: string;
  email: string;
  fechaNac: string;
  sexo: 'M' | 'F';
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  telefonoEmergencia: string;
  foto: string;
  grupoSanguineo: string;
  alergias: string;
  condicionesSalud: string;
  observaciones: string;
  grado: string;
  seccion: string;
  anioIngreso: string;
  estado: 'activo' | 'inactivo' | 'retirado';
  padre: Representante;
  madre: Representante;
  apoderado: Representante;
  historialAcademico: HistorialAcademico[];
  asistenciaPct: number;
  conductaNota: string;
  documentos: Documento[];
  estadoDocumento?: string;
  sinDocumentoMotivo?: string;
  sinDocumentoSustento?: string;
}

export function estudianteVacio(id = 0): Estudiante {
  const repVacio = (): Representante => ({
    nombres: '',
    apellidos: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    tipoDocumento: 'DNI',
    dni: '',
    telefono: '',
    email: '',
    trabajo: '',
  });
  return {
    id,
    codigo: '',
    nombres: '',
    apellidos: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    dni: '',
    tipoDocumento: 'DNI',
    email: '',
    fechaNac: '',
    sexo: 'M',
    direccion: '',
    distrito: '',
    provincia: '',
    departamento: '',
    telefonoEmergencia: '',
    foto: '',
    grupoSanguineo: 'O+',
    alergias: 'Ninguna',
    condicionesSalud: '',
    observaciones: '',
    grado: '1° Primaria',
    seccion: 'A',
    anioIngreso: String(new Date().getFullYear()),
    estado: 'activo',
    padre: repVacio(),
    madre: repVacio(),
    apoderado: repVacio(),
    historialAcademico: [],
    asistenciaPct: 0,
    conductaNota: 'AD',
    documentos: [],
  };
}

function mapRepresentante(rep: ApiExpediente['padre']): Representante {
  const paterno = rep.apellidoPaterno?.trim() ?? '';
  const materno = rep.apellidoMaterno?.trim() ?? '';
  const apellidos = rep.apellidos || [paterno, materno].filter(Boolean).join(' ');
  return {
    nombres: rep.nombres,
    apellidos,
    apellidoPaterno: paterno,
    apellidoMaterno: materno,
    tipoDocumento: rep.tipoDocumento ?? 'DNI',
    dni: rep.dni,
    telefono: rep.telefono,
    email: rep.email,
    trabajo: rep.trabajo,
  };
}

function fromApi(exp: ApiExpediente): Estudiante {
  return {
    id: exp.id,
    codigo: exp.codigo,
    nombres: exp.nombres,
    apellidos: exp.apellidos,
    apellidoPaterno: exp.apellidoPaterno ?? '',
    apellidoMaterno: exp.apellidoMaterno ?? '',
    dni: exp.dni,
    tipoDocumento: exp.tipoDocumento ?? 'DNI',
    email: exp.email,
    fechaNac: exp.fechaNac,
    sexo: exp.sexo,
    direccion: exp.direccion,
    distrito: exp.distrito ?? '',
    provincia: exp.provincia ?? '',
    departamento: exp.departamento ?? '',
    telefonoEmergencia: exp.telefonoEmergencia ?? '',
    foto: exp.foto,
    grupoSanguineo: exp.grupoSanguineo,
    alergias: exp.alergias,
    condicionesSalud: exp.condicionesSalud,
    observaciones: exp.observaciones,
    grado: exp.gradoLabel,
    seccion: exp.seccion,
    anioIngreso: exp.anioIngreso,
    estado: exp.estado,
    padre: mapRepresentante(exp.padre),
    madre: mapRepresentante(exp.madre),
    apoderado: mapRepresentante(exp.apoderado),
    historialAcademico: exp.historialAcademico.map((h) => ({ ...h })),
    asistenciaPct: exp.asistenciaPct,
    conductaNota: exp.conductaNota,
    documentos: exp.documentos.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      numero: d.numero,
      estado: d.estado,
      fechaEntrega: d.fechaEntrega,
      imagenUrl: d.imagenUrl,
    })),
    estadoDocumento: exp.estadoDocumento ?? 'regular',
    sinDocumentoMotivo: exp.sinDocumentoMotivo ?? '',
    sinDocumentoSustento: exp.sinDocumentoSustento ?? '',
  };
}

function toPayload(e: Estudiante): ExpedientePayload {
  return {
    nombres: e.nombres,
    apellidos: e.apellidos,
    apellidoPaterno: e.apellidoPaterno || undefined,
    apellidoMaterno: e.apellidoMaterno || undefined,
    codigo: e.codigo || undefined,
    dni: e.dni,
    tipoDocumento: e.tipoDocumento || undefined,
    email: e.email || `${e.dni || 'alumno'}@estudiante.pe`,
    fechaNac: e.fechaNac || undefined,
    sexo: e.sexo,
    direccion: e.direccion,
    distrito: e.distrito || undefined,
    provincia: e.provincia || undefined,
    departamento: e.departamento || undefined,
    telefonoEmergencia: e.telefonoEmergencia || undefined,
    foto: e.foto,
    grupoSanguineo: e.grupoSanguineo,
    alergias: e.alergias,
    condicionesSalud: e.condicionesSalud,
    observaciones: e.observaciones,
    gradoLabel: e.grado,
    seccion: e.seccion,
    anioIngreso: e.anioIngreso,
    estado: e.estado,
    conductaNota: e.conductaNota,
    padre: e.padre,
    madre: e.madre,
    apoderado: e.apoderado,
    historialAcademico: e.historialAcademico,
    documentos: e.documentos.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      numero: d.numero,
      estado: d.estado,
      fechaEntrega: d.fechaEntrega,
      imagenUrl: d.imagenUrl,
    })),
  };
}

type LoadRequest = ExpedientesPageQuery & { withStats?: boolean; immediate?: boolean };

@Injectable({ providedIn: 'root' })
export class ExpedientesService {
  private readonly api = inject(ExpedientesApiService);
  private readonly loadRequest$ = new Subject<LoadRequest>();
  private loadSub?: Subscription;
  private lastQuery: LoadRequest = { page: 1, pageSize: 20 };

  private readonly _estudiantes = signal<Estudiante[]>([]);
  readonly estudiantes = this._estudiantes.asReadonly();
  readonly stats = signal<StudentsStats | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    inject(TenantReloadService).registerGlobalReset(() => this.reset());

    this.loadSub = this.loadRequest$
      .pipe(
        switchMap((query) =>
          (query.immediate ? of(query) : of(query).pipe(debounceTime(250))).pipe(
            switchMap((q) => this.fetchPage(q)),
          ),
        ),
      )
      .subscribe({
        next: ({ page, stats }) => {
          this._estudiantes.set(page.items.map(fromApi));
          this.total.set(page.total);
          this.page.set(page.page);
          this.pageSize.set(page.pageSize);
          if (stats) this.stats.set(stats);
        },
        error: () => {
          this._estudiantes.set([]);
          this.total.set(0);
          this.error.set(
            'No se pudo conectar con la base de datos. Verifique que el servidor esté activo.',
          );
        },
      });
  }

  load(query: ExpedientesPageQuery & { withStats?: boolean; immediate?: boolean } = {}): void {
    const normalized: LoadRequest = {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      q: query.q,
      grado: query.grado,
      estado: query.estado,
      estadoDocumento: query.estadoDocumento,
      withStats: query.withStats ?? this.stats() === null,
      immediate: query.immediate ?? false,
    };
    this.lastQuery = normalized;
    this.loading.set(true);
    this.error.set('');
    this.loadRequest$.next(normalized);
  }

  private fetchPage(query: LoadRequest) {
    this.loading.set(true);
    this.error.set('');
    const stats$ =
      query.withStats === false
        ? of(null)
        : this.api.getStats().pipe(catchError(() => of(null)));
    return forkJoin({
      page: this.api.listPage(query),
      stats: stats$,
    }).pipe(finalize(() => this.loading.set(false)));
  }

  /** Limpia caché al cambiar institución (SIAGIE). */
  reset(): void {
    this._estudiantes.set([]);
    this.stats.set(null);
    this.total.set(0);
    this.page.set(1);
    this.error.set('');
  }

  loadFull(id: number): Observable<Estudiante> {
    return this.api.get(id).pipe(
      tap((item) => {
        const mapped = fromApi(item);
        this._estudiantes.update((list) =>
          list.map((e) => (e.id === id ? mapped : e)),
        );
      }),
      map(fromApi),
    );
  }

  refreshOne(id: number) {
    return this.api.get(id).pipe(
      tap((item) => {
        const mapped = fromApi(item);
        this._estudiantes.update((list) =>
          list.map((e) => (e.id === id ? mapped : e)),
        );
      }),
    );
  }

  createSinDocumento(
    estudiante: Estudiante,
    motivo: string,
    sustento: string,
    confirmarDuplicado = false,
  ) {
    return this.api.createSinDocumento({
      nombres: estudiante.nombres,
      apellidos: estudiante.apellidos,
      fechaNac: estudiante.fechaNac,
      gradoLabel: estudiante.grado,
      seccion: estudiante.seccion,
      sexo: estudiante.sexo,
      email: estudiante.email || undefined,
      direccion: estudiante.direccion || undefined,
      padre: estudiante.padre,
      madre: estudiante.madre,
      apoderado: estudiante.apoderado,
      sinDocumentoMotivo: motivo.trim(),
      sinDocumentoSustento: sustento.trim(),
      confirmarDuplicado,
    }).pipe(
      tap((item) => {
        this._estudiantes.update((list) => [...list, fromApi(item)]);
      }),
      map(fromApi),
    );
  }

  checkSinDocumentoDuplicates(estudiante: Estudiante) {
    return this.api.checkSinDocumentoDuplicates({
      nombres: estudiante.nombres,
      apellidos: estudiante.apellidos,
      fechaNac: estudiante.fechaNac || undefined,
      sexo: estudiante.sexo,
      padreDni: estudiante.padre.dni || undefined,
      madreDni: estudiante.madre.dni || undefined,
      apoderadoDni: estudiante.apoderado.dni || undefined,
    });
  }

  regularizarDocumento(id: number, dni: string, auditMotivo: string, tipoDocumento = 'DNI') {
    return this.api.regularizarDocumento(id, { dni, tipoDocumento, auditMotivo }).pipe(
      tap((item) => {
        const mapped = fromApi(item);
        this._estudiantes.update((list) =>
          list.map((e) => (e.id === mapped.id ? mapped : e)),
        );
      }),
      map(fromApi),
    );
  }

  create(estudiante: Estudiante) {
    return this.api.create(toPayload(estudiante)).pipe(
      tap((item) => {
        this._estudiantes.update((list) => [...list, fromApi(item)]);
      }),
      map(fromApi),
    );
  }

  update(estudiante: Estudiante, auditMotivo: string) {
    return this.api.update(estudiante.id, {
      ...toPayload(estudiante),
      auditMotivo: auditMotivo.trim(),
    }).pipe(
      tap((item) => {
        const mapped = fromApi(item);
        this._estudiantes.update((list) =>
          list.map((e) => (e.id === mapped.id ? mapped : e)),
        );
      }),
      map(fromApi),
    );
  }

  remove(id: number) {
    return this.api.remove(id).pipe(
      tap(() => {
        this._estudiantes.update((list) => list.filter((e) => e.id !== id));
      }),
    );
  }

  addDocument(studentId: number, payload: DocumentoPayload) {
    return this.api.addDocument(studentId, payload).pipe(
      tap(() => this.refreshOne(studentId).subscribe()),
    );
  }

  updateDocument(studentId: number, docId: number, payload: Partial<DocumentoPayload>) {
    return this.api.updateDocument(studentId, docId, payload).pipe(
      tap(() => this.refreshOne(studentId).subscribe()),
    );
  }

  syncRequisitosMatricula(studentId: number) {
    return this.api.syncRequisitos(studentId).pipe(
      tap((item) => {
        const mapped = fromApi(item);
        this._estudiantes.update((list) =>
          list.map((e) => (e.id === mapped.id ? mapped : e)),
        );
      }),
      map(fromApi),
    );
  }

  loadStudentDocuments(studentId: number): Observable<ApiStudentDocumentsResponse> {
    return this.api.listDocuments(studentId);
  }

  getDocumentsContext() {
    return this.api.getDocumentsContext();
  }

  uploadDocumentFile(
    studentId: number,
    docId: number,
    file: File,
    payload: { motivo: string; numero?: string },
  ) {
    return this.api.uploadDocumentFile(studentId, docId, file, payload);
  }

  downloadDocumentBlob(studentId: number, docId: number, versionId: number) {
    return this.api.downloadDocumentBlob(studentId, docId, versionId);
  }

  search(q: string) {
    this.load({ q, page: 1, pageSize: 25 });
  }

  exportCsv(filters?: {
    q?: string;
    grado?: string;
    estado?: string;
    estadoDocumento?: string;
  }): Observable<Blob> {
    return this.api.downloadExport(filters);
  }
}
