import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../core/layout/services/layout.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { DashboardService } from './dashboard.service';
import { markTenantReloadReady, setupTenantReload } from '../../core/tenant/tenant-reload.util';

interface StatCard {
  label: string;
  value: string | number;
  subtext: string;
  icon: string;
  color: string;
}
interface RecentActivity {
  type: string; description: string; user: string; time: string; icon: string; color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="space-y-6">

      <!-- Bienvenida -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">¡Buenos días, {{ primerNombre() }}! 👋</h1>
          <p class="text-gray-500 text-sm mt-1">Aquí tienes un resumen de hoy — {{ today() }}</p>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="svc.loading()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
          <button class="btn btn-primary" color="primary" routerLink="/matricula/nueva" class="text-sm">
            <span class="icon mr-1 text-base">person_add</span> Nueva Matrícula
          </button>
        </div>
      </div>

      @if (svc.loading() && !statsCards().length) {
        <div class="card p-12 flex flex-col items-center text-gray-400">
          <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
          <p class="text-sm">Cargando indicadores…</p>
        </div>
      } @else if (error()) {
        <div class="card p-6 border-red-100 bg-red-50 text-red-700 text-sm flex items-start gap-3">
          <span class="icon shrink-0">error</span>
          <div>
            <p class="font-medium">{{ error() }}</p>
            <p class="text-xs text-red-600/80 mt-2">
              Si acabas de actualizar el código, reinicia el backend: <code class="bg-red-100 px-1 rounded">npm run start:dev</code> en escolar-backend.
            </p>
          </div>
        </div>
      }

      <!-- Tarjetas estadísticas -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        @for (card of statsCards(); track card.label) {
          <div class="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" [ngClass]="card.color">
              <span class="icon text-white text-xl">{{ card.icon }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-2xl font-bold text-gray-800">{{ card.value }}</div>
              <div class="text-sm text-gray-500 truncate">{{ card.label }}</div>
              <div class="flex items-center gap-1 mt-1">
                <span class="text-xs text-gray-400">{{ card.subtext }}</span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Segunda fila: Gráficos + Actividad -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Rendimiento académico por grado -->
        <div class="card p-6 lg:col-span-2">
          <div class="flex items-center justify-between mb-5">
            <h3 class="font-semibold text-gray-800">Rendimiento Académico por Grado</h3>
            <span class="badge badge-info">Bimestre 2</span>
          </div>
          <div class="space-y-3">
            @for (grado of rendimiento; track grado.nombre) {
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-gray-600">{{ grado.nombre }}</span>
                  <div class="flex gap-3 text-xs">
                    <span class="text-green-600 font-medium">{{ grado.aprobados }}% aprobados</span>
                    <span class="text-red-500">{{ grado.desaprobados }}% desap.</span>
                  </div>
                </div>
                <div class="flex gap-1 h-5 rounded-full overflow-hidden bg-gray-100">
                  <div class="bg-green-400 transition-all duration-700" [style.width.%]="grado.aprobados"></div>
                  <div class="bg-yellow-400 transition-all duration-700" [style.width.%]="grado.proceso"></div>
                  <div class="bg-red-400 transition-all duration-700" [style.width.%]="grado.desaprobados"></div>
                </div>
              </div>
            }
          </div>
          <div class="flex gap-4 mt-4 text-xs text-gray-500">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-green-400 inline-block"></span> Aprobados</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-yellow-400 inline-block"></span> En Proceso</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-red-400 inline-block"></span> Desaprobados</span>
          </div>
        </div>

        <!-- Asistencia hoy -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="font-semibold text-gray-800">Asistencia Hoy</h3>
            <a routerLink="/asistencia/reportes" class="text-xs text-indigo-600 hover:underline">Ver reporte</a>
          </div>

          <!-- Donut visual simple -->
          <div class="flex flex-col items-center mb-5">
            <div class="relative w-32 h-32">
              <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" stroke-width="3"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#4ade80" stroke-width="3"
                  stroke-dasharray="88, 100" stroke-linecap="round"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#facc15" stroke-width="3"
                  stroke-dasharray="5, 100" stroke-dashoffset="-88" stroke-linecap="round"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f87171" stroke-width="3"
                  stroke-dasharray="7, 100" stroke-dashoffset="-93" stroke-linecap="round"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold text-gray-800">88%</span>
                <span class="text-xs text-gray-500">asistencia</span>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            @for (item of asistenciaData; track item.label) {
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full" [ngClass]="item.color"></span>
                  <span class="text-gray-600">{{ item.label }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-800">{{ item.count }}</span>
                  <span class="text-gray-400 text-xs">{{ item.pct }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Tercera fila -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Morosidad financiera -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="font-semibold text-gray-800">Estado Financiero</h3>
            <a routerLink="/tesoreria/reportes" class="text-xs text-indigo-600 hover:underline">Detalle</a>
          </div>
          <div class="space-y-4">
            @for (item of finanzas; track item.label) {
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-gray-600">{{ item.label }}</span>
                  <span class="text-sm font-semibold" [ngClass]="item.valueColor">{{ item.value }}</span>
                </div>
                <div class="progress"><div class="progress-bar bg-indigo-500" [style.width]="item.pct + '%'"></div></div>
              </div>
            }
          </div>
        </div>

        <!-- Vacantes por grado -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="font-semibold text-gray-800">Vacantes Disponibles</h3>
            <a routerLink="/matricula/vacantes" class="text-xs text-indigo-600 hover:underline">Gestionar</a>
          </div>
          @if (svc.loading() && !vacantesDisponibles().length) {
            <p class="text-sm text-gray-400 py-6 text-center">Cargando vacantes…</p>
          } @else if (!vacantesDisponibles().length) {
            <p class="text-sm text-gray-400 py-6 text-center">No hay vacantes disponibles en este momento.</p>
          } @else {
            <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
              @for (v of vacantesDisponibles(); track v.id) {
                <div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
                  <div class="min-w-0">
                    <div class="text-sm font-medium text-gray-700 truncate">{{ v.label }}</div>
                    <div class="text-xs text-gray-400">{{ v.matriculados }}/{{ v.capacidad }} ocupadas</div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0 ml-3">
                    <span class="text-sm font-bold"
                      [ngClass]="v.disponibles > 5 ? 'text-green-600' : v.disponibles > 0 ? 'text-yellow-600' : 'text-red-600'">
                      {{ v.disponibles }} libres
                    </span>
                  </div>
                </div>
              }
            </div>
            <p class="text-[11px] text-gray-400 mt-3">{{ vacantesDisponibles().length }} sección(es) con cupo · A.E. {{ svc.stats()?.anioEscolar }}</p>
          }
        </div>

        <!-- Actividad reciente -->
        <div class="card p-6">
          <h3 class="font-semibold text-gray-800 mb-5">Actividad Reciente</h3>
          <div class="space-y-3">
            @for (act of recentActivity; track act.time) {
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" [ngClass]="act.color">
                  <span class="icon text-white text-sm">{{ act.icon }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-700 leading-tight">{{ act.description }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ act.user }} · {{ act.time }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Accesos rápidos -->
      <div class="card p-6">
        <h3 class="font-semibold text-gray-800 mb-4">Accesos Rápidos</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          @for (acc of accesosRapidos; track acc.label) {
            <a
              [routerLink]="acc.route"
              class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all cursor-pointer group"
            >
              <div class="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" [ngClass]="acc.color">
                <span class="icon text-white text-lg">{{ acc.icon }}</span>
              </div>
              <span class="text-xs text-gray-600 text-center leading-tight">{{ acc.label }}</span>
            </a>
          }
        </div>
      </div>

    </div>
  `
})
export class DashboardComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly svc = inject(DashboardService);
  private readonly _tenantReloadReady = setupTenantReload(() => this.cargar());

  readonly error = signal('');

  readonly vacantesDisponibles = computed(() => this.svc.stats()?.vacantesDisponibles ?? []);

  readonly statsCards = computed((): StatCard[] => {
    const s = this.svc.stats();
    if (!s) return [];
    return [
      {
        label: 'Estudiantes Matriculados',
        value: s.estudiantesMatriculados.toLocaleString('es-PE'),
        subtext: `A.E. ${s.anioEscolar}`,
        icon: 'school',
        color: 'bg-indigo-500',
      },
      {
        label: 'Docentes Activos',
        value: s.docentesActivos.toLocaleString('es-PE'),
        subtext: 'en planta',
        icon: 'co_present',
        color: 'bg-blue-500',
      },
      {
        label: 'Asistencia Promedio',
        value: `${s.asistenciaPromedio}%`,
        subtext: s.totalRegistrosAsistencia
          ? `${s.totalRegistrosAsistencia} registros en ${s.anioEscolar}`
          : `sin registros en ${s.anioEscolar}`,
        icon: 'fact_check',
        color: 'bg-green-500',
      },
      {
        label: 'Pagos Pendientes',
        value: `S/ ${s.pagosPendientes.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        subtext: s.familiasConDeuda === 1
          ? '1 familia con deuda'
          : `${s.familiasConDeuda} familias con deuda`,
        icon: 'money_off',
        color: 'bg-red-500',
      },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle('Dashboard');
    this.cargar();
    markTenantReloadReady(this._tenantReloadReady);
  }

  cargar(): void {
    this.error.set('');
    this.svc.loadStats().subscribe({
      error: err => {
        this.error.set(
          err instanceof Error ? err.message : 'No se pudieron cargar los indicadores del dashboard.',
        );
      },
    });
  }

  primerNombre(): string {
    return this.auth.currentUser()?.nombre?.split(' ')[0] ?? 'Usuario';
  }

  today(): string {
    return new Intl.DateTimeFormat('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
  }

  rendimiento = [
    { nombre: '1A Primaria',    aprobados: 92, proceso: 5, desaprobados: 3  },
    { nombre: '3A Primaria',    aprobados: 85, proceso: 9, desaprobados: 6  },
    { nombre: '6A Primaria',    aprobados: 78, proceso: 12,desaprobados: 10 },
    { nombre: '1A Secundaria',  aprobados: 71, proceso: 15,desaprobados: 14 },
    { nombre: '3A Secundaria',  aprobados: 76, proceso: 13,desaprobados: 11 },
    { nombre: '5A Secundaria',  aprobados: 83, proceso: 10,desaprobados: 7  },
  ];

  asistenciaData = [
    { label: 'Presentes',     count: 1098, pct: '88%',  color: 'bg-green-400'  },
    { label: 'Tardanzas',     count: 62,   pct: '5%',   color: 'bg-yellow-400' },
    { label: 'Faltas',        count: 88,   pct: '7%',   color: 'bg-red-400'    },
  ];

  finanzas = [
    { label: 'Recaudado (Jun)',  value: 'S/ 48,200', pct: 74, valueColor: 'text-green-600',  matColor: 'primary' as const },
    { label: 'Pendiente',        value: 'S/ 12,450', pct: 20, valueColor: 'text-red-600',    matColor: 'warn'    as const },
    { label: 'Meta mensual',     value: 'S/ 65,000', pct: 100,valueColor: 'text-gray-700',   matColor: 'accent'  as const },
  ];

  recentActivity: RecentActivity[] = [
    { type: 'matricula',   description: 'Matrícula registrada para García López, Juan',     user: 'Secretaría', time: 'Hace 15 min', icon: 'how_to_reg', color: 'bg-blue-500'   },
    { type: 'pago',        description: 'Pago de pensión S/. 350 - Familia Quispe',         user: 'Tesorería',  time: 'Hace 32 min', icon: 'payment',    color: 'bg-green-500'  },
    { type: 'asistencia',  description: 'Asistencia registrada para 3A Secundaria',        user: 'Prof. Ruiz', time: 'Hace 1 hora', icon: 'fact_check', color: 'bg-purple-500' },
    { type: 'comunicado',  description: 'Nuevo comunicado enviado a padres de 5A grado',    user: 'Dirección',  time: 'Hace 2 horas',icon: 'campaign',   color: 'bg-orange-500' },
    { type: 'nota',        description: '45 notas registradas — Matemática 4B',            user: 'Prof. Vega', time: 'Ayer',        icon: 'grading',    color: 'bg-indigo-500' },
  ];

  accesosRapidos = [
    { label: 'Matrícula',       route: '/matricula/nueva',         icon: 'person_add',       color: 'bg-indigo-500'  },
    { label: 'Asistencia',      route: '/asistencia/registro',     icon: 'fact_check',       color: 'bg-blue-500'    },
    { label: 'Notas',           route: '/evaluacion/notas',        icon: 'grading',          color: 'bg-green-500'   },
    { label: 'Pagos',           route: '/tesoreria/pagos',         icon: 'payment',          color: 'bg-yellow-500'  },
    { label: 'Comunicados',     route: '/comunicaciones/comunicados',icon: 'campaign',       color: 'bg-orange-500'  },
    { label: 'Horarios',        route: '/academico/horarios',      icon: 'schedule',         color: 'bg-purple-500'  },
    { label: 'Expedientes',     route: '/estudiantes/expedientes', icon: 'folder_open',      color: 'bg-pink-500'    },
    { label: 'Biblioteca',      route: '/biblioteca/catalogo',     icon: 'local_library',    color: 'bg-teal-500'    },
  ];
}




