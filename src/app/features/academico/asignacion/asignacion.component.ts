import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import {
  TenantInstitutionConsultaModo,
  TenantInstitutionPickerComponent,
} from '../../../core/tenant/tenant-institution-picker.component';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import { OverlayPortalDirective } from '../../../core/overlay/overlay-portal.directive';
import {
  escapeHtml,
  printIframe,
  wrapPrintDocumentHtml,
  writeHtmlToIframe,
} from '../../../core/print/print-html.util';
import { etiquetaGradoConNivel } from '../../../core/academico/grado-display.util';
import { AsignacionService } from './asignacion.service';
import {
  AsignacionDocente,
  CursoAsignacion,
  DocenteAsignacion,
  NivelAsignacion,
  TipoDocente,
} from './asignacion.model';

type CoberturaEstado = 'completa' | 'parcial' | 'ninguna' | 'na';

interface CoberturaSeccionItem {
  seccion: string;
  docente: string | null;
  docenteCompleto: string | null;
}

interface CoberturaCelda {
  secciones: CoberturaSeccionItem[];
  cubiertas: number;
  total: number;
  estado: CoberturaEstado;
}
type Nivel = NivelAsignacion;
type TipoDoc = TipoDocente;
type MainTab = 'asignaciones' | 'docentes' | 'cobertura';
type Docente = DocenteAsignacion;
type Curso = CursoAsignacion;
type Asignacion = AsignacionDocente;

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
  const key = gradoAsignacionKey(grado);
  return grados.some((g) => gradoAsignacionKey(g) === key);
}

function normMatchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Especialidad del docente alineada con el área o nombre del curso seleccionado. */
function docenteEnsenaCurso(docente: Docente, cur: Curso): boolean {
  if (!docente.activo) return false;

  const esp = normMatchText(docente.especialidad);
  const area = normMatchText(cur.area);
  const nombre = normMatchText(cur.nombre);

  const pares: [string[], string[]][] = [
    [['matematic'], ['matematic', 'algebra', 'geometria', 'aritmetica', 'trigonometria']],
    [['comunicacion'], ['comunicacion', 'comprension lectora', 'produccion de textos', 'lengua']],
    [['ciencias', 'ciencia'], ['ciencia', 'biologia', 'fisica', 'quimica', 'cta', 'tecnologia']],
    [['historia'], ['historia', 'ccss', 'personal social', 'geografia', 'dpcc', 'ciencias sociales']],
    [['educacion fisica'], ['educacion fisica', 'psicomotricidad']],
    [['arte'], ['arte y cultura', 'arte']],
    [['ingles'], ['ingles']],
    [['musica'], ['musica']],
    [['religion', 'religiosa'], ['religion', 'religiosa']],
    [['tecnologia'], ['tecnologia', 'trabajo']],
    [['tutoria'], ['tutoria']],
  ];

  for (const [espKeys, curKeys] of pares) {
    if (!espKeys.some((k) => esp.includes(k))) continue;
    if (curKeys.some((k) => area.includes(k) || nombre.includes(k))) return true;
  }

  const tokens = [...area.split(/\s+/), ...nombre.split(/\s+/)]
    .map((t) => t.trim())
    .filter((t) => t.length >= 4);
  return tokens.some((t) => esp.includes(t));
}

const PRINT_PREVIEW_FRAME_ID = 'asignacion-print-preview-frame';

@Component({
  selector: 'app-asignacion',
  standalone: true,
  imports: [FormsModule, NgClass, OverlayPortalDirective, TenantInstitutionPickerComponent],
  template: `
<div class="min-h-screen bg-gray-50 animate-fade-in">

  <!-- HEADER -->
  <div class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <span>Gestión Académica</span><span>›</span>
          <span class="text-gray-700 font-medium">Asignación Docente</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Asignación de Docentes</h1>
        <p class="text-sm text-gray-500 mt-0.5">Relaciona docentes con cursos, grados y secciones — A.E. {{ anioEscolar() }}</p>
      </div>
      <div class="flex items-center gap-2 mt-1">
        <button class="btn btn-secondary text-sm gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Exportar
        </button>
        @if (puedeGestionar()) {
          <button class="btn btn-primary text-sm gap-1.5" (click)="abrirDrawer()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nueva Asignación
          </button>
        }
      </div>
    </div>

    <!-- TABS -->
    <div class="flex mt-5 border-b border-gray-100 -mb-px">
      @for (t of TABS; track t.id) {
        <button class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all"
          [ngClass]="tab() === t.id
            ? 'border-indigo-600 text-indigo-700'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          (click)="tab.set($any(t.id))">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="t.icon"/>
          </svg>
          {{ t.label }}
        </button>
      }
    </div>
  </div>

  <div class="p-6 max-w-[1400px] mx-auto">

    <div class="mb-4 card p-4">
      <app-tenant-institution-picker
        #instPickerAsignacion
        [allowGlobal]="false"
        hint="Seleccione la institución antes de consultar asignaciones por docente."
        (modoChange)="onModoInstitucion($event)"
      />
    </div>

    @if (requiereSeleccionInstitucion()) {
      <div class="card p-12 text-center space-y-3 mb-4">
        <span class="icon text-4xl text-amber-500">school</span>
        <p class="text-gray-700 font-medium">Seleccione una institución educativa</p>
        <p class="text-sm text-gray-500 max-w-md mx-auto">
          Elija la IE en el selector para ver docentes, asignaciones y cobertura.
        </p>
      </div>
    }

    @if (loadError()) {
      <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {{ loadError() }}
        <button class="ml-3 underline font-medium" (click)="cargarDatos()">Reintentar</button>
      </div>
    }

    @if (feedback(); as fb) {
      <div class="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium animate-fade-in"
        [ngClass]="fb.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'"
        role="alert">
        <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            [attr.d]="fb.type === 'success'
              ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'"/>
        </svg>
        <span class="flex-1">{{ fb.msg }}</span>
        <button type="button" class="text-current opacity-60 hover:opacity-100 text-lg leading-none" (click)="cerrarFeedback()">×</button>
      </div>
    }

    @if (svc.loading()) {
      <div class="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
        Cargando asignaciones desde el servidor…
      </div>
    }

    <!-- KPI cards (siempre visibles) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="card p-4 border-l-4 border-l-indigo-500">
        <div class="text-2xl font-bold text-indigo-700">{{ kpis().docentesAsig }}</div>
        <div class="text-xs text-gray-500 mt-1">Docentes Asignados</div>
        <div class="text-xs text-gray-400">de {{ _docentes().length }} registrados</div>
      </div>
      <div class="card p-4 border-l-4 border-l-blue-500">
        <div class="text-2xl font-bold text-blue-700">{{ kpis().totalAsig }}</div>
        <div class="text-xs text-gray-500 mt-1">Asignaciones Activas</div>
        <div class="text-xs text-gray-400">{{ kpis().totalSecciones }} secciones cubiertas</div>
      </div>
      <div class="card p-4 border-l-4 border-l-emerald-500">
        <div class="text-2xl font-bold text-emerald-700">{{ kpis().promedioHoras }}h</div>
        <div class="text-xs text-gray-500 mt-1">Promedio Horas/Docente</div>
        <div class="text-xs text-gray-400">por semana</div>
      </div>
      <div class="card p-4 border-l-4" [ngClass]="kpis().sinDocente > 0 ? 'border-l-orange-400' : 'border-l-green-400'">
        <div class="text-2xl font-bold" [ngClass]="kpis().sinDocente > 0 ? 'text-orange-600' : 'text-green-600'">
          {{ kpis().sinDocente }}
        </div>
        <div class="text-xs text-gray-500 mt-1">Secciones Sin Cubrir</div>
        <div class="text-xs" [ngClass]="kpis().sinDocente > 0 ? 'text-orange-400' : 'text-green-400'">
          {{ kpis().sinDocente === 0 ? 'Todas las secciones cubiertas ✓' : 'Requieren atención' }}
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════
         TAB 1: ASIGNACIONES
    ════════════════════════════════════════════ -->
    @if (tab() === 'asignaciones') {
      <div class="space-y-4 animate-fade-in">

        <!-- Filtros -->
        <div class="card p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label class="form-label">Buscar</label>
            <div class="relative">
              <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input class="form-input pl-8 w-52" placeholder="Docente o curso..."
                [ngModel]="fBusq()" (ngModelChange)="fBusq.set($event)">
            </div>
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
            <label class="form-label">Grado</label>
            <select class="form-input w-32" [ngModel]="fGrado()" (ngModelChange)="fGrado.set($event)">
              <option value="">Todos</option>
              @for (g of gradosFiltro(); track g) {
                <option [value]="g">{{ fNivel() ? etiquetaGrado(fNivel(), g) : g }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label">Docente</label>
            <select class="form-input w-52" [ngModel]="fDocId()" (ngModelChange)="fDocId.set($event ? +$event : null)">
              <option [ngValue]="null">Todos</option>
              @for (d of _docentes(); track d.id) {
                <option [ngValue]="d.id">{{ d.apellidos }}, {{ d.nombres }}</option>
              }
            </select>
          </div>
          <div class="ml-auto flex items-center gap-3 self-end">
            <span class="text-sm text-gray-400">{{ asigFiltradas().length }} resultado(s)</span>
            <button class="text-xs text-indigo-600 hover:text-indigo-800" (click)="limpiarFiltros()">Limpiar filtros</button>
          </div>
        </div>

        <!-- Table -->
        <div class="card overflow-hidden">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Docente</th>
                <th>Especialidad</th>
                <th>Curso</th>
                <th>Nivel</th>
                <th>Grado</th>
                <th>Secciones</th>
                <th class="text-center">Hrs/sem</th>
                <th>Estado</th>
                <th class="text-right pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (a of asigFiltradas(); track a.id) {
                @let doc = docById(a.docenteId);
                @let cur = curById(a.cursoId);
                <tr>
                  <td>
                    @if (doc && a.docenteId) {
                      <button
                        type="button"
                        class="flex items-center gap-2 text-left rounded-lg px-1 py-0.5 -mx-1 hover:bg-indigo-50 transition-colors w-full"
                        (click)="abrirDetalleDocente(a.docenteId!)"
                      >
                        <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {{ doc.nombres[0] }}{{ doc.apellidos[0] }}
                        </div>
                        <div class="min-w-0">
                          <div class="font-medium text-indigo-700 text-sm truncate hover:underline">
                            {{ doc.apellidos }}, {{ doc.nombres }}
                          </div>
                          <div class="text-xs text-gray-400">{{ doc.dni }}</div>
                        </div>
                      </button>
                    } @else {
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          ?
                        </div>
                        <div>
                          <div class="font-medium text-gray-900 text-sm">{{ a.docenteNombre || '—' }}</div>
                          <div class="text-xs text-gray-400">—</div>
                        </div>
                      </div>
                    }
                  </td>
                  <td class="text-sm text-gray-600">{{ doc?.especialidad ?? '—' }}</td>
                  <td>
                    <div class="text-sm font-medium text-gray-800">{{ cur?.nombre }}</div>
                    <div class="text-xs text-gray-400">{{ cur?.area }}</div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-blue':   a.nivel === 'Inicial',
                      'badge-indigo': a.nivel === 'Primaria',
                      'badge-purple': a.nivel === 'Secundaria'
                    }">{{ a.nivel }}</span>
                  </td>
                  <td class="font-semibold text-gray-800">{{ etiquetaGrado(a.nivel, a.grado) }}</td>
                  <td>
                    <div class="flex gap-1 flex-wrap">
                      @for (s of a.secciones; track s) {
                        <span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">{{ s }}</span>
                      }
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="font-bold text-indigo-700">{{ a.horasSemanales }}</span>
                    <span class="text-xs text-gray-400">h</span>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="a.activo ? 'badge-green' : 'badge-gray'">
                      {{ a.activo ? 'Activa' : 'Inactiva' }}
                    </span>
                  </td>
                  <td class="text-right pr-2">
                    <div class="flex items-center justify-end gap-1">
                      <button class="btn btn-ghost btn-icon" title="Editar" (click)="editarAsig(a.id)">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button class="btn btn-ghost btn-icon text-red-400 hover:text-red-600" title="Eliminar"
                        (click)="$event.stopPropagation(); pedirQuitarAsig(a.id)">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @empty {
                <tr>
                  <td colspan="9" class="text-center py-16 text-gray-400">
                    <svg class="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Sin asignaciones con los filtros aplicados
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- ════════════════════════════════════════════
         TAB 2: POR DOCENTE
    ════════════════════════════════════════════ -->
    @if (tab() === 'docentes') {
      <div class="space-y-4 animate-fade-in">

        <!-- Filter + sort -->
        <div class="flex flex-wrap gap-3 items-center">
          <div class="flex gap-2">
            <button class="px-3 py-1.5 text-xs rounded-lg font-medium border transition-all"
              [ngClass]="docenteFilter() === 'todos' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'"
              (click)="setDocenteFilter('todos')">Todos</button>
            <button class="px-3 py-1.5 text-xs rounded-lg font-medium border transition-all"
              [ngClass]="docenteFilter() === 'nombrado' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'"
              (click)="setDocenteFilter('nombrado')">Nombrados</button>
            <button class="px-3 py-1.5 text-xs rounded-lg font-medium border transition-all"
              [ngClass]="docenteFilter() === 'contratado' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'"
              (click)="setDocenteFilter('contratado')">Contratados</button>
            <button class="px-3 py-1.5 text-xs rounded-lg font-medium border transition-all"
              [ngClass]="docenteFilter() === 'sobrecarga' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'"
              (click)="setDocenteFilter('sobrecarga')">Con Sobrecarga</button>
          </div>
          <div class="flex items-center gap-2 ml-auto">
            <button type="button" class="btn btn-secondary text-sm gap-1.5" (click)="imprimirDocentes()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
              </svg>
              Imprimir por docente
            </button>
            <span class="text-sm text-gray-400">{{ totalDocentesFiltrados() }} docente(s)</span>
          </div>
        </div>

        <p class="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          Haz clic en un docente para abrir el panel lateral con todas sus asignaciones actuales.
        </p>

        <div class="card overflow-hidden">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Docente</th>
                <th>Especialidad</th>
                <th>Tipo</th>
                <th class="text-center">Asignaciones</th>
                <th class="text-center">Carga horaria</th>
                <th class="text-right pr-4">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (doc of docentesPaginados(); track doc.id) {
                @let stats = docenteStats(doc.id);
                @let pct = Math.min(100, Math.round((stats.totalHoras / doc.maxHoras) * 100));
                <tr
                  class="cursor-pointer hover:bg-indigo-50/60 transition-colors"
                  [ngClass]="docenteDetalleId() === doc.id && detalleDrawerOpen() ? 'bg-indigo-50' : ''"
                  (click)="abrirDetalleDocente(doc.id)"
                >
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        [ngClass]="doc.tipo === 'nombrado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'">
                        {{ doc.nombres[0] }}{{ doc.apellidos[0] }}
                      </div>
                      <div>
                        <div class="font-medium text-gray-900">{{ doc.apellidos }}, {{ doc.nombres }}</div>
                        <div class="text-xs text-gray-400">DNI {{ doc.dni }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="text-sm text-gray-600">{{ doc.especialidad }}</td>
                  <td>
                    <span class="badge text-xs" [ngClass]="doc.tipo === 'nombrado' ? 'badge-green' : 'badge-orange'">
                      {{ doc.tipo }}
                    </span>
                  </td>
                  <td class="text-center text-sm font-medium text-gray-700">{{ stats.asignaciones.length }}</td>
                  <td class="text-center">
                    <div class="text-sm font-bold" [ngClass]="pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600'">
                      {{ stats.totalHoras }}h / {{ doc.maxHoras }}h
                    </div>
                    <div class="text-[11px] text-gray-400">{{ pct }}%</div>
                  </td>
                  <td class="text-right pr-4">
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm text-indigo-600"
                      (click)="$event.stopPropagation(); abrirDetalleDocente(doc.id)"
                    >
                      Ver asignación
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-4 py-10 text-center text-sm text-gray-400">
                    No hay docentes para los filtros seleccionados
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (totalDocentesFiltrados() > 0) {
            <div class="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
              <span>
                Mostrando {{ inicioDocentes() + 1 }}–{{ finDocentes() }}
                de {{ totalDocentesFiltrados() }} · {{ DOCENTES_POR_PAGINA }} por página
              </span>
              @if (totalPaginasDocentes() > 1) {
                <div class="flex items-center gap-1">
                  <button type="button" class="btn btn-icon btn-sm" [disabled]="docentesPagina() === 1" (click)="irPaginaDocentes(docentesPagina() - 1)">‹</button>
                  @for (p of paginasDocentes(); track p) {
                    <button type="button" class="w-8 h-8 rounded-lg text-xs font-medium"
                      [ngClass]="p === docentesPagina() ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
                      (click)="irPaginaDocentes(p)">{{ p }}</button>
                  }
                  <button type="button" class="btn btn-icon btn-sm" [disabled]="docentesPagina() === totalPaginasDocentes()" (click)="irPaginaDocentes(docentesPagina() + 1)">›</button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }

    <!-- ════════════════════════════════════════════
         TAB 3: COBERTURA
    ════════════════════════════════════════════ -->
    @if (tab() === 'cobertura') {
      <div class="space-y-5 animate-fade-in">

        <!-- Nivel selector -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex gap-2">
            @for (n of NIVELES; track n) {
              <button class="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                [ngClass]="nivelCob() === n
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                (click)="nivelCob.set($any(n))">
                {{ n }}
              </button>
            }
          </div>
          <div class="flex items-center gap-2">
            <button type="button" class="btn btn-secondary text-sm gap-1.5" (click)="imprimirCobertura()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
              </svg>
              Imprimir cuadro
            </button>
          </div>
          <!-- Legend -->
          <div class="flex items-center gap-4 text-xs text-gray-500">
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>
              <span>Parcial</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
              <span>Completa</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded bg-red-100 border border-red-300"></span>
              <span>Sin docente</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded bg-gray-100 border border-gray-200"></span>
              <span>No aplica</span>
            </div>
          </div>
        </div>

        <!-- Coverage summary bar -->
        @let cob = coberturaStats();
        <div class="card p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-gray-700">Cobertura {{ nivelCob() }}</span>
            <span class="text-sm font-bold" [ngClass]="cob.pct >= 90 ? 'text-emerald-600' : cob.pct >= 70 ? 'text-amber-600' : 'text-red-600'">
              {{ cob.pct }}% cubierto
            </span>
          </div>
          <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all"
              [style.width.%]="cob.pct"
              [ngClass]="cob.pct >= 90 ? 'bg-emerald-500' : cob.pct >= 70 ? 'bg-amber-400' : 'bg-red-500'">
            </div>
          </div>
          <div class="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{{ cob.cubiertos }} de {{ cob.total }} combinaciones curso-grado-sección</span>
            <span class="text-red-400 font-medium">{{ cob.total - cob.cubiertos }} sin cubrir</span>
          </div>
        </div>

        <!-- Coverage matrix table -->
        <div class="card overflow-x-auto">
          @if (svc.loading() && !cursosCob().length) {
            <div class="p-10 text-center text-gray-400 text-sm animate-pulse">
              Cargando cursos del catálogo maestro…
            </div>
          } @else if (!cursosCob().length) {
            <div class="p-10 text-center text-gray-500 text-sm">
              No hay cursos del catálogo maestro para {{ nivelCob() }}.
            </div>
          } @else {
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="bg-gray-50">
                <th class="text-left px-3 py-3 font-semibold text-gray-600 border-b border-r border-gray-200 sticky left-0 bg-gray-50 z-10 w-40">Curso</th>
                <th class="text-center px-2 py-3 font-semibold text-gray-600 border-b border-r border-gray-200 w-8">H/s</th>
                @for (g of gradosCob(); track g) {
                  <th class="text-center px-3 py-3 font-semibold text-gray-700 border-b border-r border-gray-200 min-w-[110px]">
                    {{ etiquetaGrado(nivelCob(), g) }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (cur of cursosCob(); track cur.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-3 py-2 font-medium text-gray-800 border-r border-b border-gray-100 sticky left-0 bg-white z-10">
                    <div>{{ cur.nombre }}</div>
                    <div class="text-gray-400 text-xs">{{ cur.area }}</div>
                  </td>
                  <td class="text-center px-2 py-2 border-r border-b border-gray-100 font-semibold text-indigo-600">{{ cur.horasSemanales }}</td>
                  @for (g of gradosCob(); track g) {
                    @let cel = coberturaCelda(cur.id, g, nivelCob());
                    <td class="px-2 py-2 border-r border-b border-gray-100 align-top"
                      [ngClass]="cel.estado === 'na'
                        ? 'bg-gray-50 text-center'
                        : cel.estado === 'completa'
                          ? 'bg-emerald-50'
                          : cel.estado === 'parcial'
                            ? 'bg-amber-50'
                            : 'bg-red-50'">
                      @if (cel.estado === 'na') {
                        <span class="text-gray-300">—</span>
                      } @else {
                        <div class="space-y-1 min-w-[96px]">
                          @for (item of cel.secciones; track item.seccion) {
                            <div class="flex items-center justify-between gap-1 leading-tight px-0.5">
                              <span class="inline-flex w-5 h-5 items-center justify-center rounded bg-white/80 border border-gray-200 text-[10px] font-bold text-gray-600 shrink-0">
                                {{ item.seccion }}
                              </span>
                              @if (item.docente) {
                                <span class="text-[10px] text-emerald-700 font-medium truncate" [title]="item.docenteCompleto ?? item.docente">
                                  {{ item.docente }}
                                </span>
                              } @else {
                                <button type="button"
                                  class="text-[10px] text-red-600 font-semibold hover:underline shrink-0"
                                  (click)="abrirDrawerParaCurso(cur.id, g, item.seccion)">
                                  Asignar
                                </button>
                              }
                            </div>
                          }
                        </div>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
          }
        </div>
      </div>
    }

  </div><!-- /content -->

  <!-- ════════════════════════════════════════════
       DRAWER: Detalle docente
  ════════════════════════════════════════════ -->
  @if (detalleDrawerOpen() && docenteDetalle(); as doc) {
    <div appOverlayPortal class="fixed inset-0 z-50">
    <div class="fixed inset-0 bg-black/40" (click)="cerrarDetalleDocente()"></div>

    <div class="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col animate-slide-in-r">
      <div class="relative overflow-hidden px-6 py-5 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-900 shrink-0">
        <div class="relative flex justify-between items-start gap-3">
          <div>
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/15 text-white border border-white/20">
              Asignación actual
            </span>
            <h2 class="text-xl font-black text-white mt-3 leading-tight">{{ doc.apellidos }}, {{ doc.nombres }}</h2>
            <p class="text-sm text-white/75 mt-1">{{ doc.especialidad }} · DNI {{ doc.dni }}</p>
          </div>
          <button type="button" class="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25" (click)="cerrarDetalleDocente()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        @let stats = docenteDetalleStats();
        @let pct = Math.min(100, Math.round((stats.totalHoras / doc.maxHoras) * 100));
        <div class="relative mt-4 grid grid-cols-3 gap-2">
          <div class="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 p-3 text-center">
            <p class="text-[10px] uppercase tracking-wide text-white/70">Horas</p>
            <p class="text-lg font-black text-white">{{ stats.totalHoras }}/{{ doc.maxHoras }}</p>
          </div>
          <div class="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 p-3 text-center">
            <p class="text-[10px] uppercase tracking-wide text-white/70">Asignaciones</p>
            <p class="text-lg font-black text-white">{{ stats.asignaciones.length }}</p>
          </div>
          <div class="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 p-3 text-center">
            <p class="text-[10px] uppercase tracking-wide text-white/70">Carga</p>
            <p class="text-lg font-black text-white">{{ pct }}%</p>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 space-y-5">
        <div>
          <div class="flex justify-between text-xs mb-1.5">
            <span class="text-gray-500">Carga horaria asignada</span>
            <span class="font-semibold" [ngClass]="pct >= 100 ? 'text-red-600' : 'text-gray-700'">{{ pct }}%</span>
          </div>
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all"
              [style.width.%]="pct"
              [ngClass]="pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'">
            </div>
          </div>
        </div>

        <div>
          <h4 class="text-sm font-bold text-gray-900 mb-3">Cursos asignados — A.E. {{ anioEscolar() }}</h4>

          @if (!stats.asignaciones.length) {
            <div class="p-8 rounded-xl border border-dashed border-gray-200 text-center text-sm text-gray-400">
              Este docente no tiene asignaciones activas.
            </div>
          } @else {
            <div class="space-y-3">
              @for (a of stats.asignaciones; track a.id) {
                @let cur = curById(a.cursoId);
                <div class="p-4 rounded-xl border border-gray-100 bg-gray-50/80">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="badge text-xs"
                          [ngClass]="a.nivel === 'Primaria' ? 'badge-indigo' : a.nivel === 'Secundaria' ? 'badge-purple' : 'badge-blue'">
                          {{ a.nivel }}
                        </span>
                        <p class="font-semibold text-gray-900 truncate">{{ cur?.nombre ?? 'Curso #' + a.cursoId }}</p>
                      </div>
                      <p class="text-xs text-gray-500 mt-1">{{ cur?.area ?? '—' }} · {{ a.grado }}</p>
                      <div class="flex flex-wrap gap-1.5 mt-2">
                        @for (sec of a.secciones; track sec) {
                          <span class="inline-flex px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-medium">
                            Sec. {{ sec }}
                          </span>
                        }
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <div class="text-sm font-bold text-indigo-600">{{ a.horasSemanales }}h/sem</div>
                      <span class="badge badge-green text-[10px] mt-1">Activo</span>
                    </div>
                  </div>
                  <div class="flex gap-2 mt-3 pt-3 border-t border-gray-200/80">
                    <button type="button" class="btn btn-ghost btn-sm text-xs" (click)="editarAsigDesdeDetalle(a.id)">Editar</button>
                    <button type="button" class="btn btn-ghost btn-sm text-xs text-red-600"
                      (click)="$event.stopPropagation(); pedirQuitarAsig(a.id)">Quitar</button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0">
        <button type="button" class="btn btn-secondary" (click)="imprimirDocenteActual()">
          <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Imprimir
        </button>
        <button type="button" class="btn btn-secondary flex-1" (click)="cerrarDetalleDocente()">Cerrar</button>
        <button type="button" class="btn btn-primary flex-1" (click)="abrirDrawerDesdeDetalle()">
          Agregar curso
        </button>
      </div>
    </div>
    </div>
  }

  <!-- ════════════════════════════════════════════
       DRAWER: Nueva / Editar Asignación
  ════════════════════════════════════════════ -->
  @if (drawerOpen()) {
    <div appOverlayPortal class="fixed inset-0 z-50">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/40" (click)="cerrarDrawer()"></div>

    <!-- Panel -->
    <div class="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-r">
      <!-- Drawer header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 class="text-lg font-bold text-gray-900">
            {{ editId() ? 'Editar Asignación' : 'Nueva Asignación' }}
          </h2>
          <p class="text-xs text-gray-500 mt-0.5">Docente → Curso → Grado → Sección</p>
        </div>
        <button class="btn btn-ghost btn-icon" (click)="cerrarDrawer()">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Drawer body -->
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        <!-- Nivel -->
        <div>
          <label class="form-label">Nivel Educativo <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-3 gap-2 mt-1">
            @for (n of NIVELES; track n) {
              <button class="py-2 rounded-lg text-sm font-medium border transition-all text-center"
                [ngClass]="dNivel() === n
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
                (click)="onDNivelChange($any(n))">{{ n }}</button>
            }
          </div>
        </div>

        <!-- Grado -->
        <div>
          <label class="form-label">Grado <span class="text-red-500">*</span></label>
          <div class="flex flex-wrap gap-2 mt-1">
            @for (g of gradosPorNivel(dNivel()); track g) {
              <button class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
                [ngClass]="dGrado() === g
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-400'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'"
                (click)="onDGradoChange(g)">{{ etiquetaGrado(dNivel(), g) }}</button>
            }
          </div>
          <p class="text-xs text-gray-500 mt-1">Ej.: «5° Secundaria» y «5° Primaria» son grados distintos.</p>
        </div>

        <!-- Curso -->
        <div>
          <label class="form-label">Curso <span class="text-red-500">*</span></label>
          <select class="form-input w-full" [ngModel]="dCursoId()" (ngModelChange)="onDCursoChange($event ? +$event : null)">
            <option [ngValue]="null">-- Seleccionar curso --</option>
            @for (c of dCursosDisp(); track c.id) {
              <option [ngValue]="c.id">{{ c.nombre }} ({{ c.horasSemanales }}h/sem)</option>
            }
          </select>
          @if (dCursosDisp().length === 0) {
            <p class="text-xs text-amber-600 mt-1">No hay cursos definidos para {{ etiquetaGrado(dNivel(), dGrado()) }}</p>
          }
        </div>

        <!-- Docente -->
        <div>
          <label class="form-label">Docente <span class="text-red-500">*</span></label>
          <select class="form-input w-full"
                  [ngModel]="dDocId()"
                  (ngModelChange)="dDocId.set($event ? +$event : null)"
                  [disabled]="!dCursoId()">
            <option [ngValue]="null">{{ dCursoId() ? '-- Seleccionar docente --' : '-- Seleccione un curso primero --' }}</option>
            @for (d of dDocentesDisp(); track d.id) {
              @let stats = docenteStats(d.id);
              <option [ngValue]="d.id">
                {{ d.apellidos }}, {{ d.nombres }} — {{ d.especialidad }} ({{ stats.totalHoras }}/{{ d.maxHoras }}h)
              </option>
            }
          </select>
          @if (dCursoId() && !dDocentesDisp().length) {
            <p class="text-xs text-amber-600 mt-1">No hay docentes con especialidad acorde al curso seleccionado.</p>
          } @else if (dCursoId()) {
            <p class="text-xs text-gray-500 mt-1">{{ dDocentesDisp().length }} docente(s) habilitado(s) para enseñar este curso.</p>
          }

          <!-- Selected docente load preview -->
          @if (dDocId()) {
            @let selDoc = docById(dDocId()!);
            @let selStats = docenteStats(dDocId()!);
            @let hNuevo = dCursoId() ? (curById(dCursoId()!)?.horasSemanales ?? 0) : 0;
            @let pctNew = selDoc ? Math.min(100, Math.round(((selStats.totalHoras + hNuevo) / selDoc.maxHoras) * 100)) : 0;
            <div class="mt-2 p-3 bg-gray-50 rounded-lg">
              <div class="flex justify-between text-xs mb-1.5">
                <span class="text-gray-500">Carga actual + esta asignación</span>
                <span class="font-semibold" [ngClass]="pctNew >= 100 ? 'text-red-600' : 'text-gray-700'">{{ pctNew }}%</span>
              </div>
              <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full rounded-full"
                  [style.width.%]="pctNew"
                  [ngClass]="pctNew >= 100 ? 'bg-red-500' : pctNew >= 80 ? 'bg-amber-400' : 'bg-emerald-500'">
                </div>
              </div>
              @if (pctNew >= 100) {
                <p class="text-xs text-red-600 mt-1.5 font-medium">⚠ Este docente supera su carga máxima</p>
              }
            </div>
          }
        </div>

        <!-- Secciones -->
        <div>
          <label class="form-label">Secciones <span class="text-red-500">*</span></label>
          <div class="flex gap-2 mt-1">
            @for (s of seccionesDrawer(); track s) {
              <button class="w-10 h-10 rounded-lg font-bold text-sm border-2 transition-all"
                [ngClass]="dSecciones().includes(s)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'"
                (click)="toggleSeccion(s)">{{ s }}</button>
            }
          </div>
          @if (dSecciones().length === 0) {
            <p class="text-xs text-red-500 mt-1">Selecciona al menos una sección</p>
          }
        </div>

        <!-- Resumen preview -->
        @if (dNivel() && dGrado() && dCursoId() && dDocId() && dSecciones().length > 0) {
          @let prevDoc = docById(dDocId()!);
          @let prevCur = curById(dCursoId()!);
          <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div class="text-xs font-semibold text-indigo-700 mb-2">Vista previa de la asignación</div>
            <div class="space-y-1 text-xs text-indigo-800">
              <div><span class="text-indigo-500">Docente:</span> {{ prevDoc?.apellidos }}, {{ prevDoc?.nombres }}</div>
              <div><span class="text-indigo-500">Curso:</span> {{ prevCur?.nombre }}</div>
              <div><span class="text-indigo-500">Grado:</span> {{ etiquetaGrado(dNivel(), dGrado()) }}</div>
              <div><span class="text-indigo-500">Secciones:</span> {{ dSecciones().join(', ') }}</div>
              <div><span class="text-indigo-500">Horas/sem:</span> {{ prevCur?.horasSemanales }}h × {{ dSecciones().length }} sec = <strong>{{ (prevCur?.horasSemanales ?? 0) * dSecciones().length }}h</strong></div>
            </div>
          </div>
        }
      </div>

      <!-- Drawer footer -->
      <div class="px-6 py-4 border-t border-gray-200 flex gap-3">
        <button class="btn btn-secondary flex-1" (click)="cerrarDrawer()">Cancelar</button>
        <button class="btn btn-primary flex-1"
          [disabled]="svc.saving()"
          (click)="guardarAsig()">
          {{ svc.saving() ? 'Guardando…' : (editId() ? 'Guardar cambios' : 'Asignar curso') }}
        </button>
      </div>
    </div>
    </div>
  }

  <!-- MODAL: Confirmar quitar asignación -->
  @if (quitarTargetId()) {
    @let det = quitarAsigDetalle();
    <div appOverlayPortal class="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      (click)="cerrarConfirmQuitar()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in" (click)="$event.stopPropagation()">
        <div class="flex items-start gap-4 mb-4">
          <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-900">Quitar curso asignado</h3>
            <p class="text-sm text-gray-500 mt-0.5">El docente dejará de estar vinculado a este curso.</p>
          </div>
        </div>
        @if (det) {
          <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 space-y-2 text-sm text-red-900">
            <p>¿Confirmas quitar la asignación de <strong>«{{ det.curso }}»</strong>?</p>
            <div class="text-xs text-red-800/90 space-y-1">
              <div><span class="font-semibold">Docente:</span> {{ det.docente }}</div>
              <div><span class="font-semibold">Nivel / Grado:</span> {{ det.nivel }} · {{ det.grado }}</div>
              <div><span class="font-semibold">Secciones:</span> {{ det.secciones }}</div>
            </div>
          </div>
        } @else {
          <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-sm text-red-900">
            ¿Confirmas quitar esta asignación de curso?
          </div>
        }
        <div class="flex gap-3">
          <button type="button" class="btn btn-secondary flex-1" (click)="cerrarConfirmQuitar()">Cancelar</button>
          <button type="button" class="btn btn-danger flex-1" [disabled]="svc.saving()" (click)="confirmarQuitarAsig()">
            {{ svc.saving() ? 'Quitando…' : 'Sí, quitar curso' }}
          </button>
        </div>
      </div>
    </div>
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

  <!-- TOAST (portal global, no recortado por overflow del main) -->
  @if (toast().show) {
    <div appOverlayPortal
      class="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-slide-in-r text-sm font-medium max-w-md pointer-events-auto"
      [ngClass]="toast().type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'"
      role="alert">
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
export class AsignacionComponent implements OnInit, OnDestroy {
  private readonly _tenantReloadReady = setupTenantReload(() => {
    this.syncPickerDesdeTenant();
    this.cargarDatos();
  }, {
    onBeforeReload: () => this.limpiarDatos(),
  });
  private readonly layout = inject(LayoutService);
  private readonly route = inject(ActivatedRoute);
  readonly tenant = inject(TenantContextService);
  readonly svc = inject(AsignacionService);
  private cargarSub?: Subscription;

  readonly modoConsulta = signal<TenantInstitutionConsultaModo>('institution');
  readonly requiereSeleccionInstitucion = computed(
    () =>
      this.tenant.canSelectInstitution() &&
      this.modoConsulta() === 'pending',
  );
  readonly puedeGestionar = computed(
    () => !this.requiereSeleccionInstitucion(),
  );

  readonly Math = Math;
  readonly PRINT_PREVIEW_FRAME_ID = PRINT_PREVIEW_FRAME_ID;
  readonly gradosIncluyen = gradosIncluyen;
  readonly etiquetaGrado = etiquetaGradoConNivel;
  readonly DOCENTES_POR_PAGINA = 10;
  readonly NIVELES: Nivel[] = ['Inicial', 'Primaria', 'Secundaria'];
  readonly TABS = [
    { id: 'asignaciones', label: 'Asignaciones',   icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'docentes',     label: 'Por Docente',    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'cobertura',    label: 'Cobertura',      icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  ];

  // ── Data signals ─────────────────────────────────────────────────────
  _docentes = signal<Docente[]>([]);
  _cursos   = signal<Curso[]>([]);
  _asig     = signal<Asignacion[]>([]);
  seccionesPorGrado = signal<Record<string, string[]>>({});
  anioEscolar = signal(new Date().getFullYear());
  loadError = signal('');

  // ── UI signals ───────────────────────────────────────────────────────
  tab           = signal<MainTab>('docentes');
  docenteFilter = signal<string>('todos');
  docentesPagina = signal(1);
  nivelCob      = signal<Nivel>('Primaria');

  // Filters (asignaciones tab)
  fBusq  = signal('');
  fNivel = signal('');
  fGrado = signal('');
  fDocId = signal<number | null>(null);

  // Drawer state
  detalleDrawerOpen = signal(false);
  docenteDetalleId = signal<number | null>(null);
  drawerOpen = signal(false);
  editId     = signal<number | null>(null);
  dNivel     = signal<Nivel>('Primaria');
  dGrado     = signal<string>('5°');
  dCursoId   = signal<number | null>(null);
  dDocId     = signal<number | null>(null);
  dSecciones = signal<string[]>([]);

  toast = signal<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });
  feedback = signal<{ msg: string; type: 'success' | 'error' } | null>(null);
  quitarTargetId = signal<number | null>(null);

  printPreviewOpen = signal(false);
  printPreviewTitle = signal('');

  private printPreviewHtml = '';
  private toastTimer?: ReturnType<typeof setTimeout>;
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  quitarAsigDetalle = computed(() => {
    const id = this.quitarTargetId();
    if (id == null) return null;
    const asig = this._asig().find(a => a.id === id);
    if (!asig) return null;
    const cur = this.curById(asig.cursoId);
    const doc = this.docById(asig.docenteId);
    const docente = doc
      ? `${doc.apellidos}, ${doc.nombres}`
      : (asig.docenteNombre || 'Docente');
    return {
      curso: cur?.nombre ?? `Curso #${asig.cursoId}`,
      docente,
      nivel: asig.nivel,
      grado: asig.grado,
      secciones: asig.secciones.length ? asig.secciones.join(', ') : '—',
    };
  });

  seccionesDrawer = computed(() => {
    const key = `${this.dNivel()}|${this.dGrado()}`;
    const fromSalones = this.seccionesPorGrado()[key];
    return fromSalones?.length ? fromSalones : SECCIONES_FALLBACK;
  });

  // ── Computed ─────────────────────────────────────────────────────────
  gradosFiltro = computed(() => {
    const n = this.fNivel();
    if (n === 'Inicial') return G_INI;
    if (n === 'Primaria') return G_PRI;
    if (n === 'Secundaria') return G_SEC;
    return [...G_INI, ...G_PRI, ...G_SEC];
  });

  asigFiltradas = computed(() => {
    let list = this._asig();
    const b = this.fBusq().toLowerCase();
    if (b) {
      list = list.filter(a => {
        const doc = this.docById(a.docenteId);
        const cur = this.curById(a.cursoId);
        const docLabel = doc
          ? `${doc.nombres} ${doc.apellidos}`
          : (a.docenteNombre ?? '');
        return docLabel.toLowerCase().includes(b)
          || cur?.nombre.toLowerCase().includes(b);
      });
    }
    if (this.fNivel()) list = list.filter(a => a.nivel === this.fNivel() as Nivel);
    if (this.fGrado()) list = list.filter(a => a.grado === this.fGrado());
    if (this.fDocId()) list = list.filter(a => a.docenteId === this.fDocId());
    return list;
  });

  kpis = computed(() => {
    const asig = this._asig().filter(a => a.activo);
    const docIds = new Set(asig.map(a => a.docenteId).filter((id): id is number => id != null));
    let totalSlots = 0;
    let coveredSlots = 0;
    for (const c of this._cursos()) {
      for (const g of c.grados) {
        for (const sec of this.seccionesGradoCob(c.nivel, g)) {
          totalSlots++;
          if (this.docenteEnSeccion(c.id, g, sec)) coveredSlots++;
        }
      }
    }
    const totalHoras = asig.reduce((s, a) => s + a.horasSemanales, 0);
    const totalSecciones = asig.reduce((s, a) => s + a.secciones.length, 0);
    return {
      docentesAsig: docIds.size,
      totalAsig: asig.length,
      totalSecciones,
      promedioHoras: docIds.size > 0 ? Math.round(totalHoras / docIds.size) : 0,
      sinDocente: Math.max(0, totalSlots - coveredSlots),
    };
  });

  docentesFiltrados = computed(() => {
    const f = this.docenteFilter();
    return this._docentes().filter(d => {
      if (f === 'nombrado' || f === 'contratado') return d.tipo === f;
      if (f === 'sobrecarga') {
        const stats = this.docenteStats(d.id);
        return stats.totalHoras > d.maxHoras;
      }
      return true;
    });
  });

  totalDocentesFiltrados = computed(() => this.docentesFiltrados().length);
  totalPaginasDocentes = computed(() =>
    Math.max(1, Math.ceil(this.totalDocentesFiltrados() / this.DOCENTES_POR_PAGINA)),
  );
  inicioDocentes = computed(() => (this.docentesPagina() - 1) * this.DOCENTES_POR_PAGINA);
  finDocentes = computed(() =>
    Math.min(this.inicioDocentes() + this.DOCENTES_POR_PAGINA, this.totalDocentesFiltrados()),
  );
  docentesPaginados = computed(() =>
    this.docentesFiltrados().slice(this.inicioDocentes(), this.finDocentes()),
  );
  paginasDocentes = computed(() => {
    const total = this.totalPaginasDocentes();
    const actual = this.docentesPagina();
    const rango: number[] = [];
    const ini = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = ini; i <= fin; i++) rango.push(i);
    return rango;
  });

  docenteDetalle = computed(() => {
    const id = this.docenteDetalleId();
    return id != null ? this.docById(id) : undefined;
  });

  docenteDetalleStats = computed(() => {
    const id = this.docenteDetalleId();
    if (id == null) return { totalHoras: 0, asignaciones: [] as Asignacion[] };
    return this.docenteStats(id);
  });

  gradosCob = computed(() => {
    const n = this.nivelCob();
    if (n === 'Inicial') return G_INI;
    if (n === 'Primaria') return G_PRI;
    return G_SEC;
  });

  cursosCob = computed(() =>
    this._cursos()
      .filter(c => c.nivel === this.nivelCob())
      .sort((a, b) => a.area.localeCompare(b.area) || a.nombre.localeCompare(b.nombre)),
  );

  coberturaStats = computed(() => {
    const cursos = this.cursosCob();
    const grados = this.gradosCob();
    const nivel = this.nivelCob();
    let total = 0;
    let cubiertos = 0;
    for (const cur of cursos) {
      for (const g of grados) {
        const cel = this.coberturaCelda(cur.id, g, nivel);
        if (cel.estado === 'na') continue;
        total += cel.total;
        cubiertos += cel.cubiertas;
      }
    }
    return { total, cubiertos, pct: total > 0 ? Math.round((cubiertos / total) * 100) : 0 };
  });

  dCursosDisp = computed(() =>
    this._cursos().filter(
      (c) => c.nivel === this.dNivel() && gradosIncluyen(this.dGrado(), c.grados),
    ),
  );

  dDocentesDisp = computed(() => {
    const cursoId = this.dCursoId();
    if (!cursoId) return [];

    const cur = this.curById(cursoId);
    if (!cur) return [];

    const docentes = this._docentes()
      .filter((d) => docenteEnsenaCurso(d, cur))
      .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es'));

    const docId = this.dDocId();
    if (docId != null && !docentes.some((d) => d.id === docId)) {
      const actual = this.docById(docId);
      if (actual) return [actual, ...docentes];
    }

    return docentes;
  });

  // ── Methods ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.layout.setTitle('Asignación Docente');
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'docentes' || tabParam === 'cobertura' || tabParam === 'asignaciones') {
      this.tab.set(tabParam);
    }
    this.inicializarModoConsulta();
    if (!this.requiereSeleccionInstitucion()) {
      this.cargarDatos();
    }
    markTenantReloadReady(this._tenantReloadReady);
  }

  onModoInstitucion(modo: TenantInstitutionConsultaModo): void {
    this.modoConsulta.set(modo);
    if (modo === 'pending') {
      this.limpiarDatos();
      return;
    }
    this.cargarDatos();
  }

  private inicializarModoConsulta(): void {
    if (!this.tenant.canSelectInstitution()) {
      this.modoConsulta.set('institution');
      return;
    }
    this.modoConsulta.set(
      this.tenant.activeInstitutionId() != null ? 'institution' : 'pending',
    );
  }

  private syncPickerDesdeTenant(): void {
    if (!this.tenant.canSelectInstitution()) return;
    const id = this.tenant.activeInstitutionId();
    this.modoConsulta.set(id != null ? 'institution' : 'pending');
  }

  private limpiarDatos(): void {
    this._docentes.set([]);
    this._cursos.set([]);
    this._asig.set([]);
    this.seccionesPorGrado.set({});
    this.loadError.set('');
  }

  ngOnDestroy(): void {
    this.cargarSub?.unsubscribe();
    clearTimeout(this.toastTimer);
    clearTimeout(this.feedbackTimer);
  }

  imprimirCobertura(): void {
    if (this.tab() !== 'cobertura') this.tab.set('cobertura');
    this.abrirVistaImpresion(
      `Cobertura ${this.nivelCob()}`,
      this.buildCoberturaPrintBody(),
    );
  }

  imprimirDocentes(): void {
    if (this.tab() !== 'docentes') this.tab.set('docentes');
    this.abrirVistaImpresion(
      'Asignaciones por docente',
      this.buildDocentesPrintBody(this.docentesFiltrados(), this.docenteFilterSubtitulo()),
    );
  }

  imprimirDocenteActual(): void {
    const doc = this.docenteDetalle();
    if (!doc) return;
    this.abrirVistaImpresion(
      `Asignaciones — ${doc.apellidos}, ${doc.nombres}`,
      this.buildDocentesPrintBody([doc], 'Detalle individual'),
    );
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

  private docenteFilterSubtitulo(): string {
    const f = this.docenteFilter();
    if (f === 'nombrado') return 'Filtro: Nombrados';
    if (f === 'contratado') return 'Filtro: Contratados';
    if (f === 'sobrecarga') return 'Filtro: Con sobrecarga';
    return 'Todos los docentes';
  }

  private buildCoberturaPrintBody(): string {
    const cob = this.coberturaStats();
    const grados = this.gradosCob();
    const nivel = this.nivelCob();
    const fecha = new Date().toLocaleString('es-PE');
    const headerCols = grados.map((g) => `<th>${escapeHtml(g)}</th>`).join('');
    const rows = this.cursosCob().map((cur) => {
      const gradeCells = grados.map((g) => {
        const cel = this.coberturaCelda(cur.id, g, nivel);
        if (cel.estado === 'na') return '<td>—</td>';
        const lines = cel.secciones
          .map((item) =>
            `${escapeHtml(item.seccion)}: ${escapeHtml(item.docenteCompleto ?? 'Sin docente')}`,
          )
          .join('<br>');
        return `<td>${lines}</td>`;
      }).join('');
      return `<tr>
        <td><strong>${escapeHtml(cur.nombre)}</strong></td>
        <td>${escapeHtml(cur.area)}</td>
        <td style="text-align:center">${cur.horasSemanales}</td>
        ${gradeCells}
      </tr>`;
    }).join('');

    return `
      <h1>Cuadro de cobertura — ${escapeHtml(nivel)}</h1>
      <p class="meta">Año escolar ${this.anioEscolar()} · Generado: ${escapeHtml(fecha)}</p>
      <p class="meta">Cobertura: <strong>${cob.pct}%</strong> (${cob.cubiertos} de ${cob.total} curso-grado-sección)</p>
      <table>
        <thead><tr><th>Curso</th><th>Área</th><th>H/s</th>${headerCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  private buildDocentesPrintBody(docs: Docente[], subtitulo: string): string {
    const fecha = new Date().toLocaleString('es-PE');
    const blocks = docs.map((doc) => {
      const stats = this.docenteStats(doc.id);
      const tabla = stats.asignaciones.length
        ? `<table>
            <thead>
              <tr><th>Curso</th><th>Nivel</th><th>Grado</th><th>Secciones</th><th>H/sem</th></tr>
            </thead>
            <tbody>
              ${stats.asignaciones.map((a) => {
                const cur = this.curById(a.cursoId);
                const nombre = cur?.nombre ?? `Curso #${a.cursoId}`;
                return `<tr>
                  <td>${escapeHtml(nombre)}</td>
                  <td>${escapeHtml(a.nivel)}</td>
                  <td>${escapeHtml(a.grado)}</td>
                  <td>${escapeHtml(a.secciones.join(', '))}</td>
                  <td style="text-align:center">${a.horasSemanales}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>`
        : '<p class="empty">Sin asignaciones activas.</p>';

      return `<div class="block">
        <h2>${escapeHtml(doc.apellidos)}, ${escapeHtml(doc.nombres)}</h2>
        <p class="meta">DNI ${escapeHtml(doc.dni)} · ${escapeHtml(doc.especialidad)} · ${escapeHtml(doc.tipo)} · Carga: ${stats.totalHoras}h / ${doc.maxHoras}h</p>
        ${tabla}
      </div>`;
    }).join('');

    return `
      <h1>Asignaciones por docente</h1>
      <p class="meta">Año escolar ${this.anioEscolar()} · ${escapeHtml(subtitulo)} · Generado: ${escapeHtml(fecha)}</p>
      ${blocks || '<p class="empty">No hay docentes para imprimir.</p>'}
    `;
  }

  cargarDatos(): void {
    this.cargarSub?.unsubscribe();
    this.loadError.set('');
    if (this.requiereSeleccionInstitucion()) {
      this.limpiarDatos();
      return;
    }
    this.cargarSub = this.svc.loadContext(this.anioEscolar()).subscribe({
      next: (ctx) => {
        this.anioEscolar.set(ctx.anioEscolar);
        this._docentes.set(ctx.docentes.filter(d => d.activo));
        this._cursos.set(ctx.cursos);
        this._asig.set(ctx.asignaciones);
        this.seccionesPorGrado.set(ctx.seccionesPorGrado);
      },
      error: (err: Error) => this.loadError.set(err.message),
    });
  }

  private aplicarAsignacionLocal(saved: Asignacion, editId: number | null): void {
    this._asig.update(list => {
      const idxById = list.findIndex(a => a.id === saved.id);
      if (idxById >= 0) {
        return list.map(a => (a.id === saved.id ? { ...a, ...saved } : a));
      }
      if (editId != null) {
        return list.map(a => (a.id === editId ? { ...a, ...saved } : a));
      }
      return [...list, saved];
    });
  }

  docById(id: number | null | undefined): Docente | undefined {
    if (id == null) return undefined;
    return this._docentes().find(d => d.id === id);
  }

  curById(id: number): Curso | undefined {
    return this._cursos().find(c => c.id === id);
  }

  docenteStats(docenteId: number): { totalHoras: number; asignaciones: Asignacion[] } {
    const asignaciones = this._asig().filter(a => a.docenteId === docenteId && a.activo);
    const totalHoras = asignaciones.reduce((s, a) => s + a.horasSemanales, 0);
    return { totalHoras, asignaciones };
  }

  seccionesGradoCob(nivel: Nivel, grado: string): string[] {
    const key = `${nivel}|${grado}`;
    const fromSalones = this.seccionesPorGrado()[key];
    return fromSalones?.length ? fromSalones : [...SECCIONES_FALLBACK];
  }

  coberturaCelda(cursoId: number, grado: string, nivel: Nivel): CoberturaCelda {
    const cur = this.curById(cursoId);
    if (!cur || !gradosIncluyen(grado, cur.grados)) {
      return { secciones: [], cubiertas: 0, total: 0, estado: 'na' };
    }

    const secciones = this.seccionesGradoCob(nivel, grado);
    const items: CoberturaSeccionItem[] = secciones.map((seccion) => {
      const doc = this.docenteEnSeccion(cursoId, grado, seccion);
      return {
        seccion,
        docente: doc?.corto ?? null,
        docenteCompleto: doc?.completo ?? null,
      };
    });
    const cubiertas = items.filter((i) => i.docente).length;
    const total = items.length;
    let estado: CoberturaEstado = 'ninguna';
    if (cubiertas === total && total > 0) estado = 'completa';
    else if (cubiertas > 0) estado = 'parcial';

    return { secciones: items, cubiertas, total, estado };
  }

  private docenteEnSeccion(
    cursoId: number,
    grado: string,
    seccion: string,
  ): { corto: string; completo: string } | null {
    const sec = seccion.trim().toUpperCase();
    const asig = this._asig().find(
      (x) =>
        x.cursoId === cursoId &&
        x.activo &&
        gradosIncluyen(grado, [x.grado]) &&
        x.secciones.some((s) => s.toUpperCase() === sec),
    );
    if (!asig) return null;

    const doc = this.docById(asig.docenteId);
    const completo = doc
      ? `${doc.apellidos}, ${doc.nombres}`
      : (asig.docenteNombre ?? 'Docente');
    const corto = doc
      ? doc.apellidos.split(' ')[0]
      : (asig.docenteNombre?.split(' ')[0] ?? 'Doc.');

    return { corto, completo };
  }

  findAsigForCursoGradoSeccion(
    cursoId: number,
    grado: string,
    seccion: string,
  ): Asignacion | undefined {
    const sec = seccion.trim().toUpperCase();
    return this._asig().find(
      (x) =>
        x.cursoId === cursoId &&
        x.activo &&
        gradosIncluyen(grado, [x.grado]) &&
        x.secciones.some((s) => s.toUpperCase() === sec),
    );
  }

  findAsigForCursoGrado(cursoId: number, grado: string): Asignacion | undefined {
    return this._asig().find(
      (x) => x.cursoId === cursoId && x.activo && gradosIncluyen(grado, [x.grado]),
    );
  }

  gradosPorNivel(n: Nivel): string[] {
    if (n === 'Inicial') return G_INI;
    if (n === 'Primaria') return G_PRI;
    return G_SEC;
  }

  // Filters
  limpiarFiltros(): void {
    this.fBusq.set(''); this.fNivel.set('');
    this.fGrado.set(''); this.fDocId.set(null);
  }

  setDocenteFilter(value: string): void {
    this.docenteFilter.set(value);
    this.docentesPagina.set(1);
  }

  irPaginaDocentes(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPaginasDocentes());
    this.docentesPagina.set(clamped);
  }

  abrirDetalleDocente(id: number): void {
    this.docenteDetalleId.set(id);
    this.detalleDrawerOpen.set(true);
  }

  cerrarDetalleDocente(): void {
    this.detalleDrawerOpen.set(false);
    this.docenteDetalleId.set(null);
  }

  abrirDrawerDesdeDetalle(): void {
    const id = this.docenteDetalleId();
    this.cerrarDetalleDocente();
    if (id != null) this.abrirDrawer(id);
  }

  editarAsigDesdeDetalle(id: number): void {
    this.cerrarDetalleDocente();
    this.editarAsig(id);
  }

  // Drawer
  abrirDrawer(preDoc?: number, preCurso?: number, preGrado?: string): void {
    this.editId.set(null);
    this.dNivel.set('Primaria');
    this.dGrado.set('5°');
    this.dCursoId.set(preCurso ?? null);
    this.dDocId.set(preDoc ?? null);
    this.dSecciones.set([]);
    if (preGrado) this.dGrado.set(preGrado);
    this.drawerOpen.set(true);
  }
  abrirDrawerParaDocente(docId: number): void { this.abrirDrawer(docId); }
  abrirDrawerParaCurso(cursoId: number, grado: string, seccion?: string): void {
    const existing = seccion
      ? this.findAsigForCursoGradoSeccion(cursoId, grado, seccion)
      : this.findAsigForCursoGrado(cursoId, grado);
    if (existing) {
      this.editarAsig(existing.id);
      return;
    }
    const cur = this.curById(cursoId);
    if (cur) {
      this.abrirDrawer(undefined, cursoId, grado);
      this.dNivel.set(cur.nivel);
      if (seccion) this.dSecciones.set([seccion.trim().toUpperCase()]);
    }
  }
  editarAsig(id: number): void {
    const a = this._asig().find(x => x.id === id);
    if (!a) return;
    this.editId.set(id);
    this.dNivel.set(a.nivel);
    this.dGrado.set(a.grado);
    this.dCursoId.set(a.cursoId);
    this.dDocId.set(a.docenteId ?? null);
    this.dSecciones.set([...a.secciones]);
    this.drawerOpen.set(true);
  }
  cerrarDrawer(): void { this.drawerOpen.set(false); this.editId.set(null); }

  onDNivelChange(n: Nivel): void {
    this.dNivel.set(n);
    const grados = this.gradosPorNivel(n);
    this.dGrado.set(grados[0]);
    this.dCursoId.set(null);
    this.dDocId.set(null);
  }
  onDGradoChange(g: string): void {
    this.dGrado.set(g);
    this.dCursoId.set(null);
    this.dDocId.set(null);
  }
  onDCursoChange(id: number | null): void {
    this.dCursoId.set(id);
    const docId = this.dDocId();
    if (docId == null || id == null) return;

    const cur = this.curById(id);
    if (!cur) {
      this.dDocId.set(null);
      return;
    }

    const doc = this.docById(docId);
    if (!doc || !docenteEnsenaCurso(doc, cur)) {
      this.dDocId.set(null);
    }
  }

  toggleSeccion(s: string): void {
    const cur = this.dSecciones();
    this.dSecciones.set(cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
  }

  guardarAsig(): void {
    const cursoId = this.dCursoId();
    const docId = this.dDocId();

    if (!cursoId) {
      this.showToast('Seleccione un curso para continuar.', 'error');
      return;
    }
    if (docId == null) {
      this.showToast('Seleccione un docente para asignar el curso.', 'error');
      return;
    }
    if (!this.dSecciones().length) {
      this.showToast('Seleccione al menos una sección.', 'error');
      return;
    }

    const cur = this.curById(cursoId);
    const doc = this.docById(docId);
    if (!cur || !doc) {
      this.showToast('No se encontró el curso o el docente seleccionado.', 'error');
      return;
    }
    if (!cur.curriculumId) {
      this.showToast('El curso no tiene currícula asociada. Pulse Actualizar e intente de nuevo.', 'error');
      return;
    }

    const payload = {
      curriculumId: cur.curriculumId,
      docenteId: docId,
      cursoId: cur.id,
      nivel: this.dNivel(),
      grado: this.dGrado(),
      secciones: [...this.dSecciones()],
      horasSemanales: Math.round(cur.horasSemanales ?? 0),
    };

    const editId = this.editId();
    const req = editId
      ? this.svc.update(editId, {
          docenteId: payload.docenteId,
          cursoId: payload.cursoId,
          nivel: payload.nivel,
          grado: payload.grado,
          secciones: payload.secciones,
          horasSemanales: payload.horasSemanales,
        })
      : this.svc.create(payload);

    req.subscribe({
      next: (saved) => {
        this.aplicarAsignacionLocal(saved, editId);
        this.cerrarDrawer();
        this.showToast(this.mensajeExitoAsignacion(cur, doc, editId));
        this.cargarDatos();
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'No se pudo asignar el curso';
        this.showToast(msg, 'error');
      },
    });
  }

  pedirQuitarAsig(id: number): void {
    this.quitarTargetId.set(id);
  }

  cerrarConfirmQuitar(): void {
    if (this.svc.saving()) return;
    this.quitarTargetId.set(null);
  }

  confirmarQuitarAsig(): void {
    const id = this.quitarTargetId();
    if (id == null) return;

    const asig = this._asig().find(a => a.id === id);
    const cur = asig ? this.curById(asig.cursoId) : undefined;

    this.svc.remove(id).subscribe({
      next: () => {
        this._asig.update(list => list.filter(a => a.id !== id));
        const nombre = cur?.nombre ?? 'Curso';
        this.quitarTargetId.set(null);
        this.showToast(`Asignación de «${nombre}» eliminada correctamente`);
        this.cargarDatos();
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'No se pudo quitar la asignación';
        this.showToast(msg, 'error');
      },
    });
  }

  private mensajeExitoAsignacion(cur: Curso, doc: Docente, editId: number | null): string {
    const docente = `${doc.apellidos}, ${doc.nombres}`;
    const grado = this.dGrado();
    const secciones = this.dSecciones().join(', ');
    if (editId) {
      return `«${cur.nombre}» actualizado: ${docente} · ${grado} · sec. ${secciones}`;
    }
    return `«${cur.nombre}» asignado correctamente a ${docente} · ${grado} · sec. ${secciones}`;
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    clearTimeout(this.toastTimer);
    clearTimeout(this.feedbackTimer);

    this.feedback.set({ msg, type });
    this.toast.set({ show: true, msg, type });

    this.feedbackTimer = setTimeout(() => this.feedback.set(null), 8000);
    this.toastTimer = setTimeout(
      () => this.toast.set({ show: false, msg: '', type: 'success' }),
      5000,
    );
  }

  cerrarFeedback(): void {
    clearTimeout(this.feedbackTimer);
    this.feedback.set(null);
  }
}


