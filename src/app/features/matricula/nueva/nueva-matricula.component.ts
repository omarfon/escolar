import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { NuevaMatriculaService } from './nueva-matricula.service';
import {
  buildNuevaMatriculaPayload,
  ErroresCampoMatricula,
  ExpedienteCreado,
  formatDireccion,
  joinApellidos,
  nivelLabel,
  OcupacionSeccion,
  primerErrorMatricula,
  validarApoderadosCampos,
  validarEstudianteCampos,
} from './nueva-matricula.model';
import { requisitosPorGrado } from '../../estudiantes/shared/documentos-requisitos';
import {
  labelNumeroDocumento,
  maxLengthNumeroDocumento,
  placeholderNumeroDocumento,
  TIPOS_DOCUMENTO_IDENTIDAD,
  TipoDocumentoIdentidad,
} from '../../estudiantes/shared/identidad-documento';

interface Paso { id: number; titulo: string; icon: string; color: string; ring: string; ringColor: string; textColor: string; dot: string; }
interface DocMat { tipo: string; obligatorio: boolean; estado: 'pendiente' | 'entregado'; imagenUrl?: string; }
interface Apoderado {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  tipoDocumento: TipoDocumentoIdentidad;
  dni: string;
  parentesco: string;
  celular: string;
  email: string;
  esPrincipal: boolean;
}
function apoderadoVacio(principal = false): Apoderado {
  return {
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    tipoDocumento: 'DNI',
    dni: '',
    parentesco: principal ? 'padre' : 'madre',
    celular: '',
    email: '',
    esPrincipal: principal,
  };
}

@Component({
  selector: 'app-nueva-matricula',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  template: `
    <div class="max-w-3xl mx-auto space-y-6">

      <!-- ── HEADER ── -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Nueva Matrícula</h2>
          <p class="text-sm text-gray-400 mt-0.5">Completa los pasos para registrar al estudiante</p>
        </div>
        <a routerLink="/matricula/matriculados" class="btn btn-ghost text-gray-500 hover:text-gray-700">
          <span class="icon icon-sm">arrow_back</span> Volver
        </a>
      </div>

      <!-- ── ERROR ── -->
      @if (error()) {
        <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800">
          <span class="icon text-red-500 shrink-0 mt-0.5">error</span>
          <span>{{ error() }}</span>
        </div>
      }

      <!-- ── STEPPER ── -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
        <div class="flex items-start">
          @for (p of pasos; track p.id; let i = $index) {
            <div class="flex items-center" [class.flex-1]="i < pasos.length - 1">
              <button class="flex flex-col items-center gap-1.5 cursor-default" [class.cursor-pointer]="paso > p.id" (click)="paso > p.id ? paso = p.id : null">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300"
                  [ngClass]="paso > p.id
                    ? 'bg-green-500 text-white shadow-md shadow-green-200'
                    : paso === p.id
                      ? p.ring + ' text-white shadow-md ring-4 ring-opacity-30 ' + p.ringColor
                      : 'bg-gray-100 text-gray-400'">
                  @if (paso > p.id) {
                    <span class="icon" style="font-size:18px">check</span>
                  } @else {
                    <span class="icon" style="font-size:16px">{{ p.icon }}</span>
                  }
                </div>
                <span class="text-[11px] font-medium hidden sm:block transition-colors whitespace-nowrap"
                  [ngClass]="paso === p.id ? p.textColor : paso > p.id ? 'text-green-600' : 'text-gray-400'">
                  {{ p.titulo }}
                </span>
              </button>
              @if (i < pasos.length - 1) {
                <div class="flex-1 h-1 mx-3 mb-5 rounded-full overflow-hidden bg-gray-100">
                  <div class="h-full rounded-full transition-all duration-500"
                    [ngClass]="paso > p.id ? 'bg-green-400 w-full' : 'w-0'"></div>
                </div>
              }
            </div>
          }
        </div>
        <!-- Dot progress -->
        <div class="flex items-center justify-center gap-2 mt-4">
          @for (p of pasos; track p.id) {
            <div class="rounded-full transition-all duration-300"
              [ngClass]="paso === p.id ? (p.dot + ' w-6 h-2') : paso > p.id ? 'bg-green-400 w-2 h-2' : 'bg-gray-200 w-2 h-2'"></div>
          }
        </div>
      </div>

      <!-- ══════════════ PASO 1: ESTUDIANTE ══════════════ -->
      @if (paso === 1) {
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          <div class="px-6 py-5 border-b flex items-center gap-4 bg-gradient-to-r from-indigo-50 via-indigo-50/50 to-transparent">
            <div class="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
              <span class="icon text-indigo-600" style="font-size:22px">person</span>
            </div>
            <div>
              <h3 class="font-bold text-gray-900">Datos del Estudiante</h3>
              <p class="text-xs text-gray-500">Información personal básica del alumno</p>
            </div>
          </div>
          <div class="p-6 space-y-5">
            <!-- Nombre y apellidos -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="form-group sm:col-span-2">
                <label class="form-label">Nombres <span class="text-red-400">*</span></label>
                <input type="text" class="form-input" [ngClass]="claseCampo('nombres')"
                       [(ngModel)]="form.nombres" (ngModelChange)="limpiarCampo('nombres')"
                       placeholder="Ej: Juan Carlos">
                @if (campoError('nombres'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Apellido paterno <span class="text-red-400">*</span></label>
                <input type="text" class="form-input" [ngClass]="claseCampo('apellidoPaterno')"
                       [(ngModel)]="form.apellidoPaterno" (ngModelChange)="limpiarCampo('apellidoPaterno')"
                       placeholder="Ej: García">
                @if (campoError('apellidoPaterno'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Apellido materno <span class="text-red-400">*</span></label>
                <input type="text" class="form-input" [ngClass]="claseCampo('apellidoMaterno')"
                       [(ngModel)]="form.apellidoMaterno" (ngModelChange)="limpiarCampo('apellidoMaterno')"
                       placeholder="Ej: Pérez">
                @if (campoError('apellidoMaterno'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>
            <!-- Documento de identidad -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="form-group">
                <label class="form-label">Tipo de documento <span class="text-red-400">*</span></label>
                <select class="form-input" [(ngModel)]="form.tipoDocumento"
                        (ngModelChange)="limpiarCampo('dni')">
                  @for (t of tiposDocumento; track t.value) {
                    <option [ngValue]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ labelDocumento() }} <span class="text-red-400">*</span></label>
                <input type="text" class="form-input" [ngClass]="claseCampo('dni')"
                       [(ngModel)]="form.dni" (ngModelChange)="limpiarCampo('dni')"
                       [placeholder]="placeholderDocumento()"
                       [maxlength]="maxLengthDocumento()"
                       [attr.inputmode]="form.tipoDocumento === 'DNI' ? 'numeric' : 'text'">
                @if (campoError('dni'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group sm:col-span-2">
                <label class="form-label">Fecha de Nacimiento</label>
                <input type="date" class="form-input" [ngClass]="claseCampo('fechaNac')"
                       [(ngModel)]="form.fechaNac" (ngModelChange)="limpiarCampo('fechaNac')">
                @if (campoError('fechaNac'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>
            <!-- Sexo y teléfono -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="form-group">
                <label class="form-label">Sexo</label>
                <div class="grid grid-cols-2 gap-2 mt-1">
                  <button type="button" (click)="form.sexo = 'M'"
                    class="flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all"
                    [ngClass]="form.sexo === 'M' ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'border-gray-200 text-gray-500 hover:border-indigo-200 hover:bg-indigo-50'">
                    <span class="icon icon-sm">man</span> Masculino
                  </button>
                  <button type="button" (click)="form.sexo = 'F'"
                    class="flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all"
                    [ngClass]="form.sexo === 'F' ? 'border-pink-500 bg-pink-500 text-white shadow-md shadow-pink-200' : 'border-gray-200 text-gray-500 hover:border-pink-200 hover:bg-pink-50'">
                    <span class="icon icon-sm">woman</span> Femenino
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Teléfono de emergencia</label>
                <input type="tel" class="form-input" [ngClass]="claseCampo('telEmergencia')"
                       [(ngModel)]="form.telEmergencia" (ngModelChange)="limpiarCampo('telEmergencia')"
                       placeholder="999 999 999">
                @if (campoError('telEmergencia'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>
            <!-- Dirección -->
            <div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dirección de domicilio</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="form-group sm:col-span-2">
                  <label class="form-label">Dirección <span class="text-red-400">*</span></label>
                  <input type="text" class="form-input" [ngClass]="claseCampo('direccion')"
                         [(ngModel)]="form.direccion" (ngModelChange)="limpiarCampo('direccion')"
                         placeholder="Av. / Jr. / Calle, N° de vivienda">
                  @if (campoError('direccion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
                </div>
                <div class="form-group">
                  <label class="form-label">Distrito</label>
                  <input type="text" class="form-input" [(ngModel)]="form.distrito" placeholder="Ej: San Juan de Miraflores">
                </div>
                <div class="form-group">
                  <label class="form-label">Provincia</label>
                  <input type="text" class="form-input" [(ngModel)]="form.provincia" placeholder="Ej: Lima">
                </div>
                <div class="form-group sm:col-span-2">
                  <label class="form-label">Departamento</label>
                  <input type="text" class="form-input" [(ngModel)]="form.departamento" placeholder="Ej: Lima">
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ══════════════ PASO 2: APODERADOS ══════════════ -->
      @if (paso === 2) {
        <div class="space-y-3 animate-fade-in">
          <!-- Header de sección -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-5 flex items-center justify-between bg-gradient-to-r from-purple-50 via-purple-50/50 to-transparent">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
                  <span class="icon text-purple-600" style="font-size:22px">supervisor_account</span>
                </div>
                <div>
                  <h3 class="font-bold text-gray-900">Apoderados</h3>
                  <p class="text-xs text-gray-500">{{ form.apoderados.length }} apoderado(s) · El primero es el principal</p>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" (click)="agregarApoderado()">
                <span class="icon icon-sm">person_add</span> Agregar
              </button>
            </div>
          </div>

          <!-- Tarjetas de apoderados -->
          @if (campoError('apoderados'); as errAp) {
            <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800">
              <span class="icon text-red-500 shrink-0 mt-0.5">error</span>
              <span>{{ errAp }}</span>
            </div>
          }
          @for (ap of form.apoderados; track $index; let i = $index) {
            <div class="bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all"
              [ngClass]="ap.esPrincipal ? 'border-indigo-200 shadow-indigo-50' : 'border-gray-100'">
              <!-- Cabecera tarjeta -->
              <div class="flex items-center justify-between px-5 py-3.5 border-b"
                [ngClass]="ap.esPrincipal ? 'bg-gradient-to-r from-indigo-50 to-transparent' : 'bg-gray-50'">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    [ngClass]="ap.esPrincipal ? 'bg-indigo-500' : 'bg-gray-400'">
                    {{ ap.nombres ? ap.nombres[0].toUpperCase() : '?' }}
                  </div>
                  <div>
                    <div class="font-semibold text-gray-900 text-sm">{{ nombreCompletoApoderado(ap) || ('Apoderado ' + (i + 1)) }}</div>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      @if (ap.esPrincipal) {
                        <span class="inline-flex items-center gap-0.5 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                          <span class="icon" style="font-size:11px">star</span> Principal
                        </span>
                      }
                      @if (ap.parentesco) {
                        <span class="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full capitalize">{{ ap.parentesco }}</span>
                      }
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  @if (!ap.esPrincipal) {
                    <button class="text-xs flex items-center gap-1 text-indigo-500 hover:text-indigo-700 px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                      (click)="marcarPrincipal(i)" title="Marcar como principal">
                      <span class="icon" style="font-size:14px">star_outline</span> Principal
                    </button>
                    <button class="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      (click)="eliminarApoderado(i)">
                      <span class="icon icon-sm">delete_outline</span>
                    </button>
                  }
                </div>
              </div>
              <!-- Campos -->
              <div class="p-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="form-group sm:col-span-2">
                    <label class="form-label">Nombres{{ ap.esPrincipal ? ' *' : '' }}</label>
                    <input type="text" class="form-input"
                           [ngClass]="claseCampo(apoderadoCampoKey(i, 'nombres'))"
                           [(ngModel)]="ap.nombres"
                           (ngModelChange)="limpiarCampo(apoderadoCampoKey(i, 'nombres'))"
                           placeholder="Ej: Carlos">
                    @if (campoError(apoderadoCampoKey(i, 'nombres')); as err) {
                      <p class="form-error mt-1">{{ err }}</p>
                    }
                  </div>
                  <div class="form-group">
                    <label class="form-label">Apellido paterno{{ ap.esPrincipal ? ' *' : '' }}</label>
                    <input type="text" class="form-input"
                           [ngClass]="claseCampo(apoderadoCampoKey(i, 'apellidoPaterno'))"
                           [(ngModel)]="ap.apellidoPaterno"
                           (ngModelChange)="limpiarCampo(apoderadoCampoKey(i, 'apellidoPaterno'))"
                           placeholder="Ej: Vega">
                    @if (campoError(apoderadoCampoKey(i, 'apellidoPaterno')); as err) {
                      <p class="form-error mt-1">{{ err }}</p>
                    }
                  </div>
                  <div class="form-group">
                    <label class="form-label">Apellido materno{{ ap.esPrincipal ? ' *' : '' }}</label>
                    <input type="text" class="form-input"
                           [ngClass]="claseCampo(apoderadoCampoKey(i, 'apellidoMaterno'))"
                           [(ngModel)]="ap.apellidoMaterno"
                           (ngModelChange)="limpiarCampo(apoderadoCampoKey(i, 'apellidoMaterno'))"
                           placeholder="Ej: Ramos">
                    @if (campoError(apoderadoCampoKey(i, 'apellidoMaterno')); as err) {
                      <p class="form-error mt-1">{{ err }}</p>
                    }
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tipo de documento{{ ap.esPrincipal ? ' *' : '' }}</label>
                    <select class="form-input" [(ngModel)]="ap.tipoDocumento"
                            (ngModelChange)="limpiarCampo(apoderadoCampoKey(i, 'dni'))">
                      @for (t of tiposDocumento; track t.value) {
                        <option [ngValue]="t.value">{{ t.label }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">{{ labelDocumentoApoderado(ap) }}{{ ap.esPrincipal ? ' *' : '' }}</label>
                    <input type="text" class="form-input"
                           [ngClass]="claseCampo(apoderadoCampoKey(i, 'dni'))"
                           [(ngModel)]="ap.dni"
                           (ngModelChange)="limpiarCampo(apoderadoCampoKey(i, 'dni'))"
                           [placeholder]="placeholderDocumentoApoderado(ap)"
                           [maxlength]="maxLengthDocumentoApoderado(ap)"
                           [attr.inputmode]="ap.tipoDocumento === 'DNI' ? 'numeric' : 'text'">
                    @if (campoError(apoderadoCampoKey(i, 'dni')); as err) {
                      <p class="form-error mt-1">{{ err }}</p>
                    }
                  </div>
                  <div class="form-group">
                    <label class="form-label">Parentesco</label>
                    <select class="form-select" [(ngModel)]="ap.parentesco">
                      <option value="padre">Padre</option>
                      <option value="madre">Madre</option>
                      <option value="abuelo">Abuelo/a</option>
                      <option value="tio">Tío/a</option>
                      <option value="hermano">Hermano/a</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Celular{{ ap.esPrincipal ? ' *' : '' }}</label>
                    <input type="tel" class="form-input"
                           [ngClass]="claseCampo(apoderadoCampoKey(i, 'celular'))"
                           [(ngModel)]="ap.celular"
                           (ngModelChange)="limpiarCampo(apoderadoCampoKey(i, 'celular'))"
                           placeholder="999 999 999">
                    @if (campoError(apoderadoCampoKey(i, 'celular')); as err) {
                      <p class="form-error mt-1">{{ err }}</p>
                    }
                  </div>
                  <div class="form-group sm:col-span-2">
                    <label class="form-label">Correo electrónico</label>
                    <input type="email" class="form-input"
                           [ngClass]="claseCampo(apoderadoCampoKey(i, 'email'))"
                           [(ngModel)]="ap.email"
                           (ngModelChange)="limpiarCampo(apoderadoCampoKey(i, 'email'))"
                           placeholder="correo@ejemplo.com">
                    @if (campoError(apoderadoCampoKey(i, 'email')); as err) {
                      <p class="form-error mt-1">{{ err }}</p>
                    }
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- Botón agregar dashed -->
          <button type="button"
            class="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium
                   hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50/40 transition-all flex items-center justify-center gap-2"
            (click)="agregarApoderado()">
            <span class="icon">add_circle_outline</span> Agregar otro apoderado
          </button>
        </div>
      }

      <!-- ══════════════ PASO 3: GRADO ══════════════ -->
      @if (paso === 3) {
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          <div class="px-6 py-5 border-b flex items-center gap-4 bg-gradient-to-r from-amber-50 via-amber-50/50 to-transparent">
            <div class="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
              <span class="icon text-amber-600" style="font-size:22px">school</span>
            </div>
            <div>
              <h3 class="font-bold text-gray-900">Nivel Educativo y Grado</h3>
              <p class="text-xs text-gray-500">Selecciona dónde va a estudiar el alumno</p>
            </div>
          </div>
          <div class="p-6 space-y-6">

            <!-- Nivel: tarjetas visuales -->
            <div>
              <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 block">Nivel educativo</label>
              <div class="grid grid-cols-3 gap-3">
                @for (n of niveles; track n.val) {
                  <button type="button" (click)="seleccionarNivel(n.val)"
                    class="flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all font-medium"
                    [ngClass]="form.nivel === n.val
                      ? n.active
                      : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50'">
                    <span class="icon" style="font-size:28px">{{ n.icon }}</span>
                    <span class="text-sm">{{ n.label }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Grado: números -->
            <div>
              <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 block">Grado</label>
              <div class="flex flex-wrap gap-2">
                @for (g of gradosDisponibles(); track g) {
                  <button type="button" (click)="seleccionarGrado(g)"
                    class="w-14 h-14 rounded-2xl border-2 font-bold text-base transition-all"
                    [ngClass]="form.grado === g
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50'">
                    {{ g }}°
                  </button>
                }
              </div>
            </div>

            <!-- Sección: letras -->
            <div>
              <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 block">Sección</label>
              <div class="flex flex-wrap gap-2">
                @for (s of ['A','B','C','D']; track s) {
                  <button type="button" (click)="form.seccion = s"
                    class="min-w-[3.5rem] h-14 px-2 rounded-2xl border-2 font-bold text-lg transition-all flex flex-col items-center justify-center"
                    [ngClass]="form.seccion === s
                      ? 'border-green-500 bg-green-500 text-white shadow-lg shadow-green-200'
                      : 'border-gray-200 text-gray-500 hover:border-green-300 hover:bg-green-50'">
                    <span>{{ s }}</span>
                    <span class="text-[9px] font-normal opacity-80">{{ disponiblesSeccion(s) }} vac.</span>
                  </button>
                }
              </div>
            </div>

            <!-- Preview documentos -->
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <div class="flex items-center gap-2 text-amber-800 text-sm font-semibold mb-3">
                <span class="icon icon-sm text-amber-500">folder_open</span>
                Documentos requeridos para <span class="text-indigo-600">{{ gradoNombre() }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                @for (d of docsDelGrado(); track d.tipo) {
                  <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                    [ngClass]="d.obligatorio ? 'bg-red-100 text-red-700' : 'bg-white text-gray-500 border border-gray-200'">
                    @if (d.obligatorio) { <span class="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span> }
                    {{ d.tipo }}
                  </span>
                }
              </div>
              <p class="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                Obligatorio · Se registrarán en el siguiente paso
              </p>
            </div>
          </div>
        </div>
      }

      <!-- ══════════════ PASO 4: DOCUMENTOS ══════════════ -->
      @if (paso === 4) {
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          <div class="px-6 py-5 border-b flex items-center justify-between bg-gradient-to-r from-teal-50 via-teal-50/50 to-transparent">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
                <span class="icon text-teal-600" style="font-size:22px">folder_open</span>
              </div>
              <div>
                <h3 class="font-bold text-gray-900">Documentos — {{ gradoNombre() }}</h3>
                <p class="text-xs text-gray-500">Marca los documentos recibidos y adjunta su imagen</p>
              </div>
            </div>
            <!-- Indicador circular -->
            <div class="w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-xs transition-all"
              [ngClass]="docEntregados() === form.documentos.length && form.documentos.length > 0
                ? 'border-green-400 text-green-600 bg-green-50'
                : docEntregados() >= docObligatorios() && docObligatorios() > 0
                  ? 'border-amber-400 text-amber-600 bg-amber-50'
                  : 'border-indigo-200 text-indigo-600 bg-indigo-50'">
              {{ Math.round(docEntregados() / (form.documentos.length || 1) * 100) }}%
            </div>
          </div>

          <div class="p-6 space-y-4">
            <!-- Barra de progreso -->
            <div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500"
                  [ngClass]="docEntregados() === form.documentos.length && form.documentos.length > 0 ? 'bg-green-500'
                             : docEntregados() >= docObligatorios() && docObligatorios() > 0 ? 'bg-amber-400' : 'bg-indigo-500'"
                  [style.width]="(docEntregados() / (form.documentos.length || 1) * 100) + '%'"></div>
              </div>
              <div class="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>{{ docObligatorios() }} obligatorios · {{ form.documentos.length - docObligatorios() }} opcionales</span>
                @if (docEntregados() >= docObligatorios() && docObligatorios() > 0) {
                  <span class="text-green-600 font-medium flex items-center gap-1">
                    <span class="icon" style="font-size:12px">check_circle</span> Obligatorios completos
                  </span>
                }
              </div>
            </div>

            <!-- Lista de documentos -->
            <div class="space-y-2">
              @for (doc of form.documentos; track doc.tipo; let i = $index) {
                <div class="flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200"
                  [ngClass]="doc.estado === 'entregado' ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white hover:border-indigo-100'">

                  <!-- Custom checkbox -->
                  <label class="cursor-pointer shrink-0">
                    <input type="checkbox" class="sr-only" [checked]="doc.estado === 'entregado'" (change)="toggleDocEstado(i, $event)">
                    <div class="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                      [ngClass]="doc.estado === 'entregado'
                        ? 'bg-green-500 border-green-500 shadow-md shadow-green-200'
                        : 'border-gray-300 hover:border-green-400 hover:bg-green-50'">
                      @if (doc.estado === 'entregado') {
                        <span class="icon text-white" style="font-size:15px">check</span>
                      }
                    </div>
                  </label>

                  <!-- Thumbnail / subir -->
                  @if (doc.imagenUrl) {
                    <div class="w-12 h-12 rounded-xl overflow-hidden border-2 border-green-200 shrink-0 cursor-pointer shadow-sm hover:shadow-md transition-shadow" (click)="visorDoc.set(doc)">
                      <img [src]="doc.imagenUrl" class="w-full h-full object-cover">
                    </div>
                  } @else {
                    <label class="w-12 h-12 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer shrink-0 hover:border-indigo-400 hover:bg-indigo-50 transition-all group" title="Subir imagen">
                      <span class="icon text-gray-300 group-hover:text-indigo-400 transition-colors" style="font-size:20px">cloud_upload</span>
                      <span class="text-[8px] text-gray-300 group-hover:text-indigo-400 transition-colors mt-0.5">subir</span>
                      <input type="file" accept="image/*" class="hidden" (change)="onImgDoc($event, i)">
                    </label>
                  }

                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-gray-800">{{ doc.tipo }}</div>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      @if (doc.obligatorio) {
                        <span class="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Obligatorio</span>
                      } @else {
                        <span class="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Opcional</span>
                      }
                      @if (doc.imagenUrl) {
                        <span class="text-[10px] text-indigo-500 flex items-center gap-0.5">
                          <span class="icon" style="font-size:11px">attach_file</span> adjunto
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Estado + acciones -->
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs px-2.5 py-1 rounded-full font-semibold"
                      [ngClass]="doc.estado === 'entregado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'">
                      {{ doc.estado }}
                    </span>
                    @if (doc.imagenUrl) {
                      <label class="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors" title="Reemplazar imagen">
                        <span class="icon icon-sm">refresh</span>
                        <input type="file" accept="image/*" class="hidden" (change)="onImgDoc($event, i)">
                      </label>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Agregar doc extra -->
            @if (!docExtraAbierto()) {
              <button type="button"
                class="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium
                       hover:border-teal-300 hover:text-teal-500 hover:bg-teal-50/40 transition-all flex items-center justify-center gap-2"
                (click)="docExtraAbierto.set(true)">
                <span class="icon icon-sm">add_circle_outline</span> Agregar documento adicional
              </button>
            } @else {
              <div class="p-4 bg-teal-50 rounded-2xl border-2 border-teal-200 space-y-3">
                <p class="text-xs font-bold text-teal-700 uppercase tracking-wide">Nuevo documento</p>
                <div class="flex gap-2 items-end">
                  <div class="form-group flex-1 mb-0">
                    <label class="form-label">Tipo de documento</label>
                    <input class="form-input" [(ngModel)]="docExtraTipo" placeholder="Ej: Ficha Psicológica" (keyup.enter)="agregarDocExtra()">
                  </div>
                  <label class="flex items-center gap-1.5 cursor-pointer pb-1 whitespace-nowrap text-sm text-gray-600 select-none">
                    <input type="checkbox" class="accent-teal-600" [(ngModel)]="docExtraObligatorio"> Oblig.
                  </label>
                  <button class="btn btn-primary btn-sm" (click)="agregarDocExtra()">Agregar</button>
                  <button class="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                    (click)="docExtraAbierto.set(false)"><span class="icon">close</span></button>
                </div>
              </div>
            }

            @if (docObligatoriosPendientes() > 0) {
              <div class="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
                <span class="icon text-amber-500 shrink-0 mt-0.5">warning</span>
                <span>Quedan <strong>{{ docObligatoriosPendientes() }}</strong> documento(s) obligatorio(s) pendiente(s).
                  Puedes continuar y completarlos después desde el expediente del alumno.</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- ══════════════ PASO 5: CONFIRMACIÓN ══════════════ -->
      @if (paso === 5) {
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          <!-- Banner verde -->
          <div class="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-10 flex flex-col items-center text-center">
            <div class="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 ring-4 ring-white/20">
              <span class="icon text-white" style="font-size:46px">check_circle</span>
            </div>
            <h3 class="text-2xl font-bold text-white">¡Matrícula completada!</h3>
            <p class="text-green-100 text-sm mt-1">{{ nombreCompletoEstudiante() }} · {{ gradoNombre() }} — Sección {{ form.seccion }}</p>
            @if (resultado()?.codigo) {
              <div class="mt-4 px-5 py-2.5 bg-white/20 backdrop-blur-sm rounded-xl text-white font-mono text-lg tracking-wider">
                Código: {{ resultado()!.codigo }}
              </div>
            }
          </div>

          <!-- Resumen -->
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <!-- Estudiante -->
              <div class="bg-gray-50 rounded-2xl p-4">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <span class="icon text-indigo-600" style="font-size:15px">person</span>
                  </div>
                  <span class="text-sm font-bold text-gray-700">Estudiante</span>
                </div>
                <div class="space-y-2 text-sm">
                  <div><span class="text-xs text-gray-400 block">Nombre completo</span><span class="font-semibold">{{ nombreCompletoEstudiante() }}</span></div>
                  <div><span class="text-xs text-gray-400 block">Apellido paterno</span><span class="font-semibold">{{ form.apellidoPaterno || '—' }}</span></div>
                  <div><span class="text-xs text-gray-400 block">Apellido materno</span><span class="font-semibold">{{ form.apellidoMaterno || '—' }}</span></div>
                  <div><span class="text-xs text-gray-400 block">Tipo de documento</span><span class="font-semibold">{{ labelTipoDocumento(form.tipoDocumento) }}</span></div>
                  <div><span class="text-xs text-gray-400 block">{{ labelDocumento() }}</span><span class="font-semibold">{{ form.dni || '—' }}</span></div>
                  @if (direccionCompleta()) {
                    <div><span class="text-xs text-gray-400 block">Dirección</span><span class="font-semibold">{{ direccionCompleta() }}</span></div>
                  }
                  @if (form.telEmergencia.trim()) {
                    <div><span class="text-xs text-gray-400 block">Tel. emergencia</span><span class="font-semibold">{{ form.telEmergencia }}</span></div>
                  }
                  @if (resultado()?.email) {
                    <div><span class="text-xs text-gray-400 block">Correo institucional</span><span class="font-semibold text-sm">{{ resultado()!.email }}</span></div>
                  }
                  <div><span class="text-xs text-gray-400 block">Grado y sección</span><span class="font-semibold">{{ gradoNombre() }} — Sección {{ form.seccion }}</span></div>
                </div>
              </div>

              <!-- Apoderados -->
              <div class="bg-gray-50 rounded-2xl p-4">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                    <span class="icon text-purple-600" style="font-size:15px">supervisor_account</span>
                  </div>
                  <span class="text-sm font-bold text-gray-700">Apoderados ({{ form.apoderados.length }})</span>
                </div>
                <div class="space-y-2">
                  @for (ap of form.apoderados; track $index) {
                    <div class="flex items-center gap-2.5 text-sm">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        [ngClass]="ap.esPrincipal ? 'bg-indigo-500' : 'bg-gray-400'">
                        {{ ap.nombres ? ap.nombres[0].toUpperCase() : '?' }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="font-semibold truncate">{{ nombreCompletoApoderado(ap) || '—' }}</div>
                        <div class="text-xs text-gray-400 capitalize">
                          {{ ap.parentesco }}
                          · {{ labelTipoDocumento(ap.tipoDocumento) }} {{ ap.dni || '—' }}
                          {{ ap.celular ? ' · ' + ap.celular : '' }}
                        </div>
                      </div>
                      @if (ap.esPrincipal) {
                        <span class="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Principal</span>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Documentos -->
              <div class="bg-gray-50 rounded-2xl p-4 sm:col-span-2">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                      <span class="icon text-teal-600" style="font-size:15px">folder</span>
                    </div>
                    <span class="text-sm font-bold text-gray-700">Documentos</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                      <div class="h-full bg-green-500 rounded-full transition-all"
                        [style.width]="(docEntregados() / (form.documentos.length || 1) * 100) + '%'"></div>
                    </div>
                    <span class="text-xs text-gray-500">{{ docEntregados() }}/{{ form.documentos.length }}</span>
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  @for (doc of form.documentos; track doc.tipo) {
                    <div class="flex items-center gap-2 py-1.5 text-sm">
                      <span class="icon" style="font-size:16px"
                        [ngClass]="doc.estado === 'entregado' ? 'text-green-500' : 'text-gray-300'">
                        {{ doc.estado === 'entregado' ? 'check_circle' : 'radio_button_unchecked' }}
                      </span>
                      <span [ngClass]="doc.estado === 'entregado' ? 'text-gray-800' : 'text-gray-400'">{{ doc.tipo }}</span>
                      @if (doc.obligatorio) { <span class="text-red-400 text-xs font-bold">*</span> }
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="flex gap-3 justify-center pt-2">
              <a routerLink="/matricula/matriculados" class="btn btn-secondary">
                <span class="icon icon-sm">list</span> Ver Matrículas
              </a>
              <button class="btn btn-primary" (click)="reiniciar()">
                <span class="icon icon-sm">add</span> Nueva Matrícula
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Visor imagen -->
      @if (visorDoc()) {
        <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" (click)="visorDoc.set(null)">
          <div class="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between px-4 py-3 border-b">
              <span class="font-semibold text-sm text-gray-800">{{ visorDoc()!.tipo }}</span>
              <button class="btn-icon" (click)="visorDoc.set(null)"><span class="icon">close</span></button>
            </div>
            <img [src]="visorDoc()!.imagenUrl" alt="documento" class="w-full max-h-[70vh] object-contain bg-gray-50">
          </div>
        </div>
      }

      <!-- ── NAVEGACIÓN ── -->
      @if (paso < 5) {
        <div class="flex items-center justify-between">
          <button class="btn btn-secondary" [disabled]="paso === 1" (click)="paso = paso - 1">
            <span class="icon">arrow_back</span> Anterior
          </button>
          <!-- Dots indicadores -->
          <div class="flex items-center gap-1.5">
            @for (p of pasos.slice(0, -1); track p.id) {
              <div class="rounded-full transition-all duration-300"
                [ngClass]="paso === p.id ? (p.dot + ' w-5 h-2') : paso > p.id ? 'bg-green-400 w-2 h-2' : 'bg-gray-200 w-2 h-2'"></div>
            }
          </div>
          <button class="btn btn-primary" [disabled]="saving()" (click)="siguiente()">
            @if (saving()) {
              <span class="icon animate-spin">progress_activity</span> Guardando...
            } @else {
              {{ paso === 4 ? 'Finalizar' : 'Siguiente' }}
              <span class="icon">{{ paso === 4 ? 'check' : 'arrow_forward' }}</span>
            }
          </button>
        </div>
      }
    </div>
  `
})
export class NuevaMatriculaComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly matriculaService = inject(NuevaMatriculaService);
  readonly Math = Math;
  readonly saving = this.matriculaService.saving;

  paso = 1;
  pasos: Paso[] = [
    { id:1, titulo:'Estudiante', icon:'person',             color:'bg-indigo-600',  ring:'bg-indigo-600',  ringColor:'ring-indigo-200',  textColor:'text-indigo-600',  dot:'bg-indigo-500' },
    { id:2, titulo:'Apoderados', icon:'supervisor_account', color:'bg-purple-600',  ring:'bg-purple-600',  ringColor:'ring-purple-200',  textColor:'text-purple-600',  dot:'bg-purple-500' },
    { id:3, titulo:'Grado',      icon:'school',             color:'bg-amber-500',   ring:'bg-amber-500',   ringColor:'ring-amber-200',   textColor:'text-amber-600',   dot:'bg-amber-400'  },
    { id:4, titulo:'Documentos', icon:'folder_open',        color:'bg-teal-600',    ring:'bg-teal-600',    ringColor:'ring-teal-200',    textColor:'text-teal-600',    dot:'bg-teal-500'   },
    { id:5, titulo:'Listo',      icon:'check_circle',       color:'bg-green-600',   ring:'bg-green-600',   ringColor:'ring-green-200',   textColor:'text-green-600',   dot:'bg-green-500'  },
  ];

  niveles: { val: 'inicial' | 'primaria' | 'secundaria'; label: string; icon: string; active: string }[] = [
    { val:'inicial',    label:'Inicial',    icon:'child_care',  active:'border-orange-400 bg-orange-50 text-orange-700'  },
    { val:'primaria',   label:'Primaria',   icon:'menu_book',   active:'border-indigo-500 bg-indigo-50 text-indigo-700'  },
    { val:'secundaria', label:'Secundaria', icon:'school',      active:'border-purple-500 bg-purple-50 text-purple-700'  },
  ];

  readonly tiposDocumento = TIPOS_DOCUMENTO_IDENTIDAD;

  form = {
    nombres:'', apellidoPaterno:'', apellidoMaterno:'', tipoDocumento:'DNI' as TipoDocumentoIdentidad, dni:'', fechaNac:'', sexo:'', telEmergencia:'',
    direccion:'', distrito:'', provincia:'Lima', departamento:'Lima',
    apoderados: [apoderadoVacio(true)] as Apoderado[],
    nivel:'primaria', grado:'1', seccion:'A',
    documentos: [] as DocMat[],
  };

  visorDoc        = signal<DocMat | null>(null);
  docExtraAbierto = signal(false);
  docExtraTipo    = '';
  docExtraObligatorio = false;
  error           = signal<string | null>(null);
  fieldErrors     = signal<ErroresCampoMatricula>({});
  resultado       = signal<ExpedienteCreado | null>(null);
  ocupacion       = signal<OcupacionSeccion[]>([]);

  ngOnInit() { this.layout.setTitle('Nueva Matrícula'); }

  seleccionarNivel(val: 'inicial' | 'primaria' | 'secundaria'): void {
    this.form.nivel = val;
    this.form.grado = '1';
    this.cargarOcupacion();
  }

  seleccionarGrado(g: string): void {
    this.form.grado = g;
    this.cargarOcupacion();
  }

  cargarOcupacion(): void {
    const nivel = nivelLabel(this.form.nivel as 'inicial' | 'primaria' | 'secundaria');
    const grado = `${this.form.grado}°`;
    this.matriculaService.loadOccupancy(nivel, grado).subscribe({
      next: (data) => this.ocupacion.set(data),
      error: () => this.ocupacion.set([]),
    });
  }

  disponiblesSeccion(seccion: string): number {
    const item = this.ocupacion().find((o) => o.seccion === seccion);
    return item?.disponibles ?? 30;
  }

  gradoNombre(): string {
    const niv = this.form.nivel === 'primaria' ? 'Primaria' : this.form.nivel === 'secundaria' ? 'Secundaria' : 'Inicial';
    return `${this.form.grado}° ${niv}`;
  }

  apellidosCompletos(): string {
    return joinApellidos(this.form.apellidoPaterno, this.form.apellidoMaterno);
  }

  nombreCompletoEstudiante(): string {
    const apellidos = this.apellidosCompletos();
    return apellidos ? `${this.form.nombres.trim()} ${apellidos}` : this.form.nombres.trim();
  }

  labelDocumento(): string {
    return labelNumeroDocumento(this.form.tipoDocumento);
  }

  placeholderDocumento(): string {
    return placeholderNumeroDocumento(this.form.tipoDocumento);
  }

  maxLengthDocumento(): number {
    return maxLengthNumeroDocumento(this.form.tipoDocumento);
  }

  labelTipoDocumento(tipo: TipoDocumentoIdentidad): string {
    return TIPOS_DOCUMENTO_IDENTIDAD.find((t) => t.value === tipo)?.label ?? tipo;
  }

  direccionCompleta(): string {
    return formatDireccion(this.form);
  }

  nombreCompletoApoderado(ap: Apoderado): string {
    const apellidos = joinApellidos(ap.apellidoPaterno, ap.apellidoMaterno);
    return apellidos ? `${ap.nombres.trim()} ${apellidos}` : ap.nombres.trim();
  }

  labelDocumentoApoderado(ap: Apoderado): string {
    return labelNumeroDocumento(ap.tipoDocumento);
  }

  placeholderDocumentoApoderado(ap: Apoderado): string {
    return placeholderNumeroDocumento(ap.tipoDocumento);
  }

  maxLengthDocumentoApoderado(ap: Apoderado): number {
    return maxLengthNumeroDocumento(ap.tipoDocumento);
  }

  gradosDisponibles(): string[] {
    if (this.form.nivel === 'inicial')    return ['1','2','3'];
    if (this.form.nivel === 'secundaria') return ['1','2','3','4','5'];
    return ['1','2','3','4','5','6'];
  }

  docsDelGrado(): { tipo: string; obligatorio: boolean }[] {
    return requisitosPorGrado(this.gradoNombre());
  }
  docEntregados(): number { return this.form.documentos.filter(d => d.estado === 'entregado').length; }
  docObligatorios(): number { return this.form.documentos.filter(d => d.obligatorio).length; }
  docObligatoriosPendientes(): number { return this.form.documentos.filter(d => d.obligatorio && d.estado === 'pendiente').length; }

  siguiente(): void {
    this.error.set(null);

    if (this.paso === 1 && !this.validarPaso1()) return;
    if (this.paso === 2 && !this.validarPaso2()) return;

    if (this.paso === 4) {
      this.finalizarMatricula();
      return;
    }

    if (this.paso === 3) {
      this.form.documentos = this.docsDelGrado().map((r) => ({
        tipo: r.tipo,
        obligatorio: r.obligatorio,
        estado: 'pendiente' as const,
      }));
      this.docExtraAbierto.set(false);
      this.fieldErrors.set({});
      this.paso++;
      return;
    }

    if (this.paso === 2) {
      this.cargarOcupacion();
      this.fieldErrors.set({});
      this.paso++;
      return;
    }

    this.fieldErrors.set({});
    if (this.paso < 5) this.paso++;
  }

  validarPaso1(): boolean {
    const errors = validarEstudianteCampos(this.form);
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.error.set(primerErrorMatricula(errors));
      return false;
    }
    return true;
  }

  validarPaso2(): boolean {
    const errors = validarApoderadosCampos(this.form.apoderados);
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.error.set(primerErrorMatricula(errors));
      return false;
    }
    return true;
  }

  campoError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  campoInvalido(key: string): boolean {
    return !!this.fieldErrors()[key];
  }

  limpiarCampo(key: string): void {
    if (!this.fieldErrors()[key]) return;
    const next = { ...this.fieldErrors() };
    delete next[key];
    this.fieldErrors.set(next);
    if (!Object.keys(next).length) this.error.set(null);
  }

  claseCampo(key: string): string {
    return this.campoInvalido(key) ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : '';
  }

  apoderadoCampoKey(i: number, campo: string): string {
    return `ap-${i}-${campo}`;
  }

  finalizarMatricula(): void {
    const payload = buildNuevaMatriculaPayload({
      ...this.form,
      nivel: this.form.nivel as 'inicial' | 'primaria' | 'secundaria',
    });

    this.matriculaService.crear(payload).subscribe({
      next: (res) => {
        this.resultado.set(res);
        this.paso = 5;
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.error.set(typeof msg === 'string' ? msg : 'No se pudo registrar la matrícula. Intenta nuevamente.');
      },
    });
  }

  toggleDocEstado(i: number, e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.form.documentos[i] = { ...this.form.documentos[i], estado: checked ? 'entregado' : 'pendiente' };
  }

  onImgDoc(event: Event, i: number): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.form.documentos[i] = { ...this.form.documentos[i], imagenUrl: e.target?.result as string, estado: 'entregado' };
    };
    reader.readAsDataURL(file);
  }

  agregarDocExtra(): void {
    const tipo = this.docExtraTipo.trim();
    if (!tipo) return;
    this.form.documentos = [...this.form.documentos, { tipo, obligatorio: this.docExtraObligatorio, estado: 'pendiente' }];
    this.docExtraTipo = ''; this.docExtraObligatorio = false;
    this.docExtraAbierto.set(false);
  }

  agregarApoderado(): void { this.form.apoderados = [...this.form.apoderados, apoderadoVacio(false)]; }
  eliminarApoderado(i: number): void { this.form.apoderados = this.form.apoderados.filter((_, idx) => idx !== i); }
  marcarPrincipal(i: number): void { this.form.apoderados = this.form.apoderados.map((ap, idx) => ({ ...ap, esPrincipal: idx === i })); }

  reiniciar(): void {
    this.paso = 1;
    this.error.set(null);
    this.fieldErrors.set({});
    this.resultado.set(null);
    this.ocupacion.set([]);
    this.form = { nombres:'', apellidoPaterno:'', apellidoMaterno:'', tipoDocumento:'DNI', dni:'', fechaNac:'', sexo:'', telEmergencia:'',
      direccion:'', distrito:'', provincia:'Lima', departamento:'Lima',
      apoderados: [apoderadoVacio(true)], nivel:'primaria', grado:'1', seccion:'A', documentos:[] };
  }
}
