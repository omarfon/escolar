import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../../auth/services/auth.service';
import { TenantContextService } from '../../../tenant/tenant-context.service';
import {
  DirectorioInstitucionesService,
  InstitucionDirectorio,
} from '../../../../features/instituciones/directorio-instituciones.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <header class="h-16 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0 shadow-sm">
      @if (!auth.isPortalEstudiante() || !layout.isPhone()) {
        <button class="btn-icon" (click)="layout.toggle()" title="Menu">
          <span class="icon">menu</span>
        </button>
      }
      <h1 class="text-base font-semibold text-gray-800 flex-1 truncate">{{ layout.pageTitle() }}</h1>
      @if (auth.isSiagie()) {
        <div class="hidden sm:flex items-center gap-2 max-w-[min(100%,20rem)] shrink-0">
          <label class="sr-only" for="tenant-ie-select">Institución educativa</label>
          <select
            id="tenant-ie-select"
            class="text-sm border border-gray-200 rounded-lg px-2 py-1.5 truncate max-w-full bg-white"
            [ngModel]="tenant.activeInstitutionId() ?? ''"
            (ngModelChange)="onInstitucionChange($event)"
            [class.border-amber-400]="tenant.requiresSelection()">
            <option value="">— Seleccionar IE —</option>
            @for (ie of instituciones(); track ie.id) {
              <option [value]="ie.id">{{ ie.siglas }} · {{ ie.nombre }} ({{ ie.alumnos }} alumnos)</option>
            }
          </select>
        </div>
      }
      <div class="flex items-center gap-1">
        <button class="btn-icon" title="Buscar"><span class="icon">search</span></button>
        <!-- Notificaciones -->
        <div class="relative">
          <button class="btn-icon relative" (click)="notifOpen.set(!notifOpen())" title="Notificaciones">
            <span class="icon">notifications</span>
            <span class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">3</span>
          </button>
          @if (notifOpen()) {
            <div class="dropdown-menu dropdown-menu-right w-80">
              <div class="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">Notificaciones</div>
              @for (n of notifications; track n.id) {
                <div class="dropdown-item !items-start !py-3">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" [class]="n.iconBg">
                    <span class="icon icon-sm text-white">{{ n.icon }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-800">{{ n.title }}</div>
                    <div class="text-xs text-gray-500">{{ n.time }}</div>
                  </div>
                </div>
              }
              <div class="px-4 py-2 border-t border-gray-100 text-center">
                <a
                  [routerLink]="notificacionesRoute()"
                  class="text-xs text-indigo-600 hover:underline"
                  (click)="notifOpen.set(false)">Ver todas</a>
              </div>
            </div>
          }
        </div>
        <!-- Perfil -->
        <div class="relative ml-1">
          <button class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer"
            (click)="userOpen.set(!userOpen())">{{ initiales() }}</button>
          @if (userOpen()) {
            <div class="dropdown-menu dropdown-menu-right w-56">
              <div class="px-4 py-3 border-b border-gray-100 pointer-events-none">
                <div class="font-semibold text-gray-800 text-sm">{{ auth.nombreCompleto() }}</div>
                <div class="text-xs text-gray-500 truncate">{{ auth.currentUser()?.email }}</div>
              </div>
              <a
                class="dropdown-item"
                [routerLink]="perfilRoute()"
                (click)="userOpen.set(false)">
                <span class="icon icon-sm">person</span> Mi Perfil
              </a>
              <a
                class="dropdown-item"
                routerLink="/cuenta/cambiar-contrasena"
                (click)="userOpen.set(false)">
                <span class="icon icon-sm">lock</span> Cambiar contraseña
              </a>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item danger w-full text-left" (click)="auth.logout()">
                <span class="icon icon-sm">logout</span> Cerrar Sesion
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent implements OnInit {
  readonly layout = inject(LayoutService);
  readonly auth   = inject(AuthService);
  readonly tenant = inject(TenantContextService);
  private readonly directorio = inject(DirectorioInstitucionesService);
  readonly instituciones = signal<InstitucionDirectorio[]>([]);
  notifOpen = signal(false);
  userOpen  = signal(false);
  notifications = [
    { id: 1, title: 'Nuevo pago registrado', time: 'Hace 5 min', icon: 'payments', iconBg: 'bg-green-500' },
    { id: 2, title: '3 solicitudes de matricula pendientes', time: 'Hace 1 hora', icon: 'assignment', iconBg: 'bg-blue-500' },
    { id: 3, title: 'Alerta: 5 estudiantes con inasistencia', time: 'Hace 2 horas', icon: 'warning', iconBg: 'bg-orange-500' },
  ];
  ngOnInit(): void {
    if (!this.auth.isSiagie()) return;
    this.directorio.instituciones().subscribe({
      next: (list) => {
        this.instituciones.set(list);
        this.syncInstitutionLabel(list);
        this.ensureDefaultInstitution(list);
      },
      error: () => this.instituciones.set([]),
    });
  }

  private institutionLabel(ie: InstitucionDirectorio): string {
    return `${ie.siglas} · ${ie.nombre}`;
  }

  private syncInstitutionLabel(list: InstitucionDirectorio[]): void {
    const id = this.tenant.activeInstitutionId();
    if (id == null) return;
    const ie = list.find((item) => item.id === id);
    if (ie) {
      this.tenant.setActiveInstitutionId(id, { label: this.institutionLabel(ie) });
    }
  }

  /** Primera visita SIAGIE: selecciona la IE con más alumnos para evitar listas vacías. */
  private ensureDefaultInstitution(list: InstitucionDirectorio[]): void {
    if (!list.length || this.tenant.activeInstitutionId() != null) return;
    const best = [...list].sort((a, b) => b.alumnos - a.alumnos)[0];
    if (best?.alumnos > 0) {
      this.tenant.setActiveInstitutionId(best.id, { label: this.institutionLabel(best) });
    }
  }

  onInstitucionChange(raw: string | number | null): void {
    const value = raw === '' || raw == null ? null : Number(raw);
    const id = value != null && Number.isInteger(value) && value > 0 ? value : null;
    const ie = id != null ? this.instituciones().find((item) => item.id === id) : undefined;
    this.tenant.setActiveInstitutionId(id, {
      label: ie ? this.institutionLabel(ie) : undefined,
    });
  }

  initiales(): string {
    const u = this.auth.currentUser();
    return u ? `${u.nombre[0]??''}${u.apellido[0]??''}`.toUpperCase() : '?';
  }

  perfilRoute(): string {
    if (this.auth.isPortalEstudiante()) return '/portal-estudiante/perfil';
    if (this.auth.isPortalDocente()) return '/portal-docente/mis-datos';
    if (this.auth.isPortalPadre()) return '/portal-padre/ficha';
    return '/perfil';
  }

  notificacionesRoute(): string {
    if (this.auth.isPortalEstudiante()) return '/portal-estudiante/comunicados';
    if (this.auth.isPortalDocente()) return '/portal-docente/comunicados';
    if (this.auth.isPortalPadre()) return '/portal-padre/comunicacion';
    return '/comunicaciones/notificaciones';
  }
}
