import { Component, effect, inject, HostListener, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { StudentAppNavComponent } from '../student-app-nav/student-app-nav.component';
import { AuthService } from '../../../auth/services/auth.service';
import { GradingConfigService } from '../../../grading/grading-config.service';
import { TenantScopeBannerComponent } from '../tenant-scope-banner/tenant-scope-banner.component';
import { TenantContextService } from '../../../tenant/tenant-context.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, StudentAppNavComponent, TenantScopeBannerComponent],
  template: `
    <div class="flex h-screen bg-gray-50 overflow-hidden">
      @if (layout.isMobile() && layout.mobileOpen() && (!auth.isPortalEstudiante() || !layout.isPhone())) {
        <div class="fixed inset-0 bg-black/40 z-20 lg:hidden" (click)="layout.closeMobile()"></div>
      }
      @if (!auth.isPortalEstudiante() || !layout.isPhone()) {
        <app-sidebar />
      }
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out">
        <app-header />
        <app-tenant-scope-banner />
        <main
          class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 pt-4 sm:pt-6"
          [class.pb-24]="auth.isPortalEstudiante() && layout.isPhone()"
          [class.pb-6]="!auth.isPortalEstudiante() || !layout.isPhone()">
          <router-outlet />
        </main>
        @if (!auth.isPortalEstudiante() || !layout.isPhone()) {
          <footer class="shrink-0 border-t border-gray-100 bg-white px-6 py-2">
            <div class="flex items-center justify-between text-xs text-gray-400">
              <span>© 2025 EscolarERP — Sistema Integral de Gestion Escolar</span>
              <span>v1.0.0</span>
            </div>
          </footer>
        }
        @if (auth.isPortalEstudiante() && layout.isPhone()) {
          <app-student-app-nav />
        }
      </div>
      <div id="app-overlay-root" class="overlay-host" aria-hidden="true"></div>
    </div>
  `
})
export class MainLayoutComponent implements OnInit {
  readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly tenant = inject(TenantContextService);
  private readonly gradingConfig = inject(GradingConfigService);

  constructor() {
    effect(() => {
      const token = this.tenant.changeToken();
      if (token === 0 || !this.auth.isAuthenticated()) return;
      this.gradingConfig.reset();
      this.gradingConfig.load().subscribe({ error: () => {} });
    });
  }

  ngOnInit(): void {
    this._checkViewport();
    if (this.auth.isAuthenticated()) {
      this.auth.syncSessionFromServer().subscribe({ error: () => {} });
      if (!this.gradingConfig.loaded()) {
        this.gradingConfig.load().subscribe({ error: () => {} });
      }
    }
  }
  @HostListener('window:resize')
  onResize(): void { this._checkViewport(); }
  private _checkViewport(): void {
    const width = window.innerWidth;
    this.layout.setMobile(width < 1024);
    this.layout.setPhone(width < 768);
  }
}
