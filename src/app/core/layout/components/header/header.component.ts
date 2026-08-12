import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="h-16 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0 shadow-sm">
      @if (!auth.isPortalEstudiante() || !layout.isPhone()) {
        <button class="btn-icon" (click)="layout.toggle()" title="Menu">
          <span class="icon">menu</span>
        </button>
      }
      <h1 class="text-base font-semibold text-gray-800 flex-1 truncate">{{ layout.pageTitle() }}</h1>
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
export class HeaderComponent {
  readonly layout = inject(LayoutService);
  readonly auth   = inject(AuthService);
  notifOpen = signal(false);
  userOpen  = signal(false);
  notifications = [
    { id: 1, title: 'Nuevo pago registrado', time: 'Hace 5 min', icon: 'payments', iconBg: 'bg-green-500' },
    { id: 2, title: '3 solicitudes de matricula pendientes', time: 'Hace 1 hora', icon: 'assignment', iconBg: 'bg-blue-500' },
    { id: 3, title: 'Alerta: 5 estudiantes con inasistencia', time: 'Hace 2 horas', icon: 'warning', iconBg: 'bg-orange-500' },
  ];
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
