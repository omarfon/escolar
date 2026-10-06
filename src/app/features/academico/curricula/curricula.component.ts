import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { OverlayPortalDirective } from '../../../core/overlay/overlay-portal.directive';
import {
  etiquetaGradoConNivel,
  normalizeGradoMatriculaKey,
} from '../../../core/academico/grado-display.util';
import { CurriculaService } from './curricula.service';
import { pickCurriculaVigente } from './curricula-vigente.util';
import { AsignacionService } from '../asignacion/asignacion.service';
import { MaestrosPeriodosAcademicosService } from '../../matricula/maestros/periodos-academicos/periodos-academicos.service';
import { AsignacionDocente, DocenteAsignacion } from '../asignacion/asignacion.model';
import { MaestrosCursosService } from '../../matricula/maestros/cursos/cursos.service';
import { MaestroCursoItem } from '../../matricula/maestros/cursos/cursos.model';
import {
  Area,
  AsignDocente,
  Capacidad,
  Competencia,
  Curricula,
  CurriculaCatalog,
  CurriculaDetail,
  MallaCurricular,
  Curso,
  EstadoCurr,
  Indicador,
  MainTab,
  NivelCurricula,
  TipoEscala,
  TipoPeriodo,
} from './curricula.model';

type CfgTab = 'escalas' | 'periodos' | 'docentes';

interface MallaCeldaAsignacion {
  asignado: boolean;
  docente: string | null;
  docenteCompleto: string | null;
  secciones: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const G_INI = ['3 años', '4 años', '5 años'];
const G_PRI = ['1°', '2°', '3°', '4°', '5°', '6°'];
const G_SEC = ['1°', '2°', '3°', '4°', '5°'];
const SECCIONES_FALLBACK = ['A', 'B', 'C', 'D'];

function gradoAsignacionKey(value: string): string {
  const t = value.trim().toLowerCase();
  if (t.includes('año') || t.includes('anos')) {
    return t.replace(/\s+/g, ' ');
  }
  let g = t
    .replace(/[°º]/g, '')
    .replace(/\s*(grado|año|ano|anos)\b/g, '')
    .trim();
  const withNivel = g.match(/^(.+?)\s+(inicial|primaria|secundaria)$/i);
  if (withNivel) g = withNivel[1].trim();
  const num = g.match(/^(\d+)/);
  return num ? num[1] : g;
}

function gradosIncluyen(grado: string, grados: string[]): boolean {
  const key = normalizeGradoMatriculaKey(grado);
  return grados.some((g) => normalizeGradoMatriculaKey(g) === key);
}

// ── Component ──────────────────────────────────────────────────────────────
@Component({
  selector: 'app-curricula',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, OverlayPortalDirective],
  template: `
<div class="min-h-screen bg-gray-50 animate-fade-in">

  <!-- ── HEADER ──────────────────────────────────────────────────── -->
  <div class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <span>Gestión Académica</span>
          <span>›</span>
          <span class="text-gray-700 font-medium">Currícula</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Gestión Curricular</h1>
        <p class="text-sm text-gray-500 mt-0.5">Estructura académica: áreas · cursos · competencias · mallas@if (anioActivo()) { — A.E. {{ anioActivo() }} }</p>
      </div>
      <div class="flex items-center gap-2 mt-1">
        <button class="btn btn-secondary text-sm gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          Copiar de año anterior
        </button>
        <button class="btn btn-primary text-sm gap-1.5" (click)="abrirModalCurr()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nueva Currícula
        </button>
      </div>
    </div>

    <!-- TABS -->
    <div class="flex gap-0.5 mt-5 border-b border-gray-100 -mb-px">
      @for (t of TABS; track t.id) {
        <button class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all"
          [ngClass]="tab() === t.id
            ? 'border-indigo-600 text-indigo-700'
            : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'"
          (click)="cambiarTab($any(t.id))">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="t.icon"/>
          </svg>
          {{ t.label }}
          @if (t.badge) {
            <span class="ml-0.5 px-1.5 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">{{ t.badge }}</span>
          }
        </button>
      }
    </div>
  </div>

  <!-- ── CONTENT ──────────────────────────────────────────────────── -->
  <div class="p-6 max-w-[1400px] mx-auto">

    <!-- ════════════════════════════════════════════
         TAB 1: CURRÍCULAS
    ════════════════════════════════════════════ -->
    @if (tab() === 'curriculas') {
      <div class="space-y-5 animate-fade-in">

        <!-- Summary cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="card p-4 border-l-4 border-l-green-500">
            <div class="text-2xl font-bold text-green-600">{{ curricActivas() }}</div>
            <div class="text-xs text-gray-500 mt-1">Currículas Activas</div>
          </div>
          <div class="card p-4 border-l-4 border-l-yellow-400">
            <div class="text-2xl font-bold text-yellow-600">{{ curricBorradores() }}</div>
            <div class="text-xs text-gray-500 mt-1">En Borrador</div>
          </div>
          <div class="card p-4 border-l-4 border-l-gray-300">
            <div class="text-2xl font-bold text-gray-500">{{ curricInactivas() }}</div>
            <div class="text-xs text-gray-500 mt-1">Inactivas</div>
          </div>
          <div class="card p-4 border-l-4 border-l-indigo-400">
            <div class="text-2xl font-bold text-indigo-600">{{ _curriculas().length }}</div>
            <div class="text-xs text-gray-500 mt-1">Total Historial</div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="card p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label class="form-label">Año lectivo</label>
            <select class="form-input w-28" [ngModel]="fAnio()" (ngModelChange)="fAnio.set($event ? +$event : null)">
              <option [ngValue]="null">Todos</option>
              <option [ngValue]="2028">2028</option>
              <option [ngValue]="2027">2027</option>
              <option [ngValue]="2026">2026</option>
              <option [ngValue]="2025">2025</option>
              <option [ngValue]="2024">2024</option>
            </select>
          </div>
          <div>
            <label class="form-label">Nivel</label>
            <select class="form-input w-36" [ngModel]="fNivel()" (ngModelChange)="fNivel.set($event)">
              <option value="">Todos</option>
              <option value="Inicial">Inicial</option>
              <option value="Primaria">Primaria</option>
              <option value="Secundaria">Secundaria</option>
            </select>
          </div>
          <div>
            <label class="form-label">Estado</label>
            <select class="form-input w-36" [ngModel]="fEstado()" (ngModelChange)="fEstado.set($event)">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="borrador">Borrador</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div class="ml-auto text-sm text-gray-400 self-center">
            {{ curricFiltradas().length }} resultado(s)
          </div>
        </div>

        <!-- Table -->
        <div class="card overflow-hidden">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Año</th>
                <th>Nivel</th>
                <th>Versión</th>
                <th>Escala de calificación</th>
                <th>Periodos</th>
                <th>Estado</th>
                <th>Creación</th>
                <th class="text-right pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (c of curricFiltradas(); track c.id) {
                @let expandido = detalleExpandidoId() === c.id;
                @let detalle = detalleCache()[c.id];
                <tr class="cursor-pointer hover:bg-gray-50/80" (click)="toggleDetalleCurricula(c.id)">
                  <td class="font-bold text-gray-900 text-base">{{ c.anio }}</td>
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-blue':   c.nivel === 'Inicial',
                      'badge-indigo': c.nivel === 'Primaria',
                      'badge-purple': c.nivel === 'Secundaria'
                    }">{{ c.nivel }}</span>
                  </td>
                  <td><span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">v{{ c.version }}</span></td>
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full" [ngClass]="{
                        'bg-blue-500':   c.tipoEscala === 'numerica',
                        'bg-green-500':  c.tipoEscala === 'literal',
                        'bg-purple-500': c.tipoEscala === 'competencia'
                      }"></span>
                      <div>
                        <div class="text-sm font-medium text-gray-800">{{ escalaLabel(c.tipoEscala) }}</div>
                        <div class="text-xs text-gray-400">{{ c.tipoEscala }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="text-sm text-gray-700">{{ c.tipoPeriodo === 'bimestral' ? '4 Bimestres' : '3 Trimestres' }}</td>
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-green':  c.estado === 'activo',
                      'badge-yellow': c.estado === 'borrador',
                      'badge-gray':   c.estado === 'inactivo'
                    }">{{ c.estado }}</span>
                  </td>
                  <td class="text-sm text-gray-400">{{ c.fechaCreacion }}</td>
                  <td class="text-right pr-2" (click)="$event.stopPropagation()">
                    <div class="flex items-center justify-end gap-1">
                      <button class="btn btn-ghost btn-icon" title="Ver detalle"
                        (click)="toggleDetalleCurricula(c.id)">
                        <svg class="w-4 h-4 transition-transform" [ngClass]="expandido ? 'rotate-180' : ''"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      @if (c.estado !== 'inactivo') {
                        <button class="btn btn-ghost btn-icon" title="Editar" (click)="abrirModalCurr(c)">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                      }
                      <button class="btn btn-ghost btn-icon text-blue-500" title="Copiar" (click)="copiarCurricula(c.id)">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                      </button>
                      @if (c.estado !== 'activo') {
                        <button class="btn btn-ghost btn-icon text-green-600" title="Activar" (click)="activarCurricula(c.id)">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
                @if (expandido) {
                  <tr class="bg-indigo-50/40">
                    <td colspan="8" class="px-6 py-4">
                      @if (!detalle) {
                        <div class="text-sm text-gray-400 animate-pulse">Cargando detalle…</div>
                      } @else {
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div class="bg-white rounded-lg p-3 border border-indigo-100">
                            <div class="text-xl font-bold text-indigo-600">{{ detalle.areasCount }}</div>
                            <div class="text-xs text-gray-500">Áreas curriculares</div>
                          </div>
                          <div class="bg-white rounded-lg p-3 border border-indigo-100">
                            <div class="text-xl font-bold text-blue-600">{{ detalle.cursosCount }}</div>
                            <div class="text-xs text-gray-500">Cursos</div>
                          </div>
                          <div class="bg-white rounded-lg p-3 border border-indigo-100">
                            <div class="text-xl font-bold text-purple-600">{{ detalle.competenciasCount }}</div>
                            <div class="text-xs text-gray-500">Competencias</div>
                          </div>
                          <div class="bg-white rounded-lg p-3 border border-indigo-100">
                            <div class="text-xl font-bold text-emerald-600">{{ detalle.totalHoras }}h</div>
                            <div class="text-xs text-gray-500">Horas semanales</div>
                          </div>
                        </div>
                        <div class="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
                          <span><strong>ID:</strong> {{ detalle.id }}</span>
                          <span class="text-gray-300">|</span>
                          <span><strong>Escala:</strong> {{ escalaLabel(detalle.tipoEscala) }}</span>
                          <span class="text-gray-300">|</span>
                          <span><strong>Periodos:</strong> {{ detalle.tipoPeriodo }}</span>
                          <span class="text-gray-300">|</span>
                          <span><strong>Creada:</strong> {{ detalle.fechaCreacion }}</span>
                        </div>
                        <button type="button" class="btn btn-secondary text-sm" (click)="irGestionarCurricula(c)">
                          Gestionar áreas y cursos →
                        </button>
                      }
                    </td>
                  </tr>
                }
              }
              @empty {
                <tr>
                  <td colspan="8" class="text-center py-16 text-gray-400">
                    <svg class="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    No se encontraron currículas con los filtros aplicados
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- ════════════════════════════════════════════
         TAB 2: ÁREAS Y CURSOS
    ════════════════════════════════════════════ -->
    @if (tab() === 'areas') {
      <div class="space-y-5 animate-fade-in">

        <!-- Nivel pills + currícula + actions -->
        <div class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex gap-2">
              @for (n of NIVELES; track n) {
                <button class="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                  [ngClass]="nivelArea() === n
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700'"
                  (click)="onNivelAreaChange($any(n))">
                  {{ n }}
                </button>
              }
            </div>
            <div class="flex gap-2">
              <button class="btn btn-secondary text-sm gap-1.5" (click)="abrirModalArea()"
                [disabled]="!puedeEditar()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Nueva Área
              </button>
              <button class="btn btn-primary text-sm gap-1.5" (click)="abrirModalCurso()"
                [disabled]="!puedeEditar() || areasActuales().length === 0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Nuevo Curso
              </button>
            </div>
          </div>

          <div class="card p-4 flex flex-wrap items-end gap-4">
            <div class="flex-1 min-w-[220px]">
              <label class="form-label">Currícula</label>
              <select class="form-input w-full" [ngModel]="curriculaSelId()" (ngModelChange)="seleccionarCurricula(+$event)">
                @for (c of curriculasDelNivel(); track c.id) {
                  <option [ngValue]="c.id">{{ c.anio }} · v{{ c.version }} ({{ c.estado }})</option>
                }
              </select>
            </div>
            @if (curriculaSel(); as curr) {
              <div class="text-sm text-gray-500 pb-2">
                Escala {{ escalaLabel(curr.tipoEscala) }} · Periodos {{ curr.tipoPeriodo }}
                @if (!puedeEditar()) {
                  <span class="ml-2 text-amber-600 font-medium">(solo lectura)</span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4">
          <div class="card p-4 text-center">
            <div class="text-3xl font-bold text-indigo-600">{{ areasActuales().length }}</div>
            <div class="text-xs text-gray-500 mt-1 uppercase tracking-wide">Áreas Curriculares</div>
          </div>
          <div class="card p-4 text-center">
            <div class="text-3xl font-bold text-blue-600">{{ cursosActuales().length }}</div>
            <div class="text-xs text-gray-500 mt-1 uppercase tracking-wide">Cursos Definidos</div>
          </div>
          <div class="card p-4 text-center">
            <div class="text-3xl font-bold text-emerald-600">{{ totalHorasActuales() }}</div>
            <div class="text-xs text-gray-500 mt-1 uppercase tracking-wide">Horas Semanales</div>
          </div>
        </div>

        <!-- Area cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (area of areasActuales(); track area.id) {
            @let cursosArea = cursosParaArea(area.id);
            @let isOpen = isAreaOpen(area.id);
            <div class="card overflow-hidden transition-all">
              <!-- Area header -->
              <div class="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors gap-2">
                <button type="button" class="flex items-center gap-3 flex-1 min-w-0 text-left"
                  (click)="toggleArea(area.id)">
                  <span class="w-3 h-3 rounded-full flex-shrink-0" [ngClass]="area.dotClass"></span>
                  <div class="min-w-0">
                    <div class="font-semibold text-gray-900 truncate">{{ area.nombre }}</div>
                    <div class="text-xs text-gray-500">{{ cursosArea.length }} curso(s)</div>
                  </div>
                </button>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <span class="text-xs px-2 py-0.5 rounded-full border font-medium hidden sm:inline" [ngClass]="area.colorClass">
                    Orden {{ area.orden }}
                  </span>
                  <button type="button" class="btn btn-ghost btn-icon" title="Editar área"
                    (click)="abrirModalArea(area)" [disabled]="!puedeEditar()">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button type="button" class="btn btn-ghost btn-icon" title="Eliminar área"
                    (click)="eliminarArea(area)" [disabled]="!puedeEditar()">
                    <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                  <button type="button" class="btn btn-ghost btn-icon" (click)="toggleArea(area.id)">
                    <svg class="w-4 h-4 text-gray-400 transition-transform"
                      [ngClass]="isOpen ? 'rotate-180' : ''"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Courses list (expandable) -->
              @if (isOpen) {
                <div class="border-t border-gray-100">
                  @if (cursosArea.length === 0) {
                    <div class="px-4 py-3 text-xs text-gray-400 text-center">Sin cursos asignados</div>
                  }
                  @for (curso of cursosArea; track curso.id; let last = $last) {
                    <div class="flex items-center justify-between px-4 py-2.5 gap-2"
                      [ngClass]="!last ? 'border-b border-gray-50' : ''">
                      <div class="flex items-center gap-2 min-w-0 flex-1">
                        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" [ngClass]="area.dotClass"></span>
                        <span class="text-sm text-gray-700 truncate">{{ curso.nombre }}</span>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <span class="text-xs text-gray-400 hidden sm:inline">
                          {{ curso.grados.length }} grado(s)
                        </span>
                        <span class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {{ curso.horasSemanales }}h/sem
                        </span>
                        <button type="button" class="btn btn-ghost btn-icon" title="Editar curso"
                          (click)="abrirModalCurso(area.id, curso)">
                          <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button type="button" class="btn btn-ghost btn-icon" title="Eliminar curso"
                          (click)="eliminarCurso(curso)">
                          <svg class="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  }
                  <div class="px-4 py-2 bg-gray-50 flex justify-between items-center">
                    <span class="text-xs text-gray-400">
                      Total: {{ cursosArea.reduce((s, c) => s + c.horasSemanales, 0) }}h semanales
                    </span>
                    <button type="button" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      (click)="abrirModalCurso(area.id)">+ Agregar curso</button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }

    <!-- ════════════════════════════════════════════
         TAB 3: COMPETENCIAS
    ════════════════════════════════════════════ -->
    @if (tab() === 'competencias') {
      <div class="animate-fade-in">
        <div class="flex gap-6">

          <!-- Left: Selectors -->
          <div class="w-64 flex-shrink-0 space-y-4">
            <div class="card p-4 space-y-3">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtrar por</h3>
              <div>
                <label class="form-label">Nivel</label>
                <select class="form-input w-full" [ngModel]="nivelComp()" (ngModelChange)="onNivelCompChange($event)">
                  <option value="Inicial">Inicial</option>
                  <option value="Primaria">Primaria</option>
                  <option value="Secundaria">Secundaria</option>
                </select>
              </div>
              <div>
                <label class="form-label">Curso</label>
                <select class="form-input w-full" [ngModel]="cursoSelId()" (ngModelChange)="cursoSelId.set($event ? +$event : null)">
                  <option [ngValue]="null">-- Seleccionar --</option>
                  @for (c of cursosComp(); track c.id) {
                    <option [ngValue]="c.id">{{ c.nombre }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Info box -->
            <div class="card p-4 bg-indigo-50 border-indigo-200">
              <div class="text-xs font-semibold text-indigo-700 mb-2">Marco MINEDU</div>
              <div class="text-xs text-indigo-600 space-y-1">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>Competencia</span>
                </div>
                <div class="flex items-center gap-1.5 pl-4">
                  <span class="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>Capacidad</span>
                </div>
                <div class="flex items-center gap-1.5 pl-8">
                  <span class="w-2 h-2 rounded-full bg-gray-400"></span>
                  <span>Indicador</span>
                </div>
              </div>
            </div>

            <!-- Stats for selection -->
            @if (cursoSelId()) {
              <div class="card p-4 space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Competencias</span>
                  <span class="font-semibold text-indigo-700">{{ compsFiltradas().length }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Capacidades</span>
                  <span class="font-semibold text-blue-700">{{ totalCapacidades() }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Indicadores</span>
                  <span class="font-semibold text-gray-700">{{ totalIndicadores() }}</span>
                </div>
              </div>
            }
          </div>

          <!-- Right: Tree -->
          <div class="flex-1 min-w-0">
            @if (!cursoSelId()) {
              <div class="card p-16 text-center text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                Selecciona un curso para ver sus competencias
              </div>
            }
            @if (cursoSelId()) {
              @let cursoNombre = getCursoNombre(cursoSelId()!);
              <div class="space-y-3">
                <!-- Header -->
                <div class="flex items-center justify-between">
                  <div>
                    <h2 class="font-bold text-gray-900 text-lg">{{ cursoNombre }}</h2>
                    <p class="text-sm text-gray-500">{{ nivelComp() }} · Competencias según MINEDU 2016</p>
                  </div>
                  <button class="btn btn-primary text-sm gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Nueva Competencia
                  </button>
                </div>

                @if (compsFiltradas().length === 0) {
                  <div class="card p-10 text-center text-gray-400 text-sm">
                    Sin competencias registradas para este curso
                  </div>
                }

                <!-- Competencias tree -->
                @for (comp of compsFiltradas(); track comp.id; let ci = $index) {
                  @let isCompOpen = isCompExpanded(comp.id);
                  @let caps = capsForComp(comp.id);
                  <div class="card overflow-hidden">
                    <!-- Competencia row -->
                    <button class="w-full flex items-start gap-3 p-4 hover:bg-indigo-50 transition-colors"
                      (click)="toggleComp(comp.id)">
                      <div class="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0 mt-0.5">
                        C{{ ci + 1 }}
                      </div>
                      <div class="flex-1 text-left">
                        <div class="font-semibold text-gray-900 text-sm leading-snug">{{ comp.nombre }}</div>
                        <div class="text-xs text-gray-400 mt-0.5">{{ caps.length }} capacidad(es)</div>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <span class="badge" [ngClass]="comp.activo ? 'badge-green' : 'badge-gray'">
                          {{ comp.activo ? 'Activa' : 'Inactiva' }}
                        </span>
                        <svg class="w-4 h-4 text-gray-400 transition-transform"
                          [ngClass]="isCompOpen ? 'rotate-180' : ''"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </button>

                    <!-- Capacidades -->
                    @if (isCompOpen) {
                      <div class="border-t border-indigo-100 bg-gray-50">
                        @for (cap of caps; track cap.id; let ki = $index) {
                          @let isCapOpen = isCapExpanded(cap.id);
                          @let inds = indsForCap(cap.id);
                          <div class="border-b border-gray-100 last:border-0">
                            <!-- Capacidad row -->
                            <button class="w-full flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition-colors"
                              (click)="toggleCap(cap.id)">
                              <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                {{ ki + 1 }}
                              </div>
                              <div class="flex-1 text-left">
                                <div class="text-sm text-gray-800">{{ cap.nombre }}</div>
                                <div class="text-xs text-gray-400 mt-0.5">{{ inds.length }} indicador(es)</div>
                              </div>
                              @if (inds.length > 0) {
                                <svg class="w-4 h-4 text-gray-300 transition-transform flex-shrink-0 mt-0.5"
                                  [ngClass]="isCapOpen ? 'rotate-180' : ''"
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                              }
                            </button>

                            <!-- Indicadores -->
                            @if (isCapOpen && inds.length > 0) {
                              <div class="bg-white border-t border-gray-100">
                                @for (ind of inds; track ind.id; let ii = $index) {
                                  <div class="flex items-start gap-3 px-6 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                    <span class="w-5 h-5 rounded-full border-2 border-gray-300 text-gray-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                                      {{ ii + 1 }}
                                    </span>
                                    <div class="flex-1">
                                      <p class="text-xs text-gray-700 leading-relaxed">{{ ind.descripcion }}</p>
                                    </div>
                                    <span class="text-xs font-semibold text-gray-500 flex-shrink-0 mt-0.5">
                                      {{ ind.ponderacion }}%
                                    </span>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        }

                        <!-- Add capacidad button -->
                        <div class="px-4 py-2 bg-indigo-50 border-t border-indigo-100">
                          <button class="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                            + Agregar capacidad
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ════════════════════════════════════════════
         TAB 4: MALLA CURRICULAR
    ════════════════════════════════════════════ -->
    @if (tab() === 'malla') {
      <div class="space-y-5 animate-fade-in">

        <!-- Nivel + currícula -->
        <div class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex gap-2">
              @for (n of NIVELES; track n) {
                <button class="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                  [ngClass]="nivelMalla() === n
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                  (click)="onNivelMallaChange($any(n))">
                  {{ n }}
                </button>
              }
            </div>
            <div class="flex flex-wrap gap-2">
              <a routerLink="/academico/asignacion" [queryParams]="{ tab: 'asignaciones' }"
                class="btn btn-primary text-sm gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Gestionar asignaciones
              </a>
              <button class="btn btn-secondary text-sm gap-1.5" (click)="exportarMalla()"
                [disabled]="!curriculaSelId() || cursosParaMalla().length === 0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Exportar malla
              </button>
            </div>
          </div>

          <div class="card p-4 flex flex-wrap items-end gap-4">
            <div class="flex-1 min-w-[220px]">
              <label class="form-label">Currícula</label>
              <select class="form-input w-full" [ngModel]="curriculaSelId()" (ngModelChange)="seleccionarCurricula(+$event)">
                @for (c of curriculasDelNivel(); track c.id) {
                  <option [ngValue]="c.id">{{ c.anio }} · v{{ c.version }} ({{ c.estado }})</option>
                }
              </select>
            </div>
            @if (curriculaSel(); as curr) {
              <div class="text-sm text-gray-500 pb-2">
                A.E. {{ curr.anio }} · Escala {{ escalaLabel(curr.tipoEscala) }}
              </div>
            }
          </div>
        </div>

        <!-- Info bar -->
        <div class="card p-3 flex items-center gap-4 bg-indigo-50 border-indigo-200 text-sm">
          <svg class="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-indigo-700">
            Malla para <strong>{{ nivelMalla() }}</strong>
            @if (curriculaSel(); as curr) { · A.E. <strong>{{ curr.anio }}</strong> }
            · {{ areasParaMalla().length }} áreas · {{ cursosParaMalla().length }} cursos ·
            Docentes: {{ docentes_asignados_malla() }} asignados.
            <strong class="font-medium">Haz clic en una celda con horas</strong> para asignar o editar docente.
          </span>
        </div>

        @if (curriculaSvc.mallaLoading()) {
          <div class="card p-12 text-center text-gray-400 animate-pulse">
            Cargando malla curricular…
          </div>
        } @else if (!curriculaSelId() || cursosParaMalla().length === 0) {
          <div class="card p-12 text-center text-gray-400">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            No hay cursos definidos para esta currícula
          </div>
        } @else {
        <!-- Malla table -->
        <div class="card overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="bg-gray-50">
                <th class="text-left px-4 py-3 font-semibold text-gray-600 border-b border-r border-gray-200 w-36">Área</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-600 border-b border-r border-gray-200 w-48">Curso</th>
                @for (grado of gradosMalla(); track grado) {
                  <th class="text-center px-3 py-3 font-semibold text-gray-700 border-b border-r border-gray-200 min-w-[110px]">
                    {{ etiquetaGrado(nivelMalla(), grado) }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (area of areasParaMalla(); track area.id) {
                @let cursosArea = cursosParaMalla().filter(c => c.areaId === area.id);
                @if (cursosArea.length > 0) {
                  <!-- Area header row -->
                  <tr>
                    <td [attr.rowspan]="cursosArea.length"
                      class="px-3 py-2 border-r border-b border-gray-200 align-middle">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full flex-shrink-0" [ngClass]="area.dotClass"></span>
                        <span class="text-xs font-semibold" [ngClass]="area.colorClass.split(' ')[2]">{{ area.nombre }}</span>
                      </div>
                    </td>
                    <!-- First course row -->
                    @let firstCurso = cursosArea[0];
                    <td class="px-4 py-2 text-gray-800 border-r border-b border-gray-100">{{ firstCurso.nombre }}</td>
                    @for (grado of gradosMalla(); track grado) {
                      @let hrs = hrsEnGrado(firstCurso.id, grado);
                      @let cel = mallaCeldaAsignacion(firstCurso.id, grado);
                      <td class="px-2 py-2 text-center border-r border-b border-gray-100"
                        [ngClass]="hrs ? (cel.asignado ? 'bg-emerald-50/60' : 'bg-white') : 'bg-gray-50'">
                        @if (hrs) {
                          <button type="button"
                            class="w-full rounded-md px-1 py-1 transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            (click)="abrirAsignacionMalla(firstCurso.id, grado, $event)"
                            [title]="cel.asignado ? (cel.docenteCompleto + (cel.secciones ? ' · Sec. ' + cel.secciones : '')) : 'Asignar docente'">
                            <div class="font-bold text-indigo-700">{{ hrs }}h</div>
                            @if (cel.asignado) {
                              <div class="text-xs font-semibold text-emerald-800 truncate max-w-[88px] mx-auto">{{ cel.docente }}</div>
                              @if (cel.secciones) {
                                <div class="text-[10px] text-emerald-600">Sec. {{ cel.secciones }}</div>
                              }
                            } @else {
                              <div class="text-xs text-red-500 font-medium">+ Asignar docente</div>
                            }
                          </button>
                        } @else {
                          <span class="text-gray-300">—</span>
                        }
                      </td>
                    }
                  </tr>
                  <!-- Remaining courses for this area -->
                  @for (curso of cursosArea; track curso.id; let ci = $index) {
                    @if (ci > 0) {
                      <tr>
                        <td class="px-4 py-2 text-gray-800 border-r border-b border-gray-100">{{ curso.nombre }}</td>
                        @for (grado of gradosMalla(); track grado) {
                          @let hrs2 = hrsEnGrado(curso.id, grado);
                          @let cel2 = mallaCeldaAsignacion(curso.id, grado);
                          <td class="px-2 py-2 text-center border-r border-b border-gray-100"
                            [ngClass]="hrs2 ? (cel2.asignado ? 'bg-emerald-50/60' : 'bg-white') : 'bg-gray-50'">
                            @if (hrs2) {
                              <button type="button"
                                class="w-full rounded-md px-1 py-1 transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                (click)="abrirAsignacionMalla(curso.id, grado, $event)"
                                [title]="cel2.asignado ? (cel2.docenteCompleto + (cel2.secciones ? ' · Sec. ' + cel2.secciones : '')) : 'Asignar docente'">
                                <div class="font-bold text-indigo-700">{{ hrs2 }}h</div>
                                @if (cel2.asignado) {
                                  <div class="text-xs font-semibold text-emerald-800 truncate max-w-[88px] mx-auto">{{ cel2.docente }}</div>
                                  @if (cel2.secciones) {
                                    <div class="text-[10px] text-emerald-600">Sec. {{ cel2.secciones }}</div>
                                  }
                                } @else {
                                  <div class="text-xs text-red-500 font-medium">+ Asignar docente</div>
                                }
                              </button>
                            } @else {
                              <span class="text-gray-300">—</span>
                            }
                          </td>
                        }
                      </tr>
                    }
                  }
                }
              }
              <!-- Total row -->
              <tr class="bg-indigo-50 font-semibold">
                <td class="px-3 py-3 border-r border-t-2 border-indigo-200 text-xs text-indigo-700 uppercase tracking-wide" colspan="2">
                  Total Horas / Grado
                </td>
                @for (grado of gradosMalla(); track grado) {
                  <td class="px-2 py-3 text-center border-r border-t-2 border-indigo-200 text-indigo-800 font-bold">
                    {{ totalHorasPorGrado(grado) }}h
                  </td>
                }
              </tr>
            </tbody>
          </table>
        </div>
        }

        <!-- Legend -->
        @if (!curriculaSvc.mallaLoading() && cursosParaMalla().length > 0) {
        <div class="flex flex-wrap gap-4 text-xs text-gray-500">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-indigo-700 text-sm">6h</span>
            <span>= Horas semanales asignadas</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-gray-300">—</span>
            <span>= Curso no aplica para ese grado</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-emerald-700 font-semibold text-xs">Docente · Sec.</span>
            <span>= Curso ya asignado a docente</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-red-500 font-medium">+ Asignar docente</span>
            <span>= Haz clic en la celda para asignar</span>
          </div>
        </div>
        }
      </div>
    }

    <!-- ════════════════════════════════════════════
         TAB 5: CONFIGURACIÓN
    ════════════════════════════════════════════ -->
    @if (tab() === 'config') {
      <div class="space-y-5 animate-fade-in">

        <!-- Config sub-tabs -->
        <div class="flex gap-2 border-b border-gray-200 pb-0">
          @for (st of CFG_TABS; track st.id) {
            <button class="px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px"
              [ngClass]="cfgTab() === st.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'"
              (click)="onCfgTabClick($any(st.id))">
              {{ st.label }}
            </button>
          }
        </div>

        <!-- ── Escalas ── -->
        @if (cfgTab() === 'escalas') {
          <div class="space-y-4">
            <p class="text-sm text-gray-500">Define la escala de calificación por nivel educativo. La escala determina cómo se registran y muestran las notas.</p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

              <!-- Numérica -->
              <div class="card p-5 border-2 border-blue-200 bg-blue-50">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">N</div>
                  <h3 class="font-bold text-blue-800">Escala Numérica</h3>
                </div>
                <div class="text-xs text-blue-600 mb-4">Usada en Primaria y Secundaria</div>
                <div class="space-y-2">
                  @for (item of ESCALA_NUMERICA; track item.rango) {
                    <div class="flex items-center gap-3 p-2 rounded-lg bg-white border border-blue-100">
                      <span class="font-bold text-blue-800 w-14 text-right text-sm">{{ item.rango }}</span>
                      <span class="badge" [ngClass]="item.badge">{{ item.calificacion }}</span>
                      <span class="text-xs text-gray-500 flex-1">{{ item.descripcion }}</span>
                    </div>
                  }
                </div>
                <div class="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-600">
                  Nota mínima aprobatoria: <strong>11</strong>
                </div>
              </div>

              <!-- Literal -->
              <div class="card p-5 border-2 border-green-200 bg-green-50">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">L</div>
                  <h3 class="font-bold text-green-800">Escala Literal</h3>
                </div>
                <div class="text-xs text-green-600 mb-4">Variante opcional para algunos niveles</div>
                <div class="space-y-2">
                  @for (item of ESCALA_LITERAL; track item.letra) {
                    <div class="flex items-center gap-3 p-2 rounded-lg bg-white border border-green-100">
                      <span class="font-bold text-green-800 w-6 text-center text-lg">{{ item.letra }}</span>
                      <span class="badge badge-gray flex-shrink-0">{{ item.rango }}</span>
                      <span class="text-xs text-gray-500 flex-1">{{ item.descripcion }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Competencia -->
              <div class="card p-5 border-2 border-purple-200 bg-purple-50">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">C</div>
                  <h3 class="font-bold text-purple-800">Escala por Competencias</h3>
                </div>
                <div class="text-xs text-purple-600 mb-4">MINEDU — Usado en Inicial</div>
                <div class="space-y-2">
                  @for (item of ESCALA_COMP; track item.nivel) {
                    <div class="flex items-start gap-3 p-2 rounded-lg bg-white border border-purple-100">
                      <span class="font-bold text-purple-800 w-7 text-center pt-0.5 text-base">{{ item.nivel }}</span>
                      <div class="flex-1">
                        <div class="text-xs font-semibold text-gray-800">{{ item.nombre }}</div>
                        <div class="text-xs text-gray-500 mt-0.5">{{ item.descripcion }}</div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Configuración por nivel -->
            <div class="card p-4">
              <h3 class="font-semibold text-gray-800 mb-3">Asignación por Nivel</h3>
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>Nivel</th>
                    <th>Escala activa</th>
                    <th>Rango</th>
                    <th>Aprobado con</th>
                    <th>Cambiar</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cfg of ESCALA_CONFIG; track cfg.nivel) {
                    <tr>
                      <td class="font-medium">{{ cfg.nivel }}</td>
                      <td><span class="badge" [ngClass]="cfg.badge">{{ cfg.escala }}</span></td>
                      <td class="font-mono text-sm">{{ cfg.rango }}</td>
                      <td class="font-semibold text-green-700">{{ cfg.minAprobado }}</td>
                      <td>
                        <button class="btn btn-ghost btn-icon text-gray-500">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ── Periodos ── -->
        @if (cfgTab() === 'periodos') {
          <div class="space-y-5">
            <div class="flex items-center justify-between">
              <p class="text-sm text-gray-500">Periodos académicos para el A.E. 2026. Los periodos definen cuándo se registran evaluaciones y se cierran notas.</p>
              <div class="flex gap-2">
                <button class="btn btn-secondary text-sm">4 Bimestres</button>
                <button class="btn btn-primary text-sm">3 Trimestres</button>
              </div>
            </div>

            <!-- Timeline bimestral -->
            <div class="card p-6">
              <h3 class="font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <span class="badge badge-indigo">Primaria / Secundaria</span>
                <span>·</span>
                <span class="text-sm font-normal text-gray-500">4 Bimestres — A.E. 2026</span>
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                @for (bim of BIMESTRES; track bim.num) {
                  <div class="rounded-xl border-2 p-4 transition-all"
                    [ngClass]="bim.actual ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'">
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-xs font-bold uppercase tracking-wide" [ngClass]="bim.actual ? 'text-indigo-700' : 'text-gray-500'">
                        {{ bim.nombre }}
                      </span>
                      @if (bim.actual) {
                        <span class="badge badge-indigo text-xs">En curso</span>
                      } @else if (bim.cerrado) {
                        <span class="badge badge-gray text-xs">Cerrado</span>
                      } @else {
                        <span class="badge badge-yellow text-xs">Próximo</span>
                      }
                    </div>
                    <div class="text-xs text-gray-500 space-y-1">
                      <div class="flex justify-between">
                        <span>Inicio:</span>
                        <span class="font-medium text-gray-700">{{ bim.inicio }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>Fin:</span>
                        <span class="font-medium text-gray-700">{{ bim.fin }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>Semanas:</span>
                        <span class="font-semibold" [ngClass]="bim.actual ? 'text-indigo-700' : 'text-gray-700'">{{ bim.semanas }}</span>
                      </div>
                    </div>
                    @if (bim.actual) {
                      <div class="mt-3">
                        <div class="flex justify-between text-xs text-indigo-600 mb-1">
                          <span>Avance</span>
                          <span>{{ bim.avance }}%</span>
                        </div>
                        <div class="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                          <div class="h-full bg-indigo-500 rounded-full" [style.width.%]="bim.avance"></div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Periodos Inicial -->
            <div class="card p-5">
              <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span class="badge badge-blue">Inicial</span>
                <span>·</span>
                <span class="text-sm font-normal text-gray-500">Escala por competencias — Sin notas numéricas</span>
              </h3>
              <div class="flex gap-4">
                @for (p of PERIODOS_INICIAL; track p.nombre) {
                  <div class="flex-1 p-4 rounded-lg border border-blue-200 bg-blue-50">
                    <div class="font-semibold text-blue-800 text-sm mb-1">{{ p.nombre }}</div>
                    <div class="text-xs text-blue-600">{{ p.inicio }} — {{ p.fin }}</div>
                    <div class="text-xs text-gray-500 mt-1">{{ p.semanas }} semanas</div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ── Asignación Docente (redirige a módulo dedicado) ── -->
        @if (cfgTab() === 'docentes') {
          <div class="card p-8 text-center space-y-4">
            <p class="text-sm text-gray-600 max-w-xl mx-auto">
              Puedes asignar docentes directamente desde la pestaña
              <strong>Malla Curricular</strong> (clic en cualquier celda con horas)
              o usar el módulo completo con listado, cobertura por sección e impresión.
            </p>
            <div class="flex flex-wrap justify-center gap-3">
              <button type="button" class="btn btn-secondary" (click)="tab.set('malla'); cambiarTab('malla')">
                Ir a Malla Curricular
              </button>
              <a routerLink="/academico/asignacion" [queryParams]="{ tab: 'asignaciones' }" class="btn btn-primary inline-flex">
                Ir a Asignación Docente
              </a>
            </div>
          </div>
        }
      </div>
    }

  </div><!-- /content -->

  <!-- ── MODAL: Área ───────────────────────────────────────────────── -->
  @if (areaModalOpen()) {
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="cerrarModalArea()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 class="text-lg font-bold text-gray-900">{{ areaEditId() ? 'Editar Área' : 'Nueva Área' }}</h2>
          <button class="btn btn-ghost btn-icon" (click)="cerrarModalArea()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="form-label">Nombre del área</label>
            <input class="form-input w-full" [(ngModel)]="formAreaNombre" placeholder="Ej. Matemática" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Nivel</label>
              <input class="form-input w-full bg-gray-50" [value]="nivelArea()" readonly />
            </div>
            <div>
              <label class="form-label">Orden</label>
              <input class="form-input w-full" type="number" min="1" [(ngModel)]="formAreaOrden" />
            </div>
          </div>
        </div>
        <div class="flex gap-2 p-5 pt-0">
          <button class="btn btn-secondary flex-1" (click)="cerrarModalArea()">Cancelar</button>
          <button class="btn btn-primary flex-1" (click)="guardarArea()" [disabled]="!formAreaNombre.trim() || curriculaSvc.saving()">
            {{ areaEditId() ? 'Guardar cambios' : 'Crear área' }}
          </button>
        </div>
      </div>
    </div>
  }

  <!-- ── MODAL: Curso ──────────────────────────────────────────────── -->
  @if (cursoModalOpen()) {
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="cerrarModalCurso()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white">
          <h2 class="text-lg font-bold text-gray-900">{{ cursoEditId() ? 'Editar Curso' : 'Nuevo Curso' }}</h2>
          <button class="btn btn-ghost btn-icon" (click)="cerrarModalCurso()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-5 space-y-4">
          @if (!cursoEditId()) {
            <div>
              <label class="form-label">Curso del catálogo maestro *</label>
              @if (catalogoCursosLoading()) {
                <p class="text-sm text-gray-400 animate-pulse py-2">Cargando cursos desde el servidor…</p>
              } @else if (!catalogoCursos().length) {
                <div class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  No hay cursos en el catálogo para {{ nivelArea() }}.
                  <a routerLink="/maestros/cursos" class="underline font-medium ml-1">Gestionar en Maestros → Cursos</a>
                </div>
              } @else {
                <select class="form-input w-full" [ngModel]="cursoMaestroSelId()" (ngModelChange)="aplicarCursoMaestro($event ? +$event : null)">
                  <option [ngValue]="null">— Seleccione un curso —</option>
                  @for (mc of catalogoCursos(); track mc.id) {
                    <option [ngValue]="mc.id">{{ mc.nombre }} · {{ mc.area }} ({{ mc.horasSemanales }}h)</option>
                  }
                </select>
              }
            </div>
          }
          <div>
            <label class="form-label">Nombre del curso</label>
            <input class="form-input w-full" [(ngModel)]="formCursoNombre" placeholder="Ej. Comprensión Lectora"
              [readonly]="!cursoEditId() && !!cursoMaestroSelId()" />
          </div>
          <div>
            <label class="form-label">Área curricular</label>
            <select class="form-input w-full" [(ngModel)]="formCursoAreaId">
              @for (a of areasActuales(); track a.id) {
                <option [ngValue]="a.id">{{ a.nombre }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label">Horas semanales</label>
            <input class="form-input w-full" type="number" min="0" max="40" [(ngModel)]="formCursoHoras" />
          </div>
          <div>
            <label class="form-label">Grados donde aplica</label>
            <div class="flex flex-wrap gap-2 mt-1">
              @for (g of gradosParaNivel(nivelArea()); track g) {
                <button type="button"
                  class="px-3 py-1.5 rounded-lg text-sm border transition-all"
                  [ngClass]="formCursoGrados.includes(g)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                  (click)="toggleGradoCurso(g)">
                  {{ etiquetaGrado(nivelArea(), g) }}
                </button>
              }
            </div>
            @if (formCursoGrados.length === 0) {
              <p class="text-xs text-amber-600 mt-2">Selecciona al menos un grado</p>
            }
          </div>
        </div>
        <div class="flex gap-2 p-5 pt-0">
          <button class="btn btn-secondary flex-1" (click)="cerrarModalCurso()">Cancelar</button>
          <button class="btn btn-primary flex-1" (click)="guardarCurso()"
            [disabled]="(!cursoEditId() && !cursoMaestroSelId()) || !formCursoNombre.trim() || !formCursoAreaId || formCursoGrados.length === 0 || curriculaSvc.saving() || catalogoCursosLoading()">
            {{ cursoEditId() ? 'Guardar cambios' : 'Crear curso' }}
          </button>
        </div>
      </div>
    </div>
  }

  <!-- ── MODAL: Nueva Currícula ──────────────────────────────────────── -->
  @if (modalOpen()) {
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="cerrarModalCurr()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 class="text-lg font-bold text-gray-900">{{ curricEditId() ? 'Editar Currícula' : 'Nueva Currícula' }}</h2>
          <button class="btn btn-ghost btn-icon" (click)="cerrarModalCurr()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Año Lectivo</label>
              @if (curricEditId()) {
                <input class="form-input w-full bg-gray-50" [value]="formAnio" readonly />
              } @else {
                <select class="form-input w-full" [(ngModel)]="formAnio">
                  <option [ngValue]="2026">2026</option>
                  <option [ngValue]="2027">2027</option>
                </select>
              }
            </div>
            <div>
              <label class="form-label">Nivel</label>
              @if (curricEditId()) {
                <input class="form-input w-full bg-gray-50" [value]="formNivel" readonly />
              } @else {
                <select class="form-input w-full" [(ngModel)]="formNivel">
                  <option value="Inicial">Inicial</option>
                  <option value="Primaria">Primaria</option>
                  <option value="Secundaria">Secundaria</option>
                </select>
              }
            </div>
          </div>
          @if (curricEditId()) {
            <div>
              <label class="form-label">Versión</label>
              <input class="form-input w-full" [(ngModel)]="formVersion" placeholder="Ej. 1.0" />
            </div>
          } @else {
            <p class="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
              Se clonarán automáticamente áreas, cursos y competencias de la currícula activa del mismo nivel.
            </p>
          }
          <div>
            <label class="form-label">Escala de Calificación</label>
            <select class="form-input w-full" [(ngModel)]="formEscala">
              <option value="numerica">Numérica (0 – 20)</option>
              <option value="literal">Literal (A / B / C / D)</option>
              <option value="competencia">Competencias (AD / A / B / C)</option>
            </select>
          </div>
          <div>
            <label class="form-label">Tipo de Periodos</label>
            <div class="grid grid-cols-2 gap-3 mt-1">
              <button type="button" class="p-3 rounded-xl border-2 text-left transition-all"
                [ngClass]="formPeriodo === 'bimestral' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'"
                (click)="formPeriodo = 'bimestral'">
                <div class="font-semibold text-sm" [ngClass]="formPeriodo === 'bimestral' ? 'text-indigo-700' : 'text-gray-700'">Bimestral</div>
                <div class="text-xs text-gray-400 mt-0.5">4 periodos de ~10 semanas</div>
              </button>
              <button type="button" class="p-3 rounded-xl border-2 text-left transition-all"
                [ngClass]="formPeriodo === 'trimestral' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'"
                (click)="formPeriodo = 'trimestral'">
                <div class="font-semibold text-sm" [ngClass]="formPeriodo === 'trimestral' ? 'text-indigo-700' : 'text-gray-700'">Trimestral</div>
                <div class="text-xs text-gray-400 mt-0.5">3 periodos de ~13 semanas</div>
              </button>
            </div>
          </div>
        </div>
        <div class="flex gap-2 p-5 pt-0">
          <button class="btn btn-secondary flex-1" (click)="cerrarModalCurr()">Cancelar</button>
          <button class="btn btn-primary flex-1" (click)="guardarCurricula()" [disabled]="curriculaSvc.saving()">
            {{ curricEditId() ? 'Guardar cambios' : 'Crear Currícula' }}
          </button>
        </div>
      </div>
    </div>
  }

  <!-- ── MODAL: Asignación docente (desde malla) ───────────────────── -->
  @if (mallaAsigModalOpen()) {
    @let cursoAsig = mallaAsigCurso();
    <div appOverlayPortal class="fixed inset-0 z-[200]">
      <div class="absolute inset-0 bg-black/50" (click)="cerrarAsignacionMalla()"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
      <div class="bg-white rounded-2xl w-full max-w-lg animate-scale-in pointer-events-auto shadow-2xl" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 class="text-lg font-bold text-gray-900">
              {{ mallaAsigEditId() ? 'Editar asignación' : 'Asignar docente' }}
            </h2>
            @if (cursoAsig) {
              <p class="text-sm text-gray-500 mt-0.5">
                {{ cursoAsig.nombre }} · {{ etiquetaGrado(nivelMalla(), mallaAsigGrado()) }} · {{ cursoAsig.horasSemanales }}h/sem
              </p>
            }
          </div>
          <button type="button" class="btn btn-ghost btn-icon" (click)="cerrarAsignacionMalla()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        @if (mallaAsigCtxError()) {
          <div class="p-8 text-center space-y-3">
            <p class="text-sm text-red-600">{{ mallaAsigCtxError() }}</p>
            <button type="button" class="btn btn-secondary text-sm" (click)="recargarCtxAsignacionMalla()">Reintentar</button>
          </div>
        } @else if (asignacionSvc.loading()) {
          <div class="p-8 text-center text-sm text-gray-500 animate-pulse">Cargando docentes…</div>
        } @else {
          <div class="p-5 space-y-4">
            <div>
              <label class="form-label">Docente <span class="text-red-500">*</span></label>
              <select class="form-input w-full" [ngModel]="mallaAsigDocId()" (ngModelChange)="mallaAsigDocId.set($event ? +$event : null)">
                <option [ngValue]="null">— Seleccionar docente —</option>
                @for (d of _docentesAsig(); track d.id) {
                  <option [ngValue]="d.id">{{ d.apellidos }}, {{ d.nombres }} — {{ d.especialidad }}</option>
                }
              </select>
            </div>

            <div>
              <label class="form-label">Secciones <span class="text-red-500">*</span></label>
              <div class="flex flex-wrap gap-2 mt-1">
                @for (s of seccionesMallaModal(); track s) {
                  <button type="button" class="w-10 h-10 rounded-lg font-bold text-sm border-2 transition-all"
                    [ngClass]="seccionMallaActiva(s)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'"
                    (click)="toggleSeccionMalla(s, $event)">{{ s }}</button>
                }
              </div>
              @if (mallaAsigSecciones().length === 0) {
                <p class="text-xs text-red-500 mt-1">Selecciona al menos una sección</p>
              } @else {
                <p class="text-xs text-gray-500 mt-1">Seleccionadas: {{ mallaAsigSecciones().join(', ') }}</p>
              }
            </div>

            @if (mallaAsigFormError()) {
              <div class="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {{ mallaAsigFormError() }}
              </div>
            }

            <p class="text-xs text-gray-500">
              También puedes gestionar todas las asignaciones en
              <a routerLink="/academico/asignacion" class="text-indigo-600 underline" (click)="cerrarAsignacionMalla()">Asignación Docente</a>.
            </p>
          </div>

          <div class="flex gap-2 p-5 pt-0">
            <button type="button" class="btn btn-secondary flex-1" (click)="cerrarAsignacionMalla()">Cancelar</button>
            <button type="button" class="btn btn-primary flex-1"
              [disabled]="asignacionSvc.saving() || !mallaAsigDocId() || mallaAsigSecciones().length === 0"
              (click)="guardarAsignacionMalla($event)">
              {{ asignacionSvc.saving() ? 'Guardando…' : (mallaAsigEditId() ? 'Guardar cambios' : 'Asignar docente') }}
            </button>
          </div>
        }
      </div>
      </div>
    </div>
  }

  <!-- ── TOAST ──────────────────────────────────────────────────────── -->
  @if (toast().show) {
    <div class="fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl animate-slide-in-r text-sm font-medium"
      [ngClass]="toast().type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          [attr.d]="toast().type === 'success'
            ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
            : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'"/>
      </svg>
      {{ toast().msg }}
    </div>
  }
</div>
  `
})
export class CurriculaComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly router = inject(Router);
  readonly curriculaSvc = inject(CurriculaService);
  readonly asignacionSvc = inject(AsignacionService);
  readonly etiquetaGrado = etiquetaGradoConNivel;
  private readonly maestrosCursosSvc = inject(MaestrosCursosService);
  private readonly periodosSvc = inject(MaestrosPeriodosAcademicosService);
  private anioEscolarVigente: number | null = null;

  // ── Constants ───────────────────────────────────────────────────────
  readonly NIVELES: NivelCurricula[] = ['Inicial', 'Primaria', 'Secundaria'];
  readonly TABS = [
    { id: 'curriculas',   label: 'Currículas',      badge: null, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'areas',        label: 'Áreas y Cursos',  badge: null, icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'competencias', label: 'Competencias',    badge: null, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'malla',        label: 'Malla Curricular', badge: null, icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { id: 'config',       label: 'Configuración',   badge: null, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];
  readonly CFG_TABS = [
    { id: 'escalas',  label: 'Escalas de Calificación' },
    { id: 'periodos', label: 'Periodos Académicos' },
    { id: 'docentes', label: 'Asignación Docente' },
  ];

  // Escala data
  readonly ESCALA_NUMERICA = [
    { rango: '18 – 20', calificacion: 'Sobresaliente', descripcion: 'Logro destacado', badge: 'badge-blue' },
    { rango: '15 – 17', calificacion: 'Bueno',         descripcion: 'Logro esperado',  badge: 'badge-green' },
    { rango: '11 – 14', calificacion: 'Regular',       descripcion: 'En proceso',      badge: 'badge-yellow' },
    { rango: '00 – 10', calificacion: 'Deficiente',    descripcion: 'En inicio',       badge: 'badge-red' },
  ];
  readonly ESCALA_LITERAL = [
    { letra: 'A', rango: '15 – 20', descripcion: 'Logro esperado o destacado' },
    { letra: 'B', rango: '11 – 14', descripcion: 'En proceso de lograr' },
    { letra: 'C', rango: '00 – 10', descripcion: 'En inicio' },
  ];
  readonly ESCALA_COMP = [
    { nivel: 'AD', nombre: 'Logro Destacado',  descripcion: 'Evidencia de nivel superior al esperado' },
    { nivel: 'A',  nombre: 'Logro Esperado',   descripcion: 'Evidencia el logro de la competencia' },
    { nivel: 'B',  nombre: 'En Proceso',       descripcion: 'Está próximo a alcanzar el logro' },
    { nivel: 'C',  nombre: 'En Inicio',        descripcion: 'Evidencia dificultades en el logro' },
  ];
  readonly ESCALA_CONFIG = [
    { nivel: 'Inicial',    escala: 'Competencias', rango: 'AD/A/B/C', minAprobado: 'A',  badge: 'badge-purple' },
    { nivel: 'Primaria',   escala: 'Numérica',     rango: '0 – 20',   minAprobado: '11', badge: 'badge-blue' },
    { nivel: 'Secundaria', escala: 'Numérica',     rango: '0 – 20',   minAprobado: '11', badge: 'badge-blue' },
  ];
  readonly BIMESTRES = [
    { num: 1, nombre: 'I Bimestre',  inicio: '09 Mar',  fin: '17 May',  semanas: 10, actual: false, cerrado: true,  avance: 100 },
    { num: 2, nombre: 'II Bimestre', inicio: '19 May',  fin: '26 Jul',  semanas: 10, actual: true,  cerrado: false, avance: 72  },
    { num: 3, nombre: 'III Bimestre', inicio: '11 Ago', fin: '18 Oct',  semanas: 10, actual: false, cerrado: false, avance: 0   },
    { num: 4, nombre: 'IV Bimestre', inicio: '20 Oct',  fin: '27 Nov',  semanas: 6,  actual: false, cerrado: false, avance: 0   },
  ];
  readonly PERIODOS_INICIAL = [
    { nombre: 'I Bimestre',  inicio: '09 Mar', fin: '17 May', semanas: 10 },
    { nombre: 'II Bimestre', inicio: '19 May', fin: '26 Jul', semanas: 10 },
    { nombre: 'III Bimestre', inicio: '11 Ago', fin: '18 Oct', semanas: 10 },
    { nombre: 'IV Bimestre', inicio: '20 Oct', fin: '27 Nov', semanas: 6  },
  ];

  // ── Signals ─────────────────────────────────────────────────────────
  tab       = signal<MainTab>('curriculas');
  cfgTab    = signal<CfgTab>('escalas');
  modalOpen = signal(false);
  curricEditId = signal<number | null>(null);
  detalleExpandidoId = signal<number | null>(null);
  detalleCache = signal<Record<number, CurriculaDetail>>({});
  areaModalOpen = signal(false);
  cursoModalOpen = signal(false);
  areaEditId = signal<number | null>(null);
  cursoEditId = signal<number | null>(null);

  // Curriculas
  _curriculas = signal<Curricula[]>([]);
  _areas = signal<Area[]>([]);
  _cursos = signal<Curso[]>([]);
  _competencias = signal<Competencia[]>([]);
  _capacidades = signal<Capacidad[]>([]);
  _indicadores = signal<Indicador[]>([]);
  _asignaciones = signal<AsignDocente[]>([]);
  _mallaGrados = signal<string[]>([]);
  _mallaTotales = signal<Record<string, number>>({});
  _mallaDocentes = signal<number | null>(null);
  curriculaSelId = signal<number | null>(null);
  fAnio   = signal<number | null>(null);
  fNivel  = signal<string>('');
  fEstado = signal<string>('');

  // Areas
  nivelArea    = signal<NivelCurricula>('Primaria');
  areaExpanded = signal<Set<number>>(new Set());

  // Competencias
  nivelComp  = signal<NivelCurricula>('Primaria');
  cursoSelId = signal<number | null>(null);
  compExp    = signal<Set<number>>(new Set());
  capExp     = signal<Set<number>>(new Set());

  // Malla
  nivelMalla = signal<NivelCurricula>('Primaria');
  mallaAsigModalOpen = signal(false);
  mallaAsigEditId = signal<number | null>(null);
  mallaAsigCursoId = signal<number | null>(null);
  mallaAsigGrado = signal('');
  mallaAsigDocId = signal<number | null>(null);
  mallaAsigSecciones = signal<string[]>([]);
  _docentesAsig = signal<DocenteAsignacion[]>([]);
  _seccionesPorGrado = signal<Record<string, string[]>>({});
  _asignacionCtxLoaded = signal(false);
  mallaAsigCtxError = signal<string | null>(null);
  mallaAsigFormError = signal<string | null>(null);

  // Toast
  toast = signal<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  // Form
  formAnio: number = 2026;
  formNivel: NivelCurricula = 'Primaria';
  formVersion = '1.0';
  formEscala: TipoEscala = 'numerica';
  formPeriodo: TipoPeriodo = 'bimestral';

  formAreaNombre = '';
  formAreaOrden = 1;
  formCursoNombre = '';
  formCursoAreaId: number | null = null;
  formCursoHoras = 1;
  formCursoGrados: string[] = [];
  catalogoCursos = signal<MaestroCursoItem[]>([]);
  catalogoCursosLoading = signal(false);
  cursoMaestroSelId = signal<number | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────
  curricFiltradas = computed(() => {
    let list = this._curriculas();
    if (this.fAnio())   list = list.filter(c => c.anio === this.fAnio());
    if (this.fNivel())  list = list.filter(c => c.nivel === this.fNivel() as NivelCurricula);
    if (this.fEstado()) list = list.filter(c => c.estado === this.fEstado() as EstadoCurr);
    return list;
  });

  curricActivas   = computed(() => this._curriculas().filter(c => c.estado === 'activo').length);
  curricBorradores = computed(() => this._curriculas().filter(c => c.estado === 'borrador').length);
  curricInactivas = computed(() => this._curriculas().filter(c => c.estado === 'inactivo').length);

  curriculaSel = computed(() => {
    const id = this.curriculaSelId();
    return id ? this._curriculas().find(c => c.id === id) ?? null : null;
  });

  anioActivo = computed(() => this.curriculaSel()?.anio ?? null);

  curriculasDelNivel = computed(() =>
    this._curriculas()
      .filter(c => c.nivel === this.nivelArea())
      .sort((a, b) => b.anio - a.anio || a.version.localeCompare(b.version)),
  );

  puedeEditar = computed(() => {
    const c = this.curriculaSel();
    return c != null && c.estado !== 'inactivo';
  });

  areasActuales = computed(() => {
    const id = this.curriculaSelId();
    if (!id) return [];
    return this._areas().filter(a => a.curriculumId === id).sort((a, b) => a.orden - b.orden);
  });

  cursosActuales = computed(() => {
    const id = this.curriculaSelId();
    if (!id) return [];
    return this._cursos().filter(c => c.curriculumId === id && c.activo);
  });

  totalHorasActuales = computed(() => this.cursosActuales().reduce((s, c) => s + c.horasSemanales, 0));

  cursosComp      = computed(() => this.cursosActuales());
  compsFiltradas  = computed(() => {
    const id = this.cursoSelId();
    return id ? this._competencias().filter(c => c.cursoId === id) : [];
  });
  totalCapacidades = computed(() =>
    this.compsFiltradas().reduce((sum, comp) => sum + this._capacidades().filter(c => c.competenciaId === comp.id).length, 0)
  );
  totalIndicadores = computed(() =>
    this._capacidades()
      .filter(cap => this.compsFiltradas().some(comp => comp.id === cap.competenciaId))
      .reduce((sum, cap) => sum + this._indicadores().filter(i => i.capacidadId === cap.id).length, 0)
  );

  gradosMalla = computed(() => {
    const fromApi = this._mallaGrados();
    if (fromApi.length) return fromApi;
    const curr = this.curriculaSel();
    const n = curr?.nivel ?? this.nivelMalla();
    if (n === 'Inicial') return G_INI;
    if (n === 'Primaria') return G_PRI;
    return G_SEC;
  });
  areasParaMalla  = computed(() => this.areasActuales());
  cursosParaMalla = computed(() => this.cursosActuales());
  mallaAsigCurso = computed(() => {
    const id = this.mallaAsigCursoId();
    return id ? this._cursos().find(c => c.id === id) ?? null : null;
  });
  seccionesMallaModal = computed(() => {
    const gradoNorm = normalizeGradoMatriculaKey(this.mallaAsigGrado());
    const key = `${this.nivelMalla()}|${gradoNorm}`;
    const fromSalones = this._seccionesPorGrado()[key];
    const list = fromSalones?.length ? fromSalones : SECCIONES_FALLBACK;
    return [...new Set(list.map(s => s.trim().toUpperCase()))].sort();
  });
  docentes_asignados_malla = computed(() => {
    const fromApi = this._mallaDocentes();
    if (fromApi != null) return fromApi;
    const id = this.curriculaSelId();
    const asigs = id
      ? this._asignaciones().filter(a => a.cursoId && this._cursos().some(c => c.id === a.cursoId && c.curriculumId === id))
      : [];
    return new Set(asigs.map(a => a.docenteNombre)).size;
  });

  docentesConAsig = computed(() => {
    const nombres = new Set(this._asignaciones().map(a => a.docenteNombre));
    return [...nombres].map((nombre, i) => ({ id: i + 1, nombre, especialidad: '—' }));
  });

  cursossinDocente = computed(() => {
    const id = this.curriculaSelId();
    if (!id) return [];
    const asigIds = new Set(this._asignaciones().map(a => a.cursoId));
    return this._cursos()
      .filter(c => c.curriculumId === id && !asigIds.has(c.id))
      .map(c => c.nombre);
  });

  // ── Methods ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.layout.setTitle('Gestión Curricular');
    this.periodosSvc.resolveContext().subscribe({
      next: (ctx) => {
        this.anioEscolarVigente = ctx.anioEscolar;
        this.cargarCatalogoInicial();
      },
      error: () => this.cargarCatalogoInicial(),
    });
  }

  onCfgTabClick(id: CfgTab): void {
    this.cfgTab.set(id);
  }

  private cargarCatalogoInicial(): void {
    const anio = this.anioEscolarVigente ?? undefined;
    this.curriculaSvc.loadCatalog(undefined, 'Primaria', anio).subscribe({
      next: (data) => {
        this._curriculas.set(data.curriculas as Curricula[]);
        this.seleccionarCurriculaPorNivel('Primaria');
      },
      error: () => this.showToast('No se pudo cargar la currícula', 'error'),
    });
  }

  onNivelAreaChange(nivel: NivelCurricula): void {
    this.seleccionarCurriculaPorNivel(nivel);
  }

  seleccionarCurriculaPorNivel(nivel: NivelCurricula): void {
    this.nivelArea.set(nivel);
    this.nivelComp.set(nivel);
    this.nivelMalla.set(nivel);
    const curr = pickCurriculaVigente(
      this._curriculas(),
      nivel,
      this.anioEscolarVigente,
    );
    if (curr) {
      this.seleccionarCurricula(curr.id);
      return;
    }
    this.curriculaSvc.resolveVigente(nivel, this.anioEscolarVigente ?? undefined).subscribe({
      next: (vigente) => {
        if (!this._curriculas().some((c) => c.id === vigente.id)) {
          this._curriculas.update((list) => [...list, vigente as Curricula]);
        }
        this.seleccionarCurricula(vigente.id);
      },
      error: () => this.showToast(`No hay malla activa para ${nivel}`, 'error'),
    });
  }

  seleccionarCurricula(id: number): void {
    this.curriculaSelId.set(id);
    const curr = this._curriculas().find(c => c.id === id);
    if (curr) {
      this.nivelArea.set(curr.nivel);
      this.nivelComp.set(curr.nivel);
      this.nivelMalla.set(curr.nivel);
    }
    if (this.tab() === 'malla') {
      this.cargarMallaVigente();
      return;
    }
    this.curriculaSvc.loadCatalog(id, curr?.nivel, this.anioEscolarVigente ?? undefined).subscribe({
      next: (data) => this.aplicarCatalogo(data),
      error: () => this.showToast('No se pudo cargar la currícula', 'error'),
    });
  }

  cambiarTab(next: MainTab): void {
    this.tab.set(next);
    if (next === 'malla') {
      this.cargarMallaVigente();
    }
  }

  onNivelMallaChange(nivel: NivelCurricula): void {
    this.nivelMalla.set(nivel);
    this.seleccionarCurriculaPorNivel(nivel);
  }

  private cargarMallaVigente(): void {
    const nivel = this.nivelMalla();
    this.curriculaSvc.loadMallaVigente(nivel, this.anioEscolarVigente ?? undefined).subscribe({
      next: (data) => this.aplicarMalla(data),
      error: () => this.showToast('No se pudo cargar la malla curricular activa', 'error'),
    });
  }

  private cargarMalla(id: number): void {
    this.curriculaSvc.loadMalla(id).subscribe({
      next: (data) => this.aplicarMalla(data),
      error: () => this.showToast('No se pudo cargar la malla curricular', 'error'),
    });
  }

  private aplicarMalla(data: MallaCurricular): void {
    this._curriculas.set(data.curriculas as Curricula[]);
    this._areas.set(data.areas as Area[]);
    this._cursos.set(data.cursos as Curso[]);
    this._asignaciones.set(data.asignaciones as AsignDocente[]);
    this._mallaGrados.set(data.grados);
    this._mallaTotales.set(data.totalesPorGrado);
    this._mallaDocentes.set(data.docentesAsignados);
    this.curriculaSelId.set(data.curriculo.id);
    this.nivelMalla.set(data.curriculo.nivel);
  }

  exportarMalla(): void {
    const curr = this.curriculaSel();
    if (!curr) return;

    const grados = this.gradosMalla();
    const rows: string[] = [
      ['Área', 'Curso', ...grados].join(','),
    ];

    for (const area of this.areasParaMalla()) {
      const cursos = this.cursosParaMalla().filter(c => c.areaId === area.id);
      for (const curso of cursos) {
        const celdas = grados.map(grado => {
          const hrs = this.hrsEnGrado(curso.id, grado);
          if (!hrs) return '—';
          const doc = this.docenteEnGrado(curso.id, grado);
          return doc ? `${hrs}h (${doc})` : `${hrs}h (Sin docente)`;
        });
        rows.push([area.nombre, curso.nombre, ...celdas].map(v => `"${v}"`).join(','));
      }
    }

    const totales = grados.map(g => `${this.totalHorasPorGrado(g)}h`);
    rows.push(['Total Horas / Grado', '', ...totales].map(v => `"${v}"`).join(','));

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `malla-${curr.nivel}-${curr.anio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private aplicarCatalogo(data: CurriculaCatalog): void {
    this._curriculas.set(data.curriculas as Curricula[]);
    this._areas.set(data.areas as Area[]);
    this._cursos.set(data.cursos as Curso[]);
    this._competencias.set(data.competencias as Competencia[]);
    this._capacidades.set(data.capacidades as Capacidad[]);
    this._indicadores.set(data.indicadores as Indicador[]);
    this._asignaciones.set(data.asignaciones as AsignDocente[]);
    this._mallaGrados.set([]);
    this._mallaTotales.set({});
    this._mallaDocentes.set(null);
    const primerCurso = data.cursos[0];
    if (primerCurso) this.cursoSelId.set(primerCurso.id);
    else this.cursoSelId.set(null);
    const curr = data.curriculas.find(c => c.id === this.curriculaSelId());
    if (curr) this.cargarCatalogoMaestro(curr.nivel);
  }

  private cargarCatalogoMaestro(nivel: NivelCurricula): void {
    this.catalogoCursosLoading.set(true);
    this.maestrosCursosSvc.list({ nivel, activo: true, page: 1, pageSize: 100 }).subscribe({
      next: (data) => this.catalogoCursos.set(data.items),
      error: () => {
        this.catalogoCursos.set([]);
        this.showToast('No se pudo cargar el catálogo de cursos del servidor', 'error');
      },
      complete: () => this.catalogoCursosLoading.set(false),
    });
  }

  // Areas
  cursosParaArea(areaId: number): Curso[] {
    return this._cursos().filter(c => c.areaId === areaId && c.activo);
  }
  isAreaOpen(id: number): boolean { return this.areaExpanded().has(id); }
  toggleArea(id: number): void {
    const s = new Set(this.areaExpanded());
    s.has(id) ? s.delete(id) : s.add(id);
    this.areaExpanded.set(s);
  }

  gradosParaNivel(nivel: NivelCurricula): string[] {
    if (nivel === 'Inicial') return G_INI;
    if (nivel === 'Primaria') return G_PRI;
    return G_SEC;
  }

  abrirModalArea(area?: Area): void {
    if (!this.puedeEditar()) return;
    if (area) {
      this.areaEditId.set(area.id);
      this.formAreaNombre = area.nombre;
      this.formAreaOrden = area.orden;
    } else {
      this.areaEditId.set(null);
      this.formAreaNombre = '';
      this.formAreaOrden = this.areasActuales().length + 1;
    }
    this.areaModalOpen.set(true);
  }

  cerrarModalArea(): void {
    this.areaModalOpen.set(false);
    this.areaEditId.set(null);
  }

  guardarArea(): void {
    const nombre = this.formAreaNombre.trim();
    if (!nombre) return;

    const curriculumId = this.curriculaSelId();
    if (!curriculumId) return;

    const editId = this.areaEditId();
    if (editId) {
      this.curriculaSvc.updateArea(editId, { nombre, orden: this.formAreaOrden }).subscribe({
        next: (updated) => {
          this._areas.update(list => list.map(a => a.id === updated.id ? { ...a, ...updated } : a));
          this.cerrarModalArea();
          this.showToast('Área actualizada');
        },
        error: () => this.showToast('No se pudo actualizar el área', 'error'),
      });
      return;
    }

    this.curriculaSvc.createArea({
      curriculumId,
      nombre,
      nivel: this.nivelArea(),
      orden: this.formAreaOrden,
    }).subscribe({
      next: (created) => {
        this._areas.update(list => [...list, created as Area]);
        this.areaExpanded.update(s => new Set([...s, created.id]));
        this.cerrarModalArea();
        this.showToast(`Área "${created.nombre}" creada`);
      },
      error: () => this.showToast('No se pudo crear el área', 'error'),
    });
  }

  eliminarArea(area: Area): void {
    const cursos = this.cursosParaArea(area.id);
    if (cursos.length > 0) {
      this.showToast('Elimina o reasigna los cursos del área antes de eliminarla', 'error');
      return;
    }
    if (!confirm(`¿Eliminar el área "${area.nombre}"?`)) return;

    this.curriculaSvc.updateArea(area.id, { activo: false }).subscribe({
      next: () => {
        this._areas.update(list => list.filter(a => a.id !== area.id));
        this.showToast('Área eliminada');
      },
      error: () => this.showToast('No se pudo eliminar el área', 'error'),
    });
  }

  abrirModalCurso(areaId?: number, curso?: Curso): void {
    if (!this.puedeEditar()) return;
    this.cursoMaestroSelId.set(null);
    if (curso) {
      this.cursoEditId.set(curso.id);
      this.formCursoNombre = curso.nombre;
      this.formCursoAreaId = curso.areaId;
      this.formCursoHoras = curso.horasSemanales;
      this.formCursoGrados = [...curso.grados];
      this.cursoModalOpen.set(true);
      return;
    }

    this.cursoEditId.set(null);
    this.formCursoNombre = '';
    this.formCursoAreaId = areaId ?? this.areasActuales()[0]?.id ?? null;
    this.formCursoHoras = 1;
    this.formCursoGrados = [...this.gradosParaNivel(this.nivelArea())];

    this.catalogoCursosLoading.set(true);
    this.cursoModalOpen.set(true);
    this.maestrosCursosSvc.list({ nivel: this.nivelArea(), activo: true, page: 1, pageSize: 100 }).subscribe({
      next: (data) => {
        this.catalogoCursos.set(data.items);
        if (!data.items.length) {
          this.showToast('No hay cursos en el catálogo maestro para este nivel', 'error');
        }
      },
      error: () => {
        this.catalogoCursos.set([]);
        this.showToast('No se pudo cargar el catálogo de cursos', 'error');
      },
      complete: () => this.catalogoCursosLoading.set(false),
    });
  }

  aplicarCursoMaestro(id: number | null): void {
    this.cursoMaestroSelId.set(id);
    if (!id) return;
    const mc = this.catalogoCursos().find(c => c.id === id);
    if (!mc) return;
    this.formCursoNombre = mc.nombre;
    this.formCursoHoras = mc.horasSemanales;
    this.formCursoGrados = [...mc.grados];
    const area = this.areasActuales().find(a => a.nombre === mc.area);
    if (area) this.formCursoAreaId = area.id;
  }

  cerrarModalCurso(): void {
    this.cursoModalOpen.set(false);
    this.cursoEditId.set(null);
    this.cursoMaestroSelId.set(null);
  }

  toggleGradoCurso(grado: string): void {
    const idx = this.formCursoGrados.indexOf(grado);
    if (idx >= 0) {
      this.formCursoGrados = this.formCursoGrados.filter(g => g !== grado);
    } else {
      this.formCursoGrados = [...this.formCursoGrados, grado];
    }
  }

  guardarCurso(): void {
    const nombre = this.formCursoNombre.trim();
    if (!nombre || !this.formCursoAreaId || this.formCursoGrados.length === 0) return;

    const curriculumId = this.curriculaSelId();
    if (!curriculumId) return;

    const payload = {
      nombre,
      areaId: this.formCursoAreaId,
      grados: [...this.formCursoGrados],
      horasSemanales: this.formCursoHoras,
    };

    const editId = this.cursoEditId();
    const maestroCursoId = this.cursoMaestroSelId();
    if (!editId && !maestroCursoId) {
      this.showToast('Selecciona un curso del catálogo maestro', 'error');
      return;
    }

    if (editId) {
      this.curriculaSvc.updateCurso(editId, payload).subscribe({
        next: (updated) => {
          this._cursos.update(list => list.map(c => c.id === updated.id ? { ...c, ...updated } : c));
          this.cerrarModalCurso();
          this.showToast('Curso actualizado');
        },
        error: () => this.showToast('No se pudo actualizar el curso', 'error'),
      });
      return;
    }

    this.curriculaSvc.createCurso({
      ...payload,
      curriculumId,
      maestroCursoId: maestroCursoId!,
      nivel: this.nivelArea(),
    }).subscribe({
      next: (created) => {
        this._cursos.update(list => [...list, created as Curso]);
        this.areaExpanded.update(s => new Set([...s, created.areaId]));
        this.cerrarModalCurso();
        this.showToast(`Curso "${created.nombre}" creado`);
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.showToast(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo crear el curso',
          'error',
        );
      },
    });
  }

  eliminarCurso(curso: Curso): void {
    if (!confirm(`¿Eliminar el curso "${curso.nombre}"?`)) return;

    this.curriculaSvc.updateCurso(curso.id, { activo: false }).subscribe({
      next: () => {
        this._cursos.update(list => list.filter(c => c.id !== curso.id));
        if (this.cursoSelId() === curso.id) {
          const next = this._cursos().find(c => c.nivel === this.nivelComp() && c.activo);
          this.cursoSelId.set(next?.id ?? null);
        }
        this.showToast('Curso eliminado');
      },
      error: () => this.showToast('No se pudo eliminar el curso', 'error'),
    });
  }

  // Competencias
  capsForComp(compId: number): Capacidad[] {
    return this._capacidades().filter(c => c.competenciaId === compId).sort((a, b) => a.orden - b.orden);
  }
  indsForCap(capId: number): Indicador[] {
    return this._indicadores().filter(i => i.capacidadId === capId);
  }
  isCompExpanded(id: number): boolean { return this.compExp().has(id); }
  isCapExpanded(id: number): boolean  { return this.capExp().has(id); }
  toggleComp(id: number): void {
    const s = new Set(this.compExp());
    s.has(id) ? s.delete(id) : s.add(id);
    this.compExp.set(s);
  }
  toggleCap(id: number): void {
    const s = new Set(this.capExp());
    s.has(id) ? s.delete(id) : s.add(id);
    this.capExp.set(s);
  }
  onNivelCompChange(val: string): void {
    this.onNivelAreaChange(val as NivelCurricula);
  }
  getCursoNombre(id: number): string {
    return this._cursos().find(c => c.id === id)?.nombre ?? '—';
  }

  // Malla
  hrsEnGrado(cursoId: number, grado: string): number | null {
    const c = this._cursos().find(x => x.id === cursoId);
    if (!c || !gradosIncluyen(grado, c.grados)) return null;
    return c.horasSemanales;
  }
  mallaCeldaAsignacion(cursoId: number, grado: string): MallaCeldaAsignacion {
    const vacio: MallaCeldaAsignacion = {
      asignado: false,
      docente: null,
      docenteCompleto: null,
      secciones: '',
    };
    const asigs = this.findAsignacionesEnGrado(cursoId, grado).filter(
      a => a.docenteId != null || (a.docenteNombre?.trim() ?? '').length > 0,
    );
    if (!asigs.length) return vacio;

    const secciones = [
      ...new Set(asigs.flatMap(a => (a.secciones ?? []).map(s => s.trim().toUpperCase()))),
    ]
      .filter(Boolean)
      .sort();
    const docenteCompleto = asigs[0].docenteNombre?.trim() || null;
    const docente = docenteCompleto
      ? docenteCompleto.split(/\s+/).slice(0, 2).join(' ')
      : null;

    return {
      asignado: !!docenteCompleto,
      docente,
      docenteCompleto,
      secciones: secciones.join(', '),
    };
  }
  docenteEnGrado(cursoId: number, grado: string): string | null {
    return this.mallaCeldaAsignacion(cursoId, grado).docente;
  }
  findAsignacionEnGrado(cursoId: number, grado: string): AsignDocente | undefined {
    return this.findAsignacionesEnGrado(cursoId, grado)[0];
  }
  findAsignacionesEnGrado(cursoId: number, grado: string): AsignDocente[] {
    const id = this.curriculaSelId();
    const nivel = this.nivelMalla();
    return this._asignaciones().filter(
      x => x.cursoId === cursoId
        && x.activo !== false
        && x.nivel.trim() === nivel
        && gradosIncluyen(grado, [x.grado])
        && (
          !id
          || x.curriculumId === id
          || this._cursos().some(c => c.id === x.cursoId && c.curriculumId === id)
        ),
    );
  }
  seccionMallaActiva(seccion: string): boolean {
    const sec = seccion.trim().toUpperCase();
    return this.mallaAsigSecciones().some(s => s.trim().toUpperCase() === sec);
  }
  abrirAsignacionMalla(cursoId: number, grado: string, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();

    this.mallaAsigCursoId.set(cursoId);
    this.mallaAsigGrado.set(grado);
    this.mallaAsigEditId.set(null);
    this.mallaAsigDocId.set(null);
    this.mallaAsigSecciones.set([]);
    this.mallaAsigCtxError.set(null);
    this.mallaAsigFormError.set(null);
    this.mallaAsigModalOpen.set(true);

    const existing = this.findAsignacionesEnGrado(cursoId, grado);
    if (existing.length === 1) {
      const a = existing[0];
      this.mallaAsigEditId.set(a.id);
      this.mallaAsigDocId.set(a.docenteId);
      this.mallaAsigSecciones.set(this.normalizarSeccionesMalla(a.secciones));
    } else if (existing.length > 1) {
      const docenteIds = new Set(existing.map(a => a.docenteId).filter((id): id is number => id != null));
      if (docenteIds.size === 1) {
        const principal = existing[0];
        this.mallaAsigEditId.set(principal.id);
        this.mallaAsigDocId.set(principal.docenteId);
        const secciones = existing.flatMap(a => a.secciones ?? []);
        this.mallaAsigSecciones.set(this.normalizarSeccionesMalla(secciones));
      }
    }

    this.cargarCtxAsignacionMalla();
  }
  recargarCtxAsignacionMalla(): void {
    this.mallaAsigCtxError.set(null);
    this.cargarCtxAsignacionMalla();
  }
  private normalizarSeccionesMalla(secciones: string[] | undefined): string[] {
    return [...new Set((secciones ?? []).map(s => s.trim().toUpperCase()).filter(Boolean))].sort();
  }
  private cargarCtxAsignacionMalla(): void {
    this.asignacionSvc.loadContext(this.anioActivo() ?? undefined).subscribe({
      next: (ctx) => {
        this._docentesAsig.set(ctx.docentes);
        this._seccionesPorGrado.set(ctx.seccionesPorGrado);
        this._asignacionCtxLoaded.set(true);
        this.mallaAsigCtxError.set(null);
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'No se pudo cargar docentes para asignar';
        this.mallaAsigCtxError.set(msg);
        this.showToast(msg, 'error');
      },
    });
  }
  cerrarAsignacionMalla(): void {
    if (this.asignacionSvc.saving()) return;
    this.mallaAsigModalOpen.set(false);
    this.mallaAsigEditId.set(null);
    this.mallaAsigFormError.set(null);
  }
  toggleSeccionMalla(s: string, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const sec = s.trim().toUpperCase();
    const cur = this.normalizarSeccionesMalla(this.mallaAsigSecciones());
    this.mallaAsigFormError.set(null);
    this.mallaAsigSecciones.set(
      cur.includes(sec) ? cur.filter(x => x !== sec) : [...cur, sec],
    );
  }
  guardarAsignacionMalla(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.mallaAsigFormError.set(null);

    const cursoId = this.mallaAsigCursoId();
    const docId = this.mallaAsigDocId();
    const curriculumId = this.curriculaSelId();
    const curso = this.mallaAsigCurso();
    const secciones = this.normalizarSeccionesMalla(this.mallaAsigSecciones());

    if (!cursoId || docId == null || !curriculumId || !curso) {
      const msg = 'Seleccione docente y secciones';
      this.mallaAsigFormError.set(msg);
      this.showToast(msg, 'error');
      return;
    }
    if (!secciones.length) {
      const msg = 'Seleccione al menos una sección';
      this.mallaAsigFormError.set(msg);
      this.showToast(msg, 'error');
      return;
    }

    const payload = {
      curriculumId,
      docenteId: docId,
      cursoId,
      nivel: this.nivelMalla(),
      grado: this.mallaAsigGrado(),
      secciones,
      horasSemanales: Math.round(curso.horasSemanales ?? 0),
    };

    const editId = this.mallaAsigEditId();
    const req = editId
      ? this.asignacionSvc.update(editId, {
          docenteId: payload.docenteId,
          cursoId: payload.cursoId,
          nivel: payload.nivel,
          grado: payload.grado,
          secciones: payload.secciones,
          horasSemanales: payload.horasSemanales,
        })
      : this.asignacionSvc.create(payload);

    req.subscribe({
      next: (saved) => {
        this.aplicarAsignacionMallaLocal(saved, editId);
        this.cerrarAsignacionMalla();
        const id = this.curriculaSelId();
        if (id) this.cargarMalla(id);
        this.showToast(editId ? 'Asignación actualizada' : 'Docente asignado correctamente');
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'No se pudo guardar la asignación';
        this.mallaAsigFormError.set(msg);
        this.showToast(msg, 'error');
      },
    });
  }
  totalHorasPorGrado(grado: string): number {
    const fromApi = this._mallaTotales()[grado];
    if (fromApi != null) return fromApi;
    return this.cursosParaMalla()
      .filter(c => gradosIncluyen(grado, c.grados))
      .reduce((s, c) => s + c.horasSemanales, 0);
  }
  private aplicarAsignacionMallaLocal(saved: AsignacionDocente, editId: number | null): void {
    const mapped: AsignDocente = {
      id: saved.id,
      docenteId: saved.docenteId,
      docenteNombre: saved.docenteNombre,
      cursoId: saved.cursoId,
      curriculumId: saved.curriculumId,
      nivel: saved.nivel as NivelCurricula,
      grado: saved.grado,
      secciones: [...(saved.secciones ?? [])],
      horasSemanales: saved.horasSemanales,
      activo: saved.activo,
    };
    if (editId != null) {
      this._asignaciones.update(list => list.map(a => (a.id === editId ? mapped : a)));
      return;
    }
    this._asignaciones.update(list => {
      const sinDuplicado = list.filter(a => a.id !== mapped.id);
      return [...sinDuplicado, mapped];
    });
  }

  // Docentes
  asigParaDocente(docenteId: number): AsignDocente[] {
    const doc = this.docentesConAsig().find(d => d.id === docenteId);
    if (!doc) return [];
    return this._asignaciones().filter(a => a.docenteNombre === doc.nombre);
  }

  // Escalas
  escalaLabel(e: TipoEscala): string {
    if (e === 'numerica')    return '0 – 20';
    if (e === 'literal')     return 'A / B / C';
    return 'AD / A / B / C';
  }

  // CRUD
  activarCurricula(id: number): void {
    this.curriculaSvc.activateCurricula(id).subscribe({
      next: (updated) => {
        this._curriculas.update(list =>
          list.map(c =>
            c.nivel === updated.nivel && c.id !== updated.id && c.estado === 'activo'
              ? { ...c, estado: 'inactivo' as EstadoCurr }
              : c.id === updated.id
                ? { ...c, estado: 'activo' as EstadoCurr }
                : c,
          ),
        );
        this.detalleCache.set({});
        this.showToast('Currícula activada correctamente');
      },
      error: () => this.showToast('No se pudo activar la currícula', 'error'),
    });
  }
  copiarCurricula(id: number): void {
    this.curriculaSvc.copyCurricula(id).subscribe({
      next: (copy) => {
        this._curriculas.update(list => [...list, copy as Curricula]);
        this.showToast('Currícula copiada como borrador');
        this.seleccionarCurricula(copy.id);
      },
      error: () => this.showToast('No se pudo copiar la currícula', 'error'),
    });
  }
  abrirModalCurr(c?: Curricula): void {
    if (c) {
      if (c.estado === 'inactivo') {
        this.showToast('No se puede editar una currícula inactiva', 'error');
        return;
      }
      this.curricEditId.set(c.id);
      this.formAnio = c.anio;
      this.formNivel = c.nivel;
      this.formVersion = c.version;
      this.formEscala = c.tipoEscala;
      this.formPeriodo = c.tipoPeriodo;
    } else {
      this.curricEditId.set(null);
      this.formAnio = 2026;
      this.formNivel = 'Primaria';
      this.formVersion = '1.0';
      this.formEscala = 'numerica';
      this.formPeriodo = 'bimestral';
    }
    this.modalOpen.set(true);
  }

  cerrarModalCurr(): void {
    this.modalOpen.set(false);
    this.curricEditId.set(null);
  }

  toggleDetalleCurricula(id: number): void {
    if (this.detalleExpandidoId() === id) {
      this.detalleExpandidoId.set(null);
      return;
    }
    this.detalleExpandidoId.set(id);
    if (!this.detalleCache()[id]) {
      this.curriculaSvc.loadCurriculaDetail(id).subscribe({
        next: (det) => this.detalleCache.update(cache => ({ ...cache, [id]: det })),
        error: () => this.showToast('No se pudo cargar el detalle', 'error'),
      });
    }
  }

  irGestionarCurricula(c: Curricula): void {
    this.tab.set('areas');
    this.seleccionarCurricula(c.id);
  }

  guardarCurricula(): void {
    const editId = this.curricEditId();
    if (editId) {
      this.curriculaSvc.updateCurricula(editId, {
        version: this.formVersion.trim() || '1.0',
        tipoEscala: this.formEscala,
        tipoPeriodo: this.formPeriodo,
      }).subscribe({
        next: (updated) => {
          this._curriculas.update(list =>
            list.map(c => c.id === updated.id ? { ...c, ...updated } as Curricula : c),
          );
          this.detalleCache.update(cache => {
            const next = { ...cache };
            delete next[editId];
            return next;
          });
          this.cerrarModalCurr();
          this.showToast('Currícula actualizada');
        },
        error: () => this.showToast('No se pudo actualizar la currícula', 'error'),
      });
      return;
    }

    this.curriculaSvc.createCurricula({
      anio: this.formAnio,
      nivel: this.formNivel,
      tipoEscala: this.formEscala,
      tipoPeriodo: this.formPeriodo,
    }).subscribe({
      next: (created) => {
        this._curriculas.update(list => [...list, created as Curricula]);
        this.cerrarModalCurr();
        this.showToast(`Currícula ${this.formNivel} ${this.formAnio} creada con estructura clonada`);
        this.seleccionarCurricula(created.id);
      },
      error: () => this.showToast('No se pudo crear la currícula', 'error'),
    });
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toast.set({ show: true, msg, type });
    setTimeout(() => this.toast.set({ show: false, msg: '', type: 'success' }), 3000);
  }
}


