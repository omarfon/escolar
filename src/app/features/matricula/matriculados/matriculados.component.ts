import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import {
  Estudiante,
  ExpedientesService,
} from '../../estudiantes/services/expedientes.service';
import { FutDetalleComponent } from '../shared/fut-detalle.component';

@Component({
  selector: 'app-matriculados',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, FutDetalleComponent],
  template: `
<div class="space-y-5 animate-fade-in">

  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
    <div>
      <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Alumnos Matriculados</h2>
      <p class="text-sm text-gray-500 mt-0.5">
        {{ totalFiltrados() }} alumno(s) · página {{ paginaActual() }} de {{ totalPaginas() }}
      </p>
      @if (loading()) {
        <p class="text-xs text-indigo-500 mt-1">Cargando matrículas...</p>
      }
      @if (loadError()) {
        <p class="text-xs text-red-500 mt-1">{{ loadError() }}</p>
      }
    </div>
    <div class="flex gap-2">
      <button class="btn btn-secondary" (click)="recargar()">
        <span class="icon icon-sm">refresh</span> Actualizar
      </button>
      <a routerLink="/matricula/nueva" class="btn btn-primary">
        <span class="icon icon-sm">person_add</span> Nueva Matrícula
      </a>
    </div>
  </div>

  <!-- KPIs -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div class="card p-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span class="icon text-indigo-600">how_to_reg</span>
        </div>
        <div>
          <div class="text-xl font-bold text-gray-900">{{ totalMatriculados() }}</div>
          <div class="text-xs text-gray-400">Matriculados activos</div>
        </div>
      </div>
    </div>
    <div class="card p-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <span class="icon text-emerald-600">school</span>
        </div>
        <div>
          <div class="text-xl font-bold text-gray-900">{{ porNivel('Primaria') }}</div>
          <div class="text-xs text-gray-400">Primaria</div>
        </div>
      </div>
    </div>
    <div class="card p-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <span class="icon text-blue-600">menu_book</span>
        </div>
        <div>
          <div class="text-xl font-bold text-gray-900">{{ porNivel('Secundaria') }}</div>
          <div class="text-xs text-gray-400">Secundaria</div>
        </div>
      </div>
    </div>
    <div class="card p-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <span class="icon text-amber-600">child_care</span>
        </div>
        <div>
          <div class="text-xl font-bold text-gray-900">{{ porNivel('Inicial') }}</div>
          <div class="text-xs text-gray-400">Inicial</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Filtros -->
  <div class="card p-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="relative">
        <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
        <input class="form-input pl-9" type="text" placeholder="Buscar por nombre, DNI o código..."
               [ngModel]="filtro().q" (ngModelChange)="setFiltro('q', $event)">
      </div>
      <select class="form-input" [ngModel]="filtro().grado" (ngModelChange)="setFiltro('grado', $event)">
        <option value="">Todos los grados</option>
        @for (g of gradosDisponibles(); track g) {
          <option [value]="g">{{ g }}</option>
        }
      </select>
      <select class="form-input" [ngModel]="filtro().seccion" (ngModelChange)="setFiltro('seccion', $event)">
        <option value="">Todas las secciones</option>
        @for (s of seccionesDisponibles(); track s) {
          <option [value]="s">{{ s }}</option>
        }
      </select>
      <select class="form-input" [ngModel]="filtro().anio" (ngModelChange)="setFiltro('anio', $event)">
        <option value="">Todos los años</option>
        @for (a of aniosDisponibles(); track a) {
          <option [value]="a">{{ a }}</option>
        }
      </select>
    </div>
    @if (hayFiltros()) {
      <button class="mt-3 text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1"
              (click)="limpiarFiltros()">
        <span class="icon text-sm">filter_alt_off</span> Limpiar filtros
      </button>
    }
  </div>

  <!-- Tabla -->
  <div class="card overflow-hidden">
    <table class="data-table">
      <thead>
        <tr>
          <th class="text-left">Alumno</th>
          <th class="text-left hidden md:table-cell">DNI</th>
          <th class="text-left hidden sm:table-cell">Grado / Sección</th>
          <th class="text-center hidden lg:table-cell">Año ingreso</th>
          <th class="text-center">Estado</th>
          <th class="text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        @for (e of paginados(); track e.id) {
          <tr class="hover:bg-gray-50 cursor-pointer" (click)="abrirDetalle(e)">
            <td>
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                     [ngClass]="e.sexo === 'F' ? 'bg-pink-500' : 'bg-indigo-500'">
                  {{ iniciales(e.nombres, e.apellidos) }}
                </div>
                <div>
                  <div class="font-medium text-gray-900 text-sm">{{ e.apellidos }}, {{ e.nombres }}</div>
                  <div class="text-xs text-gray-400">{{ e.codigo }}</div>
                </div>
              </div>
            </td>
            <td class="hidden md:table-cell text-sm text-gray-600">{{ e.dni }}</td>
            <td class="hidden sm:table-cell text-sm text-gray-600">{{ e.grado }} "{{ e.seccion }}"</td>
            <td class="hidden lg:table-cell text-center text-sm text-gray-600">{{ e.anioIngreso }}</td>
            <td class="text-center">
              <span class="badge text-xs"
                    [ngClass]="e.estado === 'activo' ? 'badge-green' : e.estado === 'retirado' ? 'badge-red' : 'badge-gray'">
                {{ e.estado }}
              </span>
            </td>
            <td class="text-center" (click)="$event.stopPropagation()">
              <button class="btn-icon text-indigo-500" title="Ver detalle" (click)="abrirDetalle(e)">
                <span class="icon icon-sm">visibility</span>
              </button>
            </td>
          </tr>
        } @empty {
          <tr>
            <td colspan="6" class="py-16 text-center">
              <div class="flex flex-col items-center gap-2 text-gray-300">
                <span class="icon icon-2xl">search_off</span>
                <p class="text-sm text-gray-400">No hay alumnos matriculados para los filtros aplicados</p>
                @if (hayFiltros()) {
                  <button class="btn btn-ghost text-xs" (click)="limpiarFiltros()">Limpiar filtros</button>
                } @else {
                  <a routerLink="/matricula/nueva" class="btn btn-primary text-xs mt-2">
                    <span class="icon icon-sm">person_add</span> Registrar primera matrícula
                  </a>
                }
              </div>
            </td>
          </tr>
        }
      </tbody>
    </table>

    @if (totalFiltrados() > 0) {
      <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        <span class="text-xs text-gray-500">{{ inicio() + 1 }}–{{ fin() }} de {{ totalFiltrados() }}</span>
        <div class="flex items-center gap-1">
          <button class="btn-icon" [disabled]="paginaActual() === 1" (click)="paginaActual.update(p => p - 1)">
            <span class="icon icon-sm">chevron_left</span>
          </button>
          @for (p of paginas(); track p) {
            <button class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                    [ngClass]="p === paginaActual() ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
                    (click)="paginaActual.set(p)">{{ p }}</button>
          }
          <button class="btn-icon" [disabled]="paginaActual() === totalPaginas()" (click)="paginaActual.update(p => p + 1)">
            <span class="icon icon-sm">chevron_right</span>
          </button>
        </div>
      </div>
    }
  </div>
</div>

<!-- Drawer detalle -->
@if (detalle()) {
  <div class="fixed inset-0 bg-black/40 z-30" (click)="cerrarDetalle()"></div>
  <div class="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r">
    <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
      <div>
        <h3 class="font-semibold text-gray-900">{{ detalle()!.apellidos }}, {{ detalle()!.nombres }}</h3>
        <p class="text-xs text-gray-400">{{ detalle()!.codigo }} · DNI {{ detalle()!.dni }}</p>
      </div>
      <button class="btn btn-icon" (click)="cerrarDetalle()">
        <span class="icon">close</span>
      </button>
    </div>
    <div class="flex-1 overflow-y-auto p-5 space-y-5">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
             [ngClass]="detalle()!.sexo === 'F' ? 'bg-pink-500' : 'bg-indigo-500'">
          {{ iniciales(detalle()!.nombres, detalle()!.apellidos) }}
        </div>
        <div>
          <span class="badge"
                [ngClass]="detalle()!.estado === 'activo' ? 'badge-green' : detalle()!.estado === 'retirado' ? 'badge-red' : 'badge-gray'">
            {{ detalle()!.estado }}
          </span>
          <p class="text-sm text-gray-600 mt-1">{{ detalle()!.grado }} "{{ detalle()!.seccion }}"</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div class="text-xs text-gray-400">Año de ingreso</div>
          <div class="font-semibold text-gray-800">{{ detalle()!.anioIngreso }}</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div class="text-xs text-gray-400">Sexo</div>
          <div class="font-semibold text-gray-800">{{ detalle()!.sexo === 'F' ? 'Femenino' : 'Masculino' }}</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-3 border border-gray-100 col-span-2">
          <div class="text-xs text-gray-400">Correo</div>
          <div class="font-medium text-gray-800 truncate">{{ detalle()!.email || '—' }}</div>
        </div>
      </div>

      <div>
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Representante principal</div>
        <div class="bg-indigo-50 rounded-lg p-3 border border-indigo-100 text-sm">
          <div class="font-medium text-gray-800">
            {{ detalle()!.apoderado.nombres }} {{ detalle()!.apoderado.apellidos }}
          </div>
          <div class="text-xs text-gray-500 mt-1">DNI {{ detalle()!.apoderado.dni || '—' }}</div>
          <div class="text-xs text-gray-500">{{ detalle()!.apoderado.telefono || '—' }}</div>
        </div>
      </div>

      <div>
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ficha de matrícula</div>
        <button
          type="button"
          class="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left group"
          [ngClass]="futEntregada()
            ? 'border-teal-200 bg-teal-50 hover:border-teal-400 hover:shadow-md'
            : 'border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-md'"
          (click)="abrirFut()"
        >
          <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
               [ngClass]="futEntregada() ? 'bg-teal-600 text-white' : 'bg-amber-500 text-white'">
            <span class="icon">how_to_reg</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-900 text-sm group-hover:text-teal-800">
              Ficha Única de Matrícula (FUT)
            </div>
            <div class="text-xs text-gray-500 mt-0.5">
              {{ futNumero() }} · Clic para ver detalle completo
            </div>
          </div>
          <span class="badge text-xs shrink-0"
                [ngClass]="futEntregada() ? 'badge-green' : futVencida() ? 'badge-red' : 'badge-gray'">
            {{ futEstado() }}
          </span>
          <span class="icon text-gray-300 group-hover:text-teal-600 shrink-0">chevron_right</span>
        </button>
        @if (detalle()!.estado === 'activo') {
          <a
            class="mt-2 w-full btn btn-secondary justify-center"
            [routerLink]="['/matricula/retiro']"
            [queryParams]="{ studentId: detalle()!.id }"
          >
            <span class="icon icon-sm">person_off</span> Registrar retiro
          </a>
        }
        @if (detalle()!.estado === 'retirado') {
          <a
            class="mt-2 w-full btn btn-secondary justify-center"
            [routerLink]="['/matricula/reingreso']"
            [queryParams]="{ studentId: detalle()!.id }"
          >
            <span class="icon icon-sm">person_add</span> Registrar reingreso
          </a>
        }
      </div>

      <div>
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Documentos de matrícula</div>
        <div class="space-y-2">
          @for (doc of docsMatricula(); track doc.tipo) {
            <button
              type="button"
              class="w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg border transition-colors text-left"
              [ngClass]="doc.estado === 'entregado' ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' : 'bg-gray-50 border-gray-100 hover:border-gray-300'"
              (click)="docEsFut(doc) ? abrirFut() : null"
              [class.cursor-pointer]="docEsFut(doc)"
            >
              <span class="text-gray-700">{{ doc.tipo }}</span>
              <span class="badge text-xs"
                    [ngClass]="doc.estado === 'entregado' ? 'badge-green' : doc.estado === 'vencido' ? 'badge-red' : 'badge-gray'">
                {{ doc.estado }}
              </span>
            </button>
          } @empty {
            <p class="text-sm text-gray-400 text-center py-3">Sin documentos registrados</p>
          }
        </div>
      </div>
    </div>
    <div class="px-5 py-4 border-t border-gray-100 shrink-0">
      <a routerLink="/estudiantes/expedientes" class="btn btn-secondary w-full text-sm">
        <span class="icon icon-sm">folder_open</span> Ver expediente completo
      </a>
    </div>
  </div>
}

@if (futAbierto() && detalle()) {
  <app-fut-detalle [estudiante]="detalle()!" (closed)="cerrarFut()" />
}
  `,
})
export class MatriculadosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly tenant = inject(TenantContextService);
  private readonly expedientesSvc = inject(ExpedientesService);
  private readonly _tenantReloadReady = setupTenantReload(
    () => this.recargarPagina(),
    {
      onBeforeReload: () => {
        this.detalle.set(null);
        this.futAbierto.set(false);
        this.paginaActual.set(1);
        this.expedientesSvc.reset();
      },
    },
  );

  readonly loading = this.expedientesSvc.loading;
  readonly loadError = this.expedientesSvc.error;
  readonly POR_PAGINA = 10;

  paginaActual = signal(1);
  detalle = signal<Estudiante | null>(null);
  futAbierto = signal(false);

  readonly filtro = signal({ q: '', grado: '', seccion: '', anio: '' });

  readonly matriculados = computed(() => this.expedientesSvc.estudiantes());

  readonly filtrados = computed(() => {
    const { seccion, anio } = this.filtro();
    return this.matriculados().filter((e) => {
      const matchS = !seccion || e.seccion === seccion;
      const matchA = !anio || e.anioIngreso === anio;
      return matchS && matchA;
    });
  });

  readonly totalFiltrados = computed(() => this.expedientesSvc.total());
  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalFiltrados() / this.POR_PAGINA)),
  );
  readonly inicio = computed(() => (this.paginaActual() - 1) * this.POR_PAGINA);
  readonly fin = computed(() => Math.min(this.inicio() + this.POR_PAGINA, this.totalFiltrados()));
  readonly paginados = computed(() => this.filtrados());
  readonly paginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const ini = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    return Array.from({ length: fin - ini + 1 }, (_, i) => ini + i);
  });

  readonly totalMatriculados = computed(
    () => this.expedientesSvc.stats()?.matriculadosActivos ?? this.matriculados().length,
  );

  readonly gradosDisponibles = computed(() =>
    [...new Set(this.matriculados().map((e) => e.grado).filter(Boolean))].sort(),
  );

  readonly seccionesDisponibles = computed(() => {
    const grado = this.filtro().grado;
    const base = grado
      ? this.matriculados().filter((e) => e.grado === grado)
      : this.matriculados();
    return [...new Set(base.map((e) => e.seccion).filter(Boolean))].sort();
  });

  readonly aniosDisponibles = computed(() => {
    const { grado, seccion } = this.filtro();
    let base = this.matriculados();
    if (grado) base = base.filter((e) => e.grado === grado);
    if (seccion) base = base.filter((e) => e.seccion === seccion);
    return [...new Set(base.map((e) => e.anioIngreso).filter(Boolean))].sort().reverse();
  });

  readonly docsMatricula = computed(() => {
    const docs = this.detalle()?.documentos ?? [];
    return docs.filter(
      (d) => d.tipo.includes('Matrícula') || d.tipo.includes('FUT') || d.tipo.includes('Contrato'),
    );
  });

  readonly futRegistro = computed(() => {
    const docs = this.detalle()?.documentos ?? [];
    return docs.find((d) => d.tipo.includes('FUT') || d.tipo.includes('Matrícula')) ?? null;
  });

  readonly futEstado = computed(() => this.futRegistro()?.estado ?? 'pendiente');
  readonly futEntregada = computed(() => this.futEstado() === 'entregado');
  readonly futVencida = computed(() => this.futEstado() === 'vencido');
  readonly futNumero = computed(() => {
    const reg = this.futRegistro();
    const codigo = this.detalle()?.codigo ?? '';
    return reg?.numero?.trim() || (codigo ? `FUT-${codigo}` : 'Sin número');
  });

  readonly hayFiltros = computed(() => {
    const f = this.filtro();
    return !!f.q.trim() || !!f.grado || !!f.seccion || !!f.anio;
  });

  private busquedaTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.layout.setTitle('Alumnos Matriculados');
    if (this.tenant.requiresSelection()) {
      this.expedientesSvc.reset();
    } else {
      this.recargarPagina();
    }
    markTenantReloadReady(this._tenantReloadReady);
  }

  recargarPagina(): void {
    this.expedientesSvc.load({
      page: this.paginaActual(),
      pageSize: this.POR_PAGINA,
      q: this.filtro().q,
      grado: this.filtro().grado,
      estado: 'activo',
    });
  }

  recargar(): void {
    this.recargarPagina();
  }

  setFiltro(campo: 'q' | 'grado' | 'seccion' | 'anio', valor: string): void {
    this.filtro.update((f) => {
      const next = { ...f, [campo]: valor };
      if (campo === 'grado' && f.seccion) {
        const seccionValida = this.matriculados().some(
          (e) => e.grado === valor && e.seccion === f.seccion,
        );
        if (!seccionValida) next.seccion = '';
      }
      if (campo === 'grado' && f.anio) {
        const anioValido = this.matriculados().some(
          (e) =>
            (!valor || e.grado === valor) &&
            (!f.seccion || e.seccion === f.seccion) &&
            e.anioIngreso === f.anio,
        );
        if (!anioValido) next.anio = '';
      }
      if (campo === 'seccion' && f.anio) {
        const anioValido = this.matriculados().some(
          (e) =>
            (!f.grado || e.grado === f.grado) &&
            e.seccion === valor &&
            e.anioIngreso === f.anio,
        );
        if (!anioValido) next.anio = '';
      }
      return next;
    });
    this.paginaActual.set(1);

    if (campo === 'q') {
      if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
      this.busquedaTimer = setTimeout(() => this.recargarPagina(), 350);
      return;
    }
    this.recargarPagina();
  }

  private coincideBusqueda(e: Estudiante, q: string): boolean {
    const query = q.trim().toLowerCase();
    if (!query) return true;
    const haystack = [
      e.nombres,
      e.apellidos,
      `${e.apellidos}, ${e.nombres}`,
      `${e.nombres} ${e.apellidos}`,
      e.dni,
      e.codigo,
      e.email,
    ]
      .join(' ')
      .toLowerCase();
    return query
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => haystack.includes(token));
  }

  porNivel(nivel: string): number {
    return this.matriculados().filter((e) => e.grado.includes(nivel)).length;
  }

  iniciales(n: string, a: string): string {
    return ((n?.[0] ?? '') + (a?.[0] ?? '')).toUpperCase();
  }

  limpiarFiltros(): void {
    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
    this.filtro.set({ q: '', grado: '', seccion: '', anio: '' });
    this.paginaActual.set(1);
    this.recargarPagina();
  }

  abrirDetalle(e: Estudiante): void {
    this.detalle.set(e);
    this.futAbierto.set(false);
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
    this.futAbierto.set(false);
  }

  abrirFut(): void {
    const e = this.detalle();
    if (!e) return;
    this.futAbierto.set(true);
    this.expedientesSvc.refreshOne(e.id).subscribe({
      next: () => {
        const actualizado =
          this.expedientesSvc.estudiantes().find((x) => x.id === e.id) ?? e;
        this.detalle.set(actualizado);
      },
    });
  }

  cerrarFut(): void {
    this.futAbierto.set(false);
  }

  docEsFut(doc: { tipo: string }): boolean {
    return doc.tipo.includes('FUT') || doc.tipo.includes('Matrícula');
  }
}
