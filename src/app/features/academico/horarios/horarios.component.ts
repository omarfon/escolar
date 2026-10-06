import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import { OverlayPortalDirective } from '../../../core/overlay/overlay-portal.directive';
import {
  escapeHtml,
  printIframe,
  wrapPrintDocumentHtml,
  writeHtmlToIframe,
} from '../../../core/print/print-html.util';
import { HorariosAdminService } from './services/horarios-admin.service';
import {
  ConflictoHorario,
  CursoHorario,
  DocenteHorario,
  EntradaHorario,
  GestionClaseHorario,
  HorarioContext,
  mapHorarioContext,
  NivelHorario,
  PeriodoHorario,
  SalonHorario,
} from './models/horarios-admin.model';

type Nivel = NivelHorario;
type MainTab = 'horario' | 'gestion' | 'conflictos';
type Periodo = PeriodoHorario;
type Curso = CursoHorario;
type Docente = DocenteHorario;

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const PRINT_PREVIEW_FRAME_ID = 'horarios-print-preview-frame';

@Component({
  selector: 'app-horarios',
  standalone: true,
  imports: [FormsModule, NgClass, OverlayPortalDirective],
  template: `
<div class="min-h-screen bg-gray-50 animate-fade-in">

  <!-- HEADER -->
  <div class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <span>Gestión Académica</span><span>›</span>
          <span class="text-gray-700 font-medium">Horarios</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Gestión de Horarios</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          Cuadro de horas semanal — A.E. {{ anioEscolar() }} ·
          Inicial sale 1 PM · Primaria sale 2 PM · Secundaria sale 3 PM
        </p>
      </div>
      <div class="flex items-center gap-2 mt-1">
        <button type="button" class="btn btn-secondary text-sm gap-1.5" (click)="imprimir()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Imprimir
        </button>
        @if (tab() === 'horario' && puedeGestionar()) {
          <button class="btn text-sm gap-1.5" (click)="editMode.set(!editMode())"
            [ngClass]="editMode() ? 'btn-danger' : 'btn-primary'">
            @if (editMode()) {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Finalizar edición
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Editar horario
            }
          </button>
        }
      </div>
    </div>

    <!-- TABS -->
    <div class="flex mt-5 border-b border-gray-100 -mb-px gap-0.5">
      @for (t of TABS; track t.id) {
        <button class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all"
          [ngClass]="tab() === t.id
            ? 'border-indigo-600 text-indigo-700'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          (click)="tab.set($any(t.id))">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="t.icon"/>
          </svg>
          {{ t.label }}
          @if (t.id === 'conflictos' && conflictos().length > 0) {
            <span class="ml-0.5 px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-700">{{ conflictos().length }}</span>
          }
        </button>
      }
    </div>
  </div>

  <div class="p-6 max-w-[1400px] mx-auto">

    @if (tenant.requiresSelection()) {
      <div class="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
        Seleccione una institución educativa en la barra superior para gestionar horarios.
      </div>
    } @else if (tenant.activeInstitutionLabel(); as ie) {
      <p class="mb-4 text-xs text-gray-500">
        Institución: <span class="font-semibold text-gray-700">{{ ie }}</span>
      </p>
    }

    @if (loadError()) {
      <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {{ loadError() }}
        <button class="ml-3 underline font-medium" (click)="cargarDatos()">Reintentar</button>
      </div>
    }

    @if (svc.loading()) {
      <div class="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
        Cargando horarios desde el servidor…
      </div>
    }

    <!-- ════════════════════════════════════════════
         TAB 1: HORARIO (GRID)
    ════════════════════════════════════════════ -->
    @if (tab() === 'horario') {
      <div class="space-y-4 animate-fade-in">

        <!-- Class selector -->
        <div class="card p-4">
          <div class="flex flex-wrap items-end gap-4">
            <!-- Nivel -->
            <div class="flex gap-2">
              @for (n of NIVELES; track n) {
                <button class="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                  [ngClass]="selNivel() === n
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                  (click)="onNivelChange($any(n))">{{ n }}</button>
              }
            </div>
            <!-- Grado -->
            <div>
              <label class="form-label">Grado</label>
              <select class="form-input w-32" [ngModel]="selGrado()" (ngModelChange)="onGradoChange($event)">
                @for (g of gradosPorNivel(selNivel()); track g) {
                  <option [value]="g">{{ g }}</option>
                }
              </select>
            </div>
            <!-- Sección -->
            <div>
              <label class="form-label">Sección</label>
              <div class="flex gap-2">
                @for (s of seccionesPorAula(); track s) {
                  <button class="w-10 h-9 rounded-lg text-sm font-semibold border-2 transition-all"
                    [ngClass]="selSeccion() === s
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-400'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'"
                    (click)="selSeccion.set(s)">{{ s }}</button>
                }
              </div>
            </div>

            <!-- Stats for this class -->
            <div class="ml-auto flex items-center gap-4 self-end">
              <!-- Hora de salida badge -->
              <div class="text-center">
                <div class="text-xs text-gray-400 mb-1">Hora salida</div>
                <span class="badge"
                  [ngClass]="selNivel()==='Inicial' ? 'badge-green' : selNivel()==='Primaria' ? 'badge-blue' : 'badge-purple'">
                  {{ selNivel()==='Inicial' ? '1:00 PM' : selNivel()==='Primaria' ? '2:15 PM' : '3:00 PM' }}
                </span>
              </div>
              <div class="h-10 w-px bg-gray-200"></div>
              @let vstats = vistaStats();
              <div class="text-right">
                <div class="text-xs text-gray-400">Completitud</div>
                <div class="font-bold text-lg" [ngClass]="vstats.pct >= 80 ? 'text-emerald-600' : vstats.pct >= 50 ? 'text-amber-600' : 'text-red-500'">
                  {{ vstats.pct }}%
                </div>
              </div>
              <div class="h-10 w-px bg-gray-200"></div>
              <div class="text-right">
                <div class="text-xs text-gray-400">Horas / semana</div>
                <div class="font-bold text-lg text-indigo-700">{{ vstats.filled }}</div>
              </div>
              <div class="h-10 w-px bg-gray-200"></div>
              <div class="text-right">
                <div class="text-xs text-gray-400">Libre</div>
                <div class="font-bold text-lg text-gray-400">{{ vstats.empty }}</div>
              </div>
            </div>
          </div>

          <!-- Progress bar -->
          @let vstats2 = vistaStats();
          <div class="mt-3">
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all"
                [style.width.%]="vstats2.pct"
                [ngClass]="vstats2.pct >= 80 ? 'bg-emerald-500' : vstats2.pct >= 50 ? 'bg-amber-400' : 'bg-red-400'">
              </div>
            </div>
          </div>
        </div>

        <!-- Edit mode banner -->
        @if (editMode()) {
          <div class="card p-3 border-amber-200 bg-amber-50 flex items-center gap-3 text-sm text-amber-800">
            <svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            <span><strong>Modo edición activo</strong> — Haz clic en <span class="font-mono bg-amber-200 px-1 rounded">+</span> para agregar una clase. Haz clic en una clase asignada para editarla o eliminarla.</span>
          </div>
        }

        <!-- SCHEDULE GRID -->
        <div class="card overflow-x-auto">
          <table class="w-full border-collapse text-sm" style="min-width: 700px">
            <thead>
              <tr class="bg-gray-50">
                <th class="text-left px-4 py-3 font-semibold text-gray-500 border-b border-r border-gray-200 w-28">
                  Período
                </th>
                @for (dia of DIAS; track dia; let di = $index) {
                  <th class="px-3 py-3 font-semibold text-gray-700 border-b border-r border-gray-200 text-center"
                    [ngClass]="di === diaActual ? 'bg-indigo-50' : ''">
                    <div>{{ dia }}</div>
                    <div class="text-xs font-normal text-gray-400 mt-0.5">{{ diasFechas[di] }}</div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (periodo of periodosVis(); track periodo.id) {
                @if (periodo.isReceso) {
                  <!-- RECREO ROW -->
                  <tr class="bg-amber-50">
                    <td class="px-4 py-2 border-b border-r border-amber-100">
                      <div class="font-medium text-amber-700 text-xs">{{ periodo.nombre }}</div>
                      <div class="text-xs text-amber-500">{{ periodo.horaInicio }}–{{ periodo.horaFin }}</div>
                    </td>
                    <td colspan="5" class="px-4 py-2 border-b border-amber-100 text-center text-amber-600 font-medium text-sm">
                      🍎 Recreo — {{ periodo.horaInicio }} a {{ periodo.horaFin }}
                    </td>
                  </tr>
                } @else {
                  <!-- TEACHING PERIOD ROW -->
                  <tr class="hover:bg-gray-50/50">
                    <td class="px-4 py-2 border-b border-r border-gray-100 align-top">
                      <div class="font-medium text-gray-700 text-xs">{{ periodo.nombre }}</div>
                      <div class="text-xs text-gray-400">{{ periodo.horaInicio }}</div>
                      <div class="text-xs text-gray-300">{{ periodo.horaFin }}</div>
                    </td>
                    @for (di of [0,1,2,3,4]; track di) {
                      @let entrada = getEntrada(di, periodo.id);
                      @let isHoy = di === diaActual;
                      <td class="px-2 py-2 border-b border-r border-gray-100 align-top"
                        [ngClass]="isHoy ? 'bg-indigo-50/40' : ''">
                        @if (entrada) {
                          @let curso = curById(entrada.cursoId);
                          @let doc   = docById(entrada.docenteId);
                          <div class="rounded-lg p-2 border cursor-pointer group relative select-none transition-all hover:shadow-md"
                            [ngClass]="curso?.colorClass ?? 'bg-gray-100 text-gray-700 border-gray-200'"
                            (click)="editMode() ? abrirModal(di, periodo.id, entrada) : null">
                            <div class="font-semibold text-xs leading-tight">{{ curso?.nombre }}</div>
                            <div class="text-xs opacity-60 mt-0.5 truncate">{{ doc?.abrev }}</div>
                            @if (editMode()) {
                              <div class="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                                <button class="w-5 h-5 rounded bg-white/80 hover:bg-white flex items-center justify-center"
                                  title="Eliminar" (click)="eliminarEntrada($event, entrada.id)">
                                  <svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                  </svg>
                                </button>
                              </div>
                            }
                          </div>
                        } @else if (editMode()) {
                          <button class="w-full min-h-[52px] flex items-center justify-center text-gray-300 hover:text-indigo-400 hover:bg-indigo-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-all"
                            (click)="abrirModal(di, periodo.id, null)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                          </button>
                        } @else {
                          <div class="min-h-[52px] rounded-lg border border-dashed border-gray-100 bg-gray-50"></div>
                        }
                      </td>
                    }
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Area legend -->
        <div class="card p-3">
          <div class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Áreas curriculares</div>
          <div class="flex flex-wrap gap-2">
            @for (c of legendaCursos(); track c.id) {
              <div class="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
                [ngClass]="c.colorClass">
                <span class="w-1.5 h-1.5 rounded-full" [ngClass]="c.dotClass"></span>
                {{ c.nombre }}
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ════════════════════════════════════════════
         TAB 2: GESTIÓN
    ════════════════════════════════════════════ -->
    @if (tab() === 'gestion') {
      <div class="space-y-4 animate-fade-in">

        <!-- Summary KPIs -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card p-4 border-l-4 border-l-emerald-500">
            <div class="text-2xl font-bold text-emerald-600">{{ gestionStats().conHorario }}</div>
            <div class="text-xs text-gray-500 mt-1">Aulas con horario</div>
          </div>
          <div class="card p-4 border-l-4 border-l-amber-400">
            <div class="text-2xl font-bold text-amber-600">{{ gestionStats().enProgreso }}</div>
            <div class="text-xs text-gray-500 mt-1">Horarios incompletos</div>
          </div>
          <div class="card p-4 border-l-4 border-l-red-400">
            <div class="text-2xl font-bold text-red-500">{{ gestionStats().sinHorario }}</div>
            <div class="text-xs text-gray-500 mt-1">Sin horario</div>
          </div>
          <div class="card p-4 border-l-4 border-l-indigo-400">
            <div class="text-2xl font-bold text-indigo-600">{{ _entradas().length }}</div>
            <div class="text-xs text-gray-500 mt-1">Total entradas</div>
          </div>
        </div>

        <!-- Table by nivel -->
        @for (nivel of NIVELES; track nivel) {
          @let clases = clasesPorNivel(nivel);
          @if (clases.length > 0) {
            <div class="card overflow-hidden">
              <div class="px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                <span class="badge" [ngClass]="{
                  'badge-blue':   nivel === 'Inicial',
                  'badge-indigo': nivel === 'Primaria',
                  'badge-purple': nivel === 'Secundaria'
                }">{{ nivel }}</span>
                <span class="text-sm text-gray-500">{{ clases.length }} aula(s)</span>
              </div>
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>Grado / Sección</th>
                    <th>Estado</th>
                    <th>Períodos asignados</th>
                    <th>Completitud</th>
                    <th>Entradas</th>
                    <th class="text-right pr-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cl of clases; track cl.key) {
                    @let pct = cl.totalSlots > 0 ? Math.round((cl.filled / cl.totalSlots) * 100) : 0;
                    <tr>
                      <td class="font-semibold text-gray-900">
                        {{ cl.grado }} · Sección {{ cl.seccion }}
                      </td>
                      <td>
                        <span class="badge" [ngClass]="{
                          'badge-green':  pct === 100,
                          'badge-yellow': pct > 0 && pct < 100,
                          'badge-gray':   pct === 0
                        }">
                          {{ pct === 100 ? 'Completo' : pct > 0 ? 'En progreso' : 'Sin horario' }}
                        </span>
                      </td>
                      <td class="text-sm">
                        <span class="font-bold text-indigo-700">{{ cl.filled }}</span>
                        <span class="text-gray-400"> / {{ cl.totalSlots }}</span>
                      </td>
                      <td style="min-width: 140px">
                        <div class="flex items-center gap-2">
                          <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all"
                              [style.width.%]="pct"
                              [ngClass]="pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-400' : pct > 0 ? 'bg-red-400' : 'bg-gray-200'">
                            </div>
                          </div>
                          <span class="text-xs font-medium w-10 text-right"
                            [ngClass]="pct === 100 ? 'text-emerald-600' : pct > 50 ? 'text-amber-600' : 'text-red-500'">
                            {{ pct }}%
                          </span>
                        </div>
                      </td>
                      <td class="text-sm text-gray-500">{{ cl.filled }}</td>
                      <td class="text-right pr-2">
                        <button class="btn btn-ghost text-xs gap-1"
                          (click)="irAHorario(cl.nivel, cl.grado, cl.seccion)">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                          Ver / Editar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    }

    <!-- ════════════════════════════════════════════
         TAB 3: CONFLICTOS
    ════════════════════════════════════════════ -->
    @if (tab() === 'conflictos') {
      <div class="space-y-5 animate-fade-in">

        @if (conflictos().length === 0) {
          <div class="card p-16 text-center">
            <svg class="w-16 h-16 mx-auto mb-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 class="text-lg font-semibold text-emerald-700 mb-1">Sin conflictos detectados</h3>
            <p class="text-sm text-gray-400">Todos los horarios son consistentes. No hay superposiciones de docentes.</p>
          </div>
        } @else {
          <!-- Conflict summary -->
          <div class="card p-4 border-red-200 bg-red-50 flex items-start gap-3">
            <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <div class="font-semibold text-red-700">Se detectaron {{ conflictos().length }} conflicto(s) de horario</div>
              <p class="text-sm text-red-600 mt-0.5">
                Un docente está asignado a más de un aula en el mismo día y período. Solo se listan solapamientos reales del horario guardado.
              </p>
            </div>
          </div>

          <!-- Conflicts table -->
          <div class="space-y-4">
            @for (conf of conflictos(); track conf.key) {
              <div class="card overflow-hidden border-red-200">
                <div class="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center gap-3">
                  <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  <span class="font-semibold text-red-800">{{ conf.docNombre }}</span>
                  <span class="badge badge-red text-xs shrink-0">Docente solapado</span>
                  <span class="text-red-600 text-sm">·</span>
                  <span class="text-red-700 text-sm font-medium">{{ DIAS[conf.dia] }} · {{ getPeriodoNombre(conf.periodoId) }}</span>
                  <span class="text-red-600 text-sm">({{ getPeriodoHora(conf.periodoId) }})</span>
                </div>
                <div class="p-4">
                  <p class="text-xs text-gray-500 mb-3">
                    Este docente aparece en {{ conf.entradas.length }} aulas simultáneamente:
                  </p>
                  <div class="flex flex-wrap gap-3">
                    @for (ent of conf.entradas; track ent.id) {
                      @let cur = curById(ent.cursoId);
                      <div class="flex items-center gap-2 p-3 rounded-xl border-2 border-red-200 bg-white">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          [ngClass]="cur?.colorClass ?? 'bg-gray-100'">
                          {{ ent.seccion }}
                        </div>
                        <div>
                          <div class="text-sm font-semibold text-gray-800">{{ ent.nivel }} {{ ent.grado }} {{ ent.seccion }}</div>
                          <div class="text-xs text-gray-500">{{ cur?.nombre }}</div>
                        </div>
                      </div>
                    }
                  </div>
                  <div class="flex gap-2 mt-4">
                    <button type="button" class="btn btn-danger text-xs gap-1" (click)="abrirModalResolverConflicto(conf)">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                      Elegir aula a conservar
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Empty slots report -->
        <div class="card overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-200 bg-gray-50">
            <h3 class="font-semibold text-gray-700">Huecos en horarios (períodos sin asignar)</h3>
          </div>
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Aula</th>
                <th>Períodos asignados</th>
                <th>Períodos libres</th>
                <th>Completitud</th>
              </tr>
            </thead>
            <tbody>
              @for (cl of todasClasesConEntradas(); track cl.key) {
                @if (cl.filled < cl.totalSlots) {
                  @let pct = Math.round((cl.filled / cl.totalSlots) * 100);
                  <tr>
                    <td class="font-medium">{{ cl.nivel }} · {{ cl.grado }} {{ cl.seccion }}</td>
                    <td class="text-indigo-700 font-semibold">{{ cl.filled }}</td>
                    <td class="text-orange-600 font-semibold">{{ cl.totalSlots - cl.filled }}</td>
                    <td>
                      <div class="flex items-center gap-2">
                        <div class="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div class="h-full rounded-full" [style.width.%]="pct"
                            [ngClass]="pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'">
                          </div>
                        </div>
                        <span class="text-xs font-medium">{{ pct }}%</span>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    }

  </div><!-- /content -->

  <!-- ════════════════════════════════════════════
       MODAL: Agregar / Editar entrada
  ════════════════════════════════════════════ -->
  @if (modalOpen()) {
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="cerrarModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 class="text-lg font-bold text-gray-900">
              {{ mEditId() ? 'Editar entrada' : 'Asignar clase' }}
            </h2>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ DIAS[mDia()] }} · {{ getPeriodoHora(mPer()) }} ·
              {{ selNivel() }} {{ selGrado() }}{{ selSeccion() }}
            </p>
          </div>
          <button class="btn btn-ghost btn-icon" (click)="cerrarModal()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="p-5 space-y-4">
          <!-- Curso -->
          <div>
            <label class="form-label">Curso <span class="text-red-500">*</span></label>
            <select class="form-input w-full" [ngModel]="mCursoId()" (ngModelChange)="onMCursoChange($event ? +$event : null)">
              <option [ngValue]="null">-- Seleccionar curso --</option>
              @for (c of cursosParaNivel(selNivel()); track c.id) {
                <option [ngValue]="c.id">{{ c.nombre }}</option>
              }
            </select>
          </div>

          <!-- Docente -->
          <div>
            <label class="form-label">Docente <span class="text-red-500">*</span></label>
            <select class="form-input w-full" [ngModel]="mDocId()" (ngModelChange)="mDocId.set($event ? +$event : null)">
              <option [ngValue]="null">-- Seleccionar docente --</option>
              @for (d of _docentes(); track d.id) {
                <option [ngValue]="d.id">{{ d.apellidos }}, {{ d.nombres }}</option>
              }
            </select>
          </div>

          <!-- Conflict check -->
          @if (mDocId() && mConflicto()) {
            <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <span>⚠ Conflicto: este docente ya está asignado en este período a otra aula.</span>
            </div>
          }

          <!-- Preview -->
          @if (mCursoId()) {
            @let prevCur = curById(mCursoId()!);
            <div class="p-3 rounded-xl border flex items-center gap-3" [ngClass]="prevCur?.colorClass ?? 'bg-gray-50 border-gray-200'">
              <span class="w-2 h-2 rounded-full flex-shrink-0" [ngClass]="prevCur?.dotClass ?? 'bg-gray-400'"></span>
              <div>
                <div class="font-semibold text-sm">{{ prevCur?.nombre }}</div>
                <div class="text-xs opacity-70">{{ prevCur?.area }}</div>
              </div>
            </div>
          }
        </div>

        <div class="flex gap-2 p-5 pt-0">
          <button class="btn btn-secondary flex-1" (click)="cerrarModal()">Cancelar</button>
          <button class="btn btn-primary flex-1" [disabled]="!mCursoId() || !mDocId()" (click)="guardarEntrada()">
            {{ mEditId() ? 'Guardar' : 'Asignar' }}
          </button>
        </div>
      </div>
    </div>
  }

  <!-- MODAL: Resolver conflicto -->
  @if (confModalOpen()) {
    @let conf = confResolviendo();
    @if (conf) {
      <div appOverlayPortal class="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4" (click)="cerrarModalConflicto()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-5 border-b border-gray-200">
            <div>
              <h2 class="text-lg font-bold text-gray-900">Resolver conflicto</h2>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ conf.docNombre }} · {{ DIAS[conf.dia] }} · {{ getPeriodoNombre(conf.periodoId) }}
                ({{ getPeriodoHora(conf.periodoId) }})
              </p>
            </div>
            <button type="button" class="btn btn-ghost btn-icon" (click)="cerrarModalConflicto()">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-5 space-y-4">
            <p class="text-sm text-gray-600">
              Elige el horario que deseas <strong>conservar</strong>. Las demás entradas duplicadas se eliminarán.
            </p>
            <div class="space-y-2">
              @for (ent of conf.entradas; track ent.id) {
                @let cur = curById(ent.cursoId);
                @let selected = confKeepId() === ent.id;
                <button
                  type="button"
                  class="w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors"
                  [ngClass]="selected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 bg-white hover:border-gray-300'"
                  (click)="seleccionarAulaConservar(ent.id)">
                  <span
                    class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                    [ngClass]="selected ? 'border-indigo-600' : 'border-gray-300'">
                    @if (selected) {
                      <span class="w-2 h-2 rounded-full bg-indigo-600"></span>
                    }
                  </span>
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    [ngClass]="cur?.colorClass ?? 'bg-gray-100'">
                    {{ ent.seccion }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-gray-800">{{ ent.nivel }} {{ ent.grado }} {{ ent.seccion }}</div>
                    <div class="text-xs text-gray-500">{{ cur?.nombre }}</div>
                  </div>
                  @if (selected) {
                    <span class="badge badge-indigo text-xs shrink-0">Se conservará</span>
                  }
                </button>
              }
            </div>
            @if (conf.entradas.length > 1) {
              <p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Se eliminarán {{ conf.entradas.length - 1 }} entrada(s) duplicada(s) en otras aulas.
              </p>
            }
          </div>

          <div class="flex gap-2 p-5 pt-0">
            <button type="button" class="btn btn-secondary flex-1" (click)="cerrarModalConflicto()">Cancelar</button>
            <button
              type="button"
              class="btn btn-primary flex-1"
              [disabled]="confKeepId() == null"
              (click)="confirmarResolverConflicto()">
              Resolver conflicto
            </button>
          </div>
        </div>
      </div>
    }
  }

  <!-- VISTA PREVIA DE IMPRESIÓN -->
  @if (printPreviewOpen()) {
    <div appOverlayPortal class="fixed inset-0 z-[70] flex flex-col bg-gray-900/60" role="dialog" aria-modal="true">
      <div class="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <h2 class="text-sm font-semibold text-gray-900 truncate">{{ printPreviewTitle() }}</h2>
        <div class="flex gap-2 shrink-0">
          <button type="button" class="btn btn-secondary text-sm" (click)="cerrarVistaImpresion()">Cerrar</button>
          <button type="button" class="btn btn-primary text-sm gap-1.5" (click)="ejecutarImpresionPreview()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Imprimir
          </button>
        </div>
      </div>
      <iframe
        [id]="PRINT_PREVIEW_FRAME_ID"
        title="Vista previa de impresión"
        class="flex-1 w-full min-h-0 bg-white border-0"
      ></iframe>
    </div>
  }

  <!-- TOAST -->
  @if (toast().show) {
    <div class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl animate-slide-in-r text-sm font-medium"
      [ngClass]="toast().type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          [attr.d]="toast().type === 'success' ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'"/>
      </svg>
      {{ toast().msg }}
    </div>
  }
</div>
  `
})
export class HorariosComponent implements OnInit, OnDestroy {
  private readonly _tenantReloadReady = setupTenantReload(() => this.cargarDatos(), {
    onBeforeReload: () => this.limpiarDatos(),
  });
  readonly svc = inject(HorariosAdminService);
  private readonly layout = inject(LayoutService);
  readonly tenant = inject(TenantContextService);
  private cargarSub?: Subscription;
  private saveSub?: Subscription;

  readonly puedeGestionar = computed(
    () => !this.tenant.requiresSelection(),
  );

  readonly Math = Math;
  readonly NIVELES: Nivel[] = ['Inicial', 'Primaria', 'Secundaria'];
  readonly DIAS = DIAS;
  readonly PRINT_PREVIEW_FRAME_ID = PRINT_PREVIEW_FRAME_ID;
  readonly TABS = [
    { id: 'horario', label: 'Horario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'gestion', label: 'Gestión', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'conflictos', label: 'Conflictos', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  ];

  readonly diaActual = 0;
  readonly diasFechas = ['15 Jun', '16 Jun', '17 Jun', '18 Jun', '19 Jun'];

  anioEscolar = signal(new Date().getFullYear());
  loadError = signal('');
  tab = signal<MainTab>('horario');
  editMode = signal(false);
  _entradas = signal<EntradaHorario[]>([]);
  _periodos = signal<Periodo[]>([]);
  _cursos = signal<Curso[]>([]);
  _docentes = signal<Docente[]>([]);
  _salones = signal<SalonHorario[]>([]);
  _conflictos = signal<ConflictoHorario[]>([]);
  _gestion = signal<HorarioContext['gestion']>({
    conHorario: 0,
    enProgreso: 0,
    sinHorario: 0,
    clases: [],
  });

  selNivel = signal<Nivel>('Primaria');
  selGrado = signal<string>('5°');
  selSeccion = signal<string>('A');

  modalOpen = signal(false);
  mDia = signal(0);
  mPer = signal(1);
  mEditId = signal<number | null>(null);
  mCursoId = signal<number | null>(null);
  mDocId = signal<number | null>(null);

  confModalOpen = signal(false);
  confResolviendo = signal<ConflictoHorario | null>(null);
  confKeepId = signal<number | null>(null);

  printPreviewOpen = signal(false);
  printPreviewTitle = signal('');

  toast = signal<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  private printPreviewHtml = '';

  periodosVis = computed(() =>
    this._periodos().filter((p) => p.niveles.includes(this.selNivel())),
  );

  horaSalida = computed(() => {
    const n = this.selNivel();
    if (n === 'Inicial') return '12:45 (≈ 1:00 PM)';
    if (n === 'Primaria') return '14:15 (≈ 2:00 PM)';
    return '15:00 (3:00 PM)';
  });

  entriesVista = computed(() =>
    this._entradas().filter(
      (e) =>
        e.nivel === this.selNivel() &&
        e.grado === this.selGrado() &&
        e.seccion === this.selSeccion(),
    ),
  );

  vistaStats = computed(() => {
    const totalSlots = this.periodosVis().filter((p) => !p.isReceso).length * 5;
    const filled = this.entriesVista().length;
    return {
      totalSlots,
      filled,
      empty: totalSlots - filled,
      pct: totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0,
    };
  });

  legendaCursos = computed(() => {
    const ids = new Set(this.entriesVista().map((e) => e.cursoId));
    return this._cursos().filter((c) => ids.has(c.id));
  });

  conflictos = computed(() =>
    this._conflictos().filter((c) => c.tipo === 'docente_solapado'),
  );

  gestionStats = computed(() => {
    const g = this._gestion();
    return {
      conHorario: g.conHorario,
      enProgreso: g.enProgreso,
      sinHorario: g.sinHorario,
    };
  });

  mConflicto = computed(() => {
    if (!this.mDocId()) return false;
    return this._entradas().some(
      (e) =>
        e.docenteId === this.mDocId() &&
        e.dia === this.mDia() &&
        e.periodoId === this.mPer() &&
        e.id !== (this.mEditId() ?? -1),
    );
  });

  ngOnInit(): void {
    this.layout.setTitle('Horarios');
    this.cargarDatos();
    markTenantReloadReady(this._tenantReloadReady);
  }

  ngOnDestroy(): void {
    this.cargarSub?.unsubscribe();
    this.saveSub?.unsubscribe();
  }

  private limpiarDatos(): void {
    this._periodos.set([]);
    this._cursos.set([]);
    this._docentes.set([]);
    this._entradas.set([]);
    this._salones.set([]);
    this._conflictos.set([]);
    this._gestion.set({ conHorario: 0, enProgreso: 0, sinHorario: 0, clases: [] });
    this.editMode.set(false);
    this.loadError.set('');
  }

  cargarDatos(): void {
    this.loadError.set('');
    this.cargarSub?.unsubscribe();
    if (this.tenant.requiresSelection()) {
      this.limpiarDatos();
      return;
    }
    this.cargarSub = this.svc.loadContext(this.anioEscolar()).subscribe({
      next: (ctx) => {
        this.anioEscolar.set(ctx.anioEscolar);
        const mapped = mapHorarioContext(ctx);
        this._periodos.set(mapped.periodos);
        this._cursos.set(mapped.cursos);
        this._docentes.set(mapped.docentes);
        this._entradas.set(mapped.blocks);
        this._salones.set(mapped.salones);
        this._conflictos.set(mapped.conflictos);
        this._gestion.set(mapped.gestion);
        this.syncSeleccionConDatos();
        if (this.mPer() && !mapped.periodos.some((p) => p.id === this.mPer())) {
          const first = mapped.periodos.find((p) => !p.isReceso);
          if (first) this.mPer.set(first.id);
        }
      },
      error: (err: Error) => this.loadError.set(err.message),
    });
  }

  gradosPorNivel(n: Nivel): string[] {
    const grados = new Set<string>();
    for (const s of this._salones()) {
      if (s.nivel === n) grados.add(s.grado);
    }
    for (const cl of this._gestion().clases) {
      if (cl.nivel === n) grados.add(cl.grado);
    }
    for (const e of this._entradas()) {
      if (e.nivel === n) grados.add(e.grado);
    }
    return [...grados].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }

  seccionesPorAula(): string[] {
    return this.seccionesPorGrado(this.selNivel(), this.selGrado());
  }

  seccionesPorGrado(nivel: Nivel, grado: string): string[] {
    const secciones = new Set<string>();

    for (const s of this._salones()) {
      if (s.nivel === nivel && s.grado === grado) secciones.add(s.seccion);
    }
    for (const cl of this._gestion().clases) {
      if (cl.nivel === nivel && cl.grado === grado) secciones.add(cl.seccion);
    }
    for (const e of this._entradas()) {
      if (e.nivel === nivel && e.grado === grado) secciones.add(e.seccion);
    }

    return [...secciones].sort();
  }

  private tieneEntradas(nivel: Nivel, grado: string, seccion: string): boolean {
    return this._entradas().some(
      (e) => e.nivel === nivel && e.grado === grado && e.seccion === seccion,
    );
  }

  private mejorSeleccion(nivel: Nivel): { grado: string; seccion: string } | null {
    const grados = this.gradosPorNivel(nivel);
    let best: { grado: string; seccion: string; count: number } | null = null;

    for (const grado of grados) {
      for (const seccion of this.seccionesPorGrado(nivel, grado)) {
        const count = this._entradas().filter(
          (e) => e.nivel === nivel && e.grado === grado && e.seccion === seccion,
        ).length;
        if (count > 0 && (!best || count > best.count)) {
          best = { grado, seccion, count };
        }
      }
    }
    return best ? { grado: best.grado, seccion: best.seccion } : null;
  }

  private primeraSeccionValida(nivel: Nivel, grado: string, preferida?: string): string {
    const secciones = this.seccionesPorGrado(nivel, grado);
    if (preferida && secciones.includes(preferida)) return preferida;
    const conDatos = secciones.find((s) => this.tieneEntradas(nivel, grado, s));
    return conDatos ?? secciones[0] ?? 'A';
  }

  private syncSeleccionConDatos(): void {
    const nivel = this.selNivel();
    const grados = this.gradosPorNivel(nivel);
    if (!grados.length) {
      const altNivel = this.NIVELES.find((n) => this.gradosPorNivel(n).length > 0);
      if (altNivel && altNivel !== nivel) {
        this.selNivel.set(altNivel);
        this.syncSeleccionConDatos();
      }
      return;
    }

    let grado = grados.includes(this.selGrado()) ? this.selGrado() : grados[0];
    let seccion = this.primeraSeccionValida(nivel, grado, this.selSeccion());

    if (!this.tieneEntradas(nivel, grado, seccion)) {
      const alt = this.mejorSeleccion(nivel);
      if (alt) {
        grado = alt.grado;
        seccion = alt.seccion;
      }
    }

    this.selGrado.set(grado);
    this.selSeccion.set(seccion);
  }

  onNivelChange(n: Nivel): void {
    this.selNivel.set(n);
    this.syncSeleccionConDatos();
  }

  onGradoChange(grado: string): void {
    this.selGrado.set(grado);
    this.selSeccion.set(this.primeraSeccionValida(this.selNivel(), grado, this.selSeccion()));
  }

  getEntrada(dia: number, periodoId: number): EntradaHorario | null {
    return this.entriesVista().find((e) => e.dia === dia && e.periodoId === periodoId) ?? null;
  }

  curById(id: number): Curso | undefined {
    return this._cursos().find((c) => c.id === id);
  }

  docById(id: number): Docente | undefined {
    return this._docentes().find((d) => d.id === id);
  }

  getPeriodoNombre(id: number): string {
    return this._periodos().find((p) => p.id === id)?.nombre ?? '';
  }

  getPeriodoHora(id: number): string {
    const p = this._periodos().find((p) => p.id === id);
    return p ? `${p.horaInicio}–${p.horaFin}` : '';
  }

  cursosParaNivel(n: Nivel): Curso[] {
    return this._cursos().filter((c) => c.nivel === n);
  }

  abrirModal(dia: number, periodoId: number, entrada: EntradaHorario | null): void {
    this.mDia.set(dia);
    this.mPer.set(periodoId);
    if (entrada) {
      this.mEditId.set(entrada.id);
      this.mCursoId.set(entrada.cursoId);
      this.mDocId.set(entrada.docenteId);
    } else {
      this.mEditId.set(null);
      this.mCursoId.set(null);
      this.mDocId.set(null);
    }
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
  }

  onMCursoChange(id: number | null): void {
    this.mCursoId.set(id);
  }

  guardarEntrada(): void {
    if (!this.mCursoId() || !this.mDocId()) return;

    if (this.mEditId()) {
      this.saveSub?.unsubscribe();
      this.saveSub = this.svc
        .update(this.mEditId()!, {
          cursoId: this.mCursoId()!,
          docenteId: this.mDocId()!,
        })
        .subscribe({
          next: () => {
            this.cargarDatos();
            this.showToast('Entrada actualizada');
            this.cerrarModal();
          },
          error: (err: Error) => this.showToast(err.message, 'error'),
        });
    } else {
      this.saveSub?.unsubscribe();
      this.saveSub = this.svc
        .create({
          anioEscolar: this.anioEscolar(),
          nivel: this.selNivel(),
          grado: this.selGrado(),
          seccion: this.selSeccion(),
          dia: this.mDia(),
          periodoId: this.mPer(),
          cursoId: this.mCursoId()!,
          docenteId: this.mDocId()!,
        })
        .subscribe({
          next: () => {
            this.cargarDatos();
            this.showToast('Clase asignada correctamente');
            this.cerrarModal();
          },
          error: (err: Error) => this.showToast(err.message, 'error'),
        });
    }
  }

  eliminarEntrada(ev: Event, id: number): void {
    ev.stopPropagation();
    this.saveSub?.unsubscribe();
    this.saveSub = this.svc.remove(id).subscribe({
      next: () => {
        this.cargarDatos();
        this.showToast('Entrada eliminada', 'error');
      },
      error: (err: Error) => this.showToast(err.message, 'error'),
    });
  }

  totalSlotsNivel(nivel: Nivel): number {
    return this._periodos().filter((p) => !p.isReceso && p.niveles.includes(nivel)).length * 5;
  }

  clasesPorNivel(nivel: Nivel): GestionClaseHorario[] {
    const clases = this._gestion().clases.filter((cl) => cl.nivel === nivel);
    if (clases.length) return clases;
    return this._salones()
      .filter((cl) => cl.nivel === nivel)
      .map((cl) => {
        const totalSlots = this.totalSlotsNivel(nivel);
        const filled = this._entradas().filter(
          (e) => e.nivel === cl.nivel && e.grado === cl.grado && e.seccion === cl.seccion,
        ).length;
        return {
          ...cl,
          key: `${cl.nivel}-${cl.grado}-${cl.seccion}`,
          totalSlots,
          filled,
          estado: (filled === 0
            ? 'sin_horario'
            : filled < totalSlots
              ? 'en_progreso'
              : 'completo') as GestionClaseHorario['estado'],
        };
      });
  }

  todasClasesConEntradas() {
    const base = this._gestion().clases.length
      ? this._gestion().clases
      : this._salones().map((cl) => {
          const totalSlots = this.totalSlotsNivel(cl.nivel);
          const filled = this._entradas().filter(
            (e) => e.nivel === cl.nivel && e.grado === cl.grado && e.seccion === cl.seccion,
          ).length;
          return {
            ...cl,
            key: `${cl.nivel}-${cl.grado}-${cl.seccion}`,
            totalSlots,
            filled,
            estado: 'sin_horario' as const,
          };
        });
    return base.filter((cl) => cl.filled > 0);
  }

  irAHorario(nivel: Nivel, grado: string, seccion: string): void {
    this.selNivel.set(nivel);
    this.selGrado.set(grado);
    this.selSeccion.set(seccion);
    this.tab.set('horario');
  }

  abrirModalResolverConflicto(conf: ConflictoHorario): void {
    this.confResolviendo.set(conf);
    this.confKeepId.set(conf.entradas[0]?.id ?? null);
    this.confModalOpen.set(true);
  }

  seleccionarAulaConservar(id: number): void {
    this.confKeepId.set(id);
  }

  cerrarModalConflicto(): void {
    this.confModalOpen.set(false);
    this.confResolviendo.set(null);
    this.confKeepId.set(null);
  }

  confirmarResolverConflicto(): void {
    const conf = this.confResolviendo();
    if (!conf) return;

    this.saveSub?.unsubscribe();

    const keepId = this.confKeepId();
    if (keepId == null) return;

    const keep = conf.entradas.find((e) => e.id === keepId);
    if (!keep) {
      this.showToast('Selecciona un horario válido para conservar.', 'error');
      return;
    }

    const removeIds = conf.entradas.filter((e) => e.id !== keepId).map((e) => e.id);
    if (!removeIds.length) {
      this.showToast('No hay entradas duplicadas para eliminar.', 'error');
      return;
    }

    this.saveSub = this.svc
      .resolveConflicts({ keepBlockId: keep.id, removeBlockIds: removeIds })
      .subscribe({
        next: () => {
          this.cerrarModalConflicto();
          this.cargarDatos();
          this.showToast(
            `Conflicto resuelto — se conservó ${keep.nivel} ${keep.grado} ${keep.seccion}`,
          );
        },
        error: (err: Error) => this.showToast(err.message, 'error'),
      });
  }

  imprimir(): void {
    const t = this.tab();
    if (t === 'horario') {
      this.abrirVistaImpresion(
        `Horario ${this.selNivel()} ${this.selGrado()} ${this.selSeccion()}`,
        this.buildHorarioPrintBody(),
      );
      return;
    }
    if (t === 'gestion') {
      this.abrirVistaImpresion('Gestión de horarios', this.buildGestionPrintBody());
      return;
    }
    this.abrirVistaImpresion('Conflictos de horario', this.buildConflictosPrintBody());
  }

  abrirVistaImpresion(titulo: string, contenido: string): void {
    this.printPreviewTitle.set(titulo);
    this.printPreviewHtml = wrapPrintDocumentHtml(titulo, contenido);
    this.printPreviewOpen.set(true);
    setTimeout(() => this.syncPrintPreviewFrame(), 0);
  }

  cerrarVistaImpresion(): void {
    this.printPreviewOpen.set(false);
    this.printPreviewTitle.set('');
    this.printPreviewHtml = '';
  }

  ejecutarImpresionPreview(): void {
    const iframe = document.getElementById(PRINT_PREVIEW_FRAME_ID) as HTMLIFrameElement | null;
    if (!iframe || !printIframe(iframe)) {
      this.showToast('No se pudo abrir el diálogo de impresión.', 'error');
    }
  }

  private syncPrintPreviewFrame(): void {
    const iframe = document.getElementById(PRINT_PREVIEW_FRAME_ID) as HTMLIFrameElement | null;
    if (!iframe || !this.printPreviewHtml) return;
    if (!writeHtmlToIframe(iframe, this.printPreviewHtml)) {
      this.showToast('No se pudo cargar la vista previa.', 'error');
    }
  }

  private buildHorarioPrintBody(): string {
    const stats = this.vistaStats();
    const fecha = new Date().toLocaleString('es-PE');
    const headerCols = DIAS.map((d) => `<th>${escapeHtml(d)}</th>`).join('');
    const rows = this.periodosVis()
      .map((periodo) => {
        if (periodo.isReceso) {
          return `<tr class="receso">
            <td>${escapeHtml(periodo.nombre)}<br><small>${periodo.horaInicio}–${periodo.horaFin}</small></td>
            <td colspan="5" style="text-align:center">Recreo — ${periodo.horaInicio} a ${periodo.horaFin}</td>
          </tr>`;
        }
        const cells = [0, 1, 2, 3, 4]
          .map((di) => {
            const entrada = this.getEntrada(di, periodo.id);
            if (!entrada) return '<td class="empty">—</td>';
            const cur = this.curById(entrada.cursoId);
            const doc = this.docById(entrada.docenteId);
            return `<td><strong>${escapeHtml(cur?.nombre ?? '—')}</strong><br><small>${escapeHtml(doc?.abrev ?? '')}</small></td>`;
          })
          .join('');
        return `<tr>
          <td>${escapeHtml(periodo.nombre)}<br><small>${periodo.horaInicio}–${periodo.horaFin}</small></td>
          ${cells}
        </tr>`;
      })
      .join('');
    const leyenda = this.legendaCursos()
      .map((c) => escapeHtml(c.nombre))
      .join(' · ');

    return `
      <h1>Horario semanal — ${escapeHtml(this.selNivel())} ${escapeHtml(this.selGrado())} Sección ${escapeHtml(this.selSeccion())}</h1>
      <p class="meta">Año escolar ${this.anioEscolar()} · Completitud ${stats.pct}% (${stats.filled}/${stats.totalSlots} períodos) · Generado: ${escapeHtml(fecha)}</p>
      <table>
        <thead><tr><th>Período</th>${headerCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${leyenda ? `<p class="meta"><strong>Cursos:</strong> ${leyenda}</p>` : ''}
    `;
  }

  private buildGestionPrintBody(): string {
    const stats = this.gestionStats();
    const fecha = new Date().toLocaleString('es-PE');
    const bloques = this.NIVELES.map((nivel) => {
      const clases = this.clasesPorNivel(nivel);
      if (!clases.length) return '';
      const rows = clases
        .map((cl) => {
          const pct = cl.totalSlots > 0 ? Math.round((cl.filled / cl.totalSlots) * 100) : 0;
          const estado = pct === 100 ? 'Completo' : pct > 0 ? 'En progreso' : 'Sin horario';
          return `<tr>
            <td>${escapeHtml(cl.grado)} · Sección ${escapeHtml(cl.seccion)}</td>
            <td>${estado}</td>
            <td style="text-align:center">${cl.filled} / ${cl.totalSlots}</td>
            <td style="text-align:center">${pct}%</td>
          </tr>`;
        })
        .join('');
      return `<div class="block">
        <h2>${escapeHtml(nivel)}</h2>
        <table>
          <thead>
            <tr>
              <th>Grado / Sección</th>
              <th>Estado</th>
              <th>Períodos asignados</th>
              <th>Completitud</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join('');

    return `
      <h1>Gestión de horarios</h1>
      <p class="meta">Año escolar ${this.anioEscolar()} · Generado: ${escapeHtml(fecha)}</p>
      <p class="meta">
        Con horario: <strong>${stats.conHorario}</strong> ·
        Incompletos: <strong>${stats.enProgreso}</strong> ·
        Sin horario: <strong>${stats.sinHorario}</strong> ·
        Total entradas: <strong>${this._entradas().length}</strong>
      </p>
      ${bloques || '<p class="empty">No hay aulas registradas.</p>'}
    `;
  }

  private buildConflictosPrintBody(): string {
    const fecha = new Date().toLocaleString('es-PE');
    const lista = this.conflictos();
    const conflictosHtml =
      lista.length === 0
        ? '<p class="empty">Sin conflictos detectados.</p>'
        : lista
            .map((conf) => {
              const entradas = conf.entradas
                .map((ent) => {
                  const cur = this.curById(ent.cursoId);
                  return `<li>${escapeHtml(ent.nivel)} ${escapeHtml(ent.grado)} ${escapeHtml(ent.seccion)} — ${escapeHtml(cur?.nombre ?? '—')}</li>`;
                })
                .join('');
              return `<div class="block">
                <h2>${escapeHtml(conf.docNombre)}</h2>
                <p class="meta">${escapeHtml(DIAS[conf.dia])} · ${escapeHtml(this.getPeriodoNombre(conf.periodoId))} (${escapeHtml(this.getPeriodoHora(conf.periodoId))})</p>
                <ul>${entradas}</ul>
              </div>`;
            })
            .join('');

    const huecos = this.todasClasesConEntradas().filter((cl) => cl.filled < cl.totalSlots);
    const huecosHtml =
      huecos.length === 0
        ? '<p class="empty">No hay huecos en horarios con entradas parciales.</p>'
        : `<table>
            <thead>
              <tr>
                <th>Aula</th>
                <th>Asignados</th>
                <th>Libres</th>
                <th>Completitud</th>
              </tr>
            </thead>
            <tbody>${huecos
              .map((cl) => {
                const pct = cl.totalSlots > 0 ? Math.round((cl.filled / cl.totalSlots) * 100) : 0;
                return `<tr>
                  <td>${escapeHtml(cl.nivel)} · ${escapeHtml(cl.grado)} ${escapeHtml(cl.seccion)}</td>
                  <td style="text-align:center">${cl.filled}</td>
                  <td style="text-align:center">${cl.totalSlots - cl.filled}</td>
                  <td style="text-align:center">${pct}%</td>
                </tr>`;
              })
              .join('')}</tbody>
          </table>`;

    return `
      <h1>Conflictos y huecos de horario</h1>
      <p class="meta">Año escolar ${this.anioEscolar()} · ${lista.length} conflicto(s) · Generado: ${escapeHtml(fecha)}</p>
      <h2>Conflictos de docente</h2>
      ${conflictosHtml}
      <h2>Huecos en horarios</h2>
      ${huecosHtml}
    `;
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast.set({ show: true, msg, type });
    setTimeout(() => this.toast.set({ show: false, msg: '', type: 'success' }), 3000);
  }
}


