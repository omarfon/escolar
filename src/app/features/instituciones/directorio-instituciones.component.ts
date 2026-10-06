import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/services/auth.service';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { LayoutService } from '../../core/layout/services/layout.service';
import {
  AltaInstitucion,
  AlumnoInstitucion,
  DirectorioInstitucionesService,
  FichaInstitucion,
  InstitucionDirectorio,
  PersonaInstitucion,
  SolicitudInstitucion,
  UsuarioAdministrativo,
} from './directorio-instituciones.service';

@Component({
  selector: 'app-directorio-instituciones',
  standalone: true,
  imports: [FormsModule, NgClass, DatePipe],
  template: `
<div class="min-h-screen bg-[#f4f6fb] animate-fade-in">
  <div class="bg-white border-b border-[#e8eaf0] px-6 py-4 sticky top-0 z-20">
    <div>
      <div class="flex items-center gap-1.5 text-xs text-[#94a3b8] mb-1">
        <span>Instituciones</span><span>›</span>
        <span class="text-indigo-700 font-medium">{{ altaAbierta() ? 'Alta' : 'Directorio' }}</span>
      </div>
      <h1 class="text-xl font-bold text-[#1a202c]">
        @if (altaAbierta()) { Dar de alta una institución }
        @else if (seleccionada()) { {{ seleccionada()!.nombre }} }
        @else { Directorio de instituciones }
      </h1>
      <p class="text-sm text-[#64748b] mt-0.5">
        @if (altaAbierta()) {
          Complete la ficha de la institución educativa. El código modular identifica a la IE y no puede repetirse.
        } @else if (seleccionada()) {
          Use las pestañas del panel derecho para ver resumen, personal, alumnos o traslados de la sede.
        } @else {
          Seleccione una institución para ver su información. Solo el usuario SIAGIE administra el directorio nacional.
        }
      </p>
    </div>
  </div>

  <div class="p-6 max-w-7xl mx-auto space-y-4">
    @if (errorMsg()) {
      <div class="p-4 bg-[#fee2e2] border border-red-200 rounded-2xl text-sm text-[#b91c1c]" role="alert">{{ errorMsg() }}</div>
    }
    @if (avisoAlta()) {
      <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-sm text-indigo-800">{{ avisoAlta() }}</div>
    }

    @if (altaAbierta()) {
      <form class="space-y-4" (ngSubmit)="darDeAlta()">
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button type="button" class="btn btn-secondary" (click)="cerrarAlta()">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="guardandoAlta()">
            {{ guardandoAlta() ? 'Guardando...' : 'Registrar institución' }}
          </button>
        </div>
        @if (altaError()) {
          <div class="p-4 bg-[#fee2e2] border border-red-200 rounded-2xl text-sm text-[#b91c1c]" role="alert">{{ altaError() }}</div>
        }
        <div class="card p-6">
          <h2 class="font-bold text-[#1a202c] mb-4">Identidad de la institución</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="form-group lg:col-span-2">
              <label class="form-label" for="altaNombre">Nombre completo *</label>
              <input id="altaNombre" class="form-input" name="altaNombre" [(ngModel)]="alta.nombre" placeholder="Institución Educativa ..." />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaSiglas">Siglas</label>
              <input id="altaSiglas" class="form-input" name="altaSiglas" [(ngModel)]="alta.siglas" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaRuc">RUC</label>
              <input id="altaRuc" class="form-input" name="altaRuc" maxlength="11" [(ngModel)]="alta.ruc" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaModular">Código modular *</label>
              <input id="altaModular" class="form-input" name="altaModular" [(ngModel)]="alta.codigoModular" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaTipo">Tipo de gestión</label>
              <select id="altaTipo" class="form-select" name="altaTipo" [(ngModel)]="alta.tipoGestion">
                <option value="publica">Pública</option>
                <option value="privada">Privada</option>
                <option value="parroquial">Parroquial</option>
                <option value="convenio">Convenio</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="altaUgel">UGEL</label>
              <input id="altaUgel" class="form-input" name="altaUgel" [(ngModel)]="alta.ugel" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaDre">DRE</label>
              <input id="altaDre" class="form-input" name="altaDre" [(ngModel)]="alta.dre" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaResolucion">Resolución de creación</label>
              <input id="altaResolucion" class="form-input" name="altaResolucion" [(ngModel)]="alta.resolucion" />
            </div>
          </div>
        </div>
        <div class="card p-6">
          <h2 class="font-bold text-[#1a202c] mb-4">Ubicación y contacto</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="form-group lg:col-span-3">
              <label class="form-label" for="altaDireccion">Dirección</label>
              <input id="altaDireccion" class="form-input" name="altaDireccion" [(ngModel)]="alta.direccion" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaDistrito">Distrito</label>
              <input id="altaDistrito" class="form-input" name="altaDistrito" [(ngModel)]="alta.distrito" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaProvincia">Provincia</label>
              <input id="altaProvincia" class="form-input" name="altaProvincia" [(ngModel)]="alta.provincia" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaRegion">Región</label>
              <input id="altaRegion" class="form-input" name="altaRegion" [(ngModel)]="alta.region" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaPostal">Código postal</label>
              <input id="altaPostal" class="form-input" name="altaPostal" [(ngModel)]="alta.codigoPostal" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaTelefono">Teléfono</label>
              <input id="altaTelefono" class="form-input" name="altaTelefono" [(ngModel)]="alta.telefono" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaTelefono2">Teléfono secundario</label>
              <input id="altaTelefono2" class="form-input" name="altaTelefono2" [(ngModel)]="alta.telefono2" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaEmail">Correo institucional</label>
              <input id="altaEmail" class="form-input" type="email" name="altaEmail" [(ngModel)]="alta.email" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaWeb">Página web</label>
              <input id="altaWeb" class="form-input" name="altaWeb" [(ngModel)]="alta.web" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaFacebook">Facebook</label>
              <input id="altaFacebook" class="form-input" name="altaFacebook" [(ngModel)]="alta.facebook" />
            </div>
          </div>
        </div>
        <div class="card p-6">
          <h2 class="font-bold text-[#1a202c] mb-4">Autoridades</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="form-group">
              <label class="form-label" for="altaDirector">Director(a)</label>
              <input id="altaDirector" class="form-input" name="altaDirector" [(ngModel)]="alta.director" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaSubdirector">Subdirector(a)</label>
              <input id="altaSubdirector" class="form-input" name="altaSubdirector" [(ngModel)]="alta.subdirector" />
            </div>
            <div class="form-group">
              <label class="form-label" for="altaAdministrador">Administrador(a)</label>
              <input id="altaAdministrador" class="form-input" name="altaAdministrador" [(ngModel)]="alta.administrador" />
            </div>
          </div>
        </div>
        <div class="card p-6">
          <h2 class="font-bold text-[#1a202c] mb-4">Año escolar</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="form-group">
              <label class="form-label" for="altaAnio">Año escolar</label>
              <select id="altaAnio" class="form-select" name="altaAnio" [(ngModel)]="alta.anio">
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="altaSistema">Sistema de evaluación</label>
              <select id="altaSistema" class="form-select" name="altaSistema" [(ngModel)]="alta.sistemaEval">
                <option value="numerico">Numérico (0-20)</option>
                <option value="literal">Por competencias (AD/A/B/C)</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="altaPeriodo">Periodos</label>
              <select id="altaPeriodo" class="form-select" name="altaPeriodo" [(ngModel)]="alta.tipoPeriodo">
                <option value="bimestre">Bimestral</option>
                <option value="trimestre">Trimestral</option>
                <option value="semestre">Semestral</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="altaNota">Nota mínima aprobatoria</label>
              <input id="altaNota" class="form-input" type="number" min="1" max="20" name="altaNota" [(ngModel)]="alta.notaMinima" />
            </div>
          </div>
          @if (alta.sistemaEval !== 'numerico') {
            <div class="mt-4 pt-4 border-t border-[#f1f3f7] grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-group">
                <label class="form-label" for="altaAd">AD — Logro destacado</label>
                <input id="altaAd" class="form-input" type="number" min="0" max="20" step="0.5" name="altaAd" [(ngModel)]="alta.escalaLogro.AD" />
              </div>
              <div class="form-group">
                <label class="form-label" for="altaA">A — Logro esperado</label>
                <input id="altaA" class="form-input" type="number" min="0" max="20" step="0.5" name="altaA" [(ngModel)]="alta.escalaLogro.A" />
              </div>
              <div class="form-group">
                <label class="form-label" for="altaB">B — En proceso</label>
                <input id="altaB" class="form-input" type="number" min="0" max="20" step="0.5" name="altaB" [(ngModel)]="alta.escalaLogro.B" />
              </div>
            </div>
          }
        </div>
      </form>
    }

    @if (!altaAbierta()) {
    <div class="grid grid-cols-1 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] gap-4 items-start">
      <div class="card overflow-hidden lg:sticky lg:top-28"
        [ngClass]="seleccionada() ? 'order-2 lg:order-1' : 'order-1'">
        <div class="px-4 py-3 border-b border-[#f1f3f7] flex items-center justify-between gap-2">
          <h2 class="font-bold text-[#1a202c] text-sm">Instituciones</h2>
          @if (puedeAlta()) {
            <button type="button" class="btn btn-primary btn-sm" (click)="abrirAlta()">Dar de alta</button>
          }
        </div>
        @if (!instituciones().length) {
          <p class="p-4 text-sm text-[#94a3b8]">No hay instituciones registradas.</p>
        } @else {
          <div class="divide-y divide-[#f1f3f7] max-h-[calc(100vh-14rem)] overflow-y-auto">
            @for (ie of instituciones(); track ie.id) {
              <button type="button" class="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors"
                [ngClass]="seleccionada()?.id === ie.id ? 'bg-indigo-50 border-l-2 border-indigo-600' : 'border-l-2 border-transparent'"
                (click)="elegir(ie)">
                <div class="font-medium text-[#1a202c] text-sm leading-snug">{{ ie.nombre }}</div>
                <div class="text-xs text-[#64748b] mt-0.5">{{ ie.codigoModular }} · {{ ie.alumnos }} alumnos</div>
              </button>
            }
          </div>
        }
      </div>

      <div class="min-w-0 lg:order-2"
        [ngClass]="seleccionada() ? 'order-1' : 'order-2'">
        @if (!seleccionada()) {
          <div class="card p-10 text-center">
            <p class="text-[#64748b]">Seleccione una institución del listado para ver su información.</p>
          </div>
        } @else if (seleccionada(); as ieSel) {
          <div class="card overflow-hidden">
            <div class="px-5 py-4 border-b border-[#f1f3f7] bg-[#fafbff]">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">Institución seleccionada</p>
                  <h2 class="font-bold text-[#1a202c] text-lg">{{ ieSel.nombre }}</h2>
                  <p class="text-sm text-[#64748b] mt-0.5">{{ ieSel.codigoModular }} · {{ ieSel.ugel || 'sin UGEL' }}</p>
                </div>
                <div class="flex flex-wrap gap-2 text-xs">
                  <span class="badge badge-indigo">{{ ieSel.alumnos }} alumnos</span>
                  <span class="badge badge-indigo">{{ ieSel.solicitudes }} traslados</span>
                  @if (ficha()?.personal?.length) {
                    <span class="badge badge-indigo">{{ ficha()!.personal.length }} usuarios</span>
                  }
                </div>
              </div>
            </div>
            <div class="tabs overflow-x-auto px-3 bg-white border-b border-[#f1f3f7]">
              <button type="button" class="tab" [class.tab-active]="seccionActiva() === 'resumen'" (click)="cambiarSeccion('resumen')">
                <span class="icon icon-sm">info</span> Resumen
              </button>
              <button type="button" class="tab" [class.tab-active]="seccionActiva() === 'personal'" (click)="cambiarSeccion('personal')">
                <span class="icon icon-sm">badge</span> Personal
              </button>
              <button type="button" class="tab" [class.tab-active]="seccionActiva() === 'alumnos'" (click)="cambiarSeccion('alumnos')">
                <span class="icon icon-sm">school</span> Alumnos
              </button>
              <button type="button" class="tab" [class.tab-active]="seccionActiva() === 'traslados'" (click)="cambiarSeccion('traslados')">
                <span class="icon icon-sm">swap_horiz</span> Traslados
              </button>
            </div>
            <div class="p-5 bg-white min-h-[320px]">
              @if (seccionActiva() === 'resumen') {
              @if (fichaError()) {
                <p class="text-sm text-[#b91c1c]">{{ fichaError() }}</p>
              } @else if (!ficha()) {
                <p class="text-sm text-[#94a3b8]">Cargando la ficha de la institución...</p>
              } @else {
              <div class="space-y-5">
              <div>
                <h3 class="text-sm font-semibold text-[#1a202c] mb-3">Identidad</h3>
                <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div><dt class="text-[#94a3b8]">Siglas</dt><dd>{{ dato(ficha()!.institucion.siglas) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">RUC</dt><dd>{{ dato(ficha()!.institucion.ruc) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Gestión</dt><dd>{{ etiquetaGestion(ficha()!.institucion.tipoGestion) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">UGEL</dt><dd>{{ dato(ficha()!.institucion.ugel) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">DRE</dt><dd>{{ dato(ficha()!.institucion.dre) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Resolución</dt><dd>{{ dato(ficha()!.institucion.resolucion) }}</dd></div>
                </dl>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-[#1a202c] mb-3">Ubicación y contacto</h3>
                <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div class="sm:col-span-2 lg:col-span-3"><dt class="text-[#94a3b8]">Dirección</dt><dd>{{ dato(ficha()!.institucion.direccion) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Distrito</dt><dd>{{ dato(ficha()!.institucion.distrito) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Provincia</dt><dd>{{ dato(ficha()!.institucion.provincia) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Región</dt><dd>{{ dato(ficha()!.institucion.region) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Código postal</dt><dd>{{ dato(ficha()!.institucion.codigoPostal) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Teléfono</dt><dd>{{ dato(ficha()!.institucion.telefono) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Teléfono secundario</dt><dd>{{ dato(ficha()!.institucion.telefono2) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Correo</dt><dd>{{ dato(ficha()!.institucion.email) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Web</dt><dd>{{ dato(ficha()!.institucion.web) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Facebook</dt><dd>{{ dato(ficha()!.institucion.facebook) }}</dd></div>
                </dl>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-[#1a202c] mb-3">Autoridades y año escolar</h3>
                <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div><dt class="text-[#94a3b8]">Director(a)</dt><dd>{{ dato(ficha()!.institucion.director) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Subdirector(a)</dt><dd>{{ dato(ficha()!.institucion.subdirector) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Administrador(a)</dt><dd>{{ dato(ficha()!.institucion.administrador) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Año</dt><dd>{{ dato(ficha()!.institucion.anio) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Evaluación</dt><dd>{{ etiquetaSistema(ficha()!.institucion.sistemaEval) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Periodos</dt><dd>{{ etiquetaPeriodo(ficha()!.institucion.tipoPeriodo) }}</dd></div>
                  <div><dt class="text-[#94a3b8]">Nota mínima</dt><dd>{{ ficha()!.institucion.notaMinima }}</dd></div>
                </dl>
              </div>
              @if (ficha()!.institucion.niveles.length) {
                <div>
                  <h3 class="text-sm font-semibold text-[#1a202c] mb-3">Niveles</h3>
                  <ul class="text-sm space-y-1 text-[#1a202c]">
                    @for (nivel of ficha()!.institucion.niveles; track nivel.nombre) {
                      <li>{{ nivel.nombre }}{{ nivel.activo ? '' : ' (inactivo)' }}: {{ resumenGrados(nivel) }}</li>
                    }
                  </ul>
                </div>
              }
              </div>
              }
              }

              @if (seccionActiva() === 'personal') {
              <p class="text-xs text-[#94a3b8] mb-4">Usuarios asignados a esta sede. Cambie la clave o active la cuenta desde aquí.</p>
              @if (avisoPersonal()) {
                <p class="mb-4 p-3 text-sm text-indigo-800 bg-indigo-50 rounded-xl">{{ avisoPersonal() }}</p>
              }
              @if (fichaError()) {
                <p class="text-sm text-[#b91c1c]">{{ fichaError() }}</p>
              } @else if (!ficha()) {
                <p class="text-sm text-[#94a3b8]">Cargando personal...</p>
              } @else if (!ficha()!.personal.length) {
                <p class="text-sm text-[#94a3b8]">Esta institución no tiene personal administrativo asignado.</p>
              } @else {
                <div class="overflow-x-auto">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Persona</th>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (persona of ficha()!.personal; track persona.userId) {
                        <tr>
                          <td>
                            {{ persona.apellidos }}, {{ persona.nombres }}
                            <div class="text-xs text-[#94a3b8]">{{ persona.dni }} · {{ persona.cargo || 'sin cargo' }}</div>
                          </td>
                          <td>
                            {{ persona.username }}
                            <div class="text-xs text-[#94a3b8]">{{ persona.email }}</div>
                          </td>
                          <td>{{ etiquetasRol(persona) }}</td>
                          <td><span class="badge badge-indigo">{{ estadoPersona(persona) }}</span></td>
                          <td class="space-y-2 min-w-[220px]">
                            <div class="flex flex-wrap gap-2">
                              <button type="button" class="btn btn-secondary btn-sm" (click)="abrirClave(persona.userId)">Cambiar clave</button>
                              @if (cuentaActiva(persona)) {
                                <button type="button" class="btn btn-secondary btn-sm" [disabled]="guardandoPersonal()" (click)="fijarEstado(persona, 'inactivo')">Desactivar</button>
                              } @else {
                                <button type="button" class="btn btn-primary btn-sm" [disabled]="guardandoPersonal()" (click)="fijarEstado(persona, 'activo')">Activar</button>
                              }
                            </div>
                            @if (claveUserId() === persona.userId) {
                              <form class="flex flex-col gap-2" (ngSubmit)="guardarClave(persona)">
                                <input class="form-input" type="password" name="claveNueva{{ persona.userId }}" placeholder="Nueva clave" [(ngModel)]="claveNueva" />
                                <input class="form-input" type="password" name="claveConfirma{{ persona.userId }}" placeholder="Confirmar clave" [(ngModel)]="claveConfirmacion" />
                                @if (claveError()) {
                                  <p class="text-xs text-[#b91c1c]">{{ claveError() }}</p>
                                }
                                <div class="flex gap-2">
                                  <button type="submit" class="btn btn-primary btn-sm" [disabled]="guardandoPersonal()">Guardar clave</button>
                                  <button type="button" class="btn btn-ghost btn-sm" (click)="cerrarClave()">Cancelar</button>
                                </div>
                              </form>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
              }

              @if (seccionActiva() === 'alumnos') {
              <div class="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-4">
                <p class="text-xs text-[#94a3b8]">Matrículas vigentes de la institución.</p>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input class="form-input" placeholder="Nombre o apellido" [ngModel]="busquedaNombre" name="busquedaNombre" (ngModelChange)="busquedaNombre = $event" (keyup.enter)="buscar()" />
                  <input class="form-input" placeholder="Grado, ej. 5° Primaria" [ngModel]="busquedaGrado" name="busquedaGrado" (ngModelChange)="busquedaGrado = $event" (keyup.enter)="buscar()" />
                  <button type="button" class="btn btn-secondary btn-sm" (click)="buscar()">Buscar</button>
                </div>
              </div>
              @if (avisoAlcance()) {
                <p class="text-sm text-[#64748b]">{{ avisoAlcance() }}</p>
              } @else if (cargandoOperativos()) {
                <p class="text-sm text-[#94a3b8]">Cargando alumnos...</p>
              } @else if (!alumnos().length) {
                <p class="text-sm text-[#94a3b8]">Esta institución no tiene alumnos con ese criterio.</p>
              } @else {
                <div class="overflow-x-auto">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Código nacional</th>
                        <th>Indicador IE</th>
                        <th>Matrícula</th>
                        <th>IE de destino</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (a of alumnos(); track a.id) {
                        <tr>
                          <td>
                            {{ a.apellidos }}, {{ a.nombres }}
                            <div class="text-xs text-[#94a3b8]">{{ a.dni || 'sin documento' }} · {{ a.grado }} {{ a.nivel }} "{{ a.seccion }}"</div>
                          </td>
                          <td class="font-medium text-indigo-700">{{ a.codigoNacional }}</td>
                          <td>{{ a.indicadorInstitucion }}</td>
                          <td><span class="badge badge-indigo">{{ a.estadoMatricula }}</span></td>
                          <td>
                            @if (a.traslado) {
                              <div class="font-medium text-[#1a202c]">{{ a.traslado.ieDestinoNombre }}</div>
                              <div class="text-xs text-[#94a3b8]">{{ a.traslado.codigo }} · {{ a.traslado.estado }}</div>
                            } @else {
                              <span class="text-[#94a3b8]">—</span>
                            }
                          </td>
                          <td><button type="button" class="btn btn-ghost btn-sm" (click)="verPersona(a)">Años</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <div class="mt-4 pt-4 border-t border-[#f1f3f7] flex items-center justify-between gap-3 text-sm text-[#64748b]">
                  <span>{{ total() }} alumnos · página {{ pagina() }} de {{ totalPaginas() }}</span>
                  <div class="flex gap-2">
                    <button type="button" class="btn btn-secondary btn-sm" [disabled]="pagina() <= 1" (click)="irPagina(pagina() - 1)">Anterior</button>
                    <button type="button" class="btn btn-secondary btn-sm" [disabled]="pagina() >= totalPaginas()" (click)="irPagina(pagina() + 1)">Siguiente</button>
                  </div>
                </div>
              }
              @if (persona(); as p) {
                <div class="mt-6 border border-[#e8eaf0] rounded-xl p-4 space-y-4 bg-[#fafbff]">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h3 class="font-bold text-[#1a202c]">Trayectoria · {{ p.codigoNacional }}</h3>
                      <p class="text-xs text-[#64748b]">Indicador IE por año escolar.</p>
                    </div>
                    <button type="button" class="btn btn-ghost btn-sm" (click)="persona.set(null)">Cerrar</button>
                  </div>
                  @for (a of p.alumnos; track a.id) {
                    @if (a.trayectoria?.length) {
                      <table class="data-table">
                        <thead>
                          <tr><th>Año</th><th>Indicador IE</th><th>Institución</th><th>Grado</th><th>Estado</th></tr>
                        </thead>
                        <tbody>
                          @for (t of a.trayectoria ?? []; track t.anio) {
                            <tr>
                              <td>{{ t.anio }}</td>
                              <td class="font-medium text-indigo-700">{{ t.codigoInstitucion || '—' }}</td>
                              <td>{{ t.institucionNombre || '—' }}</td>
                              <td>{{ t.grado }} "{{ t.seccion }}"</td>
                              <td>{{ t.estado }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    }
                  }
                </div>
              }
              }

              @if (seccionActiva() === 'traslados') {
              <p class="text-xs text-[#94a3b8] mb-4">Solicitudes en las que participa esta institución como origen o destino.</p>
              @if (avisoAlcance()) {
                <p class="text-sm text-[#64748b]">{{ avisoAlcance() }}</p>
              } @else if (cargandoOperativos()) {
                <p class="text-sm text-[#94a3b8]">Cargando traslados...</p>
              } @else if (!solicitudes().length) {
                <p class="text-sm text-[#94a3b8]">Esta institución no tiene solicitudes de traslado.</p>
              } @else {
                <div class="overflow-x-auto">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Fecha</th>
                        <th>Alumno</th>
                        <th>Sentido</th>
                        <th>Estado</th>
                        <th>IE origen</th>
                        <th>IE destino</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of solicitudes(); track s.id) {
                        <tr>
                          <td class="font-medium text-indigo-700">{{ s.codigo }}</td>
                          <td>{{ s.createdAt | date:'dd/MM/yyyy' }}</td>
                          <td>{{ s.studentNombre }}<div class="text-xs text-[#94a3b8]">{{ s.studentDni }}</div></td>
                          <td>{{ s.sentido === 'salida' ? 'Sale' : 'Llega' }}</td>
                          <td><span class="badge badge-indigo">{{ s.estado }}</span></td>
                          <td>{{ s.ieOrigenNombre }}<div class="text-xs text-[#94a3b8]">{{ s.ieOrigenCodigoModular }}</div></td>
                          <td class="font-medium text-[#1a202c]">{{ s.ieDestinoNombre }}<div class="text-xs text-[#94a3b8]">{{ s.ieDestinoCodigoModular }}</div></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
              }
            </div>
          </div>
        }
      </div>
    </div>
    }
  </div>
</div>
  `,
})
export class DirectorioInstitucionesComponent implements OnInit {
  private readonly svc = inject(DirectorioInstitucionesService);
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  readonly puedeAlta = computed(() => this.auth.hasRole('SIAGIE'));

  readonly instituciones = signal<InstitucionDirectorio[]>([]);
  readonly seleccionada = signal<InstitucionDirectorio | null>(null);
  readonly ficha = signal<FichaInstitucion | null>(null);
  readonly fichaError = signal('');
  readonly avisoPersonal = signal('');
  readonly claveUserId = signal<number | null>(null);
  readonly claveError = signal('');
  readonly guardandoPersonal = signal(false);
  readonly seccionActiva = signal<'resumen' | 'personal' | 'alumnos' | 'traslados'>('resumen');
  readonly cargandoOperativos = signal(false);
  readonly alumnos = signal<AlumnoInstitucion[]>([]);
  readonly solicitudes = signal<SolicitudInstitucion[]>([]);
  readonly persona = signal<PersonaInstitucion | null>(null);
  readonly errorMsg = signal('');
  readonly avisoAlcance = signal('');
  readonly avisoAlta = signal('');
  readonly altaAbierta = signal(false);
  readonly altaError = signal('');
  readonly guardandoAlta = signal(false);
  readonly pagina = signal(1);
  readonly total = signal(0);
  readonly totalPaginas = signal(1);
  busquedaNombre = '';
  busquedaGrado = '';
  claveNueva = '';
  claveConfirmacion = '';
  alta: AltaInstitucion = this.altaVacia();

  ngOnInit(): void {
    this.layout.setTitle('Instituciones');
    this.svc.instituciones().subscribe({
      next: (rows) => {
        this.instituciones.set(rows);
        const propia = this.institutionIdPropia();
        const inicial = (propia ? rows.find((row) => row.id === propia) : undefined) ?? rows[0];
        if (inicial) this.elegir(inicial);
      },
      error: () => this.errorMsg.set('No se pudo cargar el directorio de instituciones.'),
    });
  }

  abrirAlta(): void {
    this.alta = this.altaVacia();
    this.altaError.set('');
    this.altaAbierta.set(true);
  }

  cerrarAlta(): void {
    this.altaAbierta.set(false);
    this.altaError.set('');
  }

  darDeAlta(): void {
    this.altaError.set('');
    if (!this.alta.nombre.trim() || !this.alta.codigoModular.trim()) {
      this.altaError.set('Indique el nombre y el código modular.');
      return;
    }
    this.guardandoAlta.set(true);
    this.svc.crear(this.alta).subscribe({
      next: (ie) => {
        this.guardandoAlta.set(false);
        this.instituciones.update((rows) => [...rows, ie].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        this.alta = this.altaVacia();
        this.altaAbierta.set(false);
        const acceso = ie.credenciales?.username
          ? ` Usuario ${ie.credenciales.username}, clave inicial ${ie.credenciales.password || 'ya asignada'}.`
          : '';
        this.avisoAlta.set(
          ie.rolAdministrativo
            ? `Institución registrada. El administrador de la sede es el rol ${ie.rolAdministrativo}.${acceso}`
            : 'Institución registrada.',
        );
        this.elegir(ie);
      },
      error: (err) => {
        this.guardandoAlta.set(false);
        const message = err?.error?.message;
        this.altaError.set(Array.isArray(message) ? message[0] : message || 'No se pudo registrar la institución.');
      },
    });
  }

  private altaVacia(): AltaInstitucion {
    return {
      nombre: '',
      siglas: '',
      ruc: '',
      codigoModular: '',
      tipoGestion: 'publica',
      ugel: '',
      dre: '',
      resolucion: '',
      direccion: '',
      distrito: '',
      provincia: '',
      region: '',
      codigoPostal: '',
      telefono: '',
      telefono2: '',
      email: '',
      web: '',
      facebook: '',
      director: '',
      subdirector: '',
      administrador: '',
      anio: '2026',
      sistemaEval: 'numerico',
      tipoPeriodo: 'bimestre',
      notaMinima: 11,
      escalaLogro: { AD: 17.5, A: 14, B: 11 },
    };
  }

  elegir(ie: InstitucionDirectorio): void {
    this.seleccionada.set(ie);
    this.persona.set(null);
    this.ficha.set(null);
    this.fichaError.set('');
    this.avisoPersonal.set('');
    this.avisoAlcance.set('');
    this.alumnos.set([]);
    this.solicitudes.set([]);
    this.cerrarClave();
    this.seccionActiva.set('resumen');
    this.pagina.set(1);
    this.cargarFicha();
  }

  cambiarSeccion(seccion: 'resumen' | 'personal' | 'alumnos' | 'traslados'): void {
    this.seccionActiva.set(seccion);
    this.persona.set(null);
    if (seccion === 'personal' && !this.ficha()) {
      this.cargarFicha();
    }
    if ((seccion === 'alumnos' || seccion === 'traslados') && !this.avisoAlcance()) {
      this.cargarAlumnos();
    }
  }

  dato(valor?: string | null): string {
    const texto = (valor ?? '').trim();
    return texto || '—';
  }

  etiquetaGestion(valor: string): string {
    const etiquetas: Record<string, string> = {
      publica: 'Pública',
      privada: 'Privada',
      parroquial: 'Parroquial',
      convenio: 'Convenio',
    };
    return etiquetas[valor] ?? this.dato(valor);
  }

  etiquetaSistema(valor: string): string {
    const etiquetas: Record<string, string> = {
      numerico: 'Numérico (0-20)',
      literal: 'Por competencias (AD/A/B/C)',
      mixto: 'Mixto',
    };
    return etiquetas[valor] ?? this.dato(valor);
  }

  etiquetaPeriodo(valor: string): string {
    const etiquetas: Record<string, string> = {
      bimestre: 'Bimestral',
      trimestre: 'Trimestral',
      semestre: 'Semestral',
    };
    return etiquetas[valor] ?? this.dato(valor);
  }

  resumenGrados(nivel: FichaInstitucion['institucion']['niveles'][number]): string {
    const grados = nivel.grados.map((grado) => {
      const secciones = grado.secciones.length ? ` ${grado.secciones.join(', ')}` : '';
      return `${grado.nombre}${secciones}`;
    });
    return grados.length ? grados.join(' · ') : 'sin grados';
  }

  etiquetasRol(persona: UsuarioAdministrativo): string {
    return persona.roles.map((rol) => rol.label).join(', ') || '—';
  }

  cuentaActiva(persona: UsuarioAdministrativo): boolean {
    return persona.estado === 'activo' && persona.roles.some((rol) => rol.activo);
  }

  estadoPersona(persona: UsuarioAdministrativo): string {
    if (persona.estado === 'bloqueado') return 'bloqueado';
    return this.cuentaActiva(persona) ? 'activo' : 'inactivo';
  }

  abrirClave(userId: number): void {
    this.claveUserId.set(userId);
    this.claveNueva = '';
    this.claveConfirmacion = '';
    this.claveError.set('');
  }

  cerrarClave(): void {
    this.claveUserId.set(null);
    this.claveNueva = '';
    this.claveConfirmacion = '';
    this.claveError.set('');
  }

  guardarClave(persona: UsuarioAdministrativo): void {
    const ie = this.seleccionada();
    if (!ie) return;
    this.claveError.set('');
    if (this.claveNueva.length < 8) {
      this.claveError.set('La clave debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.');
      return;
    }
    if (this.claveNueva !== this.claveConfirmacion) {
      this.claveError.set('La confirmación no coincide con la nueva clave.');
      return;
    }
    this.guardandoPersonal.set(true);
    this.svc.cambiarCredencial(ie.id, persona.userId, this.claveNueva).subscribe({
      next: (res) => {
        this.guardandoPersonal.set(false);
        this.reemplazarPersona(res.usuario);
        this.cerrarClave();
        this.avisoPersonal.set(`Clave actualizada para ${persona.username}.`);
      },
      error: (err) => {
        this.guardandoPersonal.set(false);
        const message = err?.error?.message;
        this.claveError.set(Array.isArray(message) ? message[0] : message || 'No se pudo cambiar la clave.');
      },
    });
  }

  fijarEstado(persona: UsuarioAdministrativo, estado: 'activo' | 'inactivo'): void {
    const ie = this.seleccionada();
    if (!ie) return;
    this.guardandoPersonal.set(true);
    this.avisoPersonal.set('');
    this.svc.cambiarEstado(ie.id, persona.userId, estado).subscribe({
      next: (res) => {
        this.guardandoPersonal.set(false);
        this.reemplazarPersona(res.usuario);
        this.avisoPersonal.set(res.message);
      },
      error: (err) => {
        this.guardandoPersonal.set(false);
        const message = err?.error?.message;
        this.fichaError.set(Array.isArray(message) ? message[0] : message || 'No se pudo actualizar el usuario.');
      },
    });
  }

  buscar(): void {
    this.pagina.set(1);
    this.cargarAlumnos();
  }

  irPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.pagina.set(pagina);
    this.cargarAlumnos();
  }

  cargarFicha(): void {
    const ie = this.seleccionada();
    if (!ie) return;
    this.svc.detalle(ie.id).subscribe({
      next: (row) => {
        this.ficha.set(row);
        this.fichaError.set('');
      },
      error: () => this.fichaError.set('No se pudo cargar la ficha de la institución.'),
    });
  }

  private reemplazarPersona(usuario?: UsuarioAdministrativo): void {
    if (!usuario) return;
    this.ficha.update((actual) => {
      if (!actual) return actual;
      return {
        ...actual,
        personal: actual.personal.map((row) => (row.userId === usuario.userId ? usuario : row)),
      };
    });
  }

  cargarAlumnos(): void {
    const ie = this.seleccionada();
    if (!ie) return;
    this.errorMsg.set('');
    const propia = this.institutionIdPropia();
    if (!this.puedeAlta() && propia !== ie.id) {
      this.alumnos.set([]);
      this.solicitudes.set([]);
      this.total.set(0);
      this.totalPaginas.set(1);
      this.avisoAlcance.set('Los alumnos y las solicitudes de otra institución los consulta el usuario SIAGIE.');
      return;
    }
    this.avisoAlcance.set('');
    this.cargandoOperativos.set(true);
    this.svc.alumnos(ie.id, {
      q: this.busquedaNombre,
      grado: this.busquedaGrado,
      page: this.pagina(),
    }).subscribe({
      next: (page) => {
        this.cargandoOperativos.set(false);
        this.alumnos.set(page.items);
        this.solicitudes.set(page.solicitudes ?? []);
        this.total.set(page.total);
        this.pagina.set(page.page);
        this.totalPaginas.set(page.totalPages || 1);
      },
      error: () => {
        this.cargandoOperativos.set(false);
        this.errorMsg.set('No se pudo cargar los alumnos de la institución.');
      },
    });
  }

  private institutionIdPropia(): number | null {
    const user = this.auth.currentUser() as { institutionId?: number | null } | null;
    const id = Number(user?.institutionId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  verPersona(alumno: AlumnoInstitucion): void {
    this.svc.persona(alumno.id).subscribe({
      next: (row) => this.persona.set(row),
      error: () => this.errorMsg.set('No se pudo abrir la ficha del alumno.'),
    });
  }
}
