import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { SeguimientoService } from './seguimiento.service';
import { HijoSelectorComponent } from '../shared/hijo-selector.component';
import { JustificacionesPadreService } from '../justificaciones/justificaciones-padre.service';
import {
  JustificacionItem,
  PendienteJustificacion,
  DIAS_PLAZO_JUSTIFICACION,
} from '../../asistencia/justificaciones/justificaciones.model';
import {
  SeguimientoVista,
  cursoStyle,
  estadoAsistenciaBadge,
  estadoAsistenciaLabel,
  estadoAsistenciaIcon,
  estadoAsistenciaIconBg,
  estadoAsistenciaDot,
  estadoAsistenciaRowBg,
  asistenciaPctColor,
  asistenciaPctConic,
  asistenciaPctMensaje,
  asistenciaSegmentos,
  alertaAusentismoBadge,
  alertaAusentismoLabel,
  nivelBadge,
  notaColor,
  parentescoLabel,
  tareaEstadoBadge,
  tareaEstadoLabel,
  taskFileUrl,
  HijoResumen,
} from './seguimiento.model';

@Component({
  standalone: true,
  imports: [FormsModule, NgClass, DecimalPipe, RouterLink, HijoSelectorComponent],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Seguimiento académico</h2>
          <p class="text-sm text-gray-400 mt-0.5">
            Notas, asistencia y tareas de {{ auth.nombreCompleto() }}
          </p>
        </div>
        <div class="flex gap-2">
          <a routerLink="/portal-padre/inicio" class="btn btn-secondary btn-sm">
            <span class="icon icon-sm">home</span> Inicio
          </a>
          <button class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="svc.loadingHijos() || svc.loadingTracking()">
            <span class="icon icon-sm">refresh</span> Actualizar
          </button>
        </div>
      </div>

      @if (svc.loadingHijos()) {
        <div class="card p-12 flex flex-col items-center text-gray-400">
          <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
          <p class="text-sm">Cargando hijos vinculados…</p>
        </div>
      } @else if (!svc.hijos().length) {
        <div class="card p-16 flex flex-col items-center justify-center text-center">
          <span class="text-4xl mb-4">👨‍👩‍👧</span>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">Sin hijos vinculados</h3>
          <p class="text-gray-500 text-sm">Contacta con la institución para vincular a tus hijos a tu cuenta.</p>
        </div>
      } @else {
        <app-hijo-selector [autoLoad]="false" (hijoChange)="onHijoChange($event)" />

        @if (svc.loadingTracking()) {
          <div class="card p-12 flex flex-col items-center text-gray-400">
            <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
            <p class="text-sm">Cargando información de tus hijos…</p>
          </div>
        } @else if (data(); as d) {
          <div class="card p-4 bg-gradient-to-r from-indigo-50 to-white border-indigo-100">
            <div class="flex flex-wrap items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl shrink-0">
                🎓
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-gray-900">{{ d.estudiante.nombreCompleto }}</h3>
                <p class="text-sm text-gray-500">{{ d.estudiante.aulaLabel }}</p>
                <span class="badge badge-indigo text-xs mt-1">{{ parentescoLabel(d.estudiante.parentesco) }}</span>
              </div>
              @if (d.promedioGeneral !== null) {
                <div class="text-right">
                  <p class="text-xs text-gray-400">Promedio general</p>
                  <p class="text-3xl font-bold" [ngClass]="notaColor(d.promedioGeneral)">
                    {{ d.promedioGeneral | number:'1.1-1' }}
                  </p>
                  @if (d.nivelGeneral) {
                    <span class="badge text-xs" [ngClass]="nivelBadge(d.nivelGeneral)">{{ d.nivelGeneral }}</span>
                  }
                </div>
              }
            </div>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            @for (kpi of kpis(); track kpi.label) {
              <button type="button" class="card p-4 text-left hover:shadow-md transition-shadow"
                [ngClass]="vista() === kpi.vista ? 'ring-2 ring-indigo-400' : ''"
                (click)="vista.set(kpi.vista)">
                <p class="text-xs text-gray-400">{{ kpi.label }}</p>
                <p class="text-xl font-bold mt-1" [ngClass]="kpi.text">{{ kpi.value }}</p>
              </button>
            }
          </div>

          <div class="tabs">
            @for (tab of tabs; track tab.id) {
              <button class="tab" [class.tab-active]="vista() === tab.id" (click)="vista.set(tab.id)">
                <span class="icon icon-sm">{{ tab.icon }}</span> {{ tab.label }}
              </button>
            }
          </div>

          @if (vista() === 'resumen') {
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div class="card p-5">
                <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span class="icon text-indigo-500">grading</span> Rendimiento por curso
                </h4>
                @if (!d.cursos.length) {
                  <p class="text-sm text-gray-400 text-center py-6">Sin cursos asignados en el horario</p>
                } @else {
                  <div class="space-y-3">
                    @for (c of d.cursos; track c.curso) {
                      @let style = cursoStyle(c.curso);
                      <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                          [ngClass]="style.colorClass">{{ style.emoji }}</div>
                        <div class="flex-1 min-w-0">
                          <p class="font-medium text-gray-800 truncate">{{ c.curso }}</p>
                          <p class="text-xs text-gray-400">
                            B1: {{ valorBimestre(c.b1, c.b1Nivel) }} · B2: {{ valorBimestre(c.b2, c.b2Nivel) }}
                          </p>
                        </div>
                        <div class="text-right shrink-0">
                          @if (c.promedio !== null) {
                            <p class="font-bold" [ngClass]="notaColor(c.promedio)">{{ c.promedio | number:'1.1-1' }}</p>
                            @if (c.nivel) {
                              <span class="badge text-[10px]" [ngClass]="nivelBadge(c.nivel)">{{ c.nivel }}</span>
                            }
                          } @else if (c.nivel) {
                            <span class="badge text-xs" [ngClass]="nivelBadge(c.nivel)">{{ c.nivel }}</span>
                          } @else {
                            <p class="text-sm text-gray-400">Sin promedio</p>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="space-y-4">
                <div class="card p-5">
                  <div class="flex items-center justify-between mb-4">
                    <h4 class="font-semibold text-gray-800 flex items-center gap-2">
                      <span class="icon text-emerald-500">fact_check</span> Asistencia del mes
                    </h4>
                    <button type="button" class="text-xs text-indigo-600 hover:underline font-medium"
                      (click)="vista.set('asistencia')">
                      Ver detalle
                    </button>
                  </div>
                  <div class="flex items-center gap-5 mb-4">
                    <div class="relative w-20 h-20 rounded-full shrink-0"
                      [style.background]="asistenciaPctConic(d.asistencia.asistenciaPct)">
                      <div class="absolute inset-1.5 rounded-full bg-white flex flex-col items-center justify-center">
                        <span class="text-lg font-bold leading-none" [ngClass]="asistenciaPctColor(d.asistencia.asistenciaPct)">
                          {{ d.asistencia.asistenciaPct }}%
                        </span>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-800">{{ asistenciaPctMensaje(d.asistencia.asistenciaPct) }}</p>
                      <div class="h-2 rounded-full overflow-hidden flex bg-gray-100 mt-2">
                        @for (seg of asistenciaSegmentos(d.asistencia); track seg.key) {
                          @if (seg.count > 0) {
                            <div [class]="seg.color" [style.width.%]="seg.pct" [title]="seg.label + ': ' + seg.count"></div>
                          }
                        }
                      </div>
                      <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-500">
                        <span class="inline-flex items-center gap-1">
                          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>{{ d.asistencia.presentes }} presentes
                        </span>
                        <span class="inline-flex items-center gap-1">
                          <span class="w-2 h-2 rounded-full bg-red-500"></span>{{ d.asistencia.faltas }} faltas
                        </span>
                        @if (d.asistencia.tardanzas) {
                          <span class="inline-flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-amber-400"></span>{{ d.asistencia.tardanzas }} tardanzas
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                  @if (d.asistencia.reciente.length) {
                    <div class="space-y-1.5">
                      @for (a of d.asistencia.reciente.slice(0, 4); track a.id) {
                        <div class="flex items-center gap-2.5 text-sm py-1.5 px-2 rounded-lg hover:bg-gray-50">
                          <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            [ngClass]="estadoAsistenciaIconBg(a.estado)">
                            <span class="icon icon-sm">{{ estadoAsistenciaIcon(a.estado) }}</span>
                          </span>
                          <div class="flex-1 min-w-0">
                            <p class="text-gray-800 font-medium">{{ formatFechaConDia(a.fecha) }}</p>
                          </div>
                          <span class="badge text-[10px] shrink-0" [ngClass]="estadoAsistenciaBadge(a.estado)">
                            {{ estadoAsistenciaLabel(a.estado) }}
                          </span>
                        </div>
                      }
                    </div>
                  }
                </div>

                <div class="card p-5">
                  <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span class="icon text-amber-500">assignment</span> Tareas activas
                  </h4>
                  @if (!tareasActivas().length) {
                    <p class="text-sm text-gray-400 text-center py-4">Sin tareas pendientes o vencidas</p>
                  } @else {
                    <div class="space-y-2">
                      @for (t of tareasActivas().slice(0, 4); track t.id) {
                        <div class="p-3 rounded-lg bg-gray-50">
                          <p class="text-sm font-medium text-gray-800">{{ t.titulo }}</p>
                          <div class="flex items-center justify-between mt-1">
                            <p class="text-xs text-gray-500">{{ t.curso }} · {{ formatFecha(t.fechaEntrega) }}</p>
                            <span class="badge text-[10px]" [ngClass]="tareaEstadoBadge(t.estado)">
                              {{ tareaEstadoLabel(t.estado) }}
                            </span>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          @if (vista() === 'notas') {
            <div class="space-y-4">
              @if (!d.cursos.length) {
                <div class="card p-12 text-center text-gray-400">
                  <p class="text-sm">No hay cursos asignados en el horario de este estudiante.</p>
                </div>
              } @else {
                @for (c of d.cursos; track c.curso) {
                  @let style = cursoStyle(c.curso);
                  <div class="card overflow-hidden">
                    <div class="p-4 flex flex-wrap items-center gap-4 border-b border-gray-100">
                      <div class="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0"
                        [ngClass]="style.colorClass">{{ style.emoji }}</div>
                      <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-800">{{ c.curso }}</h4>
                        <p class="text-xs text-gray-400">
                          B1: {{ valorBimestre(c.b1, c.b1Nivel) }} · B2: {{ valorBimestre(c.b2, c.b2Nivel) }} ·
                          B3: {{ valorBimestre(c.b3, c.b3Nivel) }} · B4: {{ valorBimestre(c.b4, c.b4Nivel) }}
                        </p>
                      </div>
                      <div class="text-right">
                        @if (c.promedio !== null) {
                          <p class="text-xl font-bold" [ngClass]="notaColor(c.promedio)">{{ c.promedio | number:'1.1-1' }}</p>
                          @if (c.nivel) {
                            <span class="badge text-xs" [ngClass]="nivelBadge(c.nivel)">{{ c.nivel }}</span>
                          }
                        } @else if (c.nivel) {
                          <span class="badge text-xs" [ngClass]="nivelBadge(c.nivel)">{{ c.nivel }}</span>
                        } @else {
                          <p class="text-sm text-gray-400">Sin promedio</p>
                        }
                      </div>
                    </div>
                    @if (c.ultimasNotas.length) {
                      <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                          <thead>
                            <tr class="bg-gray-50 text-xs text-gray-500">
                              <th class="text-left px-4 py-2 font-medium">Evaluación</th>
                              <th class="text-center px-4 py-2 font-medium w-24">Fecha</th>
                              <th class="text-center px-4 py-2 font-medium w-16">Bim.</th>
                              <th class="text-center px-4 py-2 font-medium w-20">Nota</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-50">
                            @for (n of c.ultimasNotas; track n.id) {
                              <tr>
                                <td class="px-4 py-2.5 text-gray-700">{{ n.descripcion }}</td>
                                <td class="px-4 py-2.5 text-center text-gray-500">{{ formatFecha(n.fecha) }}</td>
                                <td class="px-4 py-2.5 text-center text-gray-500">{{ n.bimestre }}°</td>
                                <td class="px-4 py-2.5 text-center font-semibold" [ngClass]="notaColor(n.nota)">
                                  {{ n.nota | number:'1.1-1' }}
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          }

          @if (vista() === 'asistencia') {
            <div class="card overflow-hidden">
              <div class="grid grid-cols-1 lg:grid-cols-5">
                <div class="lg:col-span-2 p-6 bg-gradient-to-br from-emerald-50/80 via-white to-indigo-50/50 flex flex-col items-center justify-center text-center border-b lg:border-b-0 lg:border-r border-gray-100">
                  <div class="relative w-32 h-32 rounded-full"
                    [style.background]="asistenciaPctConic(d.asistencia.asistenciaPct)">
                    <div class="absolute inset-2 rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                      <span class="text-3xl font-bold leading-none" [ngClass]="asistenciaPctColor(d.asistencia.asistenciaPct)">
                        {{ d.asistencia.asistenciaPct }}%
                      </span>
                      <span class="text-[10px] uppercase tracking-wide text-gray-400 mt-1">asistencia</span>
                    </div>
                  </div>
                  <p class="text-sm font-semibold text-gray-800 mt-4">{{ asistenciaPctMensaje(d.asistencia.asistenciaPct) }}</p>
                  <p class="text-xs text-gray-500 mt-1">{{ d.asistencia.totalDias }} días registrados en el mes</p>
                </div>
                <div class="lg:col-span-3 p-6">
                  <h4 class="font-semibold text-gray-800 mb-1">Desglose del mes</h4>
                  <p class="text-xs text-gray-500 mb-4">Proporción de cada tipo de registro sobre el total de días</p>
                  <div class="h-3 rounded-full overflow-hidden flex bg-gray-100 shadow-inner">
                    @for (seg of asistenciaSegmentos(d.asistencia); track seg.key) {
                      @if (seg.count > 0) {
                        <div [class]="seg.color + ' transition-all'" [style.width.%]="seg.pct"
                          [title]="seg.label + ': ' + seg.count"></div>
                      }
                    }
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    @for (seg of asistenciaSegmentos(d.asistencia); track seg.key) {
                      <div class="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="w-7 h-7 rounded-lg flex items-center justify-center"
                            [ngClass]="estadoAsistenciaIconBg(seg.key === 'presentes' ? 'P' : seg.key === 'tardanzas' ? 'T' : seg.key === 'faltas' ? 'F' : 'J')">
                            <span class="icon icon-sm">{{ seg.icon }}</span>
                          </span>
                          <span class="text-xs text-gray-500">{{ seg.label }}</span>
                        </div>
                        <p class="text-2xl font-bold" [ngClass]="seg.textColor">{{ seg.count }}</p>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 text-xs">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                <span class="icon icon-sm">check_circle</span> Presente
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                <span class="icon icon-sm">schedule</span> Tardanza
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-100">
                <span class="icon icon-sm">cancel</span> Falta
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-100">
                <span class="icon icon-sm">verified</span> Justificada
              </span>
            </div>

            @if (d.alertasAusentismo?.length) {
              <div class="space-y-3">
                @for (alert of d.alertasAusentismo; track alert.id) {
                  <div class="card p-4 border-l-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    [ngClass]="alert.leidoEnPortal
                      ? 'border-gray-300 bg-gray-50/60'
                      : alert.nivelAlerta === 'critico'
                        ? 'border-red-500 bg-red-50/50'
                        : 'border-amber-400 bg-amber-50/50'">
                    <div class="flex items-start gap-3 min-w-0">
                      <span class="icon shrink-0 mt-0.5"
                        [ngClass]="alert.leidoEnPortal ? 'text-gray-400' : alert.nivelAlerta === 'critico' ? 'text-red-600' : 'text-amber-600'">
                        {{ alert.leidoEnPortal ? 'mark_email_read' : 'notifications_active' }}
                      </span>
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <p class="font-semibold text-gray-900">Alerta de ausentismo · {{ alert.mesLabel }}</p>
                          <span class="badge text-[10px]" [ngClass]="alertaAusentismoBadge(alert.nivelAlerta)">
                            {{ alertaAusentismoLabel(alert.nivelAlerta) }}
                          </span>
                          @if (!alert.leidoEnPortal) {
                            <span class="badge badge-indigo text-[10px]">Nueva</span>
                          }
                        </div>
                        <p class="text-sm text-gray-700 mt-1">
                          <strong>{{ alert.faltasInjustificadas }}</strong> falta(s) injustificada(s)
                          · {{ alert.diasConsecutivos }} día(s) consecutivo(s)
                        </p>
                        @if (alert.motivoAlerta) {
                          <p class="text-xs text-gray-500 mt-1">{{ alert.motivoAlerta }}</p>
                        }
                        <p class="text-[11px] text-gray-400 mt-2">
                          Notificado el {{ alert.notificadoAt }}
                          @if (alert.correoEnviado) { · también enviado a su correo }
                        </p>
                      </div>
                    </div>
                    <div class="flex flex-wrap gap-2 shrink-0">
                      @if (!alert.leidoEnPortal) {
                        <button type="button" class="btn btn-secondary btn-sm"
                          (click)="marcarAlertaLeida(alert.id)">
                          Entendido
                        </button>
                      }
                      @if (pendienteActual()) {
                        <a routerLink="/portal-padre/justificaciones" class="btn btn-primary btn-sm">
                          Justificar
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            @if (pendienteActual(); as p) {
              <div class="card p-4 border-l-4 border-l-red-400 bg-red-50/40">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p class="font-semibold text-gray-900 flex items-center gap-2">
                      <span class="icon text-red-500">event_busy</span>
                      Faltas sin justificar
                    </p>
                    <p class="text-sm text-gray-600 mt-1">
                      {{ p.faltasSinJustificar }} falta(s) dentro del plazo de {{ diasPlazo }} días
                      @if (p.ultimaFalta) { · última: {{ p.ultimaFalta }} }
                    </p>
                    @if (p.faltasFueraDePlazo) {
                      <p class="text-xs text-amber-700 mt-1">
                        {{ p.faltasFueraDePlazo }} falta(s) con plazo vencido (no se pueden justificar).
                      </p>
                    }
                  </div>
                  <a routerLink="/portal-padre/justificaciones" class="btn btn-primary btn-sm shrink-0">
                    <span class="icon icon-sm">upload_file</span> Subir justificación
                  </a>
                </div>
              </div>
            } @else if (!justSvc.loading()) {
              <div class="card p-4 bg-emerald-50/50 border border-emerald-100">
                <p class="text-sm text-emerald-800 flex items-center gap-2">
                  <span class="icon icon-sm">check_circle</span>
                  No hay faltas pendientes de justificar para {{ d.estudiante.nombreCompleto }}.
                </p>
              </div>
            }

            <div class="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/40 border-indigo-100">
              <div>
                <p class="font-semibold text-gray-900">Centro de justificaciones</p>
                <p class="text-sm text-gray-600 mt-1">
                  Adjunta certificados o sustentos. Al enviar, la falta pasa a estado <strong>J — Justificada</strong>.
                  Plazo máximo: {{ diasPlazo }} días desde la fecha de la falta.
                </p>
              </div>
              <a routerLink="/portal-padre/justificaciones" class="btn btn-secondary btn-sm shrink-0">
                Ir a justificaciones
              </a>
            </div>

            @if (historialJustificaciones().length) {
              <div class="card overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 flex items-center justify-between">
                  <span>Justificaciones registradas</span>
                  <a routerLink="/portal-padre/justificaciones" class="text-xs text-indigo-600 hover:underline">Ver todas</a>
                </div>
                <div class="divide-y divide-gray-50">
                  @for (j of historialJustificaciones().slice(0, 3); track j.id) {
                    <div class="px-4 py-3">
                      <p class="text-sm font-medium text-gray-900">{{ j.motivo }}</p>
                      <p class="text-xs text-gray-500 mt-0.5">{{ j.cantidad }} falta(s) · {{ j.fechas.join(', ') }}</p>
                    </div>
                  }
                </div>
              </div>
            }

            <div class="card overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 class="font-semibold text-gray-800">Historial reciente</h4>
                  <p class="text-xs text-gray-500 mt-0.5">Cada día con su estado y acción disponible</p>
                </div>
                @if (d.asistencia.reciente.length) {
                  <div class="flex flex-wrap gap-1">
                    @for (a of d.asistencia.reciente.slice(0, 10); track a.id) {
                      <span class="w-3 h-3 rounded-sm shrink-0" [ngClass]="estadoAsistenciaDot(a.estado)"
                        [title]="formatFecha(a.fecha) + ' — ' + estadoAsistenciaLabel(a.estado)"></span>
                    }
                  </div>
                }
              </div>
              @if (!d.asistencia.reciente.length) {
                <div class="py-12 text-center">
                  <span class="icon text-4xl text-gray-300 mb-2">event_available</span>
                  <p class="text-sm text-gray-400">Sin registros de asistencia</p>
                </div>
              } @else {
                <div class="p-4 space-y-2">
                  @for (a of d.asistencia.reciente; track a.id) {
                    <div class="flex flex-wrap items-center gap-3 p-3 rounded-xl border transition-colors"
                      [ngClass]="estadoAsistenciaRowBg(a.estado)">
                      <span class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        [ngClass]="estadoAsistenciaIconBg(a.estado)">
                        <span class="icon">{{ estadoAsistenciaIcon(a.estado) }}</span>
                      </span>
                      <div class="flex-1 min-w-[140px]">
                        <p class="text-sm font-semibold text-gray-900">{{ formatFechaConDia(a.fecha) }}</p>
                        @if (a.observacion) {
                          <p class="text-xs text-gray-500 mt-0.5">{{ a.observacion }}</p>
                        } @else {
                          <p class="text-xs text-gray-400 mt-0.5">{{ estadoAsistenciaLabel(a.estado) }}</p>
                        }
                      </div>
                      <div class="flex items-center gap-2 ml-auto">
                        <span class="badge text-xs" [ngClass]="estadoAsistenciaBadge(a.estado)">
                          {{ estadoAsistenciaLabel(a.estado) }}
                        </span>
                        @if (a.estado === 'F') {
                          <a routerLink="/portal-padre/justificaciones"
                            [queryParams]="{ faltaId: a.id }"
                            class="btn btn-secondary btn-sm">
                            <span class="icon icon-sm">upload_file</span> Justificar
                          </a>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (vista() === 'tareas') {
            <div class="space-y-3">
              @if (!d.tareas.length) {
                <div class="card p-12 text-center text-gray-400">
                  <p class="text-sm">No hay tareas asignadas.</p>
                </div>
              } @else {
                @for (t of d.tareas; track t.id) {
                  <div class="card p-4"
                    [ngClass]="t.estado === 'OVERDUE' ? 'border-l-4 border-l-red-400' : t.estado === 'GRADED' ? 'border-l-4 border-l-indigo-400' : ''">
                    <div class="flex flex-wrap items-start gap-4">
                      <div class="flex-1 min-w-0">
                        <div class="flex flex-wrap items-center gap-2 mb-1">
                          <h4 class="font-semibold text-gray-800">{{ t.titulo }}</h4>
                          <span class="badge text-xs" [ngClass]="tareaEstadoBadge(t.estado)">{{ tareaEstadoLabel(t.estado) }}</span>
                          <span class="badge text-xs"
                            [ngClass]="t.prioridad === 'alta' ? 'badge-red' : t.prioridad === 'media' ? 'badge-yellow' : 'badge-gray'">
                            {{ t.prioridad }}
                          </span>
                        </div>
                        <p class="text-sm text-gray-500">{{ t.curso }} · Entrega: {{ formatFecha(t.fechaEntrega) }}</p>
                        @if (t.fechaEntregaReal) {
                          <p class="text-xs text-gray-400 mt-1">Enviada: {{ formatFecha(t.fechaEntregaReal) }}</p>
                        }
                        @if (t.archivoEntregaNombre) {
                          <a [href]="taskFileUrl(t.archivoEntregaUrl)" target="_blank" rel="noopener"
                            class="inline-flex items-center gap-1.5 mt-2 text-xs text-indigo-600 hover:underline">
                            <span class="icon icon-sm">attach_file</span> {{ t.archivoEntregaNombre }}
                          </a>
                        }
                        @if (t.comentarioEntrega) {
                          <p class="text-xs text-gray-500 mt-2 italic">"{{ t.comentarioEntrega }}"</p>
                        }
                        @if (t.estado === 'GRADED') {
                          <div class="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                            <p class="text-sm font-semibold text-indigo-800">
                              Calificación: {{ t.nota ?? '—' }}/20
                            </p>
                            @if (t.retroalimentacion) {
                              <p class="text-sm text-indigo-900 mt-1">{{ t.retroalimentacion }}</p>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          }
        }
      }
    </div>
  `,
})
export class SeguimientoComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly svc = inject(SeguimientoService);
  readonly justSvc = inject(JustificacionesPadreService);
  readonly diasPlazo = DIAS_PLAZO_JUSTIFICACION;

  readonly hijoSeleccionado = signal<number | null>(null);
  readonly vista = signal<SeguimientoVista>('resumen');
  readonly pendienteActual = signal<PendienteJustificacion | null>(null);
  readonly historialJustificaciones = signal<JustificacionItem[]>([]);

  readonly tabs: { id: SeguimientoVista; label: string; icon: string }[] = [
    { id: 'resumen', label: 'Resumen', icon: 'dashboard' },
    { id: 'notas', label: 'Notas', icon: 'grading' },
    { id: 'asistencia', label: 'Asistencia', icon: 'fact_check' },
    { id: 'tareas', label: 'Tareas', icon: 'assignment' },
  ];

  readonly data = computed(() => this.svc.seguimiento());

  readonly alertasNoLeidas = computed(() =>
    (this.data()?.alertasAusentismo ?? []).filter((a) => !a.leidoEnPortal).length,
  );

  readonly tareasActivas = computed(() => {
    const tareas = this.data()?.tareas ?? [];
    return tareas.filter(t => t.estado === 'PENDING' || t.estado === 'OVERDUE');
  });

  readonly kpis = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Promedio', value: d.promedioGeneral !== null ? d.promedioGeneral.toFixed(1) : '—', text: notaColor(d.promedioGeneral), vista: 'notas' as SeguimientoVista },
      { label: 'Asistencia', value: `${d.asistencia.asistenciaPct}%`, text: d.asistencia.asistenciaPct >= 90 ? 'text-emerald-600' : d.asistencia.asistenciaPct >= 75 ? 'text-amber-600' : 'text-red-600', vista: 'asistencia' as SeguimientoVista },
      { label: 'Tareas pendientes', value: d.tareasPendientes + d.tareasVencidas, text: 'text-amber-600', vista: 'tareas' as SeguimientoVista },
      { label: 'Entregadas', value: d.tareasEntregadas, text: 'text-emerald-600', vista: 'tareas' as SeguimientoVista },
      { label: 'Calificadas', value: d.tareasCalificadas ?? 0, text: 'text-indigo-600', vista: 'tareas' as SeguimientoVista },
    ];
  });

  cursoStyle = cursoStyle;
  notaColor = notaColor;
  nivelBadge = nivelBadge;
  parentescoLabel = parentescoLabel;
  estadoAsistenciaLabel = estadoAsistenciaLabel;
  estadoAsistenciaBadge = estadoAsistenciaBadge;
  estadoAsistenciaIcon = estadoAsistenciaIcon;
  estadoAsistenciaIconBg = estadoAsistenciaIconBg;
  estadoAsistenciaDot = estadoAsistenciaDot;
  estadoAsistenciaRowBg = estadoAsistenciaRowBg;
  asistenciaPctColor = asistenciaPctColor;
  asistenciaPctConic = asistenciaPctConic;
  asistenciaPctMensaje = asistenciaPctMensaje;
  asistenciaSegmentos = asistenciaSegmentos;
  alertaAusentismoLabel = alertaAusentismoLabel;
  alertaAusentismoBadge = alertaAusentismoBadge;
  tareaEstadoLabel = tareaEstadoLabel;
  tareaEstadoBadge = tareaEstadoBadge;
  taskFileUrl = taskFileUrl;

  valorBimestre(nota: number | null | undefined, nivel: string | null | undefined): string {
    if (nota !== null && nota !== undefined) return String(nota);
    if (nivel) return nivel;
    return '—';
  }

  ngOnInit(): void {
    this.layout.setTitle('Seguimiento académico');
    this.cargar();
  }

  cargar(): void {
    this.svc.loadHijos().subscribe({
      next: () => {
        const hijo = this.svc.hijoSeleccionado();
        if (hijo) this.onHijoChange(hijo);
      },
    });
  }

  onHijoChange(hijo: HijoResumen): void {
    this.seleccionarHijo(hijo.studentId);
  }

  seleccionarHijo(studentId: number): void {
    this.hijoSeleccionado.set(studentId);
    const hijo = this.svc.hijos().find((h) => h.studentId === studentId);
    if (hijo) this.svc.seleccionarHijo(hijo);
    this.svc.loadSeguimiento(studentId).subscribe({
      next: data => {
        this.svc.seguimiento.set(data);
        this.cargarJustificaciones(studentId);
      },
    });
  }

  marcarAlertaLeida(alertId: number): void {
    const studentId = this.hijoSeleccionado();
    if (!studentId) return;
    this.svc.markAlertaLeida(studentId, alertId).subscribe({
      next: () => {
        this.svc.seguimiento.update((current) => {
          if (!current) return current;
          return {
            ...current,
            alertasAusentismo: (current.alertasAusentismo ?? []).map((a) =>
              a.id === alertId ? { ...a, leidoEnPortal: true } : a,
            ),
          };
        });
      },
    });
  }

  cargarJustificaciones(studentId: number): void {
    this.justSvc.loadPending(studentId).subscribe({
      next: items => this.pendienteActual.set(items[0] ?? null),
      error: () => this.pendienteActual.set(null),
    });
    this.justSvc.loadHistorial(studentId).subscribe({
      next: items => this.historialJustificaciones.set(items),
      error: () => this.historialJustificaciones.set([]),
    });
  }

  formatFecha(fecha: string): string {
    return format(parseISO(fecha.slice(0, 10)), 'dd/MM/yyyy', { locale: es });
  }

  formatFechaConDia(fecha: string): string {
    const d = parseISO(fecha.slice(0, 10));
    const dia = format(d, 'EEEE', { locale: es });
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    return `${diaCap}, ${format(d, 'dd/MM/yyyy', { locale: es })}`;
  }
}
