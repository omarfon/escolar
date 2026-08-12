import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService, NavItem } from '../../services/layout.service';
import { ComunicadosService } from '../../../../features/comunicaciones/comunicados/comunicados.service';

@Component({
  selector: 'app-student-app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav
      class="shrink-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Navegación principal del portal estudiante">
      <div class="flex items-stretch justify-around max-w-lg mx-auto">
        @for (item of appNav(); track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="text-indigo-600"
            [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
            class="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 text-gray-500 hover:text-indigo-600 transition-colors min-w-0">
            <span class="icon text-[22px] leading-none relative">
              {{ item.icon }}
              @if (item.badge) {
                <span class="absolute -top-1 -right-2 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {{ badgeLabel(item.badge) }}
                </span>
              }
            </span>
            <span class="text-[10px] font-medium truncate max-w-full">{{ item.label }}</span>
          </a>
        }
      </div>
    </nav>
  `,
})
export class StudentAppNavComponent {
  readonly layout = inject(LayoutService);
  private readonly comunicados = inject(ComunicadosService);

  readonly appNav = computed(() => {
    const unread = this.comunicados.noLeidosEstudiante();
    return this.layout.studentAppNav.map((item) =>
      item.route === '/portal-estudiante/comunicados' && unread > 0
        ? { ...item, badge: unread }
        : item,
    );
  });

  badgeLabel(count: number): string {
    return count > 9 ? '9+' : String(count);
  }
}
