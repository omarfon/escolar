import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { GradingConfigService } from '../../../core/grading/grading-config.service';
import {
  cellKey,
  isNotaEnRango,
  validateNotaInRange,
} from '../../../core/grading/grading-range.validation';
import {
  DiagnosticAlumnoRow,
  DiagnosticContextItem,
  DiagnosticFilters,
  DiagnosticRegistryResponse,
  ModoRegistroDiagnostico,
  NCFG,
  NIVELES_DIAGNOSTICO,
  NivelLogroDiagnostico,
  SaveDiagnosticPayload,
} from './diagnostica.model';
import { DiagnosticaService } from './diagnostica.service';

@Component({
  selector: 'app-diagnostica',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Evaluación Diagnóstica</h2>
          <p class="text-sm text-gray-400 mt-0.5">
            Registro del 1° bimestre · adaptación y nivel de partida por curso
          </p>
          <p class="text-xs text-indigo-600 mt-1">
            API <span class="font-mono">/diagnostic-evaluations</span>
            · Año {{ anioEscolar() ?? '—' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0">
          @if (puedeVerAuditoria() && filtro().curso) {
            <a class="btn btn-secondary"
               [routerLink]="['/evaluacion/auditoria-diagnostica']"
               [queryParams]="{ curso: filtro().curso }">
              <span class="icon icon-sm">history_edu</span> Ver historial
            </a>
          }
          <button class="btn btn-primary" [disabled]="!puedeGuardar() || svc.saving()" (click)="guardar()">
            <span class="icon">save</span>
            {{ svc.saving() ? 'Guardando...' : 'Guardar diagnóstico' }}
          </button>
        </div>
      </div>

      <div class="rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 px-4 py-3 text-sm">
        Evaluación diagnóstica oficial del <strong>1° bimestre</strong>.
        @if (modoRegistro() === 'numerico') {
          Registre la nota de partida por estudiante y curso.
        } @else if (modoRegistro() === 'competencia') {
          Registre el nivel de logro inicial (AD, A, B, C).
        } @else {
          Puede registrar nota numérica, nivel de logro o ambos según corresponda.
        }
      </div>

      @if (actaCerrada()) {
        <div class="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm">
          El acta del bimestre diagnóstico está cerrada. Solo puede consultar los registros.
        </div>
      }
      @if (!bimestreHabilitado()) {
        <div class="rounded-xl bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 text-sm">
          El 1° bimestre aún no está habilitado para registro.
        </div>
      }
      @if (validacionRangos(); as vr) {
        <div class="rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 px-4 py-2 text-sm">
          {{ vr.mensaje }} {{ vr.mensajeAprobacion }}
        </div>
      }
      @if (hayNotasInvalidas()) {
        <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm" role="alert">
          Hay calificaciones fuera del rango permitido. Corrija las celdas resaltadas antes de guardar.
        </div>
      }
      @if (error()) {
        <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{{ error() }}</div>
      }
      @if (toast()) {
        <div class="rounded-xl px-4 py-3 text-sm bg-green-50 text-green-700 border border-green-200">{{ toast() }}</div>
      }

      <div class="card p-4 space-y-4">
        @if (svc.loadingContexts()) {
          <p class="text-sm text-gray-400 text-center py-2">Cargando aulas disponibles...</p>
        } @else if (!contextos().length) {
          <p class="text-sm text-gray-500 text-center py-2">No hay aulas con alumnos matriculados.</p>
        } @else {
          <div class="flex flex-col lg:flex-row lg:items-end gap-4">
            <div class="flex-1 min-w-0">
              <label class="form-label mb-1 block">Aula</label>
              <select class="form-select" [ngModel]="contextoId()" (ngModelChange)="seleccionarContexto($event)">
                @for (ctx of contextos(); track ctx.id) {
                  <option [value]="ctx.id">
                    {{ ctx.label }} — {{ ctx.alumnosCount }} alumno{{ ctx.alumnosCount === 1 ? '' : 's' }}
                    @if (ctx.actaCerrada) { (acta cerrada) }
                  </option>
                }
              </select>
            </div>
            <div class="text-sm text-gray-500">
              Bimestre <span class="font-semibold text-indigo-700">1</span>
              @if (bimestreActual()) {
                · periodo actual: B{{ bimestreActual() }}
              }
            </div>
          </div>

          @if (contextoActivo(); as ctx) {
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <label class="form-label mb-0">Curso</label>
                <span class="text-xs text-gray-400">{{ ctx.alumnosCount }} alumnos</span>
              </div>
              @if (!ctx.cursos.length) {
                <p class="text-sm text-amber-600">Sin cursos configurados para este grado.</p>
              } @else {
                <div class="flex flex-wrap gap-2">
                  @for (c of ctx.cursos; track c.nombre) {
                    <button type="button"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors"
                      [ngClass]="filtro().curso === c.nombre
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-medium'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'"
                      (click)="seleccionarCurso(c.nombre)">
                      {{ c.nombre }}
                      @if (c.conEvaluaciones) {
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Con evaluación registrada"></span>
                      }
                    </button>
                  }
                </div>
              }
            </div>
          }
        }
      </div>

      <div class="card overflow-hidden">
        @if (svc.loading()) {
          <div class="p-10 text-center text-gray-400 text-sm">Cargando alumnos...</div>
        } @else if (!filtrosCompletos()) {
          <div class="p-10 text-center text-gray-500 text-sm">Seleccione un aula y un curso.</div>
        } @else if (!alumnos().length) {
          <div class="p-10 text-center text-gray-500 text-sm">No hay alumnos matriculados en esta aula.</div>
        } @else {
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Apellidos y Nombres</th>
                  @if (usaNumerico()) {
                    <th class="text-center">Nota diagnóstica</th>
                    <th class="text-center">Nivel</th>
                  }
                  @if (usaCompetencia()) {
                    <th class="text-center">Nivel logro</th>
                  }
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                @for (a of alumnos(); track a.studentId; let i = $index) {
                  <tr>
                    <td class="text-gray-400 text-xs">{{ i + 1 }}</td>
                    <td class="font-medium">{{ a.apellido }}, {{ a.nombre }}</td>
                    @if (usaNumerico()) {
                      <td class="text-center">
                        <input type="number" min="0" [max]="notaMaxima()" step="0.1"
                          [ngModel]="a.nota"
                          (ngModelChange)="setNota(a, $event)"
                          [disabled]="!edicionPermitida()"
                          class="w-16 text-center form-input px-1 py-1 text-sm"
                          [class.border-red-500]="celdaInvalida(a.studentId)"
                          [class.bg-gray-50]="!edicionPermitida()">
                      </td>
                      <td class="text-center">
                        @if (nivelAlumno(a); as n) {
                          <span class="badge" [ngClass]="badgeNivel(n)">{{ n }}</span>
                        } @else { — }
                      </td>
                    }
                    @if (usaCompetencia()) {
                      <td class="text-center">
                        <div class="flex justify-center gap-1">
                          @for (n of NIVELES; track n) {
                            <button type="button"
                              class="w-8 h-8 rounded-lg text-xs font-bold border transition-colors"
                              [disabled]="!edicionPermitida()"
                              [ngClass]="a.nivelLogro === n
                                ? (NCFG[n].cls + ' border-transparent text-white')
                                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200'"
                              (click)="setNivel(a, n)">
                              {{ n }}
                            </button>
                          }
                        </div>
                      </td>
                    }
                    <td>
                      <input type="text" class="form-input text-sm w-full min-w-[160px]"
                        [ngModel]="a.observacion"
                        (ngModelChange)="setObservacion(a, $event)"
                        [disabled]="!edicionPermitida()"
                        placeholder="Opcional">
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
})
export class DiagnosticaComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  readonly grading = inject(GradingConfigService);
  readonly svc = inject(DiagnosticaService);

  puedeVerAuditoria(): boolean {
    return this.auth.hasAnyPermiso('evaluacion.reportes', 'admin.reportes');
  }

  readonly NCFG = NCFG;
  readonly NIVELES = NIVELES_DIAGNOSTICO;

  readonly contextos = signal<DiagnosticContextItem[]>([]);
  readonly contextoId = signal('');
  readonly alumnos = signal<DiagnosticAlumnoRow[]>([]);
  readonly modoRegistro = signal<ModoRegistroDiagnostico>('numerico');
  readonly bimestreActual = signal(1);
  readonly bimestreHabilitado = signal(true);
  readonly anioEscolar = signal<number | null>(null);
  readonly actaCerrada = signal(false);
  readonly puedeRegistrar = signal(false);
  readonly filtro = signal<DiagnosticFilters>({
    nivel: '',
    grado: '',
    seccion: '',
    curso: '',
  });
  readonly error = signal('');
  readonly toast = signal('');
  readonly validacionRangos = signal<DiagnosticRegistryResponse['validacionRangos'] | null>(null);
  readonly celdasInvalidas = signal<Set<string>>(new Set());
  private readonly originalSnapshot = new Map<number, {
    nota: number | null;
    nivelLogro: NivelLogroDiagnostico | null;
    observacion: string | null;
  }>();

  readonly contextoActivo = computed(() =>
    this.contextos().find(c => c.id === this.contextoId()) ?? null,
  );

  readonly usaNumerico = computed(
    () => this.modoRegistro() === 'numerico' || this.modoRegistro() === 'mixto',
  );
  readonly usaCompetencia = computed(
    () => this.modoRegistro() === 'competencia' || this.modoRegistro() === 'mixto',
  );

  ngOnInit(): void {
    this.layout.setTitle('Evaluación Diagnóstica');
    this.cargarContextos(true);
  }

  edicionPermitida(): boolean {
    return this.bimestreHabilitado() && !this.actaCerrada() && this.puedeRegistrar();
  }

  filtrosCompletos(): boolean {
    const f = this.filtro();
    return !!(f.nivel && f.grado && f.seccion && f.curso);
  }

  notaMaxima(): number {
    return this.validacionRangos()?.max ?? this.grading.notaMaxima();
  }

  notaMinimaRango(): number {
    return this.validacionRangos()?.min ?? 0;
  }

  hayNotasInvalidas(): boolean {
    return this.celdasInvalidas().size > 0;
  }

  celdaInvalida(studentId: number): boolean {
    return this.celdasInvalidas().has(cellKey(studentId, 'nota'));
  }

  puedeGuardar(): boolean {
    return (
      this.filtrosCompletos() &&
      this.alumnos().length > 0 &&
      this.edicionPermitida() &&
      !this.hayNotasInvalidas() &&
      this.tieneCambios()
    );
  }

  nivelAlumno(a: DiagnosticAlumnoRow): string | null {
    if (a.nota !== null && a.nota !== undefined) {
      return this.grading.nivelDeNota(a.nota);
    }
    return a.nivelLogro;
  }

  badgeNivel(nivel: string | null): string {
    if (!nivel) return 'badge-gray';
    return NCFG[nivel as NivelLogroDiagnostico]?.cls ?? 'badge-gray';
  }

  seleccionarContexto(id: string): void {
    const ctx = this.contextos().find(c => c.id === id);
    if (!ctx) return;
    this.contextoId.set(id);
    this.actaCerrada.set(!!ctx.actaCerrada);
    const curso =
      ctx.cursos.find(c => c.nombre === this.filtro().curso)?.nombre ??
      ctx.cursoSugerido ??
      ctx.cursos[0]?.nombre ??
      '';
    this.filtro.update(f => ({
      ...f,
      nivel: ctx.nivel,
      grado: ctx.grado,
      seccion: ctx.seccion,
      curso,
    }));
    this.cargar();
  }

  seleccionarCurso(curso: string): void {
    if (this.filtro().curso === curso) return;
    this.filtro.update(f => ({ ...f, curso }));
    this.cargar();
  }

  cargarContextos(inicial = false): void {
    this.svc.loadContexts().subscribe({
      next: res => {
        this.bimestreActual.set(res.bimestreActual);
        this.anioEscolar.set(res.anioEscolar);
        this.modoRegistro.set(res.modoRegistro);
        this.puedeRegistrar.set(res.permisos.registrar);
        this.contextos.set(res.contexts);
        if (!res.contexts.length) return;

        const preferido = res.contexts[0];
        const actual = res.contexts.find(c => c.id === this.contextoId()) ?? preferido;
        this.contextoId.set(actual.id);
        this.actaCerrada.set(!!actual.actaCerrada);

        const curso =
          actual.cursos.find(c => c.nombre === this.filtro().curso)?.nombre ??
          actual.cursoSugerido ??
          actual.cursos[0]?.nombre ??
          '';

        this.filtro.update(f => ({
          ...f,
          nivel: actual.nivel,
          grado: actual.grado,
          seccion: actual.seccion,
          curso,
        }));

        if (inicial || curso) this.cargar();
      },
      error: err =>
        this.error.set(err?.error?.message ?? err?.message ?? 'No se pudieron cargar las aulas'),
    });
  }

  cargar(): void {
    if (!this.filtrosCompletos()) return;
    this.error.set('');
    this.toast.set('');
    this.svc.loadRegistry(this.filtro()).subscribe({
      next: res => {
        this.bimestreActual.set(res.bimestreActual);
        this.bimestreHabilitado.set(res.bimestreHabilitado);
        this.anioEscolar.set(res.anioEscolar);
        this.modoRegistro.set(res.modoRegistro);
        this.actaCerrada.set(!!res.actaCerrada);
        if (res.validacionRangos) this.validacionRangos.set(res.validacionRangos);
        this.alumnos.set(res.alumnos.map(a => ({ ...a })));
        this.snapshotOriginal();
        this.revalidarNotas();
      },
      error: err =>
        this.error.set(err?.error?.message ?? err?.message ?? 'No se pudo cargar el registro'),
    });
  }

  setNota(alumno: DiagnosticAlumnoRow, value: string | number | null): void {
    if (!this.edicionPermitida()) return;
    const nota = value === '' || value === null ? null : Number(value);
    alumno.nota = Number.isFinite(nota as number) ? nota : null;
    alumno.nivelDerivado =
      alumno.nota !== null ? this.grading.nivelDeNota(alumno.nota) : null;
    this.actualizarValidezNota(alumno.studentId, alumno.nota);
    this.alumnos.set([...this.alumnos()]);
  }

  setNivel(alumno: DiagnosticAlumnoRow, nivel: NivelLogroDiagnostico): void {
    if (!this.edicionPermitida()) return;
    alumno.nivelLogro = alumno.nivelLogro === nivel ? null : nivel;
    this.alumnos.set([...this.alumnos()]);
  }

  setObservacion(alumno: DiagnosticAlumnoRow, value: string): void {
    if (!this.edicionPermitida()) return;
    alumno.observacion = value?.trim() || null;
    this.alumnos.set([...this.alumnos()]);
  }

  guardar(): void {
    const f = this.filtro();
    const entries: SaveDiagnosticPayload['entries'] = [];

    for (const alumno of this.alumnos()) {
      if (!this.alumnoTieneCambio(alumno)) continue;
      const entry: SaveDiagnosticPayload['entries'][number] = {
        studentId: alumno.studentId,
        evaluationId: alumno.evaluationId,
      };
      if (this.usaNumerico() && alumno.nota !== null) entry.nota = alumno.nota;
      if (this.usaCompetencia() && alumno.nivelLogro) entry.nivelLogro = alumno.nivelLogro;
      if (alumno.observacion) entry.observacion = alumno.observacion;
      if (
        (this.modoRegistro() === 'numerico' && entry.nota === undefined) ||
        (this.modoRegistro() === 'competencia' && !entry.nivelLogro)
      ) {
        continue;
      }
      entries.push(entry);
    }

    if (!entries.length) {
      this.error.set('Modifique al menos un registro antes de guardar.');
      return;
    }

    const payload: SaveDiagnosticPayload = {
      nivel: f.nivel,
      grado: f.grado,
      seccion: f.seccion,
      curso: f.curso,
      fechaEvaluacion: new Date().toISOString().slice(0, 10),
      auditMotivo: 'Registro de evaluación diagnóstica',
      entries,
    };

    this.svc.saveBulk(payload).subscribe({
      next: res => {
        this.alumnos.set(res.registry.alumnos);
        this.snapshotOriginal();
        this.toast.set(`Se guardaron ${res.saved} evaluaciones diagnósticas.`);
        this.cargarContextos(false);
      },
      error: err =>
        this.error.set(err?.error?.message ?? err?.message ?? 'Error al guardar'),
    });
  }

  private snapshotOriginal(): void {
    this.originalSnapshot.clear();
    for (const a of this.alumnos()) {
      this.originalSnapshot.set(a.studentId, {
        nota: a.nota,
        nivelLogro: a.nivelLogro,
        observacion: a.observacion,
      });
    }
  }

  private alumnoTieneCambio(a: DiagnosticAlumnoRow): boolean {
    const orig = this.originalSnapshot.get(a.studentId);
    if (!orig) return a.nota !== null || !!a.nivelLogro || !!a.observacion;
    return (
      a.nota !== orig.nota ||
      a.nivelLogro !== orig.nivelLogro ||
      a.observacion !== orig.observacion
    );
  }

  private tieneCambios(): boolean {
    return this.alumnos().some(a => this.alumnoTieneCambio(a));
  }

  private actualizarValidezNota(studentId: number, nota: number | null): void {
    const key = cellKey(studentId, 'nota');
    const invalidas = new Set(this.celdasInvalidas());
    if (isNotaEnRango(nota, this.notaMinimaRango(), this.notaMaxima())) {
      invalidas.delete(key);
    } else if (nota !== null) {
      invalidas.add(key);
    } else {
      invalidas.delete(key);
    }
    this.celdasInvalidas.set(invalidas);
  }

  private revalidarNotas(): void {
    const invalidas = new Set<string>();
    const min = this.notaMinimaRango();
    const max = this.notaMaxima();
    for (const a of this.alumnos()) {
      if (a.nota != null && !isNotaEnRango(a.nota, min, max)) {
        invalidas.add(cellKey(a.studentId, 'nota'));
      }
    }
    this.celdasInvalidas.set(invalidas);
  }
}
