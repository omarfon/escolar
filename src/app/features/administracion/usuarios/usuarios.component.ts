import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { RolesService } from '../roles/roles.service';
import { UsuariosService } from './usuarios.service';
import {
  AmbitoTerritorial,
  EstadoUsuario,
  RolUsuario,
  UserRoleAssignment,
  Usuario,
} from './usuarios.model';
import {
  descargarPlantillaUsuarios,
  FilaCargaUsuario,
  parsearArchivoUsuarios,
} from './usuarios-carga.util';
import {
  ErroresCampoUsuario,
  primerErrorUsuario,
  usuarioFormularioMinimoListo,
  validarCampoUsuario,
  validarUsuarioForm,
} from './usuario-form.validation';

function initials(n: string, a: string) { return (n[0] ?? '') + (a[0] ?? ''); }

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="space-y-5">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Gestion de Usuarios</h2>
          <p class="text-sm text-gray-500">
            @if (svc.loading()) {
              Cargando usuarios...
            } @else {
              {{ totalFiltrados() }} usuario(s) · pagina {{ paginaActual() }} de {{ totalPaginas() }}
            }
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-secondary" (click)="abrirCargaMasiva()">
            <span class="icon">upload_file</span> Carga masiva
          </button>
          <button class="btn btn-primary" (click)="abrirDrawer()">
            <span class="icon">person_add</span> Nuevo Usuario
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="relative lg:col-span-2">
            <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input class="form-input pl-10" type="text" placeholder="Buscar por nombre, email, DNI..."
              [ngModel]="filtro().busqueda" (ngModelChange)="actualizarFiltro('busqueda', $event)">
          </div>
          <div>
            <select class="form-select" [ngModel]="filtro().rol" (ngModelChange)="actualizarFiltro('rol', $event)">
              <option value="">Todos los roles</option>
              @for (r of roles; track r.value) {
                <option [value]="r.value">{{ r.label }}</option>
              }
            </select>
          </div>
          <div>
            <select class="form-select" [ngModel]="filtro().estado" (ngModelChange)="actualizarFiltro('estado', $event)">
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="card overflow-hidden">
        <table class="data-table">
          <thead>
            <tr>
              <th class="text-left">Usuario</th>
              <th class="text-left hidden md:table-cell">DNI</th>
              <th class="text-left hidden lg:table-cell">Contacto</th>
              <th class="text-left">Rol</th>
              <th class="text-left hidden sm:table-cell">Sede</th>
              <th class="text-center">Estado</th>
              <th class="text-left hidden xl:table-cell">Ultimo acceso</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (svc.loading()) {
              <tr>
                <td colspan="8" class="py-12 text-center text-gray-400">
                  <span class="icon icon-2xl block mb-2 animate-pulse">hourglass_empty</span>
                  Cargando usuarios desde el servidor...
                </td>
              </tr>
            } @else {
            @for (u of paginados(); track u.id) {
              <tr class="hover:bg-gray-50">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      [ngClass]="colorAvatar(u.rol)">
                      {{ initiales(u.nombres, u.apellidos) }}
                    </div>
                    <div>
                      <div class="font-medium text-gray-900 text-sm">{{ u.apellidos }}, {{ u.nombres }}</div>
                      <div class="text-xs text-gray-400">{{ u.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="hidden md:table-cell text-sm text-gray-600">{{ u.dni }}</td>
                <td class="hidden lg:table-cell text-sm text-gray-600">{{ u.telefono }}</td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    @for (r of rolesDeUsuario(u); track r) {
                      <span class="badge text-xs" [ngClass]="badgeRol(r)">{{ labelRol(r) }}</span>
                    }
                  </div>
                </td>
                <td class="hidden sm:table-cell text-xs text-gray-500">{{ u.sede }}</td>
                <td class="text-center">
                  <span class="badge text-xs"
                    [ngClass]="u.estado === 'activo' ? 'badge-green' : u.estado === 'bloqueado' ? 'badge-red' : 'badge-gray'">
                    {{ u.estado }}
                  </span>
                </td>
                <td class="hidden xl:table-cell text-xs text-gray-400">{{ u.ultimoAcceso || 'Nunca' }}</td>
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button class="btn-icon text-indigo-500" title="Editar" (click)="editarUsuario(u)">
                      <span class="icon icon-sm">edit</span>
                    </button>
                    <button class="btn-icon" title="Cambiar estado"
                      [ngClass]="u.estado === 'activo' ? 'text-yellow-500' : 'text-green-500'"
                      (click)="toggleEstado(u)">
                      <span class="icon icon-sm">{{ u.estado === 'activo' ? 'block' : 'check_circle' }}</span>
                    </button>
                    <button class="btn-icon text-red-400" title="Eliminar" (click)="eliminarUsuario(u.id)">
                      <span class="icon icon-sm">delete_outline</span>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="py-12 text-center text-gray-400">
                  <span class="icon icon-2xl block mb-2">search_off</span>
                  No se encontraron usuarios
                </td>
              </tr>
            }
            }
          </tbody>
        </table>

        <!-- Paginado -->
        <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <span class="text-xs text-gray-500">
            Mostrando {{ inicio() + 1 }}–{{ fin() }} de {{ totalFiltrados() }} usuarios
          </span>
          <div class="flex items-center gap-1">
            <button class="btn-icon" [disabled]="paginaActual() === 1" (click)="paginaActual.update(p => p - 1)">
              <span class="icon icon-sm">chevron_left</span>
            </button>
            @for (p of paginas(); track p) {
              <button class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                [ngClass]="p === paginaActual()
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'"
                (click)="paginaActual.set(p)">{{ p }}</button>
            }
            <button class="btn-icon" [disabled]="paginaActual() === totalPaginas()" (click)="paginaActual.update(p => p + 1)">
              <span class="icon icon-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ DRAWER LATERAL DERECHO ══════════ -->
    @if (drawerAbierto()) {
      <!-- Overlay -->
      <div class="fixed inset-0 bg-black/40 z-30 backdrop-blur-sm" (click)="cerrarDrawer()"></div>
      <!-- Panel -->
      <div class="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-40 flex flex-col animate-slide-in-l">
        <!-- Header drawer -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 class="font-semibold text-gray-900">{{ form.id ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ form.id ? 'Actualiza los datos del usuario' : 'Completa el formulario para registrar' }}</p>
          </div>
          <button class="btn-icon text-gray-400" (click)="cerrarDrawer()">
            <span class="icon">close</span>
          </button>
        </div>

        <!-- Avatar preview -->
        <div class="flex items-center gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
          <div class="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
            [ngClass]="colorAvatar(rolPrincipal())">
            {{ initiales(form.nombres, form.apellidos) || '?' }}
          </div>
          <div>
            <div class="font-medium text-gray-800">
              {{ (form.nombres + ' ' + form.apellidos).trim() || 'Nombre del usuario' }}
            </div>
            <div class="text-xs text-gray-500">{{ form.email || 'email@dominio.com' }}</div>
            <span class="badge text-xs mt-1 inline-block" [ngClass]="badgeRol(rolPrincipal())">{{ labelRol(rolPrincipal()) }}</span>
          </div>
        </div>

        <!-- Cuerpo del formulario -->
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <div class="space-y-4">
            @if (errorForm()) {
              <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <span class="icon icon-sm text-red-500">error_outline</span> {{ errorForm() }}
              </div>
            }
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos personales</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Nombres <span class="text-red-400">*</span></label>
                <input class="form-input" type="text" placeholder="Ej: Juan Carlos"
                       [ngClass]="claseCampo('nombres')"
                       [(ngModel)]="form.nombres"
                       (ngModelChange)="onCampoFormChange('nombres')"
                       (blur)="onCampoBlur('nombres')">
                @if (campoError('nombres'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Apellidos <span class="text-red-400">*</span></label>
                <input class="form-input" type="text" placeholder="Ej: Perez Torres"
                       [ngClass]="claseCampo('apellidos')"
                       [(ngModel)]="form.apellidos"
                       (ngModelChange)="onCampoFormChange('apellidos')"
                       (blur)="onCampoBlur('apellidos')">
                @if (campoError('apellidos'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">DNI <span class="text-red-400">*</span></label>
                <input class="form-input" type="text" placeholder="12345678" maxlength="8" inputmode="numeric"
                       [ngClass]="claseCampo('dni')"
                       [(ngModel)]="form.dni"
                       (ngModelChange)="onCampoFormChange('dni')"
                       (blur)="onCampoBlur('dni')">
                @if (campoError('dni'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Telefono <span class="text-gray-400 font-normal">(opcional)</span></label>
                <input class="form-input" type="tel" placeholder="987654321"
                       [ngClass]="claseCampo('telefono')"
                       [(ngModel)]="form.telefono"
                       (ngModelChange)="onCampoFormChange('telefono')"
                       (blur)="onCampoBlur('telefono')">
                @if (campoError('telefono'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>

            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Cuenta y acceso</p>
            <div class="form-group">
              <label class="form-label">Correo electronico <span class="text-red-400">*</span></label>
              <input class="form-input" type="email" placeholder="usuario@colegio.edu.pe"
                     [ngClass]="claseCampo('email')"
                     [(ngModel)]="form.email"
                     (ngModelChange)="onCampoFormChange('email')"
                     (blur)="onCampoBlur('email')">
              @if (campoError('email'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Roles y ámbito</p>
            <p class="text-xs text-gray-500 mb-2">Asigne uno o más roles. Marque exactamente uno como principal.</p>
            <div class="space-y-2 mb-3">
              @for (asg of roleAssignments(); track $index; let i = $index) {
                <div class="grid grid-cols-12 gap-2 items-end border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                  <div class="col-span-12 sm:col-span-3">
                    <label class="text-[10px] text-gray-500 uppercase">Rol</label>
                    <select class="form-select text-sm" [(ngModel)]="asg.roleCodigo" [ngModelOptions]="{standalone: true}" (ngModelChange)="onRoleAssignmentChange()">
                      @for (r of rolesDisponibles(); track r.value) {
                        <option [value]="r.value">{{ r.label }}</option>
                      }
                    </select>
                  </div>
                  <div class="col-span-6 sm:col-span-2">
                    <label class="text-[10px] text-gray-500 uppercase">Ámbito</label>
                    <select class="form-select text-sm" [(ngModel)]="asg.ambito" [ngModelOptions]="{standalone: true}">
                      @for (a of ambitos; track a.value) {
                        <option [value]="a.value">{{ a.label }}</option>
                      }
                    </select>
                  </div>
                  @if (asg.ambito === 'DRE') {
                    <div class="col-span-6 sm:col-span-2">
                      <label class="text-[10px] text-gray-500 uppercase">Cód. DRE</label>
                      <input class="form-input text-sm" [(ngModel)]="asg.dreCodigo" [ngModelOptions]="{standalone: true}">
                    </div>
                  }
                  @if (asg.ambito === 'UGEL') {
                    <div class="col-span-6 sm:col-span-2">
                      <label class="text-[10px] text-gray-500 uppercase">Cód. UGEL</label>
                      <input class="form-input text-sm" [(ngModel)]="asg.ugelCodigo" [ngModelOptions]="{standalone: true}">
                    </div>
                  }
                  <div class="col-span-6 sm:col-span-2 flex items-center gap-2 pb-1">
                    <input type="radio" name="rolPrincipal" [checked]="asg.esPrincipal" (change)="marcarPrincipal(i)">
                    <span class="text-xs text-gray-600">Principal</span>
                  </div>
                  <div class="col-span-6 sm:col-span-1 flex justify-end pb-1">
                    @if (roleAssignments().length > 1) {
                      <button type="button" class="btn btn-ghost btn-icon text-red-500" (click)="quitarRol(i)" title="Quitar rol">
                        <span class="icon icon-sm">close</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
            <button type="button" class="btn btn-secondary btn-sm mb-3" (click)="agregarRol()">
              <span class="icon icon-sm">add</span> Agregar rol
            </button>
            @if (errorRoles()) {
              <p class="form-error mb-3" role="alert">{{ errorRoles() }}</p>
            }

            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Sede</label>
                <select class="form-select" [ngClass]="claseCampo('sede')"
                        [(ngModel)]="form.sede"
                        (ngModelChange)="onCampoFormChange('sede')"
                        (blur)="onCampoBlur('sede')">
                  <option value="Todas las sedes">Todas las sedes</option>
                  @for (sede of sedes(); track sede) {
                    <option [value]="sede">{{ sede }}</option>
                  }
                </select>
                @if (campoError('sede'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Cargo / Descripcion <span class="text-gray-400 font-normal">(opcional)</span></label>
              <input class="form-input" type="text" placeholder="Ej: Docente de Matematicas"
                     [ngClass]="claseCampo('cargo')"
                     [(ngModel)]="form.cargo"
                     (ngModelChange)="onCampoFormChange('cargo')"
                     (blur)="onCampoBlur('cargo')">
              @if (campoError('cargo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Estado</label>
                <select class="form-select" [ngClass]="claseCampo('estado')"
                        [(ngModel)]="form.estado"
                        (ngModelChange)="onCampoFormChange('estado')"
                        (blur)="onCampoBlur('estado')">
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
                @if (campoError('estado'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            </div>

            @if (!form.id) {
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Contrasena inicial</p>
              <div class="form-group">
                <label class="form-label">Contrasena <span class="text-red-400">*</span></label>
                <input class="form-input" type="password" placeholder="Minimo 8 caracteres"
                       [ngClass]="claseCampo('password')"
                       [(ngModel)]="form.password"
                       (ngModelChange)="onCampoFormChange('password')"
                       (blur)="onCampoBlur('password')">
                @if (campoError('password'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
              <div class="form-group">
                <label class="form-label">Confirmar contrasena <span class="text-red-400">*</span></label>
                <input class="form-input" type="password" placeholder="Repite la contrasena"
                       [ngClass]="claseCampo('password2')"
                       [(ngModel)]="form.password2"
                       (ngModelChange)="onCampoFormChange('password2')"
                       (blur)="onCampoBlur('password2')">
                @if (campoError('password2'); as err) { <p class="form-error mt-1">{{ err }}</p> }
              </div>
            }
          </div>
        </div>

        <!-- Footer drawer -->
        <div class="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button class="btn btn-primary flex-1"
                  (click)="guardarUsuario()"
                  [disabled]="!puedeGuardarForm() || svc.saving()"
                  [title]="puedeGuardarForm() ? '' : 'Completa los campos obligatorios del usuario'">
            <span class="icon">{{ form.id ? 'save' : 'person_add' }}</span>
            {{ svc.saving() ? 'Guardando...' : (form.id ? 'Guardar cambios' : 'Registrar usuario') }}
          </button>
          <button class="btn btn-secondary" (click)="cerrarDrawer()">Cancelar</button>
        </div>
      </div>
    }

    <!-- ══════════ MODAL CARGA MASIVA ══════════ -->
    @if (modalCargaAbierto()) {
      <div class="fixed inset-0 bg-black/40 z-30 backdrop-blur-sm" (click)="cerrarCargaMasiva()"></div>
      <div class="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
        md:w-full md:max-w-4xl md:max-h-[90vh] bg-white rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 class="font-semibold text-gray-900 text-lg">Carga masiva de usuarios</h3>
            <p class="text-xs text-gray-500 mt-0.5">Descarga la plantilla, completa los datos y sube el archivo CSV o Excel</p>
          </div>
          <button class="btn-icon text-gray-400" (click)="cerrarCargaMasiva()">
            <span class="icon">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="card p-4 border-dashed border-2 border-indigo-200 bg-indigo-50/40">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <span class="icon text-indigo-600">description</span>
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-800 text-sm">1. Descargar plantilla</h4>
                  <p class="text-xs text-gray-500 mt-1 mb-3">
                    Columnas: nombres, apellidos, dni, email, telefono, rol, sede, estado, cargo, password
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <button class="btn btn-secondary btn-sm" (click)="descargarPlantilla('excel')">
                      <span class="icon icon-sm">table_chart</span> Plantilla Excel
                    </button>
                    <button class="btn btn-secondary btn-sm" (click)="descargarPlantilla('csv')">
                      <span class="icon icon-sm">description</span> Plantilla CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="card p-4 border-dashed border-2 border-gray-200">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <span class="icon text-gray-600">cloud_upload</span>
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-800 text-sm">2. Subir archivo</h4>
                  <p class="text-xs text-gray-500 mt-1 mb-3">Formatos: Excel (.xlsx, .xls) o CSV (.csv)</p>
                  <label class="btn btn-primary btn-sm cursor-pointer">
                    <span class="icon icon-sm">upload_file</span> Seleccionar archivo
                    <input type="file"
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      class="hidden"
                      (change)="onArchivoSeleccionado($event)">
                  </label>
                  @if (archivoNombre()) {
                    <p class="text-xs text-gray-600 mt-2">
                      <span class="icon icon-sm align-middle">attach_file</span> {{ archivoNombre() }}
                    </p>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="card p-4 bg-gray-50 text-xs text-gray-600 space-y-1">
            <p><strong>Roles validos:</strong> ADMIN, DIRECTOR, DOCENTE, SECRETARIA, TESORERO, PADRE, ESTUDIANTE, BIBLIOTECARIO</p>
            <p><strong>Estados validos:</strong> activo, inactivo, bloqueado (por defecto: activo)</p>
            <p><strong>Password:</strong> minimo 8 caracteres por usuario</p>
          </div>

          @if (errorCarga()) {
            <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <span class="icon icon-sm">error_outline</span> {{ errorCarga() }}
            </div>
          }

          @if (filasCarga().length) {
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-gray-800 text-sm">
                Vista previa ({{ filasCarga().length }} fila{{ filasCarga().length !== 1 ? 's' : '' }})
              </h4>
              <div class="flex gap-2 text-xs">
                <span class="badge badge-green">{{ filasValidas().length }} validas</span>
                @if (filasConError().length) {
                  <span class="badge badge-red">{{ filasConError().length }} con error</span>
                }
              </div>
            </div>

            <div class="card overflow-hidden max-h-72 overflow-y-auto">
              <table class="data-table text-xs">
                <thead class="sticky top-0 bg-white">
                  <tr>
                    <th>Fila</th>
                    <th>Usuario</th>
                    <th>DNI</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Validacion</th>
                  </tr>
                </thead>
                <tbody>
                  @for (f of filasCarga(); track f.fila) {
                    <tr [ngClass]="f.valido ? '' : 'bg-red-50'">
                      <td>{{ f.fila }}</td>
                      <td>
                        <div class="font-medium">{{ f.apellidos }}, {{ f.nombres }}</div>
                        <div class="text-gray-400">{{ f.email }}</div>
                      </td>
                      <td>{{ f.dni }}</td>
                      <td><span class="badge badge-gray">{{ f.rol }}</span></td>
                      <td>{{ f.estado }}</td>
                      <td>
                        @if (f.valido) {
                          <span class="text-green-600 flex items-center gap-1">
                            <span class="icon icon-sm">check_circle</span> OK
                          </span>
                        } @else {
                          <span class="text-red-600">{{ f.errores.join(' · ') }}</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          @if (resultadoCarga(); as r) {
            <div class="card p-4 space-y-3">
              <h4 class="font-semibold text-gray-800 text-sm">Resultado de la importacion</h4>
              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="p-3 bg-gray-50 rounded-lg">
                  <p class="text-xs text-gray-500">Total</p>
                  <p class="text-xl font-bold text-gray-800">{{ r.total }}</p>
                </div>
                <div class="p-3 bg-green-50 rounded-lg">
                  <p class="text-xs text-green-600">Creados</p>
                  <p class="text-xl font-bold text-green-700">{{ r.creados }}</p>
                </div>
                <div class="p-3 bg-red-50 rounded-lg">
                  <p class="text-xs text-red-600">Errores</p>
                  <p class="text-xl font-bold text-red-700">{{ r.errores.length }}</p>
                </div>
              </div>
              @if (r.errores.length) {
                <div class="max-h-40 overflow-y-auto space-y-1">
                  @for (e of r.errores; track e.fila + e.email) {
                    <div class="text-xs text-red-700 p-2 bg-red-50 rounded">
                      Fila {{ e.fila }} ({{ e.email || e.dni }}): {{ e.mensaje }}
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <div class="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button class="btn btn-primary flex-1"
            [disabled]="!filasValidas().length || svc.importing()"
            (click)="ejecutarCargaMasiva()">
            <span class="icon">cloud_upload</span>
            {{ svc.importing() ? 'Importando...' : 'Importar ' + filasValidas().length + ' usuario(s)' }}
          </button>
          <button class="btn btn-secondary" (click)="cerrarCargaMasiva()">Cerrar</button>
        </div>
      </div>
    }

    @if (notificacion(); as n) {
      <div class="fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in z-50"
        [ngClass]="n.tipo === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'">
        <span class="icon">{{ n.tipo === 'success' ? 'check_circle' : 'error_outline' }}</span>
        {{ n.mensaje }}
      </div>
    }
  `
})
export class UsuariosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly svc = inject(UsuariosService);
  readonly POR_PAGINA = 10;

  drawerAbierto = signal(false);
  modalCargaAbierto = signal(false);
  paginaActual  = signal(1);
  errorForm = signal('');
  errorCarga    = signal<string | null>(null);
  archivoNombre = signal('');
  notificacion  = signal<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);
  fieldErrors = signal<ErroresCampoUsuario>({});
  camposTocados = signal<Record<string, true>>({});
  intentoGuardar = signal(false);
  private readonly formRevision = signal(0);

  readonly puedeGuardarForm = computed(() => {
    this.formRevision();
    return usuarioFormularioMinimoListo(this.valoresFormulario()) && !this.validarRoleAssignments();
  });

  readonly rolPrincipal = computed((): RolUsuario => {
    this.formRevision();
    return (this.roleAssignments().find(a => a.esPrincipal)?.roleCodigo ?? this.form.rol ?? 'DOCENTE') as RolUsuario;
  });

  private readonly _filasCarga = signal<FilaCargaUsuario[]>([]);
  readonly filasCarga = this._filasCarga.asReadonly();
  readonly filasValidas = computed(() => this._filasCarga().filter((f) => f.valido));
  readonly filasConError = computed(() => this._filasCarga().filter((f) => !f.valido));
  readonly resultadoCarga = signal<{
    total: number;
    creados: number;
    errores: { fila: number; email: string; dni: string; mensaje: string }[];
  } | null>(null);

  readonly filtro = signal({ busqueda: '', rol: '', estado: '' });

  private readonly rolesApi = inject(RolesService);
  private readonly auth = inject(AuthService);
  readonly rolesDeSede = signal<{ value: string; label: string }[]>([]);

  /** Roles de operación en IE (sin territorial ni superusuario). */
  private readonly rolesPrincipales = [
    { value: 'ADMIN',         label: 'Administrador'   },
    { value: 'DIRECTOR',      label: 'Director'        },
    { value: 'DOCENTE',       label: 'Docente'         },
    { value: 'SECRETARIA',    label: 'Secretaria'      },
    { value: 'TESORERO',      label: 'Tesorero'        },
    { value: 'PADRE',         label: 'Padre/Madre'     },
    { value: 'ESTUDIANTE',    label: 'Estudiante'      },
    { value: 'BIBLIOTECARIO', label: 'Bibliotecario'   },
  ] as const;

  private readonly rolesReservados = [
    { value: 'UGEL',   label: 'Personal UGEL'   },
    { value: 'DRE',    label: 'Personal DRE'    },
    { value: 'MINEDU', label: 'Personal MINEDU' },
    { value: 'SIAGIE', label: 'SIAGIE'          },
  ] as const;

  readonly rolesDisponibles = computed(() => {
    const veCompleto =
      this.auth.hasRole('ADMIN') || this.auth.hasRole('SIAGIE');
    const base = veCompleto
      ? [...this.rolesPrincipales, ...this.rolesReservados]
      : [...this.rolesPrincipales];
    const extra = this.rolesDeSede().filter(
      (rol) => !base.some((b) => b.value === rol.value),
    );
    return [...extra, ...base];
  });

  /** Etiquetas de rol en tabla y filtros (incluye reservados aunque no estén en el selector). */
  roles = [
    ...this.rolesPrincipales,
    { value: 'UGEL', label: 'Personal UGEL' },
    { value: 'DRE', label: 'Personal DRE' },
    { value: 'MINEDU', label: 'Personal MINEDU' },
    { value: 'SIAGIE', label: 'SIAGIE' },
  ];

  ambitos: { value: AmbitoTerritorial; label: string }[] = [
    { value: 'IE', label: 'IE' },
    { value: 'UGEL', label: 'UGEL' },
    { value: 'DRE', label: 'DRE' },
    { value: 'MINEDU', label: 'MINEDU' },
  ];

  readonly roleAssignments = signal<UserRoleAssignment[]>([this._rolVacio()]);
  readonly errorRoles = signal('');

  form: Partial<Usuario> & { password?: string; password2?: string } = this._formVacio();

  private readonly _usuarios = signal<Usuario[]>([]);
  private readonly _sedes = signal<string[]>([]);
  readonly sedes = this._sedes.asReadonly();

  // ── Computed ──
  readonly filtrados = computed(() => {
    const { busqueda, rol, estado } = this.filtro();
    const q = busqueda.toLowerCase();
    return this._usuarios().filter(u => {
      const matchQ = !q || `${u.nombres} ${u.apellidos} ${u.email} ${u.dni}`.toLowerCase().includes(q);
      const matchR = !rol || this.rolesDeUsuario(u).includes(rol as RolUsuario);
      const matchE = !estado || u.estado === estado;
      return matchQ && matchR && matchE;
    });
  });

  readonly totalFiltrados = computed(() => this.filtrados().length);
  readonly totalPaginas   = computed(() => Math.max(1, Math.ceil(this.totalFiltrados() / this.POR_PAGINA)));
  readonly inicio         = computed(() => (this.paginaActual() - 1) * this.POR_PAGINA);
  readonly fin            = computed(() => Math.min(this.inicio() + this.POR_PAGINA, this.totalFiltrados()));
  readonly paginados      = computed(() => this.filtrados().slice(this.inicio(), this.fin()));
  readonly paginas        = computed(() => {
    const total = this.totalPaginas(); const actual = this.paginaActual();
    const rango: number[] = [];
    const ini = Math.max(1, actual - 2); const fin = Math.min(total, actual + 2);
    for (let i = ini; i <= fin; i++) rango.push(i);
    return rango;
  });

  ngOnInit(): void {
    this.layout.setTitle('Gestion de Usuarios');
    this.cargarUsuarios();
    this.cargarSedes();
    this.rolesApi.load().subscribe({
      next: (data) => this.rolesDeSede.set(
        data.roles
          .filter((rol) => rol.institutionId)
          .map((rol) => ({ value: rol.codigo, label: rol.institucionNombre ? `${rol.label} · ${rol.institucionNombre}` : rol.label })),
      ),
      error: () => this.rolesDeSede.set([]),
    });
  }

  actualizarFiltro(campo: 'busqueda' | 'rol' | 'estado', valor: string): void {
    this.filtro.update(f => ({ ...f, [campo]: valor }));
    this.paginaActual.set(1);
  }

  private cargarSedes(): void {
    this.svc.loadCampuses().subscribe({
      next: campuses => this._sedes.set(campuses.map(c => c.nombre)),
    });
  }

  private cargarUsuarios(): void {
    this.svc.load().subscribe({
      next: users => this._usuarios.set(users),
      error: () => {
        this._usuarios.set([]);
        this.mostrarNotificacion('No se pudieron cargar los usuarios', 'error');
      },
    });
  }

  private mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' = 'success'): void {
    this.notificacion.set({ mensaje, tipo });
    setTimeout(() => this.notificacion.set(null), 3000);
  }

  // ── Helpers visuales ──
  initiales(n: string | undefined, a: string | undefined) { return (((n ?? '')[0] ?? '') + ((a ?? '')[0] ?? '')).toUpperCase(); }

  colorAvatar(rol: RolUsuario | undefined): string {
    const map: Record<string, string> = {
      ADMIN:'bg-indigo-600', DIRECTOR:'bg-blue-600', DOCENTE:'bg-teal-500',
      SECRETARIA:'bg-pink-500', TESORERO:'bg-amber-500', PADRE:'bg-orange-500',
      ESTUDIANTE:'bg-green-500', BIBLIOTECARIO:'bg-purple-500',
      UGEL:'bg-slate-600', DRE:'bg-slate-700', MINEDU:'bg-slate-800',
    };
    return map[rol ?? ''] ?? 'bg-gray-400';
  }

  badgeRol(rol: RolUsuario | undefined): string {
    const map: Record<string, string> = {
      ADMIN:'badge-indigo', DIRECTOR:'badge-blue', DOCENTE:'badge-green',
      SECRETARIA:'badge-purple', TESORERO:'badge-yellow', PADRE:'badge-orange',
      ESTUDIANTE:'badge-gray', BIBLIOTECARIO:'badge-purple',
      UGEL:'badge-gray', DRE:'badge-gray', MINEDU:'badge-gray',
    };
    return map[rol ?? ''] ?? 'badge-gray';
  }

  labelRol(rol: RolUsuario | undefined): string {
    return this.roles.find(r => r.value === rol)?.label ?? rol ?? '';
  }

  rolesDeUsuario(u: Usuario): RolUsuario[] {
    const activos = (u.roleAssignments ?? []).filter(a => a.activo !== false).map(a => a.roleCodigo);
    if (activos.length) return [...new Set(activos)];
    if (u.roles?.length) return u.roles;
    return u.rol ? [u.rol] : [];
  }

  onRoleAssignmentChange(): void {
    this.formRevision.update(n => n + 1);
    this.errorRoles.set(this.validarRoleAssignments() ?? '');
  }

  agregarRol(): void {
    this.roleAssignments.update(list => [...list, { ...this._rolVacio(), esPrincipal: false }]);
    this.onRoleAssignmentChange();
  }

  quitarRol(index: number): void {
    this.roleAssignments.update(list => {
      const next = list.filter((_, i) => i !== index);
      if (next.length && !next.some(a => a.esPrincipal)) next[0].esPrincipal = true;
      return next.length ? next : [this._rolVacio()];
    });
    this.onRoleAssignmentChange();
  }

  marcarPrincipal(index: number): void {
    this.roleAssignments.update(list =>
      list.map((a, i) => ({ ...a, esPrincipal: i === index })),
    );
    this.onRoleAssignmentChange();
  }

  private _rolVacio(): UserRoleAssignment {
    return { roleCodigo: 'DOCENTE', ambito: 'IE', esPrincipal: true };
  }

  private validarRoleAssignments(): string | null {
    const list = this.roleAssignments();
    if (!list.length) return 'Debe asignar al menos un rol';
    const principals = list.filter(a => a.esPrincipal);
    if (principals.length !== 1) return 'Debe marcar exactamente un rol como principal';
    for (const a of list) {
      if (a.ambito === 'DRE' && !a.dreCodigo?.trim()) return 'Indique código DRE';
      if (a.ambito === 'UGEL' && !a.ugelCodigo?.trim()) return 'Indique código UGEL';
    }
    const keys = new Set(list.map(a => `${a.roleCodigo}|${a.ambito}|${a.dreCodigo ?? ''}|${a.ugelCodigo ?? ''}`));
    if (keys.size !== list.length) return 'Hay roles duplicados con el mismo ámbito';
    return null;
  }

  // ── CRUD ──
  abrirDrawer(): void {
    this.form = this._formVacio();
    this.roleAssignments.set([this._rolVacio()]);
    this.errorRoles.set('');
    this.resetValidacionForm();
    this.drawerAbierto.set(true);
  }

  editarUsuario(u: Usuario): void {
    this.form = { ...u, password: '', password2: '' };
    this.errorRoles.set('');
    this.resetValidacionForm();
    this.drawerAbierto.set(true);
    this.svc.loadRoleAssignments(u.id).subscribe({
      next: (assignments) => {
        const activos = assignments.filter(a => a.activo !== false);
        this.roleAssignments.set(
          activos.length
            ? activos.map(a => ({ ...a }))
            : [{ roleCodigo: u.rol, ambito: 'IE', esPrincipal: true }],
        );
      },
      error: () => {
        const activos = (u.roleAssignments ?? []).filter(a => a.activo !== false);
        this.roleAssignments.set(
          activos.length
            ? activos.map(a => ({ ...a }))
            : [{ roleCodigo: u.rol, ambito: 'IE', esPrincipal: true }],
        );
      },
    });
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
    this.resetValidacionForm();
  }

  private resetValidacionForm(): void {
    this.fieldErrors.set({});
    this.camposTocados.set({});
    this.intentoGuardar.set(false);
    this.errorForm.set('');
  }

  private valoresFormulario() {
    return {
      esEdicion: !!this.form.id,
      nombres: this.form.nombres ?? '',
      apellidos: this.form.apellidos ?? '',
      dni: this.form.dni ?? '',
      email: this.form.email ?? '',
      telefono: this.form.telefono ?? '',
      rol: this.rolPrincipal(),
      sede: this.form.sede ?? 'Sede Central',
      estado: (this.form.estado ?? 'activo') as EstadoUsuario,
      cargo: this.form.cargo ?? '',
      password: this.form.password ?? '',
      password2: this.form.password2 ?? '',
    };
  }

  onCampoBlur(key: string): void {
    this.camposTocados.update((t) => ({ ...t, [key]: true }));
    this.validarCampoEnVivo(key);
  }

  onCampoFormChange(key: string): void {
    this.formRevision.update((n) => n + 1);

    if (this.camposTocados()[key] || this.intentoGuardar() || this.fieldErrors()[key]) {
      this.validarCampoEnVivo(key);
    } else {
      this.quitarErrorCampo(key);
    }

    if (key === 'password' && this.camposTocados()['password2']) {
      this.validarCampoEnVivo('password2');
    }
  }

  private validarCamposMinimosEnVivo(): void {
    const keys = this.form.id
      ? ['nombres', 'apellidos', 'dni', 'email']
      : ['nombres', 'apellidos', 'dni', 'email', 'password', 'password2'];
    for (const key of keys) {
      this.camposTocados.update((t) => ({ ...t, [key]: true }));
      this.validarCampoEnVivo(key);
    }
  }

  private validarCampoEnVivo(key: string): void {
    const err = validarCampoUsuario(this.valoresFormulario(), key);
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

  abrirCargaMasiva(): void {
    this._filasCarga.set([]);
    this.archivoNombre.set('');
    this.errorCarga.set(null);
    this.resultadoCarga.set(null);
    this.modalCargaAbierto.set(true);
  }

  cerrarCargaMasiva(): void {
    this.modalCargaAbierto.set(false);
  }

  descargarPlantilla(formato: 'csv' | 'excel' = 'excel'): void {
    descargarPlantillaUsuarios(formato);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.archivoNombre.set(file.name);
    this.errorCarga.set(null);
    this.resultadoCarga.set(null);

    parsearArchivoUsuarios(file)
      .then((filas) => {
        if (!filas.length) {
          this.errorCarga.set('El archivo no contiene filas de datos validas.');
          this._filasCarga.set([]);
          return;
        }
        this._filasCarga.set(filas);
      })
      .catch((err) => {
        this._filasCarga.set([]);
        this.errorCarga.set(err instanceof Error ? err.message : 'No se pudo leer el archivo');
      });

    input.value = '';
  }

  ejecutarCargaMasiva(): void {
    const filas = this.filasValidas();
    if (!filas.length) return;

    const usuarios = filas.map((f) => ({
      nombres: f.nombres,
      apellidos: f.apellidos,
      dni: f.dni,
      email: f.email,
      telefono: f.telefono,
      rol: f.rol,
      sede: f.sede,
      estado: f.estado,
      cargo: f.cargo,
      password: f.password,
    }));
    this.svc.bulkImport({ usuarios }).subscribe({
      next: (resultado) => {
        this.resultadoCarga.set(resultado);
        this.cargarUsuarios();
        this.mostrarNotificacion(
          `Importacion completada: ${resultado.creados} de ${resultado.total} usuario(s) creados`,
          resultado.creados > 0 ? 'success' : 'error',
        );
        if (resultado.creados === resultado.total) {
          this._filasCarga.set([]);
          this.archivoNombre.set('');
        }
      },
      error: () => {
        this.mostrarNotificacion('Error al importar usuarios', 'error');
      },
    });
  }

  guardarUsuario(): void {
    this.intentoGuardar.set(true);
    if (!this.puedeGuardarForm()) {
      this.validarCamposMinimosEnVivo();
      this.errorForm.set('Completa los campos obligatorios del usuario.');
      return;
    }

    const errors = validarUsuarioForm(this.valoresFormulario());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      this.errorForm.set(primerErrorUsuario(errors) ?? 'Revisa los datos del formulario.');
      return;
    }

    const roleErr = this.validarRoleAssignments();
    if (roleErr) {
      this.errorRoles.set(roleErr);
      this.errorForm.set(roleErr);
      return;
    }
    this.errorRoles.set('');
    this.errorForm.set('');

    const principal = this.roleAssignments().find(a => a.esPrincipal)!;
    const assignments = this.roleAssignments().map(a => ({
      roleCodigo: a.roleCodigo,
      ambito: a.ambito,
      dreCodigo: a.dreCodigo?.trim() || undefined,
      ugelCodigo: a.ugelCodigo?.trim() || undefined,
      esPrincipal: a.esPrincipal,
    }));

    const payload = {
      nombres: this.form.nombres!.trim(),
      apellidos: this.form.apellidos!.trim(),
      dni: this.form.dni!.trim(),
      email: this.form.email!.trim(),
      telefono: this.form.telefono ?? '',
      rol: principal.roleCodigo,
      sede: this.form.sede ?? 'Sede Central',
      estado: (this.form.estado ?? 'activo') as EstadoUsuario,
      cargo: this.form.cargo ?? '',
    };

    const motivo = this.form.id
      ? 'Actualización de roles desde gestión de usuarios'
      : 'Asignación inicial al crear usuario';

    const persistRoles = (userId: number) =>
      this.svc.setRoleAssignments(userId, { motivo, assignments });

    if (this.form.id) {
      this.svc.update(this.form.id, payload).subscribe({
        next: () => {
          persistRoles(this.form.id!).subscribe({
            next: () => this.finalizarGuardado(true),
            error: () => this.finalizarGuardado(true, 'Usuario guardado, pero falló la asignación de roles'),
          });
        },
        error: () => this.mostrarErrorGuardado(),
      });
    } else {
      this.svc.create({
        ...payload,
        password: this.form.password!,
        roleAssignments: assignments,
        roleAssignmentsMotivo: motivo,
      }).subscribe({
        next: () => this.finalizarGuardado(false),
        error: () => this.mostrarErrorGuardado(),
      });
    }
  }

  private finalizarGuardado(esEdicion: boolean, msg?: string): void {
    this.drawerAbierto.set(false);
    this.cargarUsuarios();
    this.mostrarNotificacion(
      msg ?? (esEdicion ? 'Usuario actualizado correctamente' : 'Usuario registrado correctamente'),
      msg ? 'error' : 'success',
    );
  }

  private mostrarErrorGuardado(): void {
    this.errorForm.set('No se pudo guardar el usuario. Verifica los datos e intenta de nuevo.');
    this.mostrarNotificacion('Error al guardar el usuario', 'error');
  }

  toggleEstado(u: Usuario): void {
    this.svc.toggleEstado(u.id).subscribe({
      next: () => {
        this.cargarUsuarios();
        this.mostrarNotificacion('Estado del usuario actualizado');
      },
      error: () => this.mostrarNotificacion('No se pudo cambiar el estado', 'error'),
    });
  }

  eliminarUsuario(id: number): void {
    if (!confirm('¿Eliminar este usuario?')) return;
    this.svc.delete(id).subscribe({
      next: () => {
        this.cargarUsuarios();
        this.mostrarNotificacion('Usuario eliminado correctamente');
      },
      error: () => this.mostrarNotificacion('No se pudo eliminar el usuario', 'error'),
    });
  }

  private _formVacio(): Partial<Usuario> & { password?: string; password2?: string } {
    return { id: 0, nombres:'', apellidos:'', dni:'', email:'', telefono:'',
      rol:'DOCENTE', sede:'Sede Central', estado:'activo', cargo:'', password:'', password2:'' };
  }
}
