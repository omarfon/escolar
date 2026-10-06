import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import { ConductaService } from './conducta.service';
import {
  AlumnoConducta,
  ConductKpis,
  ESTADO_CFG,
  EstadoIncidente,
  formatFechaHoy,
  Incidente,
  LUGARES,
  MEDIDAS,
  NIVEL_CFG,
  NivelConducta,
  ResumenAlumno,
  TIPO_CFG,
  TipoIncidente,
} from './conducta.model';
import {
  ErroresCampoIncidente,
  incidenteFormularioMinimoListo,
  primerErrorIncidente,
  validarCampoIncidente,
  validarIncidenteForm,
} from './incidente-form.validation';
@Component({
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
@if (toast()) {
  <div class="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-scale-in"
       [ngClass]="toast()!.tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'">
    <span class="icon text-base">{{ toast()!.tipo === 'ok' ? 'check_circle' : 'error' }}</span>
    {{ toast()!.msg }}
  </div>
}

<div class="space-y-5 animate-fade-in">

  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-bold text-gray-800">Control de Conducta</h2>
      <p class="text-sm text-gray-500">Registro y seguimiento de incidentes disciplinarios y reconocimientos</p>
      @if (loading()) {
        <p class="text-xs text-indigo-500 mt-1">Cargando registros...</p>
      }
      @if (loadError()) {
        <p class="text-xs text-red-500 mt-1">{{ loadError() }}</p>
      }
    </div>
    <button class="btn btn-primary" [disabled]="saving()" (click)="abrirDrawerRegistro()">
      <span class="icon text-base">add</span> Registrar Incidente
    </button>
  </div>

  <!-- KPIs -->
  @let k = kpis();
  <div class="grid grid-cols-5 gap-4">
    <div class="card p-4">
      <div class="text-xs text-gray-500 font-medium uppercase tracking-wide">Total registros</div>
      <div class="text-2xl font-bold text-gray-800 mt-1">{{ k.total }}</div>
      <div class="text-xs text-gray-400">este a\u00f1o</div>
    </div>
    <div class="card p-4 border-l-4 border-yellow-400">
      <div class="text-xs text-yellow-600 font-medium uppercase tracking-wide">Faltas leves</div>
      <div class="text-2xl font-bold text-yellow-700 mt-1">{{ k.leves }}</div>
    </div>
    <div class="card p-4 border-l-4 border-orange-400">
      <div class="text-xs text-orange-600 font-medium uppercase tracking-wide">Faltas graves</div>
      <div class="text-2xl font-bold text-orange-700 mt-1">{{ k.graves }}</div>
    </div>
    <div class="card p-4 border-l-4 border-red-400">
      <div class="text-xs text-red-600 font-medium uppercase tracking-wide">Muy graves</div>
      <div class="text-2xl font-bold text-red-700 mt-1">{{ k.muyGraves }}</div>
    </div>
    <div class="card p-4 border-l-4 border-emerald-400">
      <div class="text-xs text-emerald-600 font-medium uppercase tracking-wide">Reconocimientos</div>
      <div class="text-2xl font-bold text-emerald-700 mt-1">{{ k.reconocimientos }}</div>
    </div>
  </div>

  <!-- Tabs de vista -->
  <div class="tabs">
    <button class="tab" [ngClass]="vista() === 'incidentes' ? 'tab-active' : ''" (click)="cambiarVista('incidentes')">
      <span class="icon text-base">list_alt</span> Incidentes
    </button>
    <button class="tab" [ngClass]="vista() === 'alumnos' ? 'tab-active' : ''" (click)="cambiarVista('alumnos')">
      <span class="icon text-base">groups</span> Por Alumno
    </button>
  </div>

  <!-- Filtros -->
  <div class="card px-3 py-2.5 flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <div class="relative">
        <span class="icon absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
        <input class="form-input pl-8 h-9 text-sm w-52" type="text" placeholder="Buscar alumno..."
               [ngModel]="busqueda()" (ngModelChange)="onBusquedaChange($event)">
      </div>
      <select class="form-input h-9 text-sm w-28" [ngModel]="filtroGrado()" (ngModelChange)="onFiltroGradoChange($event)">
        <option value="todos">Grado</option>
        @for (g of grados(); track g) { <option [value]="g">{{ g }}</option> }
      </select>
      <select class="form-input h-9 text-sm w-28" [ngModel]="filtroTipo()" (ngModelChange)="onFiltroTipoChange($event)">
        <option value="todos">Tipo</option>
        @for (t of tiposOpts; track t.val) { <option [value]="t.val">{{ t.label }}</option> }
      </select>
      @if (vista() === 'incidentes') {
        <select class="form-input h-9 text-sm w-28" [ngModel]="filtroEstado()" (ngModelChange)="onFiltroEstadoChange($event)">
          <option value="todos">Estado</option>
          @for (e of estadosOpts; track e.val) { <option [value]="e.val">{{ e.label }}</option> }
        </select>
      }
    </div>
    <div class="flex items-center gap-1">
      @for (opt of filtroNivelOpts; track opt.val) {
        <button class="px-3 h-8 text-xs rounded-lg font-medium transition-colors"
                [ngClass]="filtroNivel() === opt.val ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                (click)="onFiltroNivelChange(opt.val)">{{ opt.label }}</button>
      }
      @if (hayFiltros()) {
        <button class="h-8 px-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors flex items-center gap-1 text-xs" (click)="limpiarFiltros()">
          <span class="icon text-sm">filter_alt_off</span> Limpiar
        </button>
      }
      <span class="ml-auto text-xs text-gray-400">{{ totalVisible() }} registro(s)</span>
    </div>
  </div>

  <!-- ─────────── Vista: Incidentes ─────────── -->
  @if (vista() === 'incidentes') {
    <div class="flex gap-5 items-start">

      <!-- Tabla -->
      <div class="flex-1 min-w-0 card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Alumno</th>
                <th class="w-28">Tipo</th>
                <th>Descripci\u00f3n</th>
                <th class="w-24">Fecha</th>
                <th class="w-32">Lugar</th>
                <th class="w-24 text-center">Estado</th>
                <th class="w-24 text-center">Padre</th>
                <th class="w-20">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (inc of incidentes(); track inc.id) {
                <tr class="cursor-pointer"
                    [ngClass]="selId() === inc.id ? 'bg-indigo-50' : ''"
                    (click)="selId.set(inc.id)">
                  <td>
                    <div class="font-medium text-gray-800 text-sm">{{ inc.alumno }}</div>
                    <div class="text-xs text-gray-400">{{ inc.grado }} "{{ inc.seccion }}"</div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="tipoBadge(inc.tipo)">
                      {{ tipoLabel(inc.tipo) }}
                    </span>
                  </td>
                  <td class="text-sm text-gray-600 max-w-xs">
                    <span class="line-clamp-2">{{ inc.descripcion }}</span>
                  </td>
                  <td class="text-xs text-gray-600">{{ inc.fecha }}</td>
                  <td class="text-xs text-gray-600">{{ inc.lugar }}</td>
                  <td class="text-center">
                    <span class="badge text-xs" [ngClass]="estadoBadge(inc.estado)">{{ estadoLabel(inc.estado) }}</span>
                  </td>
                  <td class="text-center">
                    <span class="icon text-base" [ngClass]="inc.notificadoPadre ? 'text-emerald-500' : 'text-gray-300'"
                          [title]="inc.notificadoPadre ? 'Padre notificado' : 'Sin notificar'">
                      {{ inc.notificadoPadre ? 'mark_email_read' : 'mail' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button class="btn btn-icon" title="Ver detalle" (click)="$event.stopPropagation(); selId.set(inc.id)">
                        <span class="icon text-sm">visibility</span>
                      </button>
                      <button class="btn btn-icon text-red-400 hover:bg-red-50" title="Eliminar"
                              (click)="$event.stopPropagation(); eliminar(inc.id)">
                        <span class="icon text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @empty {
                <tr><td colspan="8" class="py-12 text-center text-gray-400 text-sm">Sin registros para los filtros seleccionados</td></tr>
              }
            </tbody>
          </table>
        </div>
        @if (totalVisible() > 0) {
          <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span class="text-xs text-gray-500">{{ rangoInicio() + 1 }}–{{ rangoFin() }} de {{ totalVisible() }}</span>
            <div class="flex items-center gap-1">
              <button class="btn btn-icon" [disabled]="paginaVisible() === 1" (click)="irPagina(paginaVisible() - 1)">
                <span class="icon text-sm">chevron_left</span>
              </button>
              @for (p of paginasVisibles(); track p) {
                <button class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                        [ngClass]="p === paginaVisible() ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
                        (click)="irPagina(p)">{{ p }}</button>
              }
              <button class="btn btn-icon" [disabled]="paginaVisible() === totalPaginasVisible()" (click)="irPagina(paginaVisible() + 1)">
                <span class="icon text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Drawer detalle incidente -->
      @if (incidenteSel(); as inc) {
        <div class="fixed inset-0 z-30" (click)="selId.set(null)"></div>
        <div class="fixed inset-y-0 right-0 z-40 w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r">
          <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <span class="icon text-lg" [ngClass]="tipoColor(inc.tipo)">{{ tipoIcon(inc.tipo) }}</span>
                <span class="badge" [ngClass]="tipoBadge(inc.tipo)">{{ tipoLabel(inc.tipo) }}</span>
              </div>
              <div class="text-sm font-semibold text-gray-800 mt-1">{{ inc.alumno }}</div>
              <div class="text-xs text-gray-400">{{ inc.grado }} "{{ inc.seccion }}"</div>
            </div>
            <button class="btn btn-icon shrink-0" (click)="selId.set(null)">
              <span class="icon">close</span>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- Datos -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div class="text-gray-400 font-medium">Fecha</div>
                <div class="text-gray-700 font-medium">{{ inc.fecha }}</div>
              </div>
              <div>
                <div class="text-gray-400 font-medium">Lugar</div>
                <div class="text-gray-700">{{ inc.lugar }}</div>
              </div>
              <div>
                <div class="text-gray-400 font-medium">Reportado por</div>
                <div class="text-gray-700">{{ inc.reportadoPor }}</div>
              </div>
              <div>
                <div class="text-gray-400 font-medium">Estado</div>
                <span class="badge" [ngClass]="estadoBadge(inc.estado)">{{ estadoLabel(inc.estado) }}</span>
              </div>
            </div>
            <!-- Descripción -->
            <div>
              <div class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Descripci\u00f3n</div>
              <div class="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border border-gray-100">{{ inc.descripcion }}</div>
            </div>
            <!-- Medida -->
            <div>
              <div class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Medida disciplinaria</div>
              <div class="bg-amber-50 rounded-lg p-3 text-sm text-amber-800 border border-amber-100">{{ inc.medida }}</div>
            </div>
            <!-- Estado selector -->
            <div>
              <div class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Cambiar estado</div>
              <div class="flex gap-1 flex-wrap">
                @for (e of estadosOpts; track e.val) {
                  <button class="px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors"
                          [ngClass]="inc.estado === e.val ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'"
                          (click)="cambiarEstado(inc.id, e.val)">
                    {{ e.label }}
                  </button>
                }
              </div>
            </div>
            <!-- Notificación padre -->
            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div class="text-sm text-gray-700 font-medium flex items-center gap-2">
                <span class="icon text-base" [ngClass]="inc.notificadoPadre ? 'text-emerald-500' : 'text-gray-400'">
                  {{ inc.notificadoPadre ? 'mark_email_read' : 'mail_outline' }}
                </span>
                Padre notificado
              </div>
              <button class="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
                      [ngClass]="inc.notificadoPadre ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'"
                      (click)="toggleNotificacion(inc.id)">
                {{ inc.notificadoPadre ? 'Desmarcar' : 'Notificar' }}
              </button>
            </div>
            <!-- Observaciones -->
            <div>
              <div class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Observaciones adicionales</div>
              <textarea class="form-input text-sm w-full h-20 resize-none"
                        placeholder="Agregar observaciones..."
                        [ngModel]="inc.observaciones"
                        (ngModelChange)="updateObs(inc.id, $event)"></textarea>
            </div>
          </div>
          <div class="px-4 py-3 border-t border-gray-100 shrink-0">
            <button class="btn btn-primary w-full text-sm py-2" (click)="guardarDetalle(inc.id)">
              <span class="icon text-base">save</span> Guardar cambios
            </button>
          </div>
        </div>
      }
    </div>
  }

  <!-- ─────────── Vista: Por Alumno ─────────── -->
  @if (vista() === 'alumnos') {
    <div class="flex gap-5 items-start">
      <div class="flex-1 min-w-0 card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Alumno</th>
                <th class="w-24 text-center">Leves</th>
                <th class="w-24 text-center">Graves</th>
                <th class="w-28 text-center">Muy Graves</th>
                <th class="w-32 text-center">Reconocimientos</th>
                <th class="w-28 text-center">Nivel conducta</th>
                <th class="w-20">Detalle</th>
              </tr>
            </thead>
            <tbody>
              @for (res of resumen(); track res.alumnoId) {
                <tr class="cursor-pointer"
                    [ngClass]="selAlumnoId() === res.alumnoId ? 'bg-indigo-50' : ''"
                    (click)="abrirDetalleAlumno(res.alumnoId)">
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                        {{ res.alumno[0] }}{{ res.alumno.split(' ')[1]?.[0] ?? '' }}
                      </div>
                      <div>
                        <div class="font-medium text-gray-800 text-sm">{{ res.alumno }}</div>
                        <div class="text-xs text-gray-400">{{ res.grado }} "{{ res.seccion }}"</div>
                      </div>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="font-bold text-sm" [ngClass]="res.leves > 0 ? 'text-yellow-600' : 'text-gray-300'">{{ res.leves }}</span>
                  </td>
                  <td class="text-center">
                    <span class="font-bold text-sm" [ngClass]="res.graves > 0 ? 'text-orange-600' : 'text-gray-300'">{{ res.graves }}</span>
                  </td>
                  <td class="text-center">
                    <span class="font-bold text-sm" [ngClass]="res.muyGraves > 0 ? 'text-red-600' : 'text-gray-300'">{{ res.muyGraves }}</span>
                  </td>
                  <td class="text-center">
                    <span class="font-bold text-sm" [ngClass]="res.reconocimientos > 0 ? 'text-emerald-600' : 'text-gray-300'">{{ res.reconocimientos }}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge" [ngClass]="nivelBadge(res.nivel)">{{ nivelLabel(res.nivel) }}</span>
                  </td>
                  <td>
                    <button class="btn btn-icon" (click)="$event.stopPropagation(); abrirDetalleAlumno(res.alumnoId)">
                      <span class="icon text-sm">chevron_right</span>
                    </button>
                  </td>
                </tr>
              }
              @empty {
                <tr><td colspan="7" class="py-12 text-center text-gray-400 text-sm">Sin alumnos para los filtros seleccionados</td></tr>
              }
            </tbody>
          </table>
        </div>
        @if (totalVisible() > 0) {
          <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span class="text-xs text-gray-500">{{ rangoInicio() + 1 }}–{{ rangoFin() }} de {{ totalVisible() }}</span>
            <div class="flex items-center gap-1">
              <button class="btn btn-icon" [disabled]="paginaVisible() === 1" (click)="irPagina(paginaVisible() - 1)">
                <span class="icon text-sm">chevron_left</span>
              </button>
              @for (p of paginasVisibles(); track p) {
                <button class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                        [ngClass]="p === paginaVisible() ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
                        (click)="irPagina(p)">{{ p }}</button>
              }
              <button class="btn btn-icon" [disabled]="paginaVisible() === totalPaginasVisible()" (click)="irPagina(paginaVisible() + 1)">
                <span class="icon text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Drawer alumno -->
      @if (alumnoSelDatos(); as datos) {
        <div class="fixed inset-0 z-30" (click)="selAlumnoId.set(null)"></div>
        <div class="fixed inset-y-0 right-0 z-40 w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r">
          <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {{ datos.res.alumno[0] }}{{ datos.res.alumno.split(' ')[1]?.[0] ?? '' }}
              </div>
              <div>
                <div class="font-semibold text-gray-800 text-sm">{{ datos.res.alumno }}</div>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-xs text-gray-400">{{ datos.res.grado }} "{{ datos.res.seccion }}"</span>
                  <span class="badge text-xs" [ngClass]="nivelBadge(datos.res.nivel)">{{ nivelLabel(datos.res.nivel) }}</span>
                </div>
              </div>
            </div>
            <button class="btn btn-icon shrink-0" (click)="selAlumnoId.set(null)">
              <span class="icon">close</span>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- Resumen -->
            <div class="grid grid-cols-2 gap-3">
              @for (stat of alumnoStats(datos.res); track stat.label) {
                <div class="rounded-xl p-3 text-center border" [ngClass]="stat.bg">
                  <div class="text-xl font-extrabold" [ngClass]="stat.color">{{ stat.val }}</div>
                  <div class="text-xs font-medium mt-0.5" [ngClass]="stat.color">{{ stat.label }}</div>
                </div>
              }
            </div>
            <!-- Barra visual -->
            <div>
              <div class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Nivel de conducta</div>
              <div class="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div class="h-full rounded-full transition-all"
                     [ngClass]="nivelBar(datos.res.nivel)"
                     [style.width]="nivelPct(datos.res) + '%'"></div>
              </div>
              <div class="flex justify-between text-xs text-gray-400 mt-1">
                <span>Deficiente</span><span>Excelente</span>
              </div>
            </div>
            <!-- Historial -->
            <div>
              <div class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Historial de incidentes</div>
              <div class="space-y-2">
                @for (inc of datos.incidentes; track inc.id) {
                  <div class="flex items-start gap-2.5 p-2.5 rounded-lg border border-l-4"
                       [ngClass]="inc.tipo === 'reconocimiento' ? 'bg-emerald-50 border-emerald-100 border-l-emerald-500' : inc.tipo === 'falta_muy_grave' ? 'bg-red-100/50 border-red-400 border-l-red-700 ring-1 ring-red-200/80' : inc.tipo === 'falta_grave' ? 'bg-orange-50 border-orange-300 border-l-orange-500' : 'bg-yellow-50 border-yellow-200 border-l-yellow-400'">
                    <span class="icon text-base shrink-0 mt-0.5" [ngClass]="tipoColor(inc.tipo)">{{ tipoIcon(inc.tipo) }}</span>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-semibold text-gray-700">{{ tipoLabel(inc.tipo) }}</div>
                      <div class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ inc.descripcion }}</div>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs text-gray-400">{{ inc.fecha }}</span>
                        <span class="badge text-xs" [ngClass]="estadoBadge(inc.estado)">{{ estadoLabel(inc.estado) }}</span>
                      </div>
                    </div>
                  </div>
                }
                @empty {
                  <div class="text-center text-sm text-gray-400 py-4">Sin incidentes registrados</div>
                }
              </div>
            </div>
          </div>
          <div class="px-4 py-3 border-t border-gray-100 shrink-0">
            <button class="btn btn-primary w-full text-sm py-2" (click)="abrirDrawerRegistroParaAlumno(datos.res.alumnoId)">
              <span class="icon text-base">add</span> Registrar incidente
            </button>
          </div>
        </div>
      }
    </div>
  }

</div>

<!-- ─── Drawer registrar incidente ─── -->
@if (drawerRegistroVisible()) {
  <div class="fixed inset-0 z-50 bg-black/30" (click)="cerrarDrawerRegistro()"></div>
  <aside class="fixed inset-y-0 right-0 z-[60] w-full max-w-md min-w-0 bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r">
    <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
      <div>
        <h3 class="font-bold text-gray-800 text-lg">Registrar Incidente</h3>
        <p class="text-xs text-gray-400 mt-0.5">Campos obligatorios marcados con *</p>
      </div>
      <button class="btn btn-icon shrink-0" (click)="cerrarDrawerRegistro()">
        <span class="icon">close</span>
      </button>
    </div>
    <div class="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4 min-w-0">
      <!-- Alumno -->
      <div class="min-w-0">
        <label class="form-label">Alumno <span class="text-red-400">*</span></label>
        @if (alumnoModalSel(); as sel) {
          <div class="flex items-center justify-between p-3 rounded-lg border border-indigo-200 bg-indigo-50"
               [ngClass]="claseCampo('alumnoId')">
            <div>
              <div class="font-medium text-gray-800 text-sm">{{ sel.nombre }}</div>
              <div class="text-xs text-gray-500">{{ sel.grado }} "{{ sel.seccion }}"</div>
            </div>
            <button type="button" class="btn btn-icon text-gray-400 hover:text-gray-600" title="Cambiar alumno"
                    (click)="limpiarAlumnoModal()">
              <span class="icon text-sm">close</span>
            </button>
          </div>
        } @else {
          <div class="space-y-2">
            <div class="relative w-full min-w-0">
              <span class="icon absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none z-10">search</span>
              <input class="form-input pl-9 w-full min-w-0 block" type="text"
                     placeholder="Buscar alumno por nombre..."
                     autocomplete="off"
                     [ngClass]="claseCampo('alumnoId')"
                     [ngModel]="fBusquedaAlumno()"
                     (ngModelChange)="onBusquedaAlumnoChange($event)"
                     (focus)="alumnoDropdownAbierto.set(true)"
                     (blur)="onCampoBlur('alumnoId')">
              @if (alumnoDropdownAbierto()) {
                <div class="absolute z-20 top-full left-0 right-0 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg overflow-hidden">
                  <div class="max-h-52 overflow-y-auto">
                    @for (al of alumnosModalFiltrados(); track al.id) {
                      <button type="button"
                              class="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-0 transition-colors"
                              (mousedown)="seleccionarAlumnoModal(al.id); $event.preventDefault()">
                        <div class="font-medium text-gray-800 text-sm">{{ al.nombre }}</div>
                        <div class="text-xs text-gray-400">{{ al.grado }} "{{ al.seccion }}"</div>
                      </button>
                    } @empty {
                      <div class="px-3 py-6 text-center text-sm text-gray-400">No se encontraron alumnos</div>
                    }
                  </div>
                  @if (alumnosModalFiltrados().length > 0) {
                    <div class="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
                      {{ alumnosModalFiltrados().length }} alumno(s) · clic para seleccionar
                    </div>
                  }
                </div>
              }
            </div>
            <select class="form-input w-full" [ngModel]="fGradoAlumnoModal()" (ngModelChange)="onGradoAlumnoModalChange($event)">
              <option value="todos">Todos los grados</option>
              @for (g of gradosModal(); track g) { <option [value]="g">{{ g }}</option> }
            </select>
          </div>
        }
        @if (campoError('alumnoId'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>
      <!-- Tipo y Estado -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">Tipo <span class="text-red-400">*</span></label>
          <select class="form-input" [ngClass]="claseCampo('tipo')"
                  [ngModel]="fTipoModal()"
                  (ngModelChange)="onCampoFormChange('tipo', $event)"
                  (blur)="onCampoBlur('tipo')">
            @for (t of tiposOpts; track t.val) { <option [value]="t.val">{{ t.label }}</option> }
          </select>
          @if (campoError('tipo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div>
          <label class="form-label">Estado</label>
          <select class="form-input" [ngModel]="fEstadoModal()" (ngModelChange)="fEstadoModal.set($event)">
            @for (e of estadosOpts; track e.val) { <option [value]="e.val">{{ e.label }}</option> }
          </select>
        </div>
      </div>
      <!-- Descripción -->
      <div>
        <label class="form-label">Descripci\u00f3n <span class="text-red-400">*</span></label>
        <textarea class="form-input h-24 resize-none" placeholder="Describe el incidente o reconocimiento..."
                  [ngClass]="claseCampo('descripcion')"
                  [ngModel]="fDescripcion()"
                  (ngModelChange)="onCampoFormChange('descripcion', $event)"
                  (blur)="onCampoBlur('descripcion')"></textarea>
        @if (campoError('descripcion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>
      <!-- Fecha y Lugar -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">Fecha <span class="text-red-400">*</span></label>
          <input class="form-input" type="text" placeholder="DD/MM/AAAA"
                 [ngClass]="claseCampo('fecha')"
                 [ngModel]="fFecha()"
                 (ngModelChange)="onCampoFormChange('fecha', $event)"
                 (blur)="onCampoBlur('fecha')">
          @if (campoError('fecha'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
        <div>
          <label class="form-label">Lugar</label>
          <select class="form-input" [ngClass]="claseCampo('lugar')"
                  [ngModel]="fLugar()"
                  (ngModelChange)="onCampoFormChange('lugar', $event)"
                  (blur)="onCampoBlur('lugar')">
            @for (l of lugares; track l) { <option [value]="l">{{ l }}</option> }
          </select>
          @if (campoError('lugar'); as err) { <p class="form-error mt-1">{{ err }}</p> }
        </div>
      </div>
      <!-- Medida y Notificar -->
      <div>
        <label class="form-label">Medida disciplinaria / reconocimiento</label>
        <input class="form-input" type="text" placeholder="Medida adoptada..."
               [ngClass]="claseCampo('medida')"
               [ngModel]="fMedida()"
               (ngModelChange)="onCampoFormChange('medida', $event)"
               (blur)="onCampoBlur('medida')">
        @if (campoError('medida'); as err) { <p class="form-error mt-1">{{ err }}</p> }
      </div>
      <label class="flex items-center gap-3 cursor-pointer">
        <button type="button" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                [ngClass]="fNotificar() ? 'bg-emerald-500' : 'bg-gray-300'"
                (click)="fNotificar.set(!fNotificar())">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                [ngClass]="fNotificar() ? 'translate-x-6' : 'translate-x-1'"></span>
        </button>
        <span class="text-sm text-gray-700">Notificar al padre de familia</span>
      </label>
      @if (errorForm()) {
        <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span class="icon icon-sm text-red-500">error_outline</span> {{ errorForm() }}
        </div>
      }
    </div>
    <div class="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
      <button class="btn btn-ghost flex-1" (click)="cerrarDrawerRegistro()">Cancelar</button>
      <button class="btn btn-primary flex-1"
              [disabled]="!puedeGuardarForm() || saving()"
              [title]="puedeGuardarForm() ? '' : 'Completa alumno, tipo, descripción y fecha válida'"
              (click)="guardar()">
        <span class="icon text-base">save</span> Guardar
      </button>
    </div>
  </aside>
}
  `,
})
export class ConductaComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly conductaService = inject(ConductaService);
  private readonly _tenantReloadReady = setupTenantReload(() => this.cargarDatos());
  readonly loading = this.conductaService.loading;
  readonly saving = this.conductaService.saving;

  ngOnInit() {
    this.layout.setTitle('Control de Conducta');
    this.cargarDatos();
    markTenantReloadReady(this._tenantReloadReady);
  }

  // ── State ──
  readonly POR_PAGINA = 10;
  incidentes   = signal<Incidente[]>([]);
  resumen      = signal<ResumenAlumno[]>([]);
  kpis         = signal<ConductKpis>({ total: 0, leves: 0, graves: 0, muyGraves: 0, reconocimientos: 0 });
  grados       = signal<string[]>([]);
  total        = signal(0);
  paginaIncidentes = signal(1);
  totalPaginasIncidentes = signal(1);
  resumenTotal = signal(0);
  paginaAlumnos = signal(1);
  totalPaginasAlumnos = signal(1);
  alumnos      = signal<AlumnoConducta[]>([]);
  alumnoIncidentes = signal<Incidente[]>([]);
  loadError    = signal('');
  vista        = signal<'incidentes' | 'alumnos'>('incidentes');
  busqueda     = signal('');
  filtroGrado  = signal('todos');
  filtroTipo   = signal('todos');
  filtroEstado = signal('todos');
  filtroNivel  = signal('todos');
  selId        = signal<number | null>(null);
  selAlumnoId  = signal<number | null>(null);
  drawerRegistroVisible = signal(false);
  toast        = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  private busquedaTimer: ReturnType<typeof setTimeout> | null = null;

  // Form modal
  fAlumnoId   = signal(0);
  fBusquedaAlumno = signal('');
  fGradoAlumnoModal = signal('todos');
  fTipoModal  = signal<TipoIncidente>('falta_leve');
  fEstadoModal = signal<EstadoIncidente>('pendiente');
  fDescripcion = signal('');
  fFecha      = signal(formatFechaHoy());
  fLugar      = signal('Salón de clase');
  fMedida     = signal('');
  fNotificar  = signal(false);
  alumnoDropdownAbierto = signal(false);
  private alumnoDropdownTimer: ReturnType<typeof setTimeout> | null = null;

  fieldErrors = signal<ErroresCampoIncidente>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);
  errorForm = signal('');

  readonly puedeGuardarForm = computed(() =>
    incidenteFormularioMinimoListo({
      alumnoId: this.fAlumnoId(),
      tipo: this.fTipoModal(),
      estado: this.fEstadoModal(),
      descripcion: this.fDescripcion(),
      fecha: this.fFecha(),
      lugar: this.fLugar(),
      medida: this.fMedida(),
    }),
  );

  readonly lugares = LUGARES;
  readonly tiposOpts = [
    { val: 'falta_leve',      label: 'Falta Leve'      },
    { val: 'falta_grave',     label: 'Falta Grave'     },
    { val: 'falta_muy_grave', label: 'Falta Muy Grave' },
    { val: 'reconocimiento',  label: 'Reconocimiento'  },
  ] as const;
  readonly estadosOpts = [
    { val: 'pendiente',  label: 'Pendiente'  },
    { val: 'en_proceso', label: 'En Proceso' },
    { val: 'resuelto',   label: 'Resuelto'   },
  ] as const;
  readonly filtroNivelOpts = [
    { val: 'todos',      label: 'Todos'       },
    { val: 'excelente',  label: 'Excelente'   },
    { val: 'bueno',      label: 'Bueno'       },
    { val: 'regular',    label: 'Regular'     },
    { val: 'deficiente', label: 'Deficiente'  },
  ] as const;

  // ── Computed ──
  readonly totalVisible = computed(() =>
    this.vista() === 'alumnos' ? this.resumenTotal() : this.total(),
  );
  readonly paginaVisible = computed(() =>
    this.vista() === 'alumnos' ? this.paginaAlumnos() : this.paginaIncidentes(),
  );
  readonly totalPaginasVisible = computed(() =>
    this.vista() === 'alumnos' ? this.totalPaginasAlumnos() : this.totalPaginasIncidentes(),
  );
  readonly rangoInicio = computed(() => (this.paginaVisible() - 1) * this.POR_PAGINA);
  readonly rangoFin = computed(() =>
    Math.min(this.rangoInicio() + this.POR_PAGINA, this.totalVisible()),
  );
  readonly paginasVisibles = computed(() => {
    const total = this.totalPaginasVisible();
    const actual = this.paginaVisible();
    const ventana = 5;
    let start = Math.max(1, actual - Math.floor(ventana / 2));
    const end = Math.min(total, start + ventana - 1);
    start = Math.max(1, end - ventana + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  incidenteSel = computed(() => {
    const id = this.selId(); if (!id) return null;
    return this.incidentes().find(i => i.id === id) ?? null;
  });

  alumnoSelDatos = computed(() => {
    const id = this.selAlumnoId();
    if (!id) return null;
    const res = this.resumen().find((r) => r.alumnoId === id);
    if (!res) return null;
    return { res, incidentes: this.alumnoIncidentes() };
  });

  hayFiltros = computed(() =>
    this.busqueda() !== '' || this.filtroGrado() !== 'todos' ||
    this.filtroTipo() !== 'todos' || this.filtroEstado() !== 'todos' || this.filtroNivel() !== 'todos'
  );

  gradosModal = computed(() =>
    [...new Set(this.alumnos().map((a) => a.grado))].sort((a, b) => a.localeCompare(b, 'es')),
  );

  alumnosModalFiltrados = computed(() => {
    const q = this.fBusquedaAlumno().trim().toLowerCase();
    const grado = this.fGradoAlumnoModal();
    return this.alumnos().filter((a) => {
      if (grado !== 'todos' && a.grado !== grado) return false;
      if (!q) return true;
      return a.nombre.toLowerCase().includes(q);
    });
  });

  alumnoModalSel = computed(() => {
    const id = this.fAlumnoId();
    if (!id) return null;
    return this.alumnos().find((a) => a.id === id) ?? null;
  });

  // ── Display helpers ──
  tipoBadge(t: TipoIncidente)    { return 'badge ' + TIPO_CFG[t].badge; }
  tipoLabel(t: TipoIncidente)    { return TIPO_CFG[t].label; }
  tipoIcon(t: TipoIncidente)     { return TIPO_CFG[t].icon; }
  tipoColor(t: TipoIncidente)    { return TIPO_CFG[t].color; }
  estadoBadge(e: EstadoIncidente){ return 'badge ' + ESTADO_CFG[e].badge; }
  estadoLabel(e: EstadoIncidente){ return ESTADO_CFG[e].label; }
  nivelBadge(n: NivelConducta)   { return 'badge ' + NIVEL_CFG[n].badge; }
  nivelLabel(n: NivelConducta)   { return NIVEL_CFG[n].label; }
  nivelBar(n: NivelConducta)     { return NIVEL_CFG[n].bar; }
  nivelPct(r: ResumenAlumno)     {
    const n = r.nivel;
    return n === 'excelente' ? 95 : n === 'bueno' ? 70 : n === 'regular' ? 40 : 15;
  }

  alumnoStats(r: ResumenAlumno) {
    return [
      { val: r.leves,           label: 'Leves',       bg: 'bg-yellow-50 border-yellow-100',  color: 'text-yellow-600'  },
      { val: r.graves,          label: 'Graves',      bg: 'bg-orange-50 border-orange-100',  color: 'text-orange-600'  },
      { val: r.muyGraves,       label: 'Muy Graves',  bg: 'bg-red-100/50 border-red-400 ring-1 ring-red-200/80', color: 'text-red-800'     },
      { val: r.reconocimientos, label: 'Reconoc.',    bg: 'bg-emerald-50 border-emerald-100',color: 'text-emerald-600' },
    ];
  }

  // ── Actions ──
  cargarDatos() {
    this.loadError.set('');
    this.conductaService.loadStudents().subscribe({
      next: (items) => this.alumnos.set(items),
      error: () => this.loadError.set('No se pudieron cargar los estudiantes.'),
    });
    this.cargarPagina(1);
  }

  private filtrosActuales() {
    return {
      busqueda: this.busqueda(),
      grado: this.filtroGrado(),
      tipo: this.filtroTipo(),
      estado: this.filtroEstado(),
      nivel: this.filtroNivel(),
      page: this.paginaIncidentes(),
      pageSize: this.POR_PAGINA,
      resumenPage: this.paginaAlumnos(),
      resumenPageSize: this.POR_PAGINA,
    };
  }

  cargarPagina(page?: number) {
    const esAlumnos = this.vista() === 'alumnos';
    const nextPage = page ?? (esAlumnos ? this.paginaAlumnos() : this.paginaIncidentes());
    if (esAlumnos) {
      this.paginaAlumnos.set(nextPage);
    } else {
      this.paginaIncidentes.set(nextPage);
    }
    this.loadError.set('');
    this.conductaService.loadPage({ ...this.filtrosActuales() }).subscribe({
      next: (data) => {
        this.incidentes.set(data.items);
        this.kpis.set(data.kpis);
        this.resumen.set(data.resumen);
        this.grados.set(data.grados);
        this.total.set(data.total);
        this.paginaIncidentes.set(data.page);
        this.totalPaginasIncidentes.set(data.totalPages);
        this.resumenTotal.set(data.resumenTotal);
        this.paginaAlumnos.set(data.resumenPage);
        this.totalPaginasAlumnos.set(data.resumenTotalPages);
      },
      error: () => this.loadError.set('No se pudieron cargar los incidentes de conducta.'),
    });
  }

  cambiarVista(v: 'incidentes' | 'alumnos') {
    if (this.vista() === v) return;
    this.vista.set(v);
    this.selId.set(null);
    this.selAlumnoId.set(null);
    this.cargarPagina(1);
  }

  irPagina(page: number) {
    if (page < 1 || page > this.totalPaginasVisible()) return;
    this.cargarPagina(page);
  }

  onBusquedaChange(val: string) {
    this.busqueda.set(val);
    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
    this.busquedaTimer = setTimeout(() => this.cargarPagina(1), 300);
  }

  onFiltroGradoChange(val: string) {
    this.filtroGrado.set(val);
    this.cargarPagina(1);
  }

  onFiltroTipoChange(val: string) {
    this.filtroTipo.set(val);
    this.cargarPagina(1);
  }

  onFiltroEstadoChange(val: string) {
    this.filtroEstado.set(val);
    this.cargarPagina(1);
  }

  onFiltroNivelChange(val: string) {
    this.filtroNivel.set(val);
    this.cargarPagina(1);
  }

  abrirDetalleAlumno(id: number) {
    this.selAlumnoId.set(id);
    this.alumnoIncidentes.set([]);
    this.conductaService.loadStudentIncidents(id).subscribe({
      next: (items) => this.alumnoIncidentes.set(items),
      error: () => this.mostrarToast('No se pudo cargar el historial del alumno.', 'err'),
    });
  }

  limpiarFiltros() {
    this.busqueda.set('');
    this.filtroGrado.set('todos');
    this.filtroTipo.set('todos');
    this.filtroEstado.set('todos');
    this.filtroNivel.set('todos');
    this.cargarPagina(1);
  }

  cambiarEstado(id: number, estado: string) {
    this.conductaService.update(id, { estado: estado as EstadoIncidente }).subscribe({
      next: () => {
        this.cargarPagina(this.paginaIncidentes());
        this.mostrarToast('Estado actualizado.', 'ok');
      },
      error: () => this.mostrarToast('No se pudo actualizar el estado.', 'err'),
    });
  }

  toggleNotificacion(id: number) {
    const current = this.incidentes().find((i) => i.id === id);
    if (!current) return;
    this.conductaService
      .update(id, { notificadoPadre: !current.notificadoPadre })
      .subscribe({
        next: (updated) => {
          this.incidentes.update((list) =>
            list.map((i) => (i.id === id ? updated : i)),
          );
        },
        error: () => this.mostrarToast('No se pudo actualizar la notificación.', 'err'),
      });
  }

  updateObs(id: number, val: string) {
    this.incidentes.update((list) =>
      list.map((i) => (i.id === id ? { ...i, observaciones: val } : i)),
    );
  }

  guardarDetalle(id: number) {
    const current = this.incidentes().find((i) => i.id === id);
    if (!current) return;
    this.conductaService
      .update(id, {
        estado: current.estado,
        notificadoPadre: current.notificadoPadre,
        observaciones: current.observaciones,
      })
      .subscribe({
        next: () => {
          this.cargarPagina(this.paginaIncidentes());
          this.mostrarToast('Cambios guardados correctamente.', 'ok');
          this.selId.set(null);
        },
        error: () => this.mostrarToast('No se pudieron guardar los cambios.', 'err'),
      });
  }

  eliminar(id: number) {
    this.conductaService.remove(id).subscribe({
      next: () => {
        if (this.selId() === id) this.selId.set(null);
        const page = this.incidentes().length === 1 && this.paginaIncidentes() > 1
          ? this.paginaIncidentes() - 1
          : this.paginaIncidentes();
        this.cargarPagina(page);
        this.mostrarToast('Incidente eliminado.', 'ok');
      },
      error: () => this.mostrarToast('No se pudo eliminar el incidente.', 'err'),
    });
  }

  abrirDrawerRegistro() {
    this.selId.set(null);
    this.selAlumnoId.set(null);
    this.resetForm();
    this.drawerRegistroVisible.set(true);
  }

  abrirDrawerRegistroParaAlumno(id: number) {
    this.resetForm();
    this.fAlumnoId.set(id);
    this.selAlumnoId.set(null);
    this.drawerRegistroVisible.set(true);
  }

  cerrarDrawerRegistro() {
    this.drawerRegistroVisible.set(false);
  }

  seleccionarAlumnoModal(id: number) {
    this.fAlumnoId.set(id);
    this.fBusquedaAlumno.set('');
    this.fGradoAlumnoModal.set('todos');
    this.alumnoDropdownAbierto.set(false);
    this.onCampoBlur('alumnoId');
  }

  limpiarAlumnoModal() {
    this.fAlumnoId.set(0);
    this.alumnoDropdownAbierto.set(true);
    this.onCampoFormChange('alumnoId');
  }

  onBusquedaAlumnoChange(val: string) {
    this.fBusquedaAlumno.set(val);
    this.alumnoDropdownAbierto.set(true);
  }

  onGradoAlumnoModalChange(val: string) {
    this.fGradoAlumnoModal.set(val);
    this.alumnoDropdownAbierto.set(true);
  }

  cerrarDropdownAlumno() {
    if (this.alumnoDropdownTimer) clearTimeout(this.alumnoDropdownTimer);
    this.alumnoDropdownTimer = setTimeout(() => this.alumnoDropdownAbierto.set(false), 150);
  }

  resetForm() {
    this.fAlumnoId.set(0);
    this.fBusquedaAlumno.set('');
    this.fGradoAlumnoModal.set('todos');
    this.alumnoDropdownAbierto.set(false);
    this.fTipoModal.set('falta_leve');
    this.fEstadoModal.set('pendiente');
    this.fDescripcion.set('');
    this.fFecha.set(formatFechaHoy());
    this.fLugar.set('Salón de clase');
    this.fMedida.set('');
    this.fNotificar.set(false);
    this.resetValidacionForm();
  }

  private resetValidacionForm(): void {
    this.fieldErrors.set({});
    this.camposTocados.set({});
    this.intentoGuardar.set(false);
    this.errorForm.set('');
  }

  private valoresFormIncidente() {
    return {
      alumnoId: this.fAlumnoId(),
      tipo: this.fTipoModal(),
      estado: this.fEstadoModal(),
      descripcion: this.fDescripcion(),
      fecha: this.fFecha(),
      lugar: this.fLugar(),
      medida: this.fMedida(),
    };
  }

  onCampoBlur(key: string): void {
    if (key === 'alumnoId') {
      this.cerrarDropdownAlumno();
      setTimeout(() => {
        this.camposTocados.update((t) => ({ ...t, [key]: true }));
        this.validarCampoEnVivo(key);
      }, 160);
      return;
    }
    this.camposTocados.update((t) => ({ ...t, [key]: true }));
    this.validarCampoEnVivo(key);
  }

  onCampoFormChange(key: string, value?: string | TipoIncidente): void {
    if (value !== undefined) {
      switch (key) {
        case 'tipo':
          this.fTipoModal.set(value as TipoIncidente);
          break;
        case 'descripcion':
          this.fDescripcion.set(String(value));
          break;
        case 'fecha':
          this.fFecha.set(String(value));
          break;
        case 'lugar':
          this.fLugar.set(String(value));
          break;
        case 'medida':
          this.fMedida.set(String(value));
          break;
      }
    }

    if (this.camposTocados()[key] || this.intentoGuardar() || this.fieldErrors()[key]) {
      this.validarCampoEnVivo(key);
    } else {
      this.quitarErrorCampo(key);
    }
  }

  private validarCamposMinimosEnVivo(): void {
    for (const key of ['alumnoId', 'tipo', 'descripcion', 'fecha']) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoIncidente(this.valoresFormIncidente(), key);
    if (err) {
      this.fieldErrors.update((errors) => ({ ...errors, [key]: err }));
    } else {
      this.quitarErrorCampo(key);
    }
  }

  private quitarErrorCampo(key: string): void {
    if (!this.fieldErrors()[key]) return;
    this.fieldErrors.update((errors) => {
      const next = { ...errors };
      delete next[key];
      return next;
    });
    if (!Object.keys(this.fieldErrors()).length) this.errorForm.set('');
  }

  campoError(key: string): string | null {
    if (!this.camposTocados()[key] && !this.intentoGuardar()) return null;
    return this.fieldErrors()[key] ?? null;
  }

  claseCampo(key: string): string {
    return this.campoError(key) ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : '';
  }

  guardar() {
    this.intentoGuardar.set(true);
    if (!this.puedeGuardarForm()) {
      this.validarCamposMinimosEnVivo();
      this.errorForm.set('Completa los campos obligatorios del incidente.');
      return;
    }

    const errors = validarIncidenteForm(this.valoresFormIncidente());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm.set(primerErrorIncidente(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    this.errorForm.set('');
    const tipo = this.fTipoModal();
    this.conductaService
      .create({
        studentId: this.fAlumnoId(),
        tipo,
        descripcion: this.fDescripcion(),
        fecha: this.fFecha(),
        lugar: this.fLugar(),
        reportadoPor: 'Administrador',
        estado: this.fEstadoModal(),
        medida: this.fMedida() || MEDIDAS[tipo][0],
        notificadoPadre: this.fNotificar(),
      })
      .subscribe({
        next: () => {
          this.cerrarDrawerRegistro();
          this.cargarPagina(1);
          this.mostrarToast('Incidente registrado correctamente.', 'ok');
        },
        error: () => this.mostrarToast('No se pudo registrar el incidente.', 'err'),
      });
  }

  mostrarToast(msg: string, tipo: 'ok' | 'err') {
    this.toast.set({ msg, tipo });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
