import { Component, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs/operators';
import { LayoutService } from '../../core/layout/services/layout.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { MatriculaReportesComponent } from '../matricula/reportes/reportes.component';
import { AsistenciaReportesComponent } from '../asistencia/reportes/reportes.component';
import { EvaluacionReportesComponent } from '../evaluacion/reportes/reportes.component';
import { TesoreriaReportesComponent } from '../tesoreria/reportes/reportes.component';
import { TerritorialReportesComponent } from './territorial/reportes.component';
import { REPORTES_NAV_ITEMS, type ReporteNavItem } from './reportes-nav.model';

@Component({
  selector: 'app-reportes-shell',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatriculaReportesComponent,
    AsistenciaReportesComponent,
    EvaluacionReportesComponent,
    TesoreriaReportesComponent,
    TerritorialReportesComponent,
  ],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Reportería</h2>
        <p class="text-sm text-gray-500 mt-0.5">
          Consulta y exportación de reportes institucionales
        </p>
        <p class="text-xs text-gray-400 mt-1">
          Ruta: <span class="font-mono">/reportes/{{ modulo() }}</span>
        </p>
      </div>

      @if (tabs.length) {
        <div class="tabs flex-wrap">
          @for (tab of tabs; track tab.id) {
            <a
              [routerLink]="['/reportes', tab.id]"
              routerLinkActive="tab-active"
              class="tab"
            >
              <span class="icon icon-sm">{{ tab.icon }}</span>
              {{ tab.label }}
            </a>
          }
        </div>
      } @else {
        <div class="card p-8 text-center text-gray-500">
          No tiene permisos para consultar reportes.
        </div>
      }

      @switch (modulo()) {
        @case ('territorial') { <app-territorial-reportes /> }
        @case ('matricula') { <app-matricula-reportes /> }
        @case ('asistencia') { <app-asistencia-reportes /> }
        @case ('evaluacion') { <app-evaluacion-reportes /> }
        @case ('tesoreria') { <app-tesoreria-reportes /> }
        @default {
          <div class="card p-8 text-center text-gray-500">
            Seleccione un módulo de reportes.
          </div>
        }
      }
    </div>
  `,
})
export class ReportesShellComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly modulo = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('modulo') ?? '')),
    { initialValue: '' },
  );

  ngOnInit(): void {
    this.layout.setTitle('Reportería');
  }

  get tabs(): ReporteNavItem[] {
    return REPORTES_NAV_ITEMS.filter((item) => {
      if (this.auth.isAdmin() || this.auth.hasRole('DIRECTOR')) return true;
      return this.auth.hasAnyPermiso(...item.permisos);
    });
  }
}
