import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { MAESTROS_NAV, type MaestroNavItem } from './maestros-nav.config';

@Component({
  selector: 'app-maestros',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
<div class="space-y-5 animate-fade-in">

  <div>
    <h2 class="text-2xl font-bold text-gray-900">Maestros</h2>
    <p class="text-sm text-gray-400 mt-0.5">
      Datos de configuracion necesarios para el funcionamiento del sistema
    </p>
  </div>

  <div class="flex flex-col lg:flex-row gap-5 items-start">
    <aside class="w-full lg:w-64 shrink-0 lg:sticky lg:top-4">
      <nav class="card p-2 space-y-0.5 max-h-[calc(100vh-7rem)] overflow-y-auto">
        @for (item of navItems; track item.route) {
          <a [routerLink]="item.route"
             routerLinkActive="bg-indigo-50 text-indigo-700 border-indigo-200"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-gray-50 transition-colors">
            <span class="icon text-indigo-500 mt-0.5">{{ item.icon }}</span>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-800">{{ item.label }}</p>
              <p class="text-[11px] text-gray-400 leading-snug">{{ item.description }}</p>
            </div>
          </a>
        }
      </nav>
    </aside>

    <section class="flex-1 min-w-0">
      <router-outlet />
    </section>
  </div>
</div>
  `,
})
export class MaestrosComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  readonly navItems = MAESTROS_NAV.filter((item) => this.puedeVerItem(item));

  ngOnInit(): void {
    this.layout.setTitle('Maestros');
  }

  private puedeVerItem(item: MaestroNavItem): boolean {
    if (!item.permisos?.length) return true;
    return this.auth.isAdmin() || this.auth.hasAnyPermiso(...item.permisos);
  }
}
