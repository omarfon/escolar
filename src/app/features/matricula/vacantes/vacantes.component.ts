import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import { OverlayPortalDirective } from '../../../core/overlay/overlay-portal.directive';
import { SalonesService } from '../maestros/salones/salones.service';
import { EsperaService } from '../espera/espera.service';
import { EsperaItem, EstadoEspera } from '../espera/espera.model';

// ─── Types ───────────────────────────────────────────────────────────────────
type Nivel        = 'Inicial' | 'Primaria' | 'Secundaria';
type EstadoVac    = 'disponible' | 'completa' | 'sobreocupada' | 'reservada';
type Prioridad    = 'alta' | 'media' | 'baja';

interface Vacante {
  id: number; anio: number; nivel: Nivel;
  grado: string; seccion: string;
  capacidad: number; matriculados: number;
  pendientesContinuidad: number;
  disponibles: number;
  esIngresante: boolean;
  esReservada: boolean;
}

interface GradoGroup  { grado: string; secciones: Vacante[]; }
interface NivelGroup  { nivel: Nivel; icon: string; gradoGroups: GradoGroup[]; totalCap: number; totalMat: number; totalDisp: number; }

// ─── Component ───────────────────────────────────────────────────────────────
@Component({
  selector: 'app-vacantes',
  standalone: true,
  imports: [FormsModule, NgClass, TitleCasePipe, RouterLink, OverlayPortalDirective],
  template: `
<div class="space-y-5">

  <!-- ── HEADER ─────────────────────────────────────────────── -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Gestión de Vacantes</h2>
      <p class="text-sm text-gray-400 mt-0.5">Vacantes = Aforo (maestro salones) − Matriculados · A.E. <span class="font-semibold text-indigo-600">2026</span></p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <a routerLink="/maestros/salones" class="btn btn-secondary text-sm">
        <span class="icon icon-sm">tune</span> Maestros · Salones
      </a>
      <button class="btn btn-secondary text-sm" (click)="cargarVacantes()" [disabled]="cargando()">
        <span class="icon icon-sm">refresh</span> Actualizar
      </button>
      <button class="btn btn-secondary text-sm" (click)="showToast('Exportando reporte de vacantes...','info')">
        <span class="icon icon-sm">download</span> Exportar
      </button>
    </div>
  </div>

  <!-- ── KPI CARDS ──────────────────────────────────────────── -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
        <span class="icon text-indigo-600">business</span>
      </div>
      <div>
        <p class="text-xs text-gray-400 font-medium">Capacidad Total</p>
        <p class="text-2xl font-bold text-gray-900">{{ totalCapacidad() }}</p>
        <p class="text-[10px] text-gray-400">{{ _vacantes().length }} secciones</p>
      </div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
        <span class="icon text-blue-600">person</span>
      </div>
      <div>
        <p class="text-xs text-gray-400 font-medium">Plazas Ocupadas</p>
        <p class="text-2xl font-bold text-blue-700">{{ totalOcupadas() }}</p>
        <p class="text-[10px] text-gray-400">{{ pctGlobal() }}% ocupación</p>
      </div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
        <span class="icon text-green-600">event_available</span>
      </div>
      <div>
        <p class="text-xs text-gray-400 font-medium">Plazas Disponibles</p>
        <p class="text-2xl font-bold text-green-700">{{ totalDisponibles() }}</p>
        <p class="text-[10px] text-gray-400">En {{ seccionesDisp() }} secciones</p>
      </div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
        <span class="icon text-rose-500">warning</span>
      </div>
      <div>
        <p class="text-xs text-gray-400 font-medium">Secciones Llenas</p>
        <p class="text-2xl font-bold text-rose-600">{{ seccionesLlenas() }}</p>
        <p class="text-[10px] text-gray-400">{{ sobreocupadas() }} sobreocupadas</p>
      </div>
    </div>
  </div>

  <!-- ── ALERTA REGLAS ──────────────────────────────────────── -->
  @if (sobreocupadas() > 0) {
    <div class="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-800 animate-fade-in">
      <span class="icon text-red-500 shrink-0" style="font-size:20px">error</span>
      <p><strong>RN-001 · Alerta:</strong> {{ sobreocupadas() }} sección{{ sobreocupadas() !== 1 ? 'es' : '' }} sobreocupada{{ sobreocupadas() !== 1 ? 's' : '' }} — capacidad excedida. Revisar antes de generar nuevas matrículas.</p>
    </div>
  }

  <!-- ── TABS ───────────────────────────────────────────────── -->
  <div class="tabs">
    <button class="tab" [class.tab-active]="tab() === 'general'" (click)="tab.set('general')">
      <span class="icon icon-sm">table_chart</span> Vista General
    </button>
    <button class="tab" [class.tab-active]="tab() === 'config'" (click)="tab.set('config')">
      <span class="icon icon-sm">tune</span> Configurar
    </button>
    <button class="tab" [class.tab-active]="tab() === 'espera'" (click)="setTab('espera')">
      <span class="icon icon-sm">hourglass_top</span> Lista de Espera
      @if (_espera().filter(e => e.vacanteDisponible && e.estado !== 'asignado').length > 0) {
        <span class="ml-1.5 px-1.5 py-px text-[10px] font-bold bg-green-500 text-white rounded-full leading-none">
          {{ _espera().filter(e => e.vacanteDisponible && e.estado !== 'asignado').length }}
        </span>
      }
    </button>
  </div>

  <!-- ══════════ TAB: VISTA GENERAL ══════════ -->
  @if (tab() === 'general') {
    <div class="space-y-4 animate-fade-in">
      <!-- Filtro nivel -->
      <div class="flex items-center gap-3">
        <span class="text-xs font-medium text-gray-500">Filtrar por nivel:</span>
        @for (n of ['Todos','Inicial','Primaria','Secundaria']; track n) {
          <button class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
            [ngClass]="filtroNivel() === n
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'"
            (click)="filtroNivel.set(n)">
            {{ n }}
          </button>
        }
      </div>

      <!-- Nivel groups -->
      @for (ng of nivelGroups(); track ng.nivel) {
        <div class="space-y-0">
          <!-- Nivel header -->
          <button class="w-full flex items-center gap-3 px-4 py-3 rounded-t-xl border border-b-0 bg-white hover:bg-gray-50 transition-colors"
            [ngClass]="nivelExpanded().has(ng.nivel) ? 'rounded-t-xl' : 'rounded-xl border-b'"
            (click)="toggleNivel(ng.nivel)">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              [ngClass]="ng.nivel === 'Inicial' ? 'bg-purple-100' : ng.nivel === 'Primaria' ? 'bg-blue-100' : 'bg-indigo-100'">
              <span class="icon text-base" [ngClass]="ng.nivel === 'Inicial' ? 'text-purple-600' : ng.nivel === 'Primaria' ? 'text-blue-600' : 'text-indigo-600'">{{ ng.icon }}</span>
            </div>
            <span class="font-bold text-gray-800 text-base">{{ ng.nivel }}</span>
            <div class="flex items-center gap-4 ml-4 text-xs text-gray-400">
              <span>Cap: <span class="font-semibold text-gray-700">{{ ng.totalCap }}</span></span>
              <span>Ocup: <span class="font-semibold text-gray-700">{{ ng.totalMat }}</span></span>
              <span>Disp: <span class="font-semibold" [ngClass]="ng.totalDisp > 0 ? 'text-green-600' : 'text-red-500'">{{ ng.totalDisp }}</span></span>
            </div>
            <!-- Progress mini bar -->
            <div class="flex-1 flex items-center gap-2 mx-4">
              <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all"
                  [ngClass]="barColor2(ng.totalMat, ng.totalCap)"
                  [style.width]="(ng.totalCap ? Math.min(100, ng.totalMat/ng.totalCap*100) : 0) + '%'"></div>
              </div>
              <span class="text-xs text-gray-400 shrink-0">{{ ng.totalCap ? Math.round(ng.totalMat/ng.totalCap*100) : 0 }}%</span>
            </div>
            <span class="icon text-gray-400 transition-transform duration-200 shrink-0"
              [ngClass]="nivelExpanded().has(ng.nivel) ? '' : '-rotate-90'">expand_more</span>
          </button>

          @if (nivelExpanded().has(ng.nivel)) {
            <div class="card rounded-t-none overflow-hidden border-t-0">
              <div class="overflow-x-auto">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Grado</th>
                      <th>Sección</th>
                      <th class="text-center">Capacidad</th>
                      <th class="text-center">Ocupadas</th>
                      <th class="text-center">Disponibles</th>
                      <th>Ocupación</th>
                      <th>Estado</th>
                      <th class="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (gg of ng.gradoGroups; track gg.grado) {
                      <!-- Grado subheader -->
                      <tr class="bg-slate-50/80">
                        <td colspan="8">
                          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {{ gg.grado }} {{ ng.nivel }}
                          </span>
                          <span class="text-xs text-gray-400 ml-2">· {{ gg.secciones.length }} sección{{ gg.secciones.length !== 1 ? 'es' : '' }}</span>
                        </td>
                      </tr>
                      @for (vac of gg.secciones; track vac.id) {
                        <tr [ngClass]="{'bg-red-50/30': estadoVacante(vac) === 'sobreocupada'}">
                          <td class="text-sm text-gray-400 pl-8">{{ vac.grado }}</td>
                          <td>
                            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-bold text-gray-700">{{ vac.seccion }}</span>
                          </td>
                          <td class="text-center text-sm font-semibold text-gray-700">{{ vac.capacidad }}</td>
                          <td class="text-center text-sm font-semibold text-gray-700">{{ vac.matriculados }}</td>
                          <td class="text-center">
                            <span class="text-sm font-bold"
                              [ngClass]="disponibles(vac) <= 0 ? 'text-red-600' : disponibles(vac) <= 3 ? 'text-amber-600' : 'text-green-600'">
                              {{ disponibles(vac) }}
                            </span>
                          </td>
                          <!-- Progress bar -->
                          <td>
                            <div class="flex items-center gap-2">
                              <div class="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-300"
                                  [ngClass]="barColor(vac)"
                                  [style.width]="pctOcupado(vac) + '%'"></div>
                              </div>
                              <span class="text-xs text-gray-400 w-9">{{ pctOcupado(vac) }}%</span>
                            </div>
                          </td>
                          <td>
                            <span class="badge text-[11px]" [ngClass]="estadoBadge(vac)">
                              <span class="icon mr-0.5" style="font-size:11px">{{ estadoIcon(vac) }}</span>
                              {{ estadoLabel(vac) }}
                            </span>
                          </td>
                          <td>
                            <div class="flex items-center gap-1 justify-center">
                              @if (estadoVacante(vac) === 'completa' || estadoVacante(vac) === 'sobreocupada') {
                                <button class="btn-icon text-indigo-500 hover:bg-indigo-50 text-[11px] px-2 py-1 h-auto rounded-lg"
                                  title="Ver alternativas (RN-003)"
                                  (click)="altVistaId.set(altVistaId() === vac.id ? null : vac.id)">
                                  <span class="icon" style="font-size:14px">alt_route</span>
                                </button>
                              }
                              <button class="btn-icon text-amber-500 hover:bg-amber-50" title="Editar capacidad"
                                (click)="editandoId.set(vac.id); editCapVal = vac.capacidad">
                                <span class="icon" style="font-size:15px">edit</span>
                              </button>
                              @if (!vac.esReservada) {
                                <button class="btn-icon text-slate-400 hover:bg-slate-50" title="Reservar sección"
                                  (click)="toggleReserva(vac.id)">
                                  <span class="icon" style="font-size:15px">bookmark</span>
                                </button>
                              } @else {
                                <button class="btn-icon text-indigo-500 hover:bg-indigo-50" title="Liberar reserva"
                                  (click)="toggleReserva(vac.id)">
                                  <span class="icon" style="font-size:15px">bookmark_added</span>
                                </button>
                              }
                            </div>
                          </td>
                        </tr>
                        <!-- Alternativas expandibles -->
                        @if (altVistaId() === vac.id) {
                          <tr>
                            <td colspan="8" class="bg-indigo-50/60 px-6 py-3">
                              <div class="flex items-start gap-3">
                                <span class="icon text-indigo-500 shrink-0 mt-0.5" style="font-size:16px">alt_route</span>
                                <div>
                                  <p class="text-xs font-semibold text-indigo-700 mb-2">
                                    RN-003 · Alternativas para {{ vac.grado }} {{ vac.nivel }} Secc. {{ vac.seccion }}
                                  </p>
                                  <div class="flex items-center gap-2 flex-wrap">
                                    @for (alt of getAlternativas(vac); track alt.id) {
                                      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700">
                                        <span class="icon text-indigo-400" style="font-size:12px">meeting_room</span>
                                        Sección {{ alt.seccion }}
                                        <span class="bg-green-100 text-green-700 rounded px-1 font-bold">{{ disponibles(alt) }} disp.</span>
                                      </span>
                                    } @empty {
                                      <span class="text-xs text-gray-400 italic">No hay secciones alternativas disponibles en este grado</span>
                                    }
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        }
                        <!-- Modal inline de edición de capacidad -->
                        @if (editandoId() === vac.id) {
                          <tr>
                            <td colspan="8" class="bg-amber-50/60 px-6 py-3">
                              <div class="flex items-center gap-3">
                                <span class="icon text-amber-500" style="font-size:16px">edit</span>
                                <span class="text-xs font-semibold text-amber-700">Editar capacidad · {{ vac.grado }} {{ vac.nivel }} Secc. {{ vac.seccion }}</span>
                                <input type="number" min="1" max="50"
                                  class="form-input w-24 text-center text-sm"
                                  [(ngModel)]="editCapVal">
                                <button class="btn btn-primary text-xs py-1.5 px-3" (click)="guardarCap(vac.id)">Guardar</button>
                                <button class="btn btn-secondary text-xs py-1.5 px-3" (click)="editandoId.set(null)">Cancelar</button>
                                <span class="text-xs text-gray-400 ml-2">Actual: {{ vac.matriculados }} matriculados</span>
                              </div>
                            </td>
                          </tr>
                        }
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      } @empty {
        <div class="card p-12 flex flex-col items-center justify-center text-center">
          <span class="icon text-gray-200 mb-3" style="font-size:48px">search_off</span>
          <p class="text-gray-400">No hay vacantes para el filtro seleccionado</p>
        </div>
      }
    </div>
  }

  <!-- ══════════ TAB: CONFIGURAR ══════════ -->
  @if (tab() === 'config') {
    <div class="space-y-5 animate-fade-in">

      <!-- Formulario rápido -->
      <div class="card p-5">
        <h3 class="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span class="icon text-indigo-500" style="font-size:16px">add_circle</span>
          Agregar configuración de vacante
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label class="form-label mb-1 block">Año</label>
            <input class="form-input w-full bg-gray-50 text-gray-500" value="2026" disabled>
          </div>
          <div>
            <label class="form-label mb-1 block">Nivel</label>
            <select class="form-input w-full" [(ngModel)]="cfNivel" (ngModelChange)="cfGrado = ''">
              <option value="">Seleccionar</option>
              <option value="Inicial">Inicial</option>
              <option value="Primaria">Primaria</option>
              <option value="Secundaria">Secundaria</option>
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Grado</label>
            <select class="form-input w-full" [(ngModel)]="cfGrado">
              <option value="">Seleccionar</option>
              @for (g of gradosParaNivel(cfNivel); track g) {
                <option [value]="g">{{ g }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Sección</label>
            <select class="form-input w-full" [(ngModel)]="cfSeccion">
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
          <div>
            <label class="form-label mb-1 block">Capacidad</label>
            <input type="number" min="1" max="60" class="form-input w-full" [(ngModel)]="cfCapacidad">
          </div>
          <div class="flex flex-col justify-end">
            <button class="btn btn-primary w-full" (click)="agregarVacante()" [disabled]="!cfNivel || !cfGrado">
              <span class="icon icon-sm">add</span> Agregar
            </button>
          </div>
        </div>
        @if (cfDuplicado()) {
          <p class="text-xs text-red-500 mt-2 flex items-center gap-1">
            <span class="icon" style="font-size:13px">error</span>
            Ya existe una vacante para {{ cfNivel }} {{ cfGrado }} Sección {{ cfSeccion }}
          </p>
        }
      </div>

      <!-- Tabla de configuración -->
      <div class="card overflow-hidden">
        <div class="px-4 py-3 border-b flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-700">Vacantes configuradas · A.E. 2026</h3>
          <span class="text-xs text-gray-400">{{ _vacantes().length }} secciones</span>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nivel</th><th>Grado</th><th>Sección</th>
                <th class="text-center">Capacidad</th>
                <th class="text-center">Matriculados</th>
                <th class="text-center">Disponibles</th>
                <th>Estado</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (vac of _vacantes(); track vac.id) {
                <tr>
                  <td><span class="badge text-[11px]" [ngClass]="nivelBadge(vac.nivel)">{{ vac.nivel }}</span></td>
                  <td class="text-sm text-gray-700">{{ vac.grado }}</td>
                  <td><span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-bold text-gray-700">{{ vac.seccion }}</span></td>
                  <!-- Capacidad inline edit -->
                  <td class="text-center">
                    @if (editandoId() === vac.id) {
                      <input type="number" min="1" class="w-16 border rounded px-2 py-1 text-sm text-center"
                        [(ngModel)]="editCapVal"
                        (keydown.enter)="guardarCap(vac.id)"
                        (keydown.escape)="editandoId.set(null)">
                    } @else {
                      <span class="text-sm font-semibold text-gray-700 cursor-pointer hover:text-indigo-600 border-b border-dashed border-gray-300"
                        title="Clic para editar"
                        (click)="editandoId.set(vac.id); editCapVal = vac.capacidad">
                        {{ vac.capacidad }}
                      </span>
                    }
                  </td>
                  <td class="text-center text-sm text-gray-600">{{ vac.matriculados }}</td>
                  <td class="text-center">
                    <span class="text-sm font-bold"
                      [ngClass]="disponibles(vac) <= 0 ? 'text-red-600' : disponibles(vac) <= 3 ? 'text-amber-600' : 'text-green-600'">
                      {{ disponibles(vac) }}
                    </span>
                  </td>
                  <td><span class="badge text-[11px]" [ngClass]="estadoBadge(vac)">{{ estadoLabel(vac) }}</span></td>
                  <td>
                    <div class="flex items-center gap-1 justify-center">
                      @if (editandoId() === vac.id) {
                        <button class="btn btn-success text-xs py-1 px-2 h-auto" (click)="guardarCap(vac.id)">
                          <span class="icon" style="font-size:14px">save</span>
                        </button>
                        <button class="btn btn-secondary text-xs py-1 px-2 h-auto" (click)="editandoId.set(null)">
                          <span class="icon" style="font-size:14px">close</span>
                        </button>
                      } @else {
                        <button class="btn-icon text-amber-500 hover:bg-amber-50" title="Editar capacidad"
                          (click)="editandoId.set(vac.id); editCapVal = vac.capacidad">
                          <span class="icon" style="font-size:15px">edit</span>
                        </button>
                        <button class="btn-icon text-rose-500 hover:bg-rose-50" title="Eliminar"
                          (click)="eliminarVacante(vac.id)">
                          <span class="icon" style="font-size:15px">delete</span>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  }

  <!-- ══════════ TAB: LISTA DE ESPERA ══════════ -->
  @if (tab() === 'espera') {
    <div class="space-y-4 animate-fade-in">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <p class="text-sm text-gray-500">
          Estudiantes en cola de asignación cuando una sección está llena
        </p>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary btn-sm" (click)="cargarEspera()" [disabled]="cargandoEspera()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
          <span class="badge badge-yellow">{{ _espera().filter(e => e.estado === 'en_espera').length }} en espera</span>
          <span class="badge badge-green">{{ _espera().filter(e => e.vacanteDisponible && e.estado !== 'asignado').length }} con vacante</span>
          <span class="badge badge-green">{{ _espera().filter(e => e.estado === 'asignado').length }} asignados</span>
        </div>
      </div>
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Estudiante</th>
                <th>DNI</th>
                <th>Solicitud</th>
                <th>Nivel</th>
                <th>Grado</th>
                <th class="text-center">Prioridad</th>
                <th>Estado</th>
                <th>Vacantes disp.</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (cargandoEspera()) {
                <tr><td colspan="10" class="py-12 text-center text-gray-400">Cargando lista de espera...</td></tr>
              } @else {
              @for (e of _espera(); track e.id) {
                <tr [ngClass]="{'opacity-60': e.estado === 'asignado'}">
                  <td class="text-xs font-mono text-gray-400">{{ e.id }}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">
                        {{ e.estudiante.split(',')[0][0] }}{{ e.estudiante.split(' ').slice(-1)[0][0] }}
                      </div>
                      <span class="text-sm font-semibold text-gray-800">{{ e.estudiante }}</span>
                    </div>
                  </td>
                  <td class="text-xs font-mono text-gray-500">{{ e.dni }}</td>
                  <td class="text-xs text-gray-500 whitespace-nowrap">{{ e.fechaSolicitud }}</td>
                  <td><span class="badge text-[11px]" [ngClass]="nivelBadge(e.nivel)">{{ e.nivel }}</span></td>
                  <td class="text-sm text-gray-700">{{ e.grado }} {{ e.nivel }}</td>
                  <td class="text-center">
                    <span class="badge text-[11px]" [ngClass]="prioridadBadge(e.prioridad)">
                      <span class="icon mr-0.5" style="font-size:11px">{{ e.prioridad === 'alta' ? 'priority_high' : e.prioridad === 'media' ? 'remove' : 'arrow_downward' }}</span>
                      {{ e.prioridad | titlecase }}
                    </span>
                  </td>
                  <td>
                    <span class="badge text-[11px]" [ngClass]="esperaBadge(e.estado)">{{ esperaLabel(e.estado) }}</span>
                    @if (e.vacanteDisponible && e.estado !== 'asignado') {
                      <span class="badge badge-green text-[10px] mt-1 block w-fit">Disponible</span>
                    }
                  </td>
                  <td class="text-sm">
                    @if (e.vacanteDisponible) {
                      <span class="text-green-600 font-bold">{{ e.vacantesDisponibles }}</span>
                      <span class="text-gray-400 text-xs ml-1">disponibles</span>
                      @if (e.seccionSugerida) {
                        <div class="text-[10px] text-green-700">Secc. {{ e.seccionSugerida }}</div>
                      }
                    } @else {
                      <span class="text-red-500 text-xs font-medium">Sin vacantes</span>
                    }
                  </td>
                  <td>
                    <div class="flex items-center gap-1 justify-center">
                      @if (e.estado !== 'asignado') {
                        <button class="btn-icon text-green-600 hover:bg-green-50" title="Asignar vacante"
                          (click)="abrirModalAsignar(e)" [disabled]="!e.vacanteDisponible || esperaSvc.saving()">
                          <span class="icon" style="font-size:15px">how_to_reg</span>
                        </button>
                        @if (e.estado === 'en_espera') {
                          <button class="btn-icon text-amber-500 hover:bg-amber-50" title="Notificar disponibilidad"
                            (click)="notificarEspera(e.id)" [disabled]="!e.vacanteDisponible">
                            <span class="icon" style="font-size:15px">notifications</span>
                          </button>
                        }
                      }
                      <button class="btn-icon text-rose-500 hover:bg-rose-50" title="Eliminar de lista"
                        (click)="eliminarEspera(e.id)">
                        <span class="icon" style="font-size:15px">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="py-12 text-center">
                    <span class="icon text-gray-200 block mb-2" style="font-size:44px">hourglass_empty</span>
                    <p class="text-gray-400 text-sm">La lista de espera está vacía</p>
                  </td>
                </tr>
              }
              }
            </tbody>
          </table>
        </div>
      </div>
      <!-- Info RN -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
          <p class="font-bold mb-1 flex items-center gap-1"><span class="icon" style="font-size:13px">info</span> RN-004 · Anular matrícula</p>
          <p>Al anular una matrícula, la vacante se libera automáticamente y se notifica al primero en lista de espera.</p>
        </div>
        <div class="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
          <p class="font-bold mb-1 flex items-center gap-1"><span class="icon" style="font-size:13px">info</span> RN-005 · Traslado de estudiante</p>
          <p>Al trasladar, la vacante de origen se libera y se ocupa la vacante de la sección destino.</p>
        </div>
      </div>
    </div>
  }

  <!-- ══════════ DRAWER AGREGAR VACANTE ══════════ -->
  @if (drawerAbierto()) {
    <div appOverlayPortal class="fixed inset-0 z-40">
    <div class="absolute inset-0 bg-black/40" (click)="drawerAbierto.set(false)"></div>
    <div class="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col animate-slide-in-r">
      <div class="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500">
        <div class="flex items-center gap-3">
          <span class="icon text-white" style="font-size:22px">add_circle</span>
          <div>
            <h3 class="font-bold text-white">Agregar Vacante</h3>
            <p class="text-indigo-200 text-xs">Configuración para A.E. 2026</p>
          </div>
        </div>
        <button class="btn-icon text-white/80 hover:text-white hover:bg-white/10" (click)="drawerAbierto.set(false)">
          <span class="icon">close</span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-5 space-y-4">
        <!-- Año -->
        <div>
          <label class="form-label mb-1 block">Año Escolar</label>
          <input class="form-input w-full bg-gray-50 text-gray-500" value="2026" disabled>
        </div>
        <!-- Nivel -->
        <div>
          <label class="form-label mb-1 block">Nivel <span class="text-red-400">*</span></label>
          <div class="grid grid-cols-3 gap-2">
            @for (n of ['Inicial','Primaria','Secundaria']; track n) {
              <button class="py-2.5 rounded-xl border text-sm font-medium transition-colors"
                [ngClass]="dNivel === n ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                (click)="dNivel = n; dGrado = ''">
                {{ n }}
              </button>
            }
          </div>
        </div>
        <!-- Grado -->
        <div>
          <label class="form-label mb-1 block">Grado <span class="text-red-400">*</span></label>
          <div class="flex flex-wrap gap-2">
            @for (g of gradosParaNivel(dNivel); track g) {
              <button class="w-10 h-10 rounded-lg border text-sm font-bold transition-colors"
                [ngClass]="dGrado === g ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                (click)="dGrado = g">
                {{ g }}
              </button>
            }
          </div>
        </div>
        <!-- Sección -->
        <div>
          <label class="form-label mb-1 block">Sección</label>
          <div class="flex gap-2">
            @for (s of ['A','B','C','D']; track s) {
              <button class="w-10 h-10 rounded-lg border text-sm font-bold transition-colors"
                [ngClass]="dSeccion === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                (click)="dSeccion = s">
                {{ s }}
              </button>
            }
          </div>
        </div>
        <!-- Capacidad -->
        <div>
          <label class="form-label mb-1 block">Capacidad Máxima</label>
          <div class="flex items-center gap-3">
            <button class="btn-icon text-gray-500" (click)="dCapacidad = Math.max(1, dCapacidad - 5)">
              <span class="icon">remove</span>
            </button>
            <input type="number" min="1" max="60" class="form-input w-24 text-center text-lg font-bold" [(ngModel)]="dCapacidad">
            <button class="btn-icon text-gray-500" (click)="dCapacidad = Math.min(60, dCapacidad + 5)">
              <span class="icon">add</span>
            </button>
          </div>
        </div>
        <!-- Preview -->
        @if (dNivel && dGrado) {
          <div class="bg-indigo-50 rounded-xl p-4 space-y-2">
            <p class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Vista previa</p>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Sección:</span>
              <span class="font-bold text-gray-800">{{ dGrado }} {{ dNivel }} — {{ dSeccion }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Capacidad:</span>
              <span class="font-bold text-indigo-700">{{ dCapacidad }} estudiantes</span>
            </div>
            @if (drawerDuplicado()) {
              <p class="text-xs text-red-500 flex items-center gap-1">
                <span class="icon" style="font-size:13px">warning</span> Ya existe esta configuración
              </p>
            }
          </div>
        }
      </div>
      <div class="flex gap-3 p-5 border-t">
        <button class="btn btn-secondary flex-1" (click)="drawerAbierto.set(false)">Cancelar</button>
        <button class="btn btn-primary flex-1"
          [disabled]="!dNivel || !dGrado || drawerDuplicado()"
          (click)="agregarDesdeDrawer()">
          <span class="icon icon-sm">add</span> Agregar Vacante
        </button>
      </div>
    </div>
    </div>
  }

  <!-- ══════════ MODAL ASIGNAR VACANTE ══════════ -->
  @if (modalAsignar(); as item) {
    <div appOverlayPortal class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" (click)="cerrarModalAsignar()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in" (click)="$event.stopPropagation()">
        <div class="px-6 py-5 border-b">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
              <span class="icon text-green-600" style="font-size:24px">how_to_reg</span>
            </div>
            <div>
              <h3 class="font-bold text-gray-900 text-lg">Asignar vacante</h3>
              <p class="text-xs text-gray-400 mt-0.5">Confirmar matrícula desde lista de espera</p>
            </div>
          </div>
        </div>
        <div class="px-6 py-5 space-y-4">
          <div class="rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100">
            <div class="px-4 py-3">
              <p class="text-xs text-gray-400 mb-0.5">Estudiante</p>
              <p class="text-sm font-semibold text-gray-900">{{ item.estudiante }}</p>
              <p class="text-xs font-mono text-gray-500 mt-1">DNI {{ item.dni }}</p>
            </div>
            <div class="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Destino</p>
                <p class="text-sm font-medium text-gray-800">{{ item.grado }} · {{ item.nivel }}</p>
              </div>
              <span class="badge text-[11px]" [ngClass]="nivelBadge(item.nivel)">{{ item.nivel }}</span>
            </div>
            <div class="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Sección</p>
                @if (seccionModalAsignar()) {
                  <p class="text-sm font-bold text-green-700">Sección {{ seccionModalAsignar() }}</p>
                } @else {
                  <p class="text-sm text-gray-600">Primera sección con vacante disponible</p>
                }
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-400 mb-0.5">Vacantes</p>
                <p class="text-lg font-bold text-green-600">{{ item.vacantesDisponibles }}</p>
              </div>
            </div>
          </div>
          <div class="flex gap-2 bg-green-50 rounded-xl p-3 text-xs text-green-800 border border-green-100">
            <span class="icon text-green-500 shrink-0" style="font-size:16px">info</span>
            El estudiante quedará matriculado y el registro pasará a estado <span class="font-semibold">Asignado</span>.
          </div>
        </div>
        <div class="flex gap-3 px-6 py-4 border-t">
          <button class="btn btn-secondary flex-1" (click)="cerrarModalAsignar()" [disabled]="esperaSvc.saving()">
            Cancelar
          </button>
          <button class="btn btn-primary flex-1" (click)="confirmarAsignar()" [disabled]="esperaSvc.saving()">
            <span class="icon icon-sm">how_to_reg</span>
            {{ esperaSvc.saving() ? 'Asignando...' : 'Confirmar asignación' }}
          </button>
        </div>
      </div>
    </div>
  }

  <!-- ══════════ TOAST ══════════ -->
  @if (toast()) {
    <div class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl animate-slide-in-r"
      [ngClass]="{
        'bg-green-600 text-white': toast()!.type === 'success',
        'bg-red-600 text-white':   toast()!.type === 'error',
        'bg-gray-800 text-white':  toast()!.type === 'info'
      }">
      <span class="icon text-white text-lg">{{ toast()!.type === 'success' ? 'check_circle' : toast()!.type === 'error' ? 'error' : 'info' }}</span>
      <p class="text-sm font-medium">{{ toast()!.msg }}</p>
    </div>
  }

</div>
  `
})
export class VacantesComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly tenant = inject(TenantContextService);
  private readonly salonesSvc = inject(SalonesService);
  readonly esperaSvc = inject(EsperaService);
  readonly Math = Math;
  private readonly _tenantReloadReady = setupTenantReload(
    () => this.recargarInstitucion(),
    { onBeforeReload: () => this.limpiarUiInstitucion() },
  );

  // ── Signals ──────────────────────────────────────────────
  readonly tab          = signal<'general'|'config'|'espera'>('general');
  readonly _vacantes    = signal<Vacante[]>([]);
  readonly cargando     = signal(false);
  readonly cargandoEspera = signal(false);
  readonly anioEscolar  = signal(2026);
  readonly _espera      = signal<EsperaItem[]>([]);
  readonly filtroNivel  = signal('Todos');
  readonly nivelExpanded = signal(new Set<string>(['Inicial','Primaria','Secundaria']));
  readonly altVistaId   = signal<number | null>(null);
  readonly editandoId   = signal<number | null>(null);
  readonly drawerAbierto = signal(false);
  readonly modalAsignar = signal<EsperaItem | null>(null);
  readonly toast        = signal<{ msg: string; type: 'success'|'error'|'info' } | null>(null);

  // Edit
  editCapVal = 30;

  // Config form (inline en tab Configurar)
  cfNivel = ''; cfGrado = ''; cfSeccion = 'A'; cfCapacidad = 30;

  // Drawer form
  dNivel = ''; dGrado = ''; dSeccion = 'A'; dCapacidad = 30;

  // ── Computed - KPI ────────────────────────────────────────
  readonly totalCapacidad   = computed(() => this._vacantes().reduce((s,v) => s + v.capacidad, 0));
  readonly totalOcupadas    = computed(() => this._vacantes().reduce((s,v) => s + v.matriculados, 0));
  readonly totalDisponibles = computed(() => this._vacantes().reduce((s,v) => s + v.disponibles, 0));
  readonly seccionesDisp    = computed(() => this._vacantes().filter(v => v.disponibles > 0).length);
  readonly seccionesLlenas  = computed(() => this._vacantes().filter(v => v.disponibles <= 0 && v.matriculados <= v.capacidad).length);
  readonly sobreocupadas    = computed(() => this._vacantes().filter(v => v.matriculados > v.capacidad).length);
  readonly pctGlobal        = computed(() => this.totalCapacidad() ? Math.round(this.totalOcupadas() / this.totalCapacidad() * 100) : 0);

  // ── Computed - Groups ─────────────────────────────────────
  readonly _filtradas = computed(() => {
    const nv = this.filtroNivel();
    return nv === 'Todos' ? this._vacantes() : this._vacantes().filter(v => v.nivel === nv);
  });

  readonly nivelGroups = computed((): NivelGroup[] => {
    const list    = this._filtradas();
    const config: { nivel: Nivel; icon: string }[] = [
      { nivel:'Inicial',    icon:'child_care' },
      { nivel:'Primaria',   icon:'menu_book'  },
      { nivel:'Secundaria', icon:'school'     },
    ];
    return config.map(({ nivel, icon }) => {
      const nSecs = list.filter(v => v.nivel === nivel);
      const gMap  = new Map<string, Vacante[]>();
      for (const vac of nSecs) {
        if (!gMap.has(vac.grado)) gMap.set(vac.grado, []);
        gMap.get(vac.grado)!.push(vac);
      }
      return {
        nivel, icon,
        gradoGroups: Array.from(gMap.entries()).map(([grado, secciones]) => ({ grado, secciones })),
        totalCap:  nSecs.reduce((s,v) => s + v.capacidad, 0),
        totalMat:  nSecs.reduce((s,v) => s + v.matriculados, 0),
        totalDisp: nSecs.reduce((s,v) => s + v.disponibles, 0),
      };
    }).filter(ng => ng.gradoGroups.length > 0);
  });

  readonly cfDuplicado = computed(() =>
    !!this._vacantes().find(v => v.nivel === this.cfNivel && v.grado === this.cfGrado && v.seccion === this.cfSeccion)
  );

  readonly drawerDuplicado = computed(() =>
    !!this._vacantes().find(v => v.nivel === this.dNivel && v.grado === this.dGrado && v.seccion === this.dSeccion)
  );

  readonly seccionModalAsignar = computed(() => {
    const item = this.modalAsignar();
    if (!item) return null;
    return item.seccionSugerida || item.seccionDeseada || null;
  });

  ngOnInit(): void {
    this.layout.setTitle('Gestión de Vacantes');
    if (this.tenant.requiresSelection()) {
      this.limpiarUiInstitucion();
    } else {
      this.recargarInstitucion();
    }
    markTenantReloadReady(this._tenantReloadReady);
  }

  private limpiarUiInstitucion(): void {
    this._vacantes.set([]);
    this._espera.set([]);
    this.modalAsignar.set(null);
    this.editandoId.set(null);
    this.altVistaId.set(null);
    this.drawerAbierto.set(false);
    this.toast.set(null);
  }

  private recargarInstitucion(): void {
    this.cargarVacantes();
    if (this.tab() === 'espera') {
      this.cargarEspera();
    }
  }

  setTab(value: 'general' | 'config' | 'espera'): void {
    this.tab.set(value);
    if (value === 'espera') this.cargarEspera();
  }

  cargarEspera(): void {
    this.cargandoEspera.set(true);
    this.esperaSvc.load().subscribe({
      next: (items) => {
        this._espera.set(items);
        this.cargandoEspera.set(false);
      },
      error: (err) => {
        this.cargandoEspera.set(false);
        const msg = err?.error?.message;
        this.showToast(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'Error al cargar lista de espera',
          'error',
        );
      },
    });
  }

  cargarVacantes(): void {
    this.cargando.set(true);
    this.salonesSvc.listVacancies({ anioEscolar: this.anioEscolar() }).subscribe({
      next: (rows) => {
        this._vacantes.set(rows.map((v) => ({
          id: v.id,
          anio: v.anioEscolar,
          nivel: v.nivel as Nivel,
          grado: v.grado,
          seccion: v.seccion,
          capacidad: v.aforo,
          matriculados: v.matriculados,
          pendientesContinuidad: v.pendientesContinuidad ?? 0,
          disponibles: v.disponibles,
          esIngresante: v.esIngresante,
          esReservada: false,
        })));
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.showToast(err.message || 'Error al cargar vacantes', 'error');
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  disponibles(v: Vacante): number       { return v.disponibles; }
  pctOcupado(v: Vacante): number        { return Math.min(110, Math.round(v.matriculados / v.capacidad * 100)); }

  estadoVacante(v: Vacante): EstadoVac {
    if (v.matriculados > v.capacidad)  return 'sobreocupada';
    if (v.matriculados >= v.capacidad) return 'completa';
    if (v.esReservada)                 return 'reservada';
    return 'disponible';
  }

  estadoLabel(v: Vacante): string {
    return { disponible:'Disponible', completa:'Completa', sobreocupada:'Sobreocupada', reservada:'Reservada' }[this.estadoVacante(v)];
  }

  estadoBadge(v: Vacante): string {
    return { disponible:'badge-green', completa:'badge-red', sobreocupada:'badge-red', reservada:'badge-yellow' }[this.estadoVacante(v)];
  }

  estadoIcon(v: Vacante): string {
    return { disponible:'check_circle', completa:'block', sobreocupada:'warning', reservada:'bookmark' }[this.estadoVacante(v)];
  }

  barColor(v: Vacante): string  { return this.barColor2(v.matriculados, v.capacidad); }
  barColor2(mat: number, cap: number): string {
    const p = cap ? mat / cap * 100 : 0;
    if (p >= 100) return 'bg-red-500';
    if (p >= 90)  return 'bg-orange-500';
    if (p >= 70)  return 'bg-amber-500';
    return 'bg-green-500';
  }

  nivelBadge(n: string): string {
    return { Inicial:'badge-purple', Primaria:'badge-blue', Secundaria:'badge-indigo' }[n] ?? 'badge-gray';
  }

  prioridadBadge(p: Prioridad): string { return { alta:'badge-red', media:'badge-yellow', baja:'badge-gray' }[p]; }

  esperaBadge(e: EstadoEspera): string {
    return { en_espera:'badge-blue', notificado:'badge-yellow', asignado:'badge-green', cancelado:'badge-gray' }[e] ?? 'badge-gray';
  }
  esperaLabel(e: EstadoEspera): string {
    return { en_espera:'En espera', notificado:'Notificado', asignado:'Asignado', cancelado:'Cancelado' }[e] ?? e;
  }

  gradosParaNivel(nivel: string): string[] {
    if (nivel === 'Inicial')    return ['1°','2°','3°'];
    if (nivel === 'Primaria')   return ['1°','2°','3°','4°','5°','6°'];
    if (nivel === 'Secundaria') return ['1°','2°','3°','4°','5°'];
    return [];
  }

  getAlternativas(vac: Vacante): Vacante[] {
    return this._vacantes().filter(x => x.nivel === vac.nivel && x.grado === vac.grado && x.id !== vac.id && (x.capacidad - x.matriculados) > 0);
  }

  vacantesDisp(nivel: Nivel, grado: string): number {
    return this._vacantes()
      .filter(v => v.nivel === nivel && v.grado === grado)
      .reduce((s, v) => s + Math.max(0, v.capacidad - v.matriculados), 0);
  }

  // ── Actions ───────────────────────────────────────────────
  toggleNivel(nivel: string): void {
    this.nivelExpanded.update(s => { const n = new Set(s); n.has(nivel) ? n.delete(nivel) : n.add(nivel); return n; });
  }

  toggleReserva(id: number): void {
    this._vacantes.update(list => list.map(v => v.id === id ? { ...v, esReservada: !v.esReservada } : v));
    this.showToast('Estado de reserva actualizado', 'success');
  }

  guardarCap(id: number): void {
    if (this.editCapVal < 1) return;
    this.salonesSvc.updateAforo(id, this.editCapVal).subscribe({
      next: () => {
        this.editandoId.set(null);
        this.showToast(`Capacidad actualizada a ${this.editCapVal} estudiantes`, 'success');
        this.cargarVacantes();
      },
      error: (err) => this.showToast(err.message || 'Error al guardar', 'error'),
    });
  }

  agregarVacante(): void {
    this.showToast('Configure nuevos salones en Maestros → Sincronizar estructura', 'info');
  }

  agregarDesdeDrawer(): void {
    this.drawerAbierto.set(false);
    this.showToast('Configure nuevos salones en Maestros → Sincronizar estructura', 'info');
  }

  eliminarVacante(_id: number): void {
    this.showToast('Elimine o desactive salones desde el maestro de salones', 'info');
  }

  abrirModalAsignar(item: EsperaItem): void {
    if (!item.vacanteDisponible) {
      this.showToast('No hay vacantes disponibles para este estudiante', 'error');
      return;
    }
    this.modalAsignar.set(item);
  }

  cerrarModalAsignar(): void {
    this.modalAsignar.set(null);
  }

  confirmarAsignar(): void {
    const item = this.modalAsignar();
    if (!item) return;
    const seccion = item.seccionSugerida || item.seccionDeseada || undefined;

    this.esperaSvc.assign(item.id, { seccion }).subscribe({
      next: (res) => {
        this.cerrarModalAsignar();
        this.cargarEspera();
        this.cargarVacantes();
        this.showToast(
          `${item.estudiante} asignado a ${item.grado} ${item.nivel} — Secc. ${res.seccionAsignada}`,
          'success',
        );
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.showToast(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo asignar la vacante',
          'error',
        );
      },
    });
  }

  notificarEspera(id: number): void {
    this.esperaSvc.notify(id).subscribe({
      next: () => {
        this.cargarEspera();
        this.showToast('Notificación enviada al apoderado', 'success');
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.showToast(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo notificar',
          'error',
        );
      },
    });
  }

  eliminarEspera(id: number): void {
    if (!confirm('¿Eliminar este registro de la lista de espera?')) return;
    this.esperaSvc.delete(id).subscribe({
      next: () => {
        this.cargarEspera();
        this.showToast('Registro eliminado de la lista de espera', 'info');
      },
      error: () => this.showToast('No se pudo eliminar el registro', 'error'),
    });
  }

  replicar(): void {
    const count = this._vacantes().length;
    this.showToast(`${count} secciones replicadas de 2025 para el año 2026`, 'success');
  }

  showToast(msg: string, type: 'success'|'error'|'info'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}



