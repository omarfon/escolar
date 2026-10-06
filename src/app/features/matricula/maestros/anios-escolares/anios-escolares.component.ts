import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { TenantContextService } from '../../../../core/tenant/tenant-context.service';
import { markTenantReloadReady, setupTenantReload } from '../../../../core/tenant/tenant-reload.util';
import {
  ACCION_ANIO_ESCOLAR_LABEL,
  AnioEscolarContext,
  AnioEscolarDetalle,
  AnioEscolarEvento,
  AnioEscolarItem,
  AnioEscolarTipoPeriodo,
  CopiarCalendarioResumen,
  ESTADO_ANIO_CFG,
} from './anios-escolares.model';
import {
  MaestrosAniosEscolaresService,
  anioEscolarErrorMessage,
} from './anios-escolares.service';
import { validarAnioEscolarForm } from './anio-escolar-form.validation';
import { MaestrosPeriodosAcademicosService } from '../periodos-academicos/periodos-academicos.service';

@Component({
  selector: 'app-maestros-anios-escolares',
  standalone: true,
  imports: [FormsModule, NgClass, DatePipe, RouterLink],
  template: `
<div class="space-y-4">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h3 class="text-lg font-bold text-gray-900">Años escolares</h3>
      <p class="text-sm text-gray-400 mt-0.5">
        Registro de calendarización escolar por año lectivo, periodos y activación vigente
      </p>
      @if (context(); as ctx) {
        <p class="text-xs text-gray-500 mt-1">
          IE {{ ctx.institucion.nombre }} · activo institucional {{ ctx.institucion.anioEscolarActivo }}
        </p>
      }
    </div>
    @if (puedeGestionar()) {
      <button class="btn btn-primary btn-sm" (click)="abrirModal()">
        <span class="icon icon-sm">add</span> Registrar año
      </button>
    }
  </div>

  @if (tenant.requiresSelection()) {
    <div class="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
      Seleccione una institución educativa en la barra superior para ver sus años escolares.
    </div>
  }

      @if (context()?.anioVigente; as vigente) {
    <div class="card p-4 bg-green-50 border border-green-100 flex flex-wrap items-center gap-3">
      <span class="icon text-green-600">event_available</span>
      <p class="text-sm text-green-900">
        Año vigente: <span class="font-semibold">{{ vigente.anio }}</span>
        ({{ vigente.fechaInicio }} – {{ vigente.fechaFin }}) · {{ vigente.tipoPeriodo }}
      </p>
    </div>
  }

  <div class="card p-4 flex flex-wrap items-end gap-4">
    <div class="form-group w-44">
      <label class="form-label">Estado</label>
      <select class="form-select" [(ngModel)]="filtroEstado" (ngModelChange)="cargar()">
        <option value="">Todos</option>
        @for (e of context()?.estados ?? []; track e.codigo) {
          <option [value]="e.codigo">{{ e.label }}</option>
        }
      </select>
    </div>
    <p class="text-xs text-gray-400 ml-auto pb-2">{{ items().length }} registro(s)</p>
  </div>

  @if (error()) {
    <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm" role="alert">
      {{ error() }}
    </div>
  }
  @if (success()) {
    <div class="rounded-xl bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm" role="status">
      {{ success() }}
    </div>
  }

  <div class="card overflow-hidden">
    @if (svc.loading()) {
      <div class="p-10 text-center text-gray-400 animate-pulse">Cargando años escolares…</div>
    } @else if (!items().length) {
      <div class="p-10 text-center text-gray-500">No hay años escolares registrados.</div>
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">Año</th>
              <th class="px-4 py-3 text-left">Inicio</th>
              <th class="px-4 py-3 text-left">Fin</th>
              <th class="px-4 py-3 text-left">Periodos</th>
              <th class="px-4 py-3 text-left">Estado</th>
              <th class="px-4 py-3 text-left">Versión</th>
              <th class="px-2 py-3 text-right w-28">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (a of items(); track a.id) {
              <tr class="hover:bg-gray-50/80" [class.bg-green-50/40]="a.vigente">
                <td class="px-4 py-3 font-semibold text-gray-900">{{ a.anio }}</td>
                <td class="px-4 py-3 text-gray-600">{{ a.fechaInicio }}</td>
                <td class="px-4 py-3 text-gray-600">{{ a.fechaFin }}</td>
                <td class="px-4 py-3 text-gray-600 capitalize">{{ a.tipoPeriodo }}</td>
                <td class="px-4 py-3">
                  <span [ngClass]="badgeEstado(a.estado)">{{ etiquetaEstado(a.estado) }}</span>
                  @if (a.vigente) {
                    <span class="badge badge-indigo ml-1">Vigente</span>
                  }
                </td>
                <td class="px-4 py-3 text-gray-500">v{{ a.version }}</td>
                <td class="px-2 py-3 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-0.5">
                    <button type="button" class="btn btn-ghost btn-icon text-indigo-600"
                      title="Ver detalle e historial" (click)="verDetalle(a)">
                      <span class="icon icon-sm">visibility</span>
                    </button>
                    @if (puedeGestionar()) {
                      @if (a.estado === 'planificado') {
                        <button type="button" class="btn btn-ghost btn-icon text-gray-600 hover:text-indigo-600"
                          title="Copiar calendario del año anterior" [disabled]="svc.saving()" (click)="abrirCopia(a)">
                          <span class="icon icon-sm">content_copy</span>
                        </button>
                        <button type="button" class="btn btn-ghost btn-icon text-green-600"
                          title="Activar año escolar" [disabled]="svc.saving()" (click)="activar(a)">
                          <span class="icon icon-sm">event_available</span>
                        </button>
                      }
                      @if (a.estado !== 'cerrado' && puedePublicarComunicado()) {
                        <button type="button" class="btn btn-ghost btn-icon text-indigo-600"
                          title="Publicar comunicado del calendario" [disabled]="svc.saving()" (click)="abrirPublicar(a)">
                          <span class="icon icon-sm">campaign</span>
                        </button>
                      }
                      @if (a.estado !== 'cerrado' && !a.vigente) {
                        <button type="button" class="btn btn-ghost btn-icon text-red-500"
                          title="Cerrar año escolar" [disabled]="svc.saving()" (click)="cerrar(a)">
                          <span class="icon icon-sm">lock</span>
                        </button>
                      }
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
</div>

@if (modalDetalleAbierto()) {
  <div class="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" (click)="cerrarDetalle()" aria-hidden="true"></div>
  <aside
    class="fixed inset-y-0 right-0 z-[90] w-full max-w-2xl bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tituloDetalleAnio"
    (click)="$event.stopPropagation()"
  >
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
      <div>
        <h4 id="tituloDetalleAnio" class="text-lg font-bold text-gray-900">
          @if (detalle(); as d) {
            Año escolar {{ d.anio }}
          } @else {
            Detalle del año escolar
          }
        </h4>
        <p class="text-xs text-gray-500 mt-0.5">Datos, historial y calendarización asociada</p>
      </div>
      <button type="button" class="btn btn-ghost btn-icon shrink-0" title="Cerrar" (click)="cerrarDetalle()">
        <span class="icon icon-sm">close</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      @if (detalleCargando()) {
        <p class="text-sm text-gray-400 animate-pulse py-8 text-center">Cargando detalle…</p>
      } @else if (detalle(); as d) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg bg-gray-50 px-3 py-2">
            <p class="text-xs text-gray-500">Rango lectivo</p>
            <p class="font-medium text-gray-900">{{ d.fechaInicio }} – {{ d.fechaFin }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 px-3 py-2">
            <p class="text-xs text-gray-500">Tipo de periodos</p>
            <p class="font-medium text-gray-900 capitalize">{{ d.tipoPeriodo }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 px-3 py-2">
            <p class="text-xs text-gray-500">Estado</p>
            <p class="font-medium text-gray-900">
              {{ etiquetaEstado(d.estado) }}
              @if (d.vigente) { · Vigente }
              @if (d.publicado) { · Publicado }
            </p>
          </div>
          <div class="rounded-lg bg-gray-50 px-3 py-2">
            <p class="text-xs text-gray-500">Versión</p>
            <p class="font-medium text-gray-900">v{{ d.version }}</p>
          </div>
          @if (d.motivo) {
            <div class="sm:col-span-2 rounded-lg bg-gray-50 px-3 py-2">
              <p class="text-xs text-gray-500">Motivo / observación</p>
              <p class="text-gray-800">{{ d.motivo }}</p>
            </div>
          }
          <div class="rounded-lg bg-gray-50 px-3 py-2">
            <p class="text-xs text-gray-500">Registrado</p>
            <p class="text-gray-800">{{ d.createdAt | date:'dd/MM/yyyy HH:mm' }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 px-3 py-2">
            <p class="text-xs text-gray-500">Última actualización</p>
            <p class="text-gray-800">{{ d.updatedAt | date:'dd/MM/yyyy HH:mm' }}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <a class="btn btn-secondary btn-xs" routerLink="/maestros/periodos-academicos">
            <span class="icon icon-sm">date_range</span> Periodos {{ d.anio }}
          </a>
          <a class="btn btn-secondary btn-xs" routerLink="/maestros/feriados">
            <span class="icon icon-sm">event_busy</span> Feriados
          </a>
          <a class="btn btn-secondary btn-xs" routerLink="/maestros/eventos">
            <span class="icon icon-sm">event</span> Eventos
          </a>
        </div>

        <div>
          <h5 class="text-sm font-semibold text-gray-800 mb-2">Historial de calendarización</h5>
          @if (!d.eventos.length) {
            <p class="text-sm text-gray-500">Sin eventos registrados.</p>
          } @else {
            <ul class="space-y-3 border-l-2 border-indigo-100 pl-4">
              @for (ev of d.eventos; track ev.id) {
                <li class="relative">
                  <span class="absolute -left-[1.35rem] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-400 ring-2 ring-white"></span>
                  <p class="text-sm font-medium text-gray-900">{{ etiquetaAccion(ev.accion) }}</p>
                  <p class="text-xs text-gray-500">
                    {{ ev.createdAt | date:'dd/MM/yyyy HH:mm' }}
                    @if (ev.actorNombre) { · {{ ev.actorNombre }} }
                    @if (ev.actorRol) { ({{ ev.actorRol }}) }
                  </p>
                  @if (ev.estadoAnterior || ev.estadoNuevo) {
                    <p class="text-xs text-gray-600 mt-0.5">
                      Estado: {{ ev.estadoAnterior || '—' }} → {{ ev.estadoNuevo || '—' }}
                    </p>
                  }
                  @if (ev.motivo) {
                    <p class="text-xs text-gray-600 mt-0.5">{{ ev.motivo }}</p>
                  }
                  @if (resumenEvento(ev); as resumen) {
                    <p class="text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1 mt-1 inline-block">{{ resumen }}</p>
                  }
                </li>
              }
            </ul>
          }
        </div>
      } @else if (detalleError()) {
        <p class="form-error" role="alert">{{ detalleError() }}</p>
      }
    </div>
  </aside>
}

@if (modalCopiaAbierto()) {
  <div class="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" (click)="cerrarCopia()" aria-hidden="true"></div>
  <aside
    class="fixed inset-y-0 right-0 z-[90] w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tituloCopiaCalendario"
    (click)="$event.stopPropagation()"
  >
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
      <div>
        <h4 id="tituloCopiaCalendario" class="text-lg font-bold text-gray-900">Copiar calendario del año anterior</h4>
        @if (copiaDestino(); as dest) {
          <p class="text-xs text-gray-500 mt-0.5">
            Destino: {{ dest.anio }} ({{ dest.fechaInicio }} – {{ dest.fechaFin }})
          </p>
        }
      </div>
      <button type="button" class="btn btn-ghost btn-icon" title="Cerrar" (click)="cerrarCopia()">
        <span class="icon icon-sm">close</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      <p class="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 leading-relaxed">
        Los periodos también se gestionan en
        <span class="font-medium">Maestros → Períodos Académicos</span>.
        Esta copia es un atajo masivo desde el año anterior; lo más habitual es copiar
        <span class="font-medium">feriados y eventos</span>.
      </p>
      @if (copiaCargandoOpciones()) {
        <p class="text-xs text-gray-400 animate-pulse">Verificando calendario del año destino…</p>
      }
      <div>
        <label class="form-label" for="anioOrigenCopia">Año origen</label>
        <input id="anioOrigenCopia" type="number" class="form-input" [(ngModel)]="copiaForm.anioOrigen" min="2000" />
      </div>
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium text-gray-700">Elementos a copiar</legend>
        @if (!copiaDestinoTienePeriodos()) {
          <label class="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" class="mt-0.5" [(ngModel)]="copiaForm.copiarPeriodos" />
            <span>
              Periodos académicos
              <span class="block text-[11px] text-gray-400 mt-0.5">
                Recomendado solo si el año destino aún no tiene bimestres registrados.
              </span>
            </span>
          </label>
        } @else if (copiaDestino(); as dest) {
          <p class="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            El año {{ dest.anio }} ya tiene periodos académicos. Edítelos en
            <span class="font-medium">Períodos Académicos</span> o regístrelo sin plantilla si desea copiarlos desde otro año.
          </p>
        }
        <label class="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" [(ngModel)]="copiaForm.copiarFeriados" />
          Feriados (nacionales, locales e institucionales)
        </label>
        <label class="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" [(ngModel)]="copiaForm.copiarEventos" />
          Eventos y actividades institucionales
        </label>
      </fieldset>
      <div>
        <label class="form-label" for="motivoCopia">Motivo / observación</label>
        <textarea id="motivoCopia" class="form-input min-h-[72px]" [(ngModel)]="copiaForm.motivo"></textarea>
      </div>
      @if (copiaError()) {
        <p class="form-error" role="alert">{{ copiaError() }}</p>
      }
    </div>

    <div class="shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
      <button type="button" class="btn btn-secondary" (click)="cerrarCopia()">Cancelar</button>
      <button type="button" class="btn btn-primary" [disabled]="svc.saving()" (click)="confirmarCopia()">
        @if (svc.saving()) { Copiando… } @else { Copiar calendario }
      </button>
    </div>
  </aside>
}

@if (modalPublicarAbierto()) {
  <div class="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" (click)="cerrarPublicar()" aria-hidden="true"></div>
  <aside
    class="fixed inset-y-0 right-0 z-[90] w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tituloPublicarComunicado"
    (click)="$event.stopPropagation()"
  >
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
      <div>
        <h4 id="tituloPublicarComunicado" class="text-lg font-bold text-gray-900">Publicar comunicado del calendario</h4>
        @if (publicarDestino(); as dest) {
          <p class="text-xs text-gray-500 mt-0.5">Año {{ dest.anio }} · v{{ dest.version }}</p>
        }
      </div>
      <button type="button" class="btn btn-ghost btn-icon" title="Cerrar" (click)="cerrarPublicar()">
        <span class="icon icon-sm">close</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      <p class="text-xs text-gray-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
        Se creará un comunicado institucional con el resumen del calendario y se marcará como publicado (nueva versión).
      </p>
      @if (publicarDestino()?.publicado) {
        <label class="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <input type="checkbox" class="mt-0.5" [(ngModel)]="publicarForm.republicar" />
          <span>Republicar (ya existe una publicación previa)</span>
        </label>
      }
      <div>
        <label class="form-label" for="destinatariosPublicar">Destinatarios</label>
        <select id="destinatariosPublicar" class="form-input" [(ngModel)]="publicarForm.destinatarios">
          <option value="todos">Toda la comunidad educativa</option>
          <option value="padres">Padres de familia</option>
          <option value="docentes">Docentes</option>
          <option value="alumnos">Estudiantes</option>
        </select>
      </div>
      <div>
        <label class="form-label" for="prioridadPublicar">Prioridad</label>
        <select id="prioridadPublicar" class="form-input" [(ngModel)]="publicarForm.prioridad">
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </div>
      <div>
        <label class="form-label" for="tituloPublicar">Título (opcional)</label>
        <input id="tituloPublicar" class="form-input" [(ngModel)]="publicarForm.titulo" maxlength="120" />
      </div>
      <div>
        <label class="form-label" for="motivoPublicar">Motivo / observación</label>
        <textarea id="motivoPublicar" class="form-input min-h-[72px]" [(ngModel)]="publicarForm.motivo"></textarea>
      </div>
      @if (publicarError()) {
        <p class="form-error" role="alert">{{ publicarError() }}</p>
      }
    </div>

    <div class="shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
      <button type="button" class="btn btn-secondary" (click)="cerrarPublicar()">Cancelar</button>
      <button type="button" class="btn btn-primary" [disabled]="svc.saving()" (click)="confirmarPublicar()">
        @if (svc.saving()) { Publicando… } @else { Publicar comunicado }
      </button>
    </div>
  </aside>
}

@if (modalAbierto()) {
  <div class="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" (click)="cerrarModal()" aria-hidden="true"></div>
  <aside
    class="fixed inset-y-0 right-0 z-[90] w-full max-w-xl bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-r"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tituloRegistroAnio"
    (click)="$event.stopPropagation()"
  >
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
      <div>
        <h4 id="tituloRegistroAnio" class="text-lg font-bold text-gray-900">Registrar año escolar</h4>
        <p class="text-xs text-gray-500 mt-0.5">Calendarización del nuevo año lectivo</p>
      </div>
      <button type="button" class="btn btn-ghost btn-icon" title="Cerrar" (click)="cerrarModal()">
        <span class="icon icon-sm">close</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="form-label" for="anioRegistro">Año lectivo</label>
          <input id="anioRegistro" type="number" class="form-input" [(ngModel)]="form.anio" min="2000" />
        </div>
        <div>
          <label class="form-label" for="tipoPeriodo">Tipo de periodos</label>
          <select id="tipoPeriodo" class="form-input" [(ngModel)]="form.tipoPeriodo">
            @for (t of tiposPeriodo; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </div>
        <div>
          <label class="form-label" for="fechaInicio">Fecha inicio</label>
          <input id="fechaInicio" type="date" class="form-input" [(ngModel)]="form.fechaInicio" />
        </div>
        <div>
          <label class="form-label" for="fechaFin">Fecha fin</label>
          <input id="fechaFin" type="date" class="form-input" [(ngModel)]="form.fechaFin" />
        </div>
      </div>
      <div>
        <label class="form-label" for="motivoRegistro">Motivo / observación</label>
        <textarea id="motivoRegistro" class="form-input min-h-[72px]" [(ngModel)]="form.motivo"></textarea>
      </div>
      <label class="flex items-start gap-2 text-sm text-gray-600">
        <input type="checkbox" class="mt-0.5" [(ngModel)]="form.generarPeriodos" />
        <span>
          Generar plantilla de periodos académicos
          @if (form.generarPeriodos) {
            <span class="block text-[11px] text-gray-400 mt-0.5">
              Equivale a crear los bimestres con fechas MINEDU. Luego use «Copiar calendario» solo para feriados y eventos.
            </span>
          }
        </span>
      </label>
      <label class="flex items-start gap-2 text-sm text-gray-600">
        <input type="checkbox" class="mt-0.5" [(ngModel)]="form.activar" />
        <span>
          Activar como año vigente al registrar
          <span class="block text-[11px] text-gray-400 mt-0.5">
            Actualiza la IE y desactiva el año activo anterior si existe.
          </span>
        </span>
      </label>
      @if (formError()) {
        <p class="form-error" role="alert">{{ formError() }}</p>
      }
    </div>

    <div class="shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
      <button type="button" class="btn btn-secondary" (click)="cerrarModal()">Cancelar</button>
      <button type="button" class="btn btn-primary" [disabled]="svc.saving()" (click)="guardar()">
        @if (svc.saving()) { Guardando… } @else { Registrar }
      </button>
    </div>
  </aside>
}
  `,
})
export class MaestrosAniosEscolaresComponent implements OnInit {
  readonly svc = inject(MaestrosAniosEscolaresService);
  private readonly periodosSvc = inject(MaestrosPeriodosAcademicosService);
  private readonly auth = inject(AuthService);
  readonly tenant = inject(TenantContextService);
  private readonly _tenantReloadReady = setupTenantReload(() => this.cargar());

  readonly context = signal<AnioEscolarContext | null>(null);
  readonly items = signal<AnioEscolarItem[]>([]);
  readonly error = signal('');
  readonly success = signal('');
  readonly modalAbierto = signal(false);
  readonly modalCopiaAbierto = signal(false);
  readonly modalPublicarAbierto = signal(false);
  readonly modalDetalleAbierto = signal(false);
  readonly detalle = signal<AnioEscolarDetalle | null>(null);
  readonly detalleCargando = signal(false);
  readonly detalleError = signal('');
  readonly copiaDestino = signal<AnioEscolarItem | null>(null);
  readonly copiaDestinoTienePeriodos = signal(false);
  readonly copiaCargandoOpciones = signal(false);
  readonly formError = signal('');
  readonly copiaError = signal('');
  readonly publicarError = signal('');
  readonly publicarDestino = signal<AnioEscolarItem | null>(null);

  filtroEstado = '';
  tiposPeriodo: AnioEscolarTipoPeriodo[] = ['bimestre', 'trimestre', 'semestre'];
  private idempotencyKey = crypto.randomUUID();
  private copiaIdempotencyKey = crypto.randomUUID();
  private publicarIdempotencyKey = crypto.randomUUID();

  form = {
    anio: new Date().getFullYear() + 1,
    fechaInicio: '',
    fechaFin: '',
    tipoPeriodo: 'bimestre' as AnioEscolarTipoPeriodo,
    motivo: '',
    generarPeriodos: true,
    activar: false,
  };

  copiaForm = {
    anioOrigen: new Date().getFullYear(),
    copiarPeriodos: false,
    copiarFeriados: true,
    copiarEventos: true,
    motivo: '',
  };

  publicarForm = {
    destinatarios: 'todos' as 'alumnos' | 'padres' | 'todos' | 'docentes',
    prioridad: 'media' as 'alta' | 'media' | 'baja',
    titulo: '',
    motivo: '',
    republicar: false,
  };

  ngOnInit(): void {
    const next = this.form.anio;
    this.form.fechaInicio = `${next}-03-01`;
    this.form.fechaFin = `${next}-12-20`;
    if (!this.tenant.requiresSelection()) {
      this.cargar();
    }
    markTenantReloadReady(this._tenantReloadReady);
  }

  puedeGestionar(): boolean {
    return (
      this.auth.isAdmin() ||
      this.auth.hasAnyPermiso('calendarizacion.gestionar', 'admin.institucional')
    );
  }

  puedePublicarComunicado(): boolean {
    return (
      this.puedeGestionar() &&
      (this.auth.isAdmin() ||
        this.auth.hasAnyPermiso('comunicados.enviar', 'admin.institucional'))
    );
  }

  cargar(): void {
    this.error.set('');
    this.success.set('');
    if (this.tenant.requiresSelection()) {
      this.context.set(null);
      this.items.set([]);
      return;
    }
    this.svc.getContext().subscribe({
      next: (ctx) => {
        this.context.set(ctx);
        this.tiposPeriodo = ctx.tiposPeriodo as AnioEscolarTipoPeriodo[];
      },
      error: (err) => this.error.set(anioEscolarErrorMessage(err, 'No se pudo cargar el contexto')),
    });
    this.svc.list(1, this.filtroEstado).subscribe({
      next: (page) => this.items.set(page.items),
      error: (err) => this.error.set(anioEscolarErrorMessage(err, 'No se pudo cargar el listado')),
    });
  }

  abrirModal(): void {
    this.formError.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  verDetalle(item: AnioEscolarItem): void {
    this.detalleError.set('');
    this.detalle.set(null);
    this.detalleCargando.set(true);
    this.modalDetalleAbierto.set(true);
    this.svc.detail(item.id).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.detalleCargando.set(false);
      },
      error: (err) => {
        this.detalleError.set(anioEscolarErrorMessage(err, 'No se pudo cargar el detalle'));
        this.detalleCargando.set(false);
      },
    });
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.detalle.set(null);
    this.detalleError.set('');
  }

  abrirCopia(item: AnioEscolarItem): void {
    this.copiaError.set('');
    this.copiaDestino.set(item);
    this.copiaForm.anioOrigen = item.anio - 1;
    this.copiaForm.motivo = `Copia desde ${item.anio - 1}`;
    this.copiaForm.copiarFeriados = true;
    this.copiaForm.copiarEventos = true;
    this.copiaForm.copiarPeriodos = false;
    this.copiaDestinoTienePeriodos.set(false);
    this.copiaCargandoOpciones.set(true);
    this.modalCopiaAbierto.set(true);

    this.periodosSvc.list({ anioEscolar: item.anio, activo: true }).subscribe({
      next: (periodos) => {
        const tiene = periodos.length > 0;
        this.copiaDestinoTienePeriodos.set(tiene);
        this.copiaForm.copiarPeriodos = !tiene;
        this.copiaCargandoOpciones.set(false);
      },
      error: () => {
        this.copiaDestinoTienePeriodos.set(false);
        this.copiaForm.copiarPeriodos = true;
        this.copiaCargandoOpciones.set(false);
      },
    });
  }

  cerrarCopia(): void {
    this.modalCopiaAbierto.set(false);
    this.copiaDestino.set(null);
    this.copiaDestinoTienePeriodos.set(false);
    this.copiaCargandoOpciones.set(false);
  }

  abrirPublicar(item: AnioEscolarItem): void {
    this.publicarError.set('');
    this.publicarDestino.set(item);
    this.publicarForm.destinatarios = 'todos';
    this.publicarForm.prioridad = 'media';
    this.publicarForm.titulo = '';
    this.publicarForm.motivo = `Publicación del calendario escolar ${item.anio}`;
    this.publicarForm.republicar = false;
    this.modalPublicarAbierto.set(true);
  }

  cerrarPublicar(): void {
    this.modalPublicarAbierto.set(false);
    this.publicarDestino.set(null);
  }

  confirmarPublicar(): void {
    const dest = this.publicarDestino();
    if (!dest) return;
    this.publicarError.set('');
    if (!confirm(`¿Publicar el comunicado del calendario ${dest.anio}?`)) return;

    this.svc
      .publishComunicado(dest.id, {
        destinatarios: this.publicarForm.destinatarios,
        prioridad: this.publicarForm.prioridad,
        titulo: this.publicarForm.titulo.trim() || undefined,
        motivo: this.publicarForm.motivo.trim() || undefined,
        republicar: dest.publicado ? this.publicarForm.republicar : undefined,
        idempotencyKey: this.publicarIdempotencyKey,
      })
      .subscribe({
        next: (res) => {
          this.success.set(
            res.recuperado
              ? `${res.mensaje} (idempotencia).`
              : `${res.mensaje} Comunicado #${res.comunicado.id}.`,
          );
          this.publicarIdempotencyKey = crypto.randomUUID();
          this.cerrarPublicar();
          this.cargar();
        },
        error: (err) =>
          this.publicarError.set(
            anioEscolarErrorMessage(err, 'No se pudo publicar el comunicado'),
          ),
      });
  }

  confirmarCopia(): void {
    const dest = this.copiaDestino();
    if (!dest) return;
    this.copiaError.set('');
    if (
      !this.copiaForm.copiarPeriodos &&
      !this.copiaForm.copiarFeriados &&
      !this.copiaForm.copiarEventos
    ) {
      this.copiaError.set('Seleccione al menos un tipo de elemento a copiar.');
      return;
    }
    if (this.copiaForm.anioOrigen >= dest.anio) {
      this.copiaError.set('El año origen debe ser anterior al año destino.');
      return;
    }
    this.svc
      .copyCalendar(dest.id, {
        anioOrigen: Number(this.copiaForm.anioOrigen),
        copiarPeriodos: this.copiaForm.copiarPeriodos,
        copiarFeriados: this.copiaForm.copiarFeriados,
        copiarEventos: this.copiaForm.copiarEventos,
        motivo: this.copiaForm.motivo.trim() || undefined,
        idempotencyKey: this.copiaIdempotencyKey,
      })
      .subscribe({
        next: (res) => {
          const detalle = `Periodos ${res.periodos.copiados}, feriados ${res.feriados.copiados}, eventos ${res.eventos.copiados}.`;
          this.success.set(
            res.recuperado ? `${res.mensaje} (idempotencia).` : `${res.mensaje} ${detalle}`,
          );
          this.copiaIdempotencyKey = crypto.randomUUID();
          this.cerrarCopia();
          this.cargar();
        },
        error: (err) =>
          this.copiaError.set(anioEscolarErrorMessage(err, 'No se pudo copiar el calendario')),
      });
  }

  guardar(): void {
    this.formError.set('');
    const payload = {
      anio: Number(this.form.anio),
      fechaInicio: this.form.fechaInicio,
      fechaFin: this.form.fechaFin,
      tipoPeriodo: this.form.tipoPeriodo,
      motivo: this.form.motivo.trim() || undefined,
      generarPeriodos: this.form.generarPeriodos,
      activar: this.form.activar,
      idempotencyKey: this.idempotencyKey,
    };
    const err = validarAnioEscolarForm(payload);
    if (err) {
      this.formError.set(err);
      return;
    }
    this.svc.create(payload).subscribe({
      next: (res) => {
        this.success.set(
          res.recuperado
            ? 'Operación recuperada (idempotencia).'
            : `Año escolar ${res.anio} registrado.`,
        );
        this.idempotencyKey = crypto.randomUUID();
        this.cerrarModal();
        this.cargar();
      },
      error: (e) => this.formError.set(anioEscolarErrorMessage(e, 'No se pudo registrar')),
    });
  }

  activar(item: AnioEscolarItem): void {
    if (!confirm(`¿Activar el año escolar ${item.anio}? Actualizará la IE vigente.`)) return;
    this.svc.activate(item.id, 'Activación desde calendarización escolar').subscribe({
      next: () => {
        this.success.set(`Año ${item.anio} activado.`);
        this.cargar();
      },
      error: (err) => this.error.set(anioEscolarErrorMessage(err, 'No se pudo activar')),
    });
  }

  cerrar(item: AnioEscolarItem): void {
    const motivo = prompt('Motivo del cierre (mín. 5 caracteres):', '');
    if (!motivo || motivo.trim().length < 5) return;
    this.svc.close(item.id, motivo.trim()).subscribe({
      next: () => {
        this.success.set(`Año ${item.anio} cerrado.`);
        this.cargar();
      },
      error: (err) => this.error.set(anioEscolarErrorMessage(err, 'No se pudo cerrar')),
    });
  }

  badgeEstado(estado: string): string {
    return ESTADO_ANIO_CFG[estado as keyof typeof ESTADO_ANIO_CFG] ?? 'badge badge-gray';
  }

  etiquetaEstado(estado: string): string {
    return this.context()?.estados.find((e) => e.codigo === estado)?.label ?? estado;
  }

  etiquetaAccion(accion: string): string {
    return ACCION_ANIO_ESCOLAR_LABEL[accion] ?? accion;
  }

  resumenEvento(ev: AnioEscolarEvento): string | null {
    const c = ev.cambios ?? {};
    if (ev.accion === 'copiar_calendario') {
      const origen = c['anioOrigen'];
      const destino = c['anioDestino'];
      const p = c['periodos'] as CopiarCalendarioResumen | undefined;
      const f = c['feriados'] as CopiarCalendarioResumen | undefined;
      const e = c['eventos'] as CopiarCalendarioResumen | undefined;
      if (p || f || e) {
        return `Desde ${origen ?? '?'} → ${destino ?? '?'}: periodos ${p?.copiados ?? 0}, feriados ${f?.copiados ?? 0}, eventos ${e?.copiados ?? 0}`;
      }
    }
    if (ev.accion === 'registrar' && c['anio']) {
      return `Año ${c['anio']} · ${String(c['tipoPeriodo'] ?? '')}`;
    }
    if (ev.accion === 'activar' && c['anioInstitucion']) {
      return `IE actualizada al ${c['anioInstitucion']}`;
    }
    if (ev.accion === 'publicar_comunicado') {
      return `Comunicado #${c['announcementId'] ?? '?'} · v${c['versionNueva'] ?? c['version'] ?? '?'}`;
    }
    if (typeof c['version'] === 'number') {
      return `Versión ${c['version']}`;
    }
    return null;
  }
}
