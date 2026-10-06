import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import {
  Documento,
  Estudiante,
  ExpedientesService,
  estudianteVacio,
} from '../services/expedientes.service';
import {
  ErroresCampoEstudiante,
  estudianteFormularioMinimoListo,
  primerErrorEstudiante,
  validarCampoEstudiante,
  validarEstudianteForm,
} from '../shared/estudiante-form.validation';
import {
  DOCUMENTOS_REQUISITOS,
  DocumentoRequerido,
} from '../shared/documentos-requisitos';
import { EstudianteAuditoriaService } from '../auditoria-cambios/estudiante-auditoria.service';
import { EstudianteChangeLog } from '../auditoria-cambios/estudiante-auditoria.model';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { markTenantReloadReady, setupTenantReload } from '../../../core/tenant/tenant-reload.util';
import { EstudiantesListTableComponent } from './estudiantes-list-table.component';

@Component({
  selector: 'app-estudiantes-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, EstudiantesListTableComponent],
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Gestion de Estudiantes</h2>
          <p class="text-sm text-gray-500 mt-0.5">{{ totalFiltrados() }} estudiante(s) · pagina {{ paginaActual() }} de {{ totalPaginas() }}</p>
          @if (loading()) {
            <p class="text-xs text-indigo-500 mt-1">Cargando expedientes...</p>
          }
          @if (loadError()) {
            <p class="text-xs text-red-500 mt-1">{{ loadError() }}</p>
          }
          @if (tenant.requiresSelection()) {
            <p class="text-xs text-amber-600 mt-1">Seleccione una institución educativa en el encabezado para ver el padrón.</p>
          }
          @if (!loading() && !loadError() && !tenant.requiresSelection() && totalFiltrados() === 0) {
            <p class="text-xs text-gray-500 mt-1">
              No hay estudiantes en la IE #{{ tenant.effectiveInstitutionId() }}. Pruebe otra institución en el selector (revise el conteo de alumnos).
            </p>
          }
        </div>
        <div class="flex gap-2 flex-wrap">
          @if (puedeGestionarVinculos()) {
            <a class="btn btn-secondary" routerLink="/estudiantes/representante-vinculos">
              <span class="icon icon-sm">family_restroom</span> Vínculos representante
            </a>
          }
          <button class="btn btn-secondary" (click)="exportarCsv()" [disabled]="loading() || exportando()">
            <span class="icon icon-sm">download</span> {{ exportando() ? 'Exportando…' : 'Exportar' }}
          </button>
          <button class="btn btn-primary" (click)="abrirDrawerNuevo()">
            <span class="icon icon-sm">person_add</span> Nuevo Estudiante
          </button>
        </div>
      </div>

      <!-- Stats rápidas -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <span class="icon text-indigo-600">groups</span>
            </div>
            <div>
              <div class="text-xl font-bold text-gray-900">{{ totalEstudiantes() }}</div>
              <div class="text-xs text-gray-400">Total</div>
            </div>
          </div>
        </div>
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <span class="icon text-green-600">check_circle</span>
            </div>
            <div>
              <div class="text-xl font-bold text-gray-900">{{ estudiantesActivos() }}</div>
              <div class="text-xs text-gray-400">Activos</div>
            </div>
          </div>
        </div>
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
              <span class="icon text-pink-600">girl</span>
            </div>
            <div>
              <div class="text-xl font-bold text-gray-900">{{ estudiantesMujeres() }}</div>
              <div class="text-xs text-gray-400">Mujeres</div>
            </div>
          </div>
        </div>
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <span class="icon text-blue-600">boy</span>
            </div>
            <div>
              <div class="text-xl font-bold text-gray-900">{{ estudiantesVarones() }}</div>
              <div class="text-xs text-gray-400">Varones</div>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="card p-4 text-left transition-colors"
          [class.ring-2]="filtroDocumento() === 'pendiente_regularizacion'"
          [class.ring-amber-400]="filtroDocumento() === 'pendiente_regularizacion'"
          [class.bg-amber-50]="filtroDocumento() === 'pendiente_regularizacion'"
          (click)="toggleFiltroPendientesRegularizacion()"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <span class="icon text-amber-600">badge</span>
            </div>
            <div>
              <div class="text-xl font-bold text-gray-900">{{ pendientesRegularizacion() }}</div>
              <div class="text-xs text-gray-400">Pend. regularización</div>
            </div>
          </div>
        </button>
      </div>

      @if (pendientesRegularizacion() > 0 && filtroDocumento() !== 'pendiente_regularizacion') {
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm text-amber-900">
            Hay {{ pendientesRegularizacion() }} estudiante(s) registrados sin documento pendientes de regularización.
          </p>
          <button type="button" class="btn btn-sm bg-amber-600 text-white hover:bg-amber-700" (click)="verPendientesRegularizacion()">
            Ver pendientes
          </button>
        </div>
      }

      <!-- Filtros -->
      <div class="card p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div class="relative lg:col-span-2">
            <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">search</span>
            <input class="form-input pl-10 bg-gray-50" type="text" placeholder="Buscar por nombre, DNI o codigo..."
              [ngModel]="filtroQ()" (ngModelChange)="filtroQ.set($event); onFiltroChange()">
          </div>
          <div class="relative">
            <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">school</span>
            <select class="form-select pl-10 bg-gray-50" [ngModel]="filtroGrado()" (ngModelChange)="filtroGrado.set($event); onFiltroChange()">
              <option value="">Todos los grados</option>
              @for (g of grados; track g) { <option [value]="g">{{ g }}</option> }
            </select>
          </div>
          <div class="relative">
            <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">toggle_on</span>
            <select class="form-select pl-10 bg-gray-50" [ngModel]="filtroEstado()" (ngModelChange)="filtroEstado.set($event); onFiltroChange()">
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="retirado">Retirado</option>
            </select>
          </div>
          <div class="relative">
            <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">badge</span>
            <select class="form-select pl-10 bg-gray-50" [ngModel]="filtroDocumento()" (ngModelChange)="filtroDocumento.set($event); onFiltroChange()">
              <option value="">Todo el padrón</option>
              <option value="pendiente_regularizacion">Pendientes de regularización</option>
              <option value="regular">Documento regularizado</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <app-estudiantes-list-table
        [estudiantes]="paginados()"
        [paginaActual]="paginaActual()"
        [totalPaginas]="totalPaginas()"
        [totalFiltrados]="totalFiltrados()"
        [inicio]="inicio()"
        [fin]="fin()"
        [paginas]="paginas()"
        (verExpediente)="abrirExpediente($event)"
        (editar)="abrirDrawerEditar($event)"
        (eliminar)="eliminar($event)"
        (irPagina)="irPagina($event)"
        (limpiarFiltros)="limpiarFiltros()"
      />
    </div>

    <!-- ══════════════════════ DRAWER: NUEVO / EDITAR ══════════════════════ -->
    @if (drawerForm()) {
      <div class="fixed inset-0 bg-black/40 z-30 backdrop-blur-sm" (click)="cerrarDrawerForm()"></div>
      <div class="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-40 flex flex-col animate-slide-in-r">
        <div class="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-500">
          <div>
            <h3 class="font-semibold text-white">{{ form.id ? 'Editar Estudiante' : 'Nuevo Estudiante' }}</h3>
            <p class="text-xs text-indigo-200">{{ form.id ? form.codigo : 'Campos obligatorios marcados con *' }}</p>
          </div>
          <button class="btn-icon text-white hover:bg-white/20" (click)="cerrarDrawerForm()"><span class="icon">close</span></button>
        </div>
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          @if (!form.id) {
            <label class="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer">
              <input type="checkbox" class="mt-1" [(ngModel)]="registroSinDocumento"
                (ngModelChange)="onToggleSinDocumento()">
              <span>
                <span class="text-sm font-medium text-amber-900">Registro excepcional sin documento</span>
                <span class="block text-xs text-amber-700 mt-0.5">
                  Se asignará identificador interno ({{ form.codigo || 'EST-…' }}) y el expediente quedará pendiente de regularización.
                </span>
              </span>
            </label>
          }

          @if (registroSinDocumento && !form.id) {
            <div class="grid grid-cols-1 gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50/40">
              <div class="form-group">
                <label class="form-label">Motivo del registro sin documento *</label>
                <textarea class="form-input min-h-[3rem]" rows="2" [(ngModel)]="sinDocumentoMotivo"
                  placeholder="Ej: Estudiante extranjero recién llegado"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Sustento / referencia *</label>
                <textarea class="form-input min-h-[3rem]" rows="2" [(ngModel)]="sinDocumentoSustento"
                  placeholder="Ej: Informe de admisión, constancia migratoria"></textarea>
              </div>
              @if (coincidenciasDuplicado().length) {
                <div class="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800" role="alert">
                  <p class="font-semibold mb-1">Posibles coincidencias detectadas:</p>
                  <ul class="list-disc pl-4 space-y-1">
                    @for (c of coincidenciasDuplicado(); track c.id) {
                      <li>{{ c.codigo }} — {{ c.coincidencias.join(', ') }}</li>
                    }
                  </ul>
                  <label class="flex items-center gap-2 mt-2">
                    <input type="checkbox" [(ngModel)]="confirmarDuplicado">
                    Confirmo que no es el mismo estudiante
                  </label>
                </div>
              }
            </div>
          }

          @if (form.id && form.estadoDocumento === 'pendiente_regularizacion') {
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p class="text-sm font-semibold text-amber-900">Regularización documentaria pendiente</p>
              <p class="text-xs text-amber-800">Motivo: {{ form.sinDocumentoMotivo || '—' }}</p>
              <div class="grid grid-cols-2 gap-3">
                <div class="form-group">
                  <label class="form-label">Número de documento *</label>
                  <input class="form-input" [(ngModel)]="regularizarDni" maxlength="20"
                    placeholder="Ingrese DNI/CE">
                </div>
                <div class="form-group">
                  <label class="form-label">Motivo de regularización *</label>
                  <input class="form-input" [(ngModel)]="regularizarMotivo"
                    placeholder="Ej: Presentó DNI en secretaría">
                </div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="guardandoForm()"
                (click)="regularizarDocumento()">
                Asociar documento oficial
              </button>
            </div>
          }

          <!-- Datos personales -->
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos Personales</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Nombres *</label>
                <input class="form-input" [ngClass]="claseCampo('nombres')"
                       [(ngModel)]="form.nombres"
                       (ngModelChange)="onCampoFormChange('nombres')"
                       (blur)="onCampoBlur('nombres')"
                       placeholder="Nombres completos">
                @if (campoError('nombres'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Apellidos *</label>
                <input class="form-input" [ngClass]="claseCampo('apellidos')"
                       [(ngModel)]="form.apellidos"
                       (ngModelChange)="onCampoFormChange('apellidos')"
                       (blur)="onCampoBlur('apellidos')"
                       placeholder="Apellidos">
                @if (campoError('apellidos'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              @if (!registroSinDocumento) {
                <div class="form-group">
                  <label class="form-label">DNI *</label>
                  <input class="form-input" [ngClass]="claseCampo('dni')"
                         [(ngModel)]="form.dni"
                         (ngModelChange)="onCampoFormChange('dni')"
                         (blur)="onCampoBlur('dni')"
                         placeholder="12345678" maxlength="8" inputmode="numeric">
                  @if (campoError('dni'); as err) { <p class="form-error mt-1">{{ err }}</p> }
                </div>
              } @else {
                <div class="form-group">
                  <label class="form-label">Identificador interno</label>
                  <input class="form-input bg-gray-50" readonly value="Se generará al guardar (EST-…)" aria-readonly="true">
                </div>
              }
              <div class="form-group">
                <label class="form-label">Fecha de Nacimiento *</label>
                <input class="form-input" type="date" [ngClass]="claseCampo('fechaNac')"
                       [(ngModel)]="form.fechaNac"
                       (ngModelChange)="onCampoFormChange('fechaNac')"
                       (blur)="onCampoBlur('fechaNac')">
                @if (campoError('fechaNac'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Sexo</label>
                <select class="form-select" [(ngModel)]="form.sexo">
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Grupo Sanguineo</label>
                <select class="form-select" [(ngModel)]="form.grupoSanguineo">
                  @for (gs of gruposSanguineos; track gs) { <option [value]="gs">{{ gs }}</option> }
                </select>
              </div>
              <div class="form-group col-span-2">
                <label class="form-label">Direccion</label>
                <input class="form-input" [(ngModel)]="form.direccion" placeholder="Av. / Jr. / Calle, numero">
              </div>
            </div>
          </div>

          <!-- Academico -->
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos Academicos</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Grado *</label>
                <select class="form-select" [ngClass]="claseCampo('grado')"
                        [(ngModel)]="form.grado"
                        (ngModelChange)="onCampoFormChange('grado')"
                        (blur)="onCampoBlur('grado')">
                  @for (g of grados; track g) { <option [value]="g">{{ g }}</option> }
                </select>
                @if (campoError('grado'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Seccion</label>
                <select class="form-select" [(ngModel)]="form.seccion">
                  <option value="A">A</option><option value="B">B</option>
                  <option value="C">C</option><option value="D">D</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Ano de Ingreso</label>
                <select class="form-select" [(ngModel)]="form.anioIngreso">
                  @for (a of anios; track a) { <option [value]="a">{{ a }}</option> }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Estado</label>
                <select class="form-select" [(ngModel)]="form.estado">
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="retirado">Retirado</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Salud -->
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Salud</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Alergias</label>
                <input class="form-input" [(ngModel)]="form.alergias" placeholder="Ej: Penicilina, Polen...">
              </div>
              <div class="form-group">
                <label class="form-label">Condiciones de Salud</label>
                <input class="form-input" [(ngModel)]="form.condicionesSalud" placeholder="Ej: Asma, Diabetes...">
              </div>
              <div class="form-group col-span-2">
                <label class="form-label">Observaciones</label>
                <textarea class="form-textarea" rows="2" [(ngModel)]="form.observaciones" placeholder="Observaciones importantes..."></textarea>
              </div>
            </div>
          </div>

          <!-- Padre -->
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos del Padre</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Nombres</label>
                <input class="form-input" [ngClass]="claseCampo('padre-nombres')"
                       [(ngModel)]="form.padre.nombres"
                       (ngModelChange)="onCampoFormChange('padre-nombres')"
                       (blur)="onCampoBlur('padre-nombres')">
                @if (campoError('padre-nombres'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Apellidos</label>
                <input class="form-input" [ngClass]="claseCampo('padre-apellidos')"
                       [(ngModel)]="form.padre.apellidos"
                       (ngModelChange)="onCampoFormChange('padre-apellidos')"
                       (blur)="onCampoBlur('padre-apellidos')">
                @if (campoError('padre-apellidos'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">DNI</label>
                <input class="form-input" [ngClass]="claseCampo('padre-dni')"
                       [(ngModel)]="form.padre.dni"
                       (ngModelChange)="onCampoFormChange('padre-dni')"
                       (blur)="onCampoBlur('padre-dni')" maxlength="8" inputmode="numeric">
                @if (campoError('padre-dni'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Telefono</label>
                <input class="form-input" [ngClass]="claseCampo('padre-telefono')"
                       [(ngModel)]="form.padre.telefono"
                       (ngModelChange)="onCampoFormChange('padre-telefono')"
                       (blur)="onCampoBlur('padre-telefono')">
                @if (campoError('padre-telefono'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-input" type="email" [ngClass]="claseCampo('padre-email')"
                       [(ngModel)]="form.padre.email"
                       (ngModelChange)="onCampoFormChange('padre-email')"
                       (blur)="onCampoBlur('padre-email')">
                @if (campoError('padre-email'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group"><label class="form-label">Trabajo / Ocupacion</label><input class="form-input" [(ngModel)]="form.padre.trabajo"></div>
            </div>
          </div>

          <!-- Madre -->
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos de la Madre</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Nombres</label>
                <input class="form-input" [ngClass]="claseCampo('madre-nombres')"
                       [(ngModel)]="form.madre.nombres"
                       (ngModelChange)="onCampoFormChange('madre-nombres')"
                       (blur)="onCampoBlur('madre-nombres')">
                @if (campoError('madre-nombres'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Apellidos</label>
                <input class="form-input" [ngClass]="claseCampo('madre-apellidos')"
                       [(ngModel)]="form.madre.apellidos"
                       (ngModelChange)="onCampoFormChange('madre-apellidos')"
                       (blur)="onCampoBlur('madre-apellidos')">
                @if (campoError('madre-apellidos'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">DNI</label>
                <input class="form-input" [ngClass]="claseCampo('madre-dni')"
                       [(ngModel)]="form.madre.dni"
                       (ngModelChange)="onCampoFormChange('madre-dni')"
                       (blur)="onCampoBlur('madre-dni')" maxlength="8" inputmode="numeric">
                @if (campoError('madre-dni'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Telefono</label>
                <input class="form-input" [ngClass]="claseCampo('madre-telefono')"
                       [(ngModel)]="form.madre.telefono"
                       (ngModelChange)="onCampoFormChange('madre-telefono')"
                       (blur)="onCampoBlur('madre-telefono')">
                @if (campoError('madre-telefono'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-input" type="email" [ngClass]="claseCampo('madre-email')"
                       [(ngModel)]="form.madre.email"
                       (ngModelChange)="onCampoFormChange('madre-email')"
                       (blur)="onCampoBlur('madre-email')">
                @if (campoError('madre-email'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group"><label class="form-label">Trabajo / Ocupacion</label><input class="form-input" [(ngModel)]="form.madre.trabajo"></div>
            </div>
          </div>

          <!-- Apoderado principal -->
          <div class="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white p-4">
            <p class="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span class="icon icon-sm">verified_user</span>
              Apoderado principal
              <span class="inline-flex items-center gap-0.5 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold normal-case">
                <span class="icon" style="font-size:11px">star</span> Contacto principal
              </span>
            </p>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Nombres</label>
                <input class="form-input" [ngClass]="claseCampo('apoderado-nombres')"
                       [(ngModel)]="form.apoderado.nombres"
                       (ngModelChange)="onCampoFormChange('apoderado-nombres')"
                       (blur)="onCampoBlur('apoderado-nombres')">
                @if (campoError('apoderado-nombres'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Apellidos</label>
                <input class="form-input" [ngClass]="claseCampo('apoderado-apellidos')"
                       [(ngModel)]="form.apoderado.apellidos"
                       (ngModelChange)="onCampoFormChange('apoderado-apellidos')"
                       (blur)="onCampoBlur('apoderado-apellidos')">
                @if (campoError('apoderado-apellidos'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">DNI</label>
                <input class="form-input" [ngClass]="claseCampo('apoderado-dni')"
                       [(ngModel)]="form.apoderado.dni"
                       (ngModelChange)="onCampoFormChange('apoderado-dni')"
                       (blur)="onCampoBlur('apoderado-dni')" maxlength="8" inputmode="numeric">
                @if (campoError('apoderado-dni'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Telefono</label>
                <input class="form-input" [ngClass]="claseCampo('apoderado-telefono')"
                       [(ngModel)]="form.apoderado.telefono"
                       (ngModelChange)="onCampoFormChange('apoderado-telefono')"
                       (blur)="onCampoBlur('apoderado-telefono')">
                @if (campoError('apoderado-telefono'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-input" type="email" [ngClass]="claseCampo('apoderado-email')"
                       [(ngModel)]="form.apoderado.email"
                       (ngModelChange)="onCampoFormChange('apoderado-email')"
                       (blur)="onCampoBlur('apoderado-email')">
                @if (campoError('apoderado-email'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group"><label class="form-label">Relacion con el alumno</label><input class="form-input" [(ngModel)]="form.apoderado.trabajo" placeholder="Ej: Tio, Abuelo..."></div>
            </div>
          </div>

          @if (form.id && puedeVerAuditoria() && historialReciente().length) {
            <div class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <p class="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Últimos cambios registrados</p>
              <ul class="space-y-2">
                @for (h of historialReciente(); track h.id) {
                  <li class="text-xs text-gray-600">
                    <span class="font-medium text-gray-800">{{ h.fechaDisplay }} {{ h.horaDisplay }}</span>
                    · {{ h.actorNombre }} · {{ h.motivo }}
                  </li>
                }
              </ul>
            </div>
          }

          @if (form.id) {
            <div class="form-group">
              <label class="form-label">Motivo de la actualización *</label>
              <textarea class="form-input min-h-[4rem]" rows="2"
                [(ngModel)]="auditMotivo"
                placeholder="Ej: Corrección de domicilio solicitada por apoderado"
                aria-describedby="audit-motivo-hint"></textarea>
              <p id="audit-motivo-hint" class="text-xs text-gray-400 mt-1">
                Obligatorio para trazabilidad. Quedará registrado en el historial de auditoría.
              </p>
              @if (intentoGuardar() && auditMotivo.trim().length < 3) {
                <p class="form-error mt-1">Indique un motivo de al menos 3 caracteres.</p>
              }
            </div>
          }

          @if (errorForm) {
            <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <span class="icon icon-sm text-red-500">error_outline</span> {{ errorForm }}
            </div>
          }
        </div>
        <div class="flex flex-wrap gap-2 px-6 py-4 border-t bg-gray-50 shrink-0">
          @if (form.id && puedeVerAuditoria()) {
            <a class="btn btn-secondary w-full sm:w-auto"
               [routerLink]="['/estudiantes/auditoria-cambios']"
               [queryParams]="{ studentId: form.id }">
              <span class="icon icon-sm">history_edu</span> Ver historial de cambios
            </a>
          }
          <button class="btn btn-primary flex-1 min-w-[10rem]"
                  [disabled]="!puedeGuardarForm() || guardandoForm()"
                  [title]="puedeGuardarForm() ? '' : 'Completa nombres, apellidos, DNI, fecha de nacimiento y grado'"
                  (click)="guardarForm()">
            <span class="icon">{{ form.id ? 'save' : 'person_add' }}</span>
            {{ guardandoForm() ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Registrar estudiante') }}
          </button>
          <button class="btn btn-secondary" (click)="cerrarDrawerForm()">Cancelar</button>
        </div>
      </div>
    }

    <!-- ══════════════════════ MODAL: REQUISITOS POR GRADO ══════════════════════ -->
    @if (modalRequisitos()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="modalRequisitos.set(false)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" (click)="$event.stopPropagation()">
          <!-- header -->
          <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <div>
              <h3 class="font-semibold text-gray-900">Documentos Requeridos por Grado</h3>
              <p class="text-xs text-gray-500">Define qué documentos se solicitan en cada grado</p>
            </div>
            <button class="btn-icon" (click)="modalRequisitos.set(false)"><span class="icon">close</span></button>
          </div>
          <!-- body: dos paneles -->
          <div class="flex flex-1 overflow-hidden">
            <!-- Panel izquierdo: lista de grados -->
            <div class="w-52 shrink-0 border-r overflow-y-auto py-2">
              @for (g of grados; track g) {
                <button class="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between"
                  [ngClass]="gradoReqActivo() === g ? 'bg-indigo-50 text-indigo-700 font-semibold border-r-2 border-indigo-500' : 'text-gray-700 hover:bg-gray-50'"
                  (click)="gradoReqActivo.set(g)">
                  <span>{{ g }}</span>
                  <span class="text-xs px-1.5 py-0.5 rounded-full"
                    [ngClass]="gradoReqActivo() === g ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'">
                    {{ docsDeGrado(g).length }}
                  </span>
                </button>
              }
            </div>
            <!-- Panel derecho: documentos del grado seleccionado -->
            <div class="flex-1 overflow-y-auto p-5 space-y-3">
              @if (gradoReqActivo()) {
                <div class="flex items-center justify-between mb-1">
                  <h4 class="font-semibold text-gray-800">{{ gradoReqActivo() }}</h4>
                  <span class="text-xs text-gray-500">{{ docsDeGrado(gradoReqActivo()).filter(d=>d.obligatorio).length }} obligatorios · {{ docsDeGrado(gradoReqActivo()).filter(d=>!d.obligatorio).length }} opcionales</span>
                </div>
                @for (dr of docsDeGrado(gradoReqActivo()); track dr.tipo; let idx = $index) {
                  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group">
                    <span class="icon text-gray-400">{{ docIcono(dr.tipo) }}</span>
                    <span class="flex-1 text-sm text-gray-800">{{ dr.tipo }}</span>
                    <!-- obligatorio toggle -->
                    <label class="flex items-center gap-1.5 cursor-pointer select-none">
                      <div class="relative w-9 h-5">
                        <input type="checkbox" class="sr-only peer" [checked]="dr.obligatorio"
                          (change)="toggleObligatorio(gradoReqActivo(), idx)">
                        <div class="w-9 h-5 rounded-full transition-colors peer-checked:bg-indigo-500 bg-gray-300"></div>
                        <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                      </div>
                      <span class="text-xs" [ngClass]="dr.obligatorio ? 'text-indigo-600 font-medium' : 'text-gray-400'">
                        {{ dr.obligatorio ? 'Obligatorio' : 'Opcional' }}
                      </span>
                    </label>
                    <button class="btn-icon text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      (click)="eliminarDocReq(gradoReqActivo(), idx)">
                      <span class="icon icon-sm">delete_outline</span>
                    </button>
                  </div>
                } @empty {
                  <div class="text-center text-gray-400 py-8 text-sm">Sin documentos configurados</div>
                }
                <!-- Agregar nuevo tipo de documento requerido -->
                <div class="flex gap-2 pt-2">
                  <input class="form-input flex-1" [(ngModel)]="nuevoDocReqTipo"
                    placeholder="Ej: Ficha Psicológica" (keyup.enter)="agregarDocReq()">
                  <label class="flex items-center gap-1.5 cursor-pointer select-none px-2">
                    <input type="checkbox" class="accent-indigo-600" [(ngModel)]="nuevoDocReqObligatorio">
                    <span class="text-xs text-gray-600">Oblig.</span>
                  </label>
                  <button class="btn btn-primary btn-sm" (click)="agregarDocReq()">
                    <span class="icon icon-sm">add</span> Agregar
                  </button>
                </div>
              } @else {
                <div class="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <span class="icon icon-2xl">arrow_back</span>
                  <p class="text-sm">Selecciona un grado</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ══════════════════════ VISOR DE DOCUMENTO ══════════════════════ -->
    @if (docVisor()) {
      <div class="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4" (click)="cerrarVisor()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" (click)="$event.stopPropagation()">
          <!-- header visor -->
          <div class="flex items-center justify-between px-5 py-3 border-b shrink-0">
            <div>
              <div class="font-semibold text-gray-900 text-sm">{{ docVisor()!.tipo }}</div>
              <div class="text-xs text-gray-500">{{ docVisor()!.numero ? 'N: ' + docVisor()!.numero : 'Sin numero' }}</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="badge text-xs" [ngClass]="docVisor()!.estado === 'entregado' ? 'badge-green' : docVisor()!.estado === 'vencido' ? 'badge-red' : 'badge-gray'">{{ docVisor()!.estado }}</span>
              <label class="btn btn-secondary btn-sm cursor-pointer" title="Reemplazar imagen">
                <span class="icon icon-sm">upload</span> Cambiar imagen
                <input type="file" accept="image/*" class="hidden" (change)="onArchivoVisor($event)">
              </label>
              <button class="btn-icon" (click)="cerrarVisor()"><span class="icon">close</span></button>
            </div>
          </div>
          <!-- cuerpo visor -->
          <div class="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
            <img [src]="docVisor()!.imagenUrl" alt="documento" class="max-w-full max-h-full rounded-lg shadow object-contain">
          </div>
        </div>
      </div>
    }

    <!-- ══════════════════════ DRAWER: EXPEDIENTE ══════════════════════ -->
    @if (drawerExp()) {
      <div class="fixed inset-0 bg-black/40 z-30 backdrop-blur-sm" (click)="cerrarExpediente()"></div>
      <div class="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-40 flex flex-col animate-slide-in-r">

        <!-- Header expediente -->
        <div class="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gradient-to-r from-slate-700 to-slate-600">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white/30"
              [ngClass]="expActivo()!.sexo === 'F' ? 'bg-pink-500' : 'bg-indigo-500'">
              {{ iniciales(expActivo()!.nombres, expActivo()!.apellidos) }}
            </div>
            <div>
              <div class="font-semibold text-white">{{ expActivo()!.apellidos }}, {{ expActivo()!.nombres }}</div>
              <div class="text-xs text-slate-300">{{ expActivo()!.codigo }} · {{ expActivo()!.grado }} {{ expActivo()!.seccion }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-sm bg-white/15 text-white border-white/20 hover:bg-white/25" (click)="abrirDrawerEditar(expActivo()!)">
              <span class="icon icon-sm">edit</span> Editar
            </button>
            <button class="btn-icon text-white hover:bg-white/20" (click)="cerrarExpediente()"><span class="icon">close</span></button>
          </div>
        </div>

        <!-- Tabs del expediente -->
        <div class="tabs px-6 pt-3 shrink-0 border-b border-gray-100">
          @for (tab of tabsExp; track tab.id) {
            <button class="tab" [class.active]="tabExp() === tab.id" (click)="tabExp.set(tab.id)">
              <span class="icon icon-sm">{{ tab.icon }}</span> {{ tab.label }}
            </button>
          }
        </div>

        <!-- Cuerpo expediente -->
        <div class="flex-1 overflow-y-auto px-6 py-5">

          <!-- TAB: Datos Personales -->
          @if (tabExp() === 'personal') {
            <div class="space-y-4 animate-fade-in">
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-gray-50 rounded-lg p-3">
                  <div class="text-xs text-gray-400 mb-0.5">DNI</div>
                  <div class="font-medium text-gray-800">{{ expActivo()!.dni }}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                  <div class="text-xs text-gray-400 mb-0.5">Fecha de Nacimiento</div>
                  <div class="font-medium text-gray-800">{{ formatFecha(expActivo()!.fechaNac) }}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                  <div class="text-xs text-gray-400 mb-0.5">Sexo</div>
                  <div class="font-medium text-gray-800">{{ expActivo()!.sexo === 'M' ? 'Masculino' : 'Femenino' }}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3">
                  <div class="text-xs text-gray-400 mb-0.5">Grupo Sanguineo</div>
                  <div class="font-medium text-gray-800">{{ expActivo()!.grupoSanguineo }}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3 col-span-2">
                  <div class="text-xs text-gray-400 mb-0.5">Direccion</div>
                  <div class="font-medium text-gray-800">{{ expActivo()!.direccion || '—' }}</div>
                </div>
              </div>

              <div class="border-t pt-4">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Salud</p>
                <div class="grid grid-cols-1 gap-3">
                  <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div class="text-xs text-amber-600 font-medium mb-0.5">Alergias</div>
                    <div class="text-sm text-gray-800">{{ expActivo()!.alergias || 'Ninguna' }}</div>
                  </div>
                  <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div class="text-xs text-blue-600 font-medium mb-0.5">Condiciones de Salud</div>
                    <div class="text-sm text-gray-800">{{ expActivo()!.condicionesSalud || 'Sin condiciones registradas' }}</div>
                  </div>
                  @if (expActivo()!.observaciones) {
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div class="text-xs text-yellow-600 font-medium mb-0.5">Observaciones importantes</div>
                      <div class="text-sm text-gray-800">{{ expActivo()!.observaciones }}</div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- TAB: Representantes -->
          @if (tabExp() === 'representantes') {
            <div class="space-y-4 animate-fade-in">
              @for (rep of representantes(expActivo()!); track rep.tipo) {
                <div class="card p-4 overflow-hidden"
                  [ngClass]="rep.esPrincipal
                    ? 'border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-white shadow-sm'
                    : ''">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      [ngClass]="rep.esPrincipal ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-indigo-500'">
                      <span class="icon icon-sm">{{ repIcon(rep) }}</span>
                    </span>
                    <div class="flex flex-wrap items-center gap-2 min-w-0">
                      <span class="font-semibold" [ngClass]="rep.esPrincipal ? 'text-indigo-900' : 'text-gray-800'">
                        {{ rep.esPrincipal ? 'Apoderado principal' : rep.tipo }}
                      </span>
                      @if (rep.esPrincipal) {
                        <span class="inline-flex items-center gap-0.5 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
                          <span class="icon" style="font-size:11px">star</span> Contacto principal
                        </span>
                      }
                      @if (!rep.datos.nombres) { <span class="badge badge-gray text-xs">No registrado</span> }
                    </div>
                  </div>
                  @if (rep.datos.nombres) {
                    <div class="grid grid-cols-2 gap-2 text-sm"
                      [ngClass]="rep.esPrincipal ? 'pl-11' : ''">
                      <div><span class="text-gray-400 text-xs">Nombre</span><div class="font-medium">{{ rep.datos.nombres }} {{ rep.datos.apellidos }}</div></div>
                      <div><span class="text-gray-400 text-xs">DNI</span><div class="font-medium">{{ rep.datos.dni }}</div></div>
                      <div><span class="text-gray-400 text-xs">Telefono</span><div class="font-medium">{{ rep.datos.telefono }}</div></div>
                      <div><span class="text-gray-400 text-xs">Email</span><div class="font-medium text-xs">{{ rep.datos.email || '—' }}</div></div>
                      <div class="col-span-2"><span class="text-gray-400 text-xs">Trabajo / Ocupacion</span><div class="font-medium">{{ rep.datos.trabajo || '—' }}</div></div>
                    </div>
                  } @else {
                    <p class="text-sm text-gray-400 italic" [ngClass]="rep.esPrincipal ? 'pl-11' : ''">Sin datos registrados</p>
                  }
                </div>
              }
            </div>
          }

          <!-- TAB: Historial -->
          @if (tabExp() === 'historial') {
            <div class="space-y-4 animate-fade-in">
              <!-- KPIs -->
              <div class="grid grid-cols-3 gap-3">
                <div class="card p-4 text-center">
                  <div class="text-2xl font-bold text-indigo-600">{{ expActivo()!.asistenciaPct }}%</div>
                  <div class="text-xs text-gray-500 mt-1">Asistencia</div>
                </div>
                <div class="card p-4 text-center">
                  <div class="text-2xl font-bold"
                    [ngClass]="expActivo()!.conductaNota === 'AD' ? 'text-green-600' : expActivo()!.conductaNota === 'A' ? 'text-blue-600' : expActivo()!.conductaNota === 'B' ? 'text-yellow-600' : 'text-red-600'">
                    {{ expActivo()!.conductaNota }}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">Conducta</div>
                </div>
                <div class="card p-4 text-center">
                  <div class="text-2xl font-bold text-gray-700">{{ expActivo()!.historialAcademico.length }}</div>
                  <div class="text-xs text-gray-500 mt-1">Anos registrados</div>
                </div>
              </div>
              <!-- Historial anual -->
              <div>
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Historial Academico</p>
                @if (expActivo()!.historialAcademico.length === 0) {
                  <div class="text-sm text-gray-400 text-center py-6">Sin historial registrado</div>
                } @else {
                  <div class="overflow-hidden rounded-lg border border-gray-200">
                    <table class="w-full text-sm">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Ano</th>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Grado</th>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Seccion</th>
                          <th class="text-right px-4 py-2 text-xs font-semibold text-gray-500">Promedio</th>
                          <th class="text-left px-4 py-2 text-xs font-semibold text-gray-500">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (h of expActivo()!.historialAcademico; track h.anio) {
                          <tr class="border-t border-gray-100">
                            <td class="px-4 py-2 font-medium">{{ h.anio }}</td>
                            <td class="px-4 py-2 text-gray-600">{{ h.grado }}</td>
                            <td class="px-4 py-2 text-gray-600">{{ h.seccion }}</td>
                            <td class="px-4 py-2 text-right font-bold"
                              [ngClass]="h.promedio >= 14 ? 'text-green-600' : h.promedio >= 11 ? 'text-yellow-600' : 'text-red-600'">
                              {{ h.promedio }}
                            </td>
                            <td class="px-4 py-2">
                              <span class="badge badge-green text-xs">{{ h.estado }}</span>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </div>
          }

          <!-- TAB: Documentos -->
          @if (tabExp() === 'documentos') {
            <div class="space-y-3 animate-fade-in">
              <!-- Cabecera -->
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Documentos del Expediente</p>
                  <span class="text-xs text-gray-500">{{ entregados() }} / {{ expActivo()!.documentos.length }} entregados</span>
                </div>
                <div class="flex gap-2">
                  <button class="btn btn-secondary btn-sm" (click)="abrirModalRequisitos()">
                    <span class="icon icon-sm">rule</span> Requisitos por grado
                  </button>
                  <button class="btn btn-primary btn-sm" (click)="abrirNuevoDoc()">
                    <span class="icon icon-sm">upload_file</span> Agregar
                  </button>
                </div>
              </div>

              <!-- Panel: Requisitos del grado del alumno -->
              @if (reqDelGrado().length > 0) {
                <div class="card overflow-hidden">
                  <button class="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    (click)="panelReqAbierto.update(v => !v)">
                    <div class="flex items-center gap-2">
                      <span class="icon icon-sm text-indigo-500">checklist</span>
                      <span class="text-sm font-semibold text-indigo-700">Requisitos para {{ expActivo()!.grado }}</span>
                      <span class="badge badge-indigo text-xs">{{ reqCumplidos() }}/{{ reqDelGrado().length }}</span>
                    </div>
                    <span class="icon icon-sm text-indigo-400">{{ panelReqAbierto() ? 'expand_less' : 'expand_more' }}</span>
                  </button>
                  @if (panelReqAbierto()) {
                    <div class="divide-y divide-gray-100">
                      @for (dr of reqDelGrado(); track dr.tipo) {
                        @let docAlumno = docDeAlumno(dr.tipo);
                        <div class="flex items-center gap-3 px-4 py-2.5">
                          <span class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs"
                            [ngClass]="docAlumno ? (docAlumno.estado === 'entregado' ? 'bg-green-100 text-green-600' : docAlumno.estado === 'vencido' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-600') : 'bg-gray-100 text-gray-400'">
                            <span class="icon" style="font-size:14px">{{ docAlumno ? (docAlumno.estado === 'entregado' ? 'check' : docAlumno.estado === 'vencido' ? 'block' : 'schedule') : 'close' }}</span>
                          </span>
                          <span class="flex-1 text-sm text-gray-700">{{ dr.tipo }}</span>
                          @if (dr.obligatorio) {
                            <span class="text-[10px] text-red-500 font-medium">Obligatorio</span>
                          } @else {
                            <span class="text-[10px] text-gray-400">Opcional</span>
                          }
                          @if (docAlumno) {
                            <span class="badge text-xs"
                              [ngClass]="docAlumno.estado === 'entregado' ? 'badge-green' : docAlumno.estado === 'vencido' ? 'badge-red' : 'badge-yellow'">
                              {{ docAlumno.estado }}
                            </span>
                          } @else {
                            <button class="text-xs text-indigo-500 hover:text-indigo-700 underline" (click)="agregarDocDesdeReq(dr.tipo)">
                              Agregar
                            </button>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Formulario nuevo documento (inline) -->
              @if (docNuevoAbierto()) {
                <div class="card p-4 border-2 border-indigo-300 bg-indigo-50 space-y-3 animate-fade-in">
                  <p class="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Nuevo Documento</p>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="form-group col-span-2">
                      <label class="form-label">Tipo de documento *</label>
                      <input class="form-input" [(ngModel)]="docNuevo.tipo" placeholder="Ej: Ficha de Salud">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Numero / Codigo</label>
                      <input class="form-input" [(ngModel)]="docNuevo.numero" placeholder="Opcional">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Estado</label>
                      <select class="form-select" [(ngModel)]="docNuevo.estado">
                        <option value="pendiente">Pendiente</option>
                        <option value="entregado">Entregado</option>
                        <option value="vencido">Vencido</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Fecha entrega</label>
                      <input class="form-input" [(ngModel)]="docNuevo.fechaEntrega" placeholder="DD/MM/YYYY">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Imagen / Archivo</label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <span class="btn btn-secondary btn-sm">
                          <span class="icon icon-sm">attach_file</span>
                          {{ docNuevo.imagenUrl ? 'Cambiar' : 'Seleccionar' }}
                        </span>
                        <span class="text-xs text-gray-400 truncate">{{ docNuevo.imagenUrl ? 'Archivo cargado' : 'Sin archivo' }}</span>
                        <input #fileNuevo type="file" accept="image/*,application/pdf" class="hidden" (change)="onArchivoNuevoDoc($event)">
                      </label>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button class="btn btn-primary btn-sm" (click)="agregarDocumento()"><span class="icon icon-sm">save</span> Guardar</button>
                    <button class="btn btn-secondary btn-sm" (click)="docNuevoAbierto.set(false)">Cancelar</button>
                  </div>
                </div>
              }

              <!-- Lista de documentos -->
              @for (doc of expActivo()!.documentos; track doc.tipo) {
                @if (doc.imagenUrl) {
                  <!-- CON imagen: clic abre visor -->
                  <div class="card p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow group"
                    (click)="verDoc(doc)">
                    <div class="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-gray-200 relative">
                      <img [src]="doc.imagenUrl" alt="doc" class="w-full h-full object-cover">
                      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span class="icon text-white opacity-0 group-hover:opacity-100 transition-opacity">zoom_in</span>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-800 text-sm">{{ doc.tipo }}</div>
                      <div class="text-xs text-gray-500">{{ doc.numero ? 'N: ' + doc.numero : 'Sin numero' }}{{ doc.fechaEntrega ? ' · ' + doc.fechaEntrega : '' }}</div>
                      <div class="text-xs text-indigo-400 mt-0.5">Clic para ver o cambiar</div>
                    </div>
                    <span class="badge text-xs shrink-0"
                      [ngClass]="doc.estado === 'entregado' ? 'badge-green' : doc.estado === 'vencido' ? 'badge-red' : 'badge-gray'">
                      {{ doc.estado }}
                    </span>
                  </div>
                } @else {
                  <!-- SIN imagen: clic abre selector de archivo directamente -->
                  <label class="card p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-indigo-300 border-2 border-dashed border-gray-200 transition-all group">
                    <input type="file" accept="image/*" class="hidden" (change)="onArchivoDoc($event, doc)">
                    <div class="w-14 h-14 rounded-lg shrink-0 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center"
                      [ngClass]="doc.estado === 'entregado' ? 'bg-green-50 text-green-400' : doc.estado === 'vencido' ? 'bg-red-50 text-red-300' : 'bg-gray-50 text-gray-300 group-hover:text-indigo-400 group-hover:border-indigo-300'">
                      <span class="icon">{{ docIcono(doc.tipo) }}</span>
                      <span class="text-[9px] mt-0.5 group-hover:text-indigo-500 transition-colors">cargar</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-800 text-sm">{{ doc.tipo }}</div>
                      <div class="text-xs text-gray-500">{{ doc.numero ? 'N: ' + doc.numero : 'Sin numero' }}{{ doc.fechaEntrega ? ' · ' + doc.fechaEntrega : '' }}</div>
                      <div class="text-xs text-gray-400 mt-0.5 group-hover:text-indigo-400 transition-colors">Sin imagen · clic para cargar</div>
                    </div>
                    <span class="badge text-xs shrink-0"
                      [ngClass]="doc.estado === 'entregado' ? 'badge-green' : doc.estado === 'vencido' ? 'badge-red' : 'badge-gray'">
                      {{ doc.estado }}
                    </span>
                  </label>
                }
              }

              <!-- Progreso -->
              <div class="card p-4">
                <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Completitud del expediente</span>
                  <span class="font-semibold">{{ pctDocs() }}%</span>
                </div>
                <div class="progress">
                  <div class="progress-bar bg-indigo-500 transition-all" [style.width]="pctDocs() + '%'"></div>
                </div>
              </div>
            </div>
          }

        </div>
      </div>
    }
  `
})
export class EstudiantesListComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  readonly tenant = inject(TenantContextService);
  private readonly expedientesSvc = inject(ExpedientesService);
  private readonly auditoriaSvc = inject(EstudianteAuditoriaService);
  private readonly _tenantReloadReady = setupTenantReload(
    () => this.recargarPagina(),
    {
      onBeforeReload: () => {
        this.limpiarUiInstitucion();
        this.expedientesSvc.reset();
      },
    },
  );
  readonly Math = Math;
  readonly POR_PAGINA = 10;
  readonly loading = this.expedientesSvc.loading;
  readonly loadError = this.expedientesSvc.error;
  readonly exportando = signal(false);

  drawerForm     = signal(false);
  drawerExp      = signal(false);
  tabExp         = signal('personal');
  paginaActual   = signal(1);
  errorForm      = '';
  fieldErrors = signal<ErroresCampoEstudiante>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);
  guardandoForm = signal(false);
  docVisor        = signal<Documento | null>(null);
  docNuevoAbierto = signal(false);
  docNuevo: Documento = { tipo:'', numero:'', estado:'pendiente', fechaEntrega:'', imagenUrl:'' };

  // ── Catálogo requisitos ──
  modalRequisitos  = signal(false);
  gradoReqActivo   = signal('');
  panelReqAbierto  = signal(true);
  nuevoDocReqTipo  = '';
  nuevoDocReqObligatorio = true;
  private readonly _catalogo = signal<Record<string, DocumentoRequerido[]>>(
    JSON.parse(JSON.stringify(DOCUMENTOS_REQUISITOS))
  );

  tabsExp = [
    { id:'personal',        label:'Personal',      icon:'person'         },
    { id:'representantes',  label:'Representantes',icon:'family_restroom' },
    { id:'historial',       label:'Historial',     icon:'timeline'       },
    { id:'documentos',      label:'Documentos',    icon:'folder'         },
  ];

  readonly filtroQ = signal('');
  readonly filtroGrado = signal('');
  readonly filtroEstado = signal('');
  readonly filtroDocumento = signal('');

  grados = ['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria',
            '1° Secundaria','2° Secundaria','3° Secundaria','4° Secundaria','5° Secundaria'];
  gruposSanguineos = ['O+','O-','A+','A-','B+','B-','AB+','AB-'];
  anios = ['2024','2025','2026','2023','2022','2021','2020','2019','2018','2017'];

  private readonly _expActivo   = signal<Estudiante | null>(null);
  readonly expActivo = this._expActivo.asReadonly();

  form: Estudiante = estudianteVacio(0);
  auditMotivo = '';
  registroSinDocumento = false;
  sinDocumentoMotivo = '';
  sinDocumentoSustento = '';
  confirmarDuplicado = false;
  regularizarDni = '';
  regularizarMotivo = '';
  readonly coincidenciasDuplicado = signal<Array<{ id: number; codigo: string; coincidencias: string[] }>>([]);
  readonly historialReciente = signal<EstudianteChangeLog[]>([]);
  /** En zoneless, mutar `form` no dispara CD; este tick recalcula puedeGuardarForm. */
  private readonly formRevision = signal(0);
  readonly puedeGuardarForm = computed(() => {
    this.formRevision();
    return estudianteFormularioMinimoListo(this.form, this.registroSinDocumento);
  });

  // ── Computed ──
  readonly totalFiltrados = computed(() => this.expedientesSvc.total());
  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalFiltrados() / this.POR_PAGINA)),
  );
  readonly inicio = computed(() => (this.paginaActual() - 1) * this.POR_PAGINA);
  readonly fin = computed(() =>
    Math.min(this.inicio() + this.POR_PAGINA, this.totalFiltrados()),
  );
  readonly paginados = computed(() => this.expedientesSvc.estudiantes());
  readonly paginas        = computed(() => {
    const total = this.totalPaginas(); const actual = this.paginaActual();
    const ini = Math.max(1, actual - 2); const fin = Math.min(total, actual + 2);
    return Array.from({ length: fin - ini + 1 }, (_, i) => ini + i);
  });
  readonly totalEstudiantes = computed(
    () => this.expedientesSvc.stats()?.total ?? this.expedientesSvc.estudiantes().length,
  );
  readonly estudiantesActivos = computed(
    () => this.expedientesSvc.stats()?.activos ?? this.expedientesSvc.estudiantes().filter(e => e.estado === 'activo').length,
  );
  readonly estudiantesMujeres = computed(
    () => this.expedientesSvc.stats()?.mujeres ?? this.expedientesSvc.estudiantes().filter(e => e.sexo === 'F').length,
  );
  readonly estudiantesVarones = computed(
    () => this.expedientesSvc.stats()?.varones ?? this.expedientesSvc.estudiantes().filter(e => e.sexo === 'M').length,
  );
  readonly pendientesRegularizacion = computed(
    () => this.expedientesSvc.estudiantes().filter(e => e.estadoDocumento === 'pendiente_regularizacion').length,
  );

  ngOnInit(): void {
    this.layout.setTitle('Gestion de Estudiantes');
    if (this.tenant.requiresSelection()) {
      this.limpiarUiInstitucion();
      this.expedientesSvc.reset();
    } else {
      this.recargarPagina();
    }
    markTenantReloadReady(this._tenantReloadReady);
  }

  private limpiarUiInstitucion(): void {
    this.drawerForm.set(false);
    this.drawerExp.set(false);
    this._expActivo.set(null);
    this.paginaActual.set(1);
    this.filtroQ.set('');
    this.filtroGrado.set('');
    this.filtroEstado.set('');
    this.filtroDocumento.set('');
  }

  recargarPagina(): void {
    if (this.tenant.requiresSelection()) {
      this.expedientesSvc.reset();
      return;
    }
    this.expedientesSvc.load({
      page: this.paginaActual(),
      pageSize: this.POR_PAGINA,
      q: this.filtroQ(),
      grado: this.filtroGrado(),
      estado: this.filtroEstado(),
      estadoDocumento: this.filtroDocumento(),
      immediate: true,
    });
  }

  onFiltroChange(): void {
    this.paginaActual.set(1);
    this.recargarPagina();
  }

  irPagina(p: number): void {
    this.paginaActual.set(p);
    this.recargarPagina();
  }

  puedeVerAuditoria(): boolean {
    return this.auth.hasAnyPermiso('estudiantes.expediente', 'admin.reportes');
  }

  puedeGestionarVinculos(): boolean {
    return this.auth.hasAnyPermiso(
      'estudiantes.representantes',
      'estudiantes.expediente',
      'estudiantes.editar',
    );
  }

  exportarCsv(): void {
    this.exportando.set(true);
    this.expedientesSvc.exportCsv({
      q: this.filtroQ(),
      grado: this.filtroGrado(),
      estado: this.filtroEstado(),
      estadoDocumento: this.filtroDocumento(),
    }).subscribe({
      next: (blob) => {
        const stamp = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `padron-estudiantes-${stamp}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exportando.set(false);
      },
      error: () => {
        this.exportando.set(false);
        alert('No se pudo exportar el padrón. Verifique permisos y conexión con el servidor.');
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroQ.set('');
    this.filtroGrado.set('');
    this.filtroEstado.set('');
    this.filtroDocumento.set('');
    this.paginaActual.set(1);
    this.recargarPagina();
  }

  verPendientesRegularizacion(): void {
    this.filtroDocumento.set('pendiente_regularizacion');
    this.paginaActual.set(1);
    this.recargarPagina();
  }

  toggleFiltroPendientesRegularizacion(): void {
    this.filtroDocumento.set(
      this.filtroDocumento() === 'pendiente_regularizacion' ? '' : 'pendiente_regularizacion',
    );
    this.paginaActual.set(1);
    this.recargarPagina();
  }

  iniciales(n: string, a: string) { return ((n?.[0] ?? '') + (a?.[0] ?? '')).toUpperCase(); }
  formatFecha(f: string) {
    if (!f) return '—';
    const [y, m, d] = f.split('-');
    return `${d}/${m}/${y}`;
  }
  representantes(e: Estudiante) {
    return [
      { tipo: 'Apoderado', datos: e.apoderado, esPrincipal: true },
      { tipo: 'Padre', datos: e.padre, esPrincipal: false },
      { tipo: 'Madre', datos: e.madre, esPrincipal: false },
    ];
  }

  repIcon(rep: { tipo: string; esPrincipal: boolean }): string {
    if (rep.esPrincipal) return 'verified_user';
    if (rep.tipo === 'Padre') return 'man';
    if (rep.tipo === 'Madre') return 'woman';
    return 'supervisor_account';
  }

  abrirDrawerNuevo(): void {
    this.form = estudianteVacio(0);
    this.auditMotivo = '';
    this.registroSinDocumento = false;
    this.sinDocumentoMotivo = '';
    this.sinDocumentoSustento = '';
    this.confirmarDuplicado = false;
    this.coincidenciasDuplicado.set([]);
    this.regularizarDni = '';
    this.regularizarMotivo = '';
    this.historialReciente.set([]);
    this.errorForm = '';
    this.resetValidacionForm();
    this.formRevision.update((n) => n + 1);
    this.drawerForm.set(true);
  }

  abrirDrawerEditar(e: Estudiante): void {
    this.form = JSON.parse(JSON.stringify(e)); // deep copy
    this.auditMotivo = '';
    this.registroSinDocumento = false;
    this.regularizarDni = '';
    this.regularizarMotivo = '';
    this.coincidenciasDuplicado.set([]);
    this.historialReciente.set([]);
    this.errorForm = '';
    this.resetValidacionForm();
    this.formRevision.update((n) => n + 1);
    this.drawerForm.set(true);
    this.drawerExp.set(false);
    if (this.puedeVerAuditoria()) {
      this.auditoriaSvc.loadByStudent(e.id, 1, 5).subscribe({
        next: (res) => this.historialReciente.set(res.items),
        error: () => this.historialReciente.set([]),
      });
    }
  }

  cerrarDrawerForm(): void {
    this.drawerForm.set(false);
    this.resetValidacionForm();
    this.guardandoForm.set(false);
  }

  onToggleSinDocumento(): void {
    this.coincidenciasDuplicado.set([]);
    this.confirmarDuplicado = false;
    if (this.registroSinDocumento && this.form.nombres.trim() && this.form.apellidos.trim()) {
      this.buscarCoincidenciasSinDocumento();
    }
  }

  buscarCoincidenciasSinDocumento(): void {
    if (!this.registroSinDocumento || this.form.id) return;
    this.expedientesSvc.checkSinDocumentoDuplicates(this.form).subscribe({
      next: (items) => this.coincidenciasDuplicado.set(items),
      error: () => this.coincidenciasDuplicado.set([]),
    });
  }

  regularizarDocumento(): void {
    if (!this.form.id) return;
    if (this.regularizarDni.trim().length < 4) {
      this.errorForm = 'Ingrese un número de documento válido.';
      return;
    }
    if (this.regularizarMotivo.trim().length < 3) {
      this.errorForm = 'Indique el motivo de la regularización.';
      return;
    }
    this.guardandoForm.set(true);
    this.errorForm = '';
    this.expedientesSvc
      .regularizarDocumento(this.form.id, this.regularizarDni.trim(), this.regularizarMotivo.trim())
      .subscribe({
        next: (updated) => {
          this.form = { ...updated };
          this.regularizarDni = '';
          this.regularizarMotivo = '';
          this.guardandoForm.set(false);
        },
        error: (err: { error?: { message?: string }; status?: number }) => {
          this.errorForm =
            err?.status === 403
              ? 'No tiene permiso para regularizar el documento.'
              : err?.error?.message ?? 'No se pudo regularizar el documento.';
          this.guardandoForm.set(false);
        },
      });
  }

  private resetValidacionForm(): void {
    this.fieldErrors.set({});
    this.camposTocados.set({});
    this.intentoGuardar.set(false);
  }

  guardarForm(): void {
    this.intentoGuardar.set(true);
    if (!this.puedeGuardarForm()) {
      this.validarCamposMinimosEnVivo();
      this.errorForm = 'Completa los campos obligatorios del estudiante.';
      return;
    }

    const errors = validarEstudianteForm(this.form);
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm = primerErrorEstudiante(errors) ?? 'Revisa los datos del formulario.';
      return;
    }

    const isNew = !this.form.id;
    if (!isNew && this.auditMotivo.trim().length < 3) {
      this.errorForm = 'Indique el motivo de la actualización (mínimo 3 caracteres).';
      return;
    }

    if (isNew && this.registroSinDocumento) {
      if (this.sinDocumentoMotivo.trim().length < 3 || this.sinDocumentoSustento.trim().length < 3) {
        this.errorForm = 'Indique motivo y sustento del registro sin documento (mín. 3 caracteres).';
        return;
      }
      if (this.coincidenciasDuplicado().length && !this.confirmarDuplicado) {
        this.errorForm = 'Confirme que no se trata de un estudiante duplicado.';
        return;
      }
    }

    this.errorForm = '';

    if (!this.registroSinDocumento && !this.form.email) {
      this.form.email = `${this.form.dni.trim()}@estudiante.pe`;
    }

    this.guardandoForm.set(true);
    const req = isNew
      ? (this.registroSinDocumento
        ? this.expedientesSvc.createSinDocumento(
            this.form,
            this.sinDocumentoMotivo.trim(),
            this.sinDocumentoSustento.trim(),
            this.confirmarDuplicado,
          )
        : this.expedientesSvc.create(this.form))
      : this.expedientesSvc.update(this.form, this.auditMotivo.trim());

    req.subscribe({
      next: () => {
        this.drawerForm.set(false);
        this.errorForm = '';
        this.resetValidacionForm();
        this.guardandoForm.set(false);
      },
      error: (err: { error?: { message?: string | string[]; coincidencias?: unknown[] }; status?: number }) => {
        const raw = err?.error?.message;
        const msg = Array.isArray(raw) ? raw[0] : raw;
        if (err?.status === 409 && err?.error?.coincidencias) {
          this.coincidenciasDuplicado.set(
            err.error.coincidencias as Array<{ id: number; codigo: string; coincidencias: string[] }>,
          );
          this.errorForm = typeof msg === 'string' ? msg : 'Se detectaron posibles coincidencias.';
        } else if (err?.status === 400 && msg) {
          this.errorForm = msg;
        } else if (err?.status === 403) {
          this.errorForm = 'No tiene permiso para editar datos del estudiante.';
        } else {
          this.errorForm = msg ?? 'No se pudo guardar el expediente.';
        }
        this.guardandoForm.set(false);
      },
    });
  }

  onCampoBlur(key: string): void {
    this.camposTocados.update((t) => ({ ...t, [key]: true }));
    this.validarCampoEnVivo(key);
  }

  onCampoFormChange(key: string): void {
    this.normalizarCampoDocumento(key);
    this.formRevision.update((n) => n + 1);

    if (this.camposTocados()[key] || this.intentoGuardar() || this.fieldErrors()[key]) {
      this.validarCampoEnVivo(key);
    } else {
      this.quitarErrorCampo(key);
    }
  }

  private normalizarCampoDocumento(key: string): void {
    if (key === 'dni') {
      this.form.dni = this.form.dni.replace(/\D/g, '').slice(0, 8);
      return;
    }

    const repKey = key.match(/^(padre|madre|apoderado)-dni$/);
    if (repKey) {
      const prefix = repKey[1] as 'padre' | 'madre' | 'apoderado';
      this.form[prefix].dni = this.form[prefix].dni.replace(/\D/g, '').slice(0, 8);
    }
  }

  private validarCamposMinimosEnVivo(): void {
    for (const key of ['nombres', 'apellidos', 'dni', 'fechaNac', 'grado']) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoEstudiante(this.form, key);
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
    if (!Object.keys(this.fieldErrors()).length) this.errorForm = '';
  }

  campoError(key: string): string | null {
    if (!this.camposTocados()[key] && !this.intentoGuardar()) return null;
    return this.fieldErrors()[key] ?? null;
  }

  campoInvalido(key: string): boolean {
    return !!this.campoError(key);
  }

  claseCampo(key: string): string {
    return this.campoInvalido(key) ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : '';
  }

  eliminar(id: number): void {
    this.expedientesSvc.remove(id).subscribe({
      error: () => { this.errorForm = 'No se pudo eliminar el estudiante.'; },
    });
  }

  // ── Computed docs ──
  readonly entregados = computed(() => this.expActivo()?.documentos.filter(d => d.estado === 'entregado').length ?? 0);
  readonly pctDocs    = computed(() => {
    const docs = this.expActivo()?.documentos;
    if (!docs?.length) return 0;
    return Math.round(docs.filter(d => d.estado === 'entregado').length / docs.length * 100);
  });
  readonly reqDelGrado = computed(() => this._catalogo()[this.expActivo()?.grado ?? ''] ?? []);
  readonly reqCumplidos = computed(() => {
    const docs = this.expActivo()?.documentos ?? [];
    return this.reqDelGrado().filter(r => docs.some(d => d.tipo === r.tipo && d.estado === 'entregado')).length;
  });

  docIcono(tipo: string): string {
    if (tipo.includes('DNI'))          return 'badge';
    if (tipo.includes('Partida'))      return 'article';
    if (tipo.includes('Contrato'))     return 'handshake';
    if (tipo.includes('Cert'))         return 'workspace_premium';
    if (tipo.includes('Libreta') || tipo.includes('Notas')) return 'menu_book';
    if (tipo.includes('Salud') || tipo.includes('Vacuna'))  return 'health_and_safety';
    if (tipo.includes('Matrícula') || tipo.includes('FUT')) return 'how_to_reg';
    if (tipo.includes('Foto'))         return 'photo_camera';
    if (tipo.includes('Famil') || tipo.includes('Datos'))   return 'family_restroom';
    return 'description';
  }

  docDeAlumno(tipo: string): Documento | undefined {
    return this.expActivo()?.documentos.find(d => d.tipo === tipo);
  }

  // ── Catálogo requisitos ──
  docsDeGrado(grado: string): DocumentoRequerido[] { return this._catalogo()[grado] ?? []; }

  abrirModalRequisitos(): void {
    this.gradoReqActivo.set(this.expActivo()?.grado ?? this.grados[0]);
    this.modalRequisitos.set(true);
  }

  toggleObligatorio(grado: string, idx: number): void {
    this._catalogo.update(cat => {
      const lista = [...(cat[grado] ?? [])];
      lista[idx] = { ...lista[idx], obligatorio: !lista[idx].obligatorio };
      return { ...cat, [grado]: lista };
    });
  }

  eliminarDocReq(grado: string, idx: number): void {
    this._catalogo.update(cat => {
      const lista = [...(cat[grado] ?? [])];
      lista.splice(idx, 1);
      return { ...cat, [grado]: lista };
    });
  }

  agregarDocReq(): void {
    const tipo = this.nuevoDocReqTipo.trim();
    if (!tipo || !this.gradoReqActivo()) return;
    const grado = this.gradoReqActivo();
    this._catalogo.update(cat => ({
      ...cat,
      [grado]: [...(cat[grado] ?? []), { tipo, obligatorio: this.nuevoDocReqObligatorio }],
    }));
    this.nuevoDocReqTipo = '';
    this.nuevoDocReqObligatorio = true;
  }

  agregarDocDesdeReq(tipo: string): void {
    const exp = this.expActivo();
    if (!exp) return;
    this.expedientesSvc.addDocument(exp.id, { tipo, estado: 'pendiente' }).subscribe({
      next: () => this._syncExpActivo(exp.id),
    });
  }

  verDoc(doc: Documento): void { this.docVisor.set(doc); }
  cerrarVisor(): void { this.docVisor.set(null); }

  private _leerArchivo(file: File, cb: (url: string) => void): void {
    const reader = new FileReader();
    reader.onload = e => cb(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  onArchivoDoc(event: Event, doc: Documento): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this._leerArchivo(file, url => {
      doc.imagenUrl = url;
      this._actualizarDoc(doc);
    });
  }

  onArchivoVisor(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.docVisor()) return;
    this._leerArchivo(file, url => {
      const doc = this.docVisor()!;
      doc.imagenUrl = url;
      this.docVisor.set({ ...doc });
      this._actualizarDoc(doc);
    });
  }

  private _actualizarDoc(doc: Documento): void {
    const exp = this.expActivo();
    if (!exp) return;
    const payload = {
      tipo: doc.tipo,
      numero: doc.numero,
      estado: doc.estado,
      fechaEntrega: doc.fechaEntrega,
      imagenUrl: doc.imagenUrl,
    };
    const req = doc.id
      ? this.expedientesSvc.updateDocument(exp.id, doc.id, payload)
      : this.expedientesSvc.addDocument(exp.id, payload);
    req.subscribe({ next: () => this._syncExpActivo(exp.id) });
  }

  abrirNuevoDoc(): void {
    this.docNuevo = { tipo:'', numero:'', estado:'pendiente', fechaEntrega:'', imagenUrl:'' };
    this.docNuevoAbierto.set(true);
  }

  onArchivoNuevoDoc(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this._leerArchivo(file, url => { this.docNuevo = { ...this.docNuevo, imagenUrl: url }; });
  }

  agregarDocumento(): void {
    if (!this.docNuevo.tipo.trim()) return;
    const exp = this.expActivo();
    if (!exp) return;
    this.expedientesSvc.addDocument(exp.id, {
      tipo: this.docNuevo.tipo,
      numero: this.docNuevo.numero,
      estado: this.docNuevo.estado,
      fechaEntrega: this.docNuevo.fechaEntrega,
      imagenUrl: this.docNuevo.imagenUrl,
    }).subscribe({
      next: () => {
        this.docNuevoAbierto.set(false);
        this._syncExpActivo(exp.id);
      },
    });
  }

  abrirExpediente(e: Estudiante): void {
    this.expedientesSvc.loadFull(e.id).subscribe({
      next: (fresh) => {
        this._expActivo.set({ ...fresh });
        this.tabExp.set('personal');
        this.drawerExp.set(true);
      },
    });
  }

  private _syncExpActivo(id: number, openDrawer = false): void {
    const fresh = this.expedientesSvc.estudiantes().find((s) => s.id === id);
    if (!fresh) return;
    this._expActivo.set({ ...fresh });
    if (openDrawer) {
      this.tabExp.set('personal');
      this.drawerExp.set(true);
    }
  }
  cerrarExpediente(): void { this.drawerExp.set(false); }
}
