import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import { InstitucionalService } from '../../administracion/institucional/institucional.service';
import { Nivel } from '../../administracion/institucional/institucional.model';
import { AsistenciaRegistroService } from '../services/asistencia-registro.service';
import { AsistenciaDocenteService } from '../../portal-docente/asistencia/asistencia-docente.service';
import { DocenteSalonAsignado } from '../../portal-docente/asistencia/asistencia-docente.model';
import {
  DailyRegisterCalendarDay,
  DailyRegisterCalendarResponse,
  DailyRegisterNavigation,
  EstadoAsistencia,
} from '../models/asistencia-registro.model';

interface RegistroAsistencia {
  studentId: number;
  nombres: string;
  apellidos: string;
  dni: string;
  attendanceId: number | null;
  estado: EstadoAsistencia;
  observacion: string;
}

function gradoKey(value: string): string {
  const t = value
    .toLowerCase()
    .replace(/[°º]/g, '')
    .replace(/\s*(grado|año|ano|anos)\b/g, '')
    .trim();
  const num = t.match(/^(\d+)/);
  return num ? num[1] : t;
}

function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

@Component({
  selector: 'app-asistencia-registro',
  standalone: true,
  imports: [NgClass, FormsModule, RouterLink],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Registro Diario de Asistencia</h2>
          <p class="text-sm text-gray-500">
            @if (gradoLabel()) {
              {{ gradoLabel() }} — Sección {{ filtros().seccion }}
            } @else {
              Selecciona nivel, grado y sección
            }
          </p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary" (click)="marcarTodos('P')"
            [disabled]="!puedeRegistrar() || svc.saving()">
            <span class="icon text-green-500 text-base mr-1">done_all</span> Todos Presentes
          </button>
          <button class="btn btn-primary" (click)="guardar()"
            [disabled]="!puedeRegistrar() || svc.saving() || !registros().length">
            <span class="icon text-base mr-1">save</span>
            {{ svc.saving() ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>

      <div class="card p-4">
        @if (modoDocente()) {
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <span class="badge badge-indigo">{{ filtros().nivel }}</span>
            <span class="font-semibold text-gray-800">{{ gradoLabel() || filtros().grado }} — Sección {{ filtros().seccion }}</span>
            <span class="text-gray-400">·</span>
            <span class="text-gray-500">{{ fechaDisplay() }}</span>
          </div>
        } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="form-group">
            <label class="form-label">Nivel</label>
            <select class="form-select" [ngModel]="filtros().nivel"
              (ngModelChange)="setFiltro('nivel', $event)">
              <option value="">Seleccionar...</option>
              @for (n of niveles(); track n.id) {
                <option [value]="n.nombre">{{ n.nombre }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Grado</label>
            <select class="form-select" [ngModel]="filtros().grado"
              (ngModelChange)="setFiltro('grado', $event)" [disabled]="!filtros().nivel">
              <option value="">Seleccionar...</option>
              @for (g of gradosDisponibles(); track g) {
                <option [value]="g">{{ g }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Sección</label>
            <select class="form-select" [ngModel]="filtros().seccion"
              (ngModelChange)="setFiltro('seccion', $event)" [disabled]="!filtros().grado">
              <option value="">Seleccionar...</option>
              @for (s of seccionesDisponibles(); track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
          </div>
          <div class="form-group flex items-end">
            <button class="btn btn-secondary w-full" (click)="cargar()"
              [disabled]="!filtrosCompletos() || svc.loading()">
              <span class="icon icon-sm mr-1">search</span>
            {{ svc.loading() ? 'Buscando...' : 'Buscar alumnos' }}
          </button>
        </div>
        </div>
        }
      </div>

      @if (filtrosCompletos()) {
        <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
          <div class="space-y-4">
            <div class="card p-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button type="button" class="btn btn-secondary btn-sm"
                  [disabled]="!navegacion()?.anterior || svc.loading()"
                  (click)="irDia(navegacion()!.anterior!)">
                  <span class="icon icon-sm">chevron_left</span> Anterior
                </button>

                <div class="text-center flex-1">
                  <p class="text-lg font-semibold text-gray-900 capitalize">{{ fechaDisplay() }}</p>
                  <div class="flex flex-wrap items-center justify-center gap-2 mt-1">
                    @if (navegacion()?.esHoy) {
                      <span class="badge bg-indigo-100 text-indigo-700 text-[10px]">Hoy</span>
                    }
                    @if (navegacion()?.periodoActual) {
                      <span class="text-[11px] text-gray-500">
                        {{ navegacion()!.periodoActual!.nombre }}
                      </span>
                    }
                  </div>
                </div>

                <div class="flex gap-2 justify-end">
                  @if (!navegacion()?.esHoy) {
                    <button type="button" class="btn btn-secondary btn-sm"
                      [disabled]="svc.loading()" (click)="irHoy()">
                      <span class="icon icon-sm">today</span> Hoy
                    </button>
                  }
                  <button type="button" class="btn btn-secondary btn-sm"
                    [disabled]="!navegacion()?.siguiente || svc.loading()"
                    (click)="irDia(navegacion()!.siguiente!)">
                    Siguiente <span class="icon icon-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            @if (avisoDia()) {
              <div class="rounded-xl px-4 py-3 text-sm"
                [ngClass]="avisoDia()!.tipo === 'feriado'
                  ? 'bg-amber-50 border border-amber-200 text-amber-900'
                  : 'bg-slate-50 border border-slate-200 text-slate-700'">
                <span class="icon icon-sm align-middle mr-1">{{ avisoDia()!.icon }}</span>
                {{ avisoDia()!.texto }}
                @if (avisoDia()!.tipo === 'feriado') {
                  — configura en
                  <a routerLink="/maestros/feriados" class="underline font-medium">Maestros → Feriados</a>.
                }
                @if (avisoDia()!.tipo === 'periodo') {
                  — configura en
                  <a routerLink="/maestros/periodos-academicos" class="underline font-medium">Maestros → Periodos</a>.
                }
              </div>
            }

            @if (error()) {
              <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {{ error() }}
              </div>
            }

            @if (toast()) {
              <div class="rounded-xl px-4 py-3 text-sm"
                [ngClass]="toast()!.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-700'">
                {{ toast()!.msg }}
              </div>
            }

            @if (registros().length) {
              <div class="grid grid-cols-4 gap-3">
                @for (stat of resumen(); track stat.label) {
                  <div class="card p-4 flex flex-col items-center justify-center text-center">
                    <div class="text-2xl font-bold" [ngClass]="stat.color">{{ stat.count }}</div>
                    <div class="text-xs text-gray-500">{{ stat.label }}</div>
                    <div class="text-xs font-medium mt-1" [ngClass]="stat.color">{{ stat.pct }}%</div>
                  </div>
                }
              </div>
            }

            <div class="card overflow-hidden" [class.opacity-60]="!puedeRegistrar()">
              @if (svc.loading()) {
                <div class="p-10 text-center text-gray-400 animate-pulse">Cargando alumnos...</div>
              } @else if (!registros().length) {
                <div class="p-10 text-center text-gray-500 text-sm">
                  No hay alumnos activos matriculados en {{ gradoLabel() || filtros().grado }} — Sección {{ filtros().seccion }}.
                </div>
              } @else {
                <div class="overflow-x-auto">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th class="text-left">N°</th>
                        <th class="text-left">Estudiante</th>
                        <th class="text-left">DNI</th>
                        <th class="text-center">P</th>
                        <th class="text-center">F</th>
                        <th class="text-center">T</th>
                        <th class="text-center">J</th>
                        <th class="text-left">Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (reg of registros(); track reg.studentId; let i = $index) {
                        <tr>
                          <td class="text-gray-500">{{ i + 1 }}</td>
                          <td>
                            <div class="font-medium text-gray-900">{{ reg.apellidos }}, {{ reg.nombres }}</div>
                          </td>
                          <td class="text-gray-500 text-sm">{{ reg.dni || '—' }}</td>
                          @for (est of estados; track est) {
                            <td class="text-center">
                              <input type="radio" [name]="'asistencia-' + reg.studentId" [value]="est"
                                [(ngModel)]="reg.estado" class="accent-indigo-600"
                                [disabled]="!puedeRegistrar()">
                            </td>
                          }
                          <td>
                            <input type="text" class="form-input py-1 text-xs" placeholder="Observación..."
                              [(ngModel)]="reg.observacion" [disabled]="!puedeRegistrar()">
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>

          <div class="card p-4 h-fit xl:sticky xl:top-4">
            <div class="flex items-center justify-between mb-3">
              <button type="button" class="btn-icon text-gray-500" (click)="cambiarMes(-1)"
                [disabled]="svc.calendarLoading()">
                <span class="icon">chevron_left</span>
              </button>
              <div class="text-center">
                <p class="font-semibold text-gray-800 capitalize">{{ calendario()?.mesLabel || 'Calendario' }}</p>
                @if (calendario()?.periodoActual) {
                  <p class="text-[11px] text-gray-500">{{ calendario()!.periodoActual!.nombre }}</p>
                }
              </div>
              <button type="button" class="btn-icon text-gray-500" (click)="cambiarMes(1)"
                [disabled]="svc.calendarLoading()">
                <span class="icon">chevron_right</span>
              </button>
            </div>

            <div class="grid grid-cols-7 gap-1 mb-1">
              @for (d of diasSemana; track d) {
                <div class="text-center text-[10px] font-medium text-gray-400 py-1">{{ d }}</div>
              }
            </div>

            @if (svc.calendarLoading()) {
              <div class="py-8 text-center text-xs text-gray-400 animate-pulse">Cargando calendario...</div>
            } @else {
              <div class="grid grid-cols-7 gap-1">
                @for (celda of calendario()?.dias ?? []; track celda.fecha) {
                  <button type="button"
                    class="relative aspect-square rounded-lg border text-xs font-medium transition-colors"
                    [ngClass]="claseCelda(celda)"
                    (click)="seleccionarDia(celda.fecha)">
                    {{ celda.dia }}
                    @if (celda.esDiaClase && celda.totalAlumnos > 0) {
                      <span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        [ngClass]="celda.registrado ? 'bg-emerald-500' : 'bg-amber-400'"></span>
                    }
                  </button>
                }
              </div>
            }

            <div class="mt-4 pt-3 border-t space-y-1.5 text-[11px] text-gray-500">
              <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Registrado</div>
              <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400"></span> Pendiente</div>
              <div class="flex items-center gap-2"><span class="w-3 h-3 rounded border-2 border-indigo-500"></span> Hoy</div>
              <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-amber-100 border border-amber-200"></span> Feriado</div>
            </div>
          </div>
        </div>
      } @else {
        <div class="card p-10 text-center text-gray-500 text-sm">
          Selecciona nivel, grado y sección para ver el calendario y registrar asistencia.
        </div>
      }
    </div>
  `,
})
export class AsistenciaRegistroComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly svc = inject(AsistenciaRegistroService);
  private readonly institucional = inject(InstitucionalService);
  private readonly asistenciaDocente = inject(AsistenciaDocenteService);
  private readonly _tenantReloadReady = setupTenantReload(() => {
    if (this.modoDocente()) return;
    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => {
        this._niveles.set(niveles);
        this.cargar();
      },
    });
  }, {
    onBeforeReload: () => {
      this._registros.set([]);
      this.calendario.set(null);
      this.navegacion.set(null);
      this.error.set('');
    },
  });

  readonly modoDocente = input(false);
  readonly salonInicial = input<{ nivel: string; grado: string; seccion: string } | null>(null);

  private readonly salonesPermitidos = signal<DocenteSalonAsignado[]>([]);

  readonly estados: EstadoAsistencia[] = ['P', 'F', 'T', 'J'];
  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  private readonly _niveles = signal<Nivel[]>([]);
  readonly niveles = this._niveles.asReadonly();

  readonly filtros = signal({
    nivel: '',
    grado: '',
    seccion: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  readonly mesVisible = signal(mesDe(new Date().toISOString().split('T')[0]));
  readonly gradoLabel = signal('');
  readonly feriadoDelDia = signal<{ nombre: string; tipo: string } | null>(null);
  readonly navegacion = signal<DailyRegisterNavigation | null>(null);
  readonly calendario = signal<DailyRegisterCalendarResponse | null>(null);
  readonly error = signal('');
  readonly toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  private readonly _registros = signal<RegistroAsistencia[]>([]);
  readonly registros = this._registros.asReadonly();

  readonly gradosDisponibles = computed(() => {
    const nivel = this._niveles().find((n) => n.nombre === this.filtros().nivel);
    return nivel?.grados.map((g) => g.nombre) ?? [];
  });

  readonly seccionesDisponibles = computed(() => {
    const { nivel, grado } = this.filtros();
    const nivelData = this._niveles().find((n) => n.nombre === nivel);
    const gradoData = nivelData?.grados.find((g) => gradoKey(g.nombre) === gradoKey(grado));
    return gradoData?.secciones.map((s) => s.nombre) ?? [];
  });

  readonly filtrosCompletos = computed(() => {
    const f = this.filtros();
    return !!(f.nivel && f.grado && f.seccion && f.fecha);
  });

  readonly fechaDisplay = computed(() => {
    const f = this.filtros().fecha;
    if (!f) return '';
    const [y, m, d] = f.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  readonly avisoDia = computed(() => {
    const nav = this.navegacion();
    const feriado = this.feriadoDelDia();
    if (feriado) {
      return {
        tipo: 'feriado' as const,
        icon: 'event_busy',
        texto: `${feriado.nombre} — no hay clases este día`,
      };
    }
    if (nav?.esFinDeSemana) {
      return {
        tipo: 'info' as const,
        icon: 'weekend',
        texto: 'Fin de semana — no corresponde registrar asistencia',
      };
    }
    if (nav?.fueraDePeriodo) {
      const p = nav.periodoActual;
      return {
        tipo: 'periodo' as const,
        icon: 'date_range',
        texto: p
          ? `Fecha fuera del periodo académico ${p.nombre} (${p.inicio} — ${p.fin})`
          : 'Fecha fuera del calendario escolar activo',
      };
    }
    return null;
  });

  readonly resumen = computed(() => {
    const regs = this._registros();
    const total = regs.length;
    const count = (e: EstadoAsistencia) => regs.filter((r) => r.estado === e).length;
    const pct = (c: number) => (total ? Math.round((c / total) * 100) : 0);
    return [
      { label: 'Presentes', count: count('P'), pct: pct(count('P')), color: 'text-green-600' },
      { label: 'Faltas', count: count('F'), pct: pct(count('F')), color: 'text-red-600' },
      { label: 'Tardanzas', count: count('T'), pct: pct(count('T')), color: 'text-yellow-600' },
      { label: 'Justif.', count: count('J'), pct: pct(count('J')), color: 'text-blue-600' },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle(
      this.modoDocente() ? 'Asistencia — Mi salón' : 'Registro de Asistencia',
    );

    const initConSalon = (salon: { nivel: string; grado: string; seccion: string }) => {
      this.filtros.set({
        ...this.filtros(),
        nivel: salon.nivel,
        grado: salon.grado,
        seccion: salon.seccion,
      });
      this.cargar();
    };

    if (this.modoDocente()) {
      this.asistenciaDocente.loadMisSalones().subscribe({
        next: (res) => {
          this.salonesPermitidos.set(res.salones);
          const salon = this.salonInicial();
          if (salon?.nivel && salon?.grado && salon?.seccion) {
            if (this.esSalonPermitido(salon)) {
              initConSalon(salon);
            } else {
              this.error.set('No tienes permiso para registrar asistencia en este salón.');
            }
          }
        },
        error: () => this.error.set('No se pudieron validar tus salones asignados.'),
      });
      return;
    }

    this.institucional.loadEducationLevels().subscribe({
      next: (niveles) => {
        this._niveles.set(niveles);
        const salon = this.salonInicial();
        if (salon?.nivel && salon?.grado && salon?.seccion) {
          initConSalon(salon);
        }
      },
    });
    markTenantReloadReady(this._tenantReloadReady);
  }

  setFiltro(campo: 'nivel' | 'grado' | 'seccion' | 'fecha', valor: string): void {
    this.filtros.update((f) => {
      const next = { ...f, [campo]: valor };
      if (campo === 'nivel') {
        next.grado = '';
        next.seccion = '';
      }
      if (campo === 'grado') next.seccion = '';
      return next;
    });

    if (campo === 'fecha') {
      this.mesVisible.set(mesDe(valor));
    }

    if (this.filtrosCompletos()) {
      this.cargar();
    }
  }

  puedeRegistrar(): boolean {
    return !!(this.filtrosCompletos() && this.navegacion()?.esDiaClase && !this.svc.loading());
  }

  irDia(fecha: string): void {
    this.setFiltro('fecha', fecha);
  }

  irHoy(): void {
    const hoy = this.navegacion()?.hoy ?? new Date().toISOString().split('T')[0];
    this.setFiltro('fecha', hoy);
  }

  seleccionarDia(fecha: string): void {
    this.setFiltro('fecha', fecha);
  }

  cambiarMes(delta: -1 | 1): void {
    const cal = this.calendario();
    const mes = delta < 0 ? cal?.mesAnterior : cal?.mesSiguiente;
    if (!mes) return;
    this.mesVisible.set(mes);
    this.cargarCalendario();
  }

  claseCelda(celda: DailyRegisterCalendarDay): Record<string, boolean> {
    return {
      'text-gray-300 border-transparent': !celda.esMesActual,
      'text-gray-700 border-gray-100 hover:bg-gray-50': celda.esMesActual && !celda.esSeleccionado && !celda.feriado,
      'bg-indigo-600 text-white border-indigo-600': celda.esSeleccionado,
      'ring-2 ring-indigo-400 ring-offset-1': celda.esHoy && !celda.esSeleccionado,
      'bg-amber-50 text-amber-800 border-amber-200': !!celda.feriado && celda.esMesActual && !celda.esSeleccionado,
      'opacity-50': celda.fueraDePeriodo && celda.esMesActual && !celda.esSeleccionado,
      'text-gray-400': celda.esFinDeSemana && celda.esMesActual && !celda.esSeleccionado && !celda.feriado,
    };
  }

  cargar(): void {
    if (!this.filtrosCompletos()) return;
    if (this.modoDocente() && !this.esSalonPermitido(this.filtros())) {
      this.error.set('Solo puedes registrar asistencia en salones asignados a tu perfil.');
      this._registros.set([]);
      this.navegacion.set(null);
      return;
    }

    this.error.set('');
    this.toast.set(null);
    const f = this.filtros();

    this.svc.load(f).subscribe({
      next: (data) => {
        this.gradoLabel.set(data.gradoLabel);
        this.feriadoDelDia.set(data.feriado);
        this.navegacion.set(data.navegacion);
        this.mesVisible.set(mesDe(data.fecha));
        this._registros.set(
          data.registros.map((r) => ({
            studentId: r.studentId,
            nombres: r.nombres,
            apellidos: r.apellidos,
            dni: r.dni,
            attendanceId: r.attendanceId,
            estado: r.estado ?? 'P',
            observacion: r.observacion ?? '',
          })),
        );
        this.cargarCalendario();
      },
      error: (err) => {
        this.error.set(err.message);
        this._registros.set([]);
        this.navegacion.set(null);
      },
    });
  }

  cargarCalendario(): void {
    if (!this.filtrosCompletos()) return;
    this.svc.loadCalendar(this.filtros(), this.mesVisible()).subscribe({
      next: (data) => this.calendario.set(data),
      error: () => this.calendario.set(null),
    });
  }

  marcarTodos(estado: EstadoAsistencia): void {
    if (!this.puedeRegistrar()) return;
    this._registros.update((regs) => regs.map((r) => ({ ...r, estado })));
  }

  guardar(): void {
    if (!this.puedeRegistrar() || !this._registros().length) return;
    if (this.modoDocente() && !this.esSalonPermitido(this.filtros())) {
      this.mostrarToast('No tienes permiso para guardar asistencia en este salón.', 'error');
      return;
    }

    const f = this.filtros();
    this.error.set('');

    this.svc
      .save({
        nivel: f.nivel,
        grado: f.grado,
        seccion: f.seccion,
        fecha: f.fecha,
        registros: this._registros().map((r) => ({
          studentId: r.studentId,
          estado: r.estado,
          observacion: r.observacion.trim() || undefined,
        })),
      })
      .subscribe({
        next: (res) => {
          this.mostrarToast(`Asistencia guardada (${res.guardados} registro(s))`, 'success');
          this.cargar();
        },
        error: (err) => this.mostrarToast(err.message, 'error'),
      });
  }

  private mostrarToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  private esSalonPermitido(f: { nivel: string; grado: string; seccion: string }): boolean {
    if (!this.modoDocente()) return true;
    const salones = this.salonesPermitidos();
    if (!salones.length) return false;
    return salones.some(
      (s) =>
        s.nivel === f.nivel &&
        s.grado === f.grado &&
        s.seccion.toUpperCase() === f.seccion.trim().toUpperCase(),
    );
  }
}
