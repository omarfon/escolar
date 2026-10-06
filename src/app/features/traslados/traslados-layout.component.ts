import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../core/layout/services/layout.service';
import { TrasladoContext, TrasladosService, trasladoErrorMessage } from './traslados.service';
import { TRASLADOS_NAV } from './traslados-nav.config';

@Component({
  selector: 'app-traslados-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
<div class="min-h-screen bg-[#f4f6fb] animate-fade-in">
  <div class="bg-white border-b border-[#e8eaf0] px-6 py-4 sticky top-0 z-20">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 max-w-6xl mx-auto">
      <div>
        <div class="flex items-center gap-1.5 text-xs text-[#94a3b8] mb-1">
          <span>Traslados</span><span>›</span>
          <span class="text-indigo-700 font-medium">{{ sectionLabel() }}</span>
        </div>
        <h1 class="text-2xl font-bold text-[#1a202c]">{{ sectionLabel() }}</h1>
        @if (context(); as ctx) {
          <p class="text-sm text-[#64748b] mt-0.5">
            @if (ctx.institucion; as ie) {
              {{ ie.nombre }} · modular {{ ie.codigoModular || '—' }} · A.E. {{ ie.anioEscolar }}
            } @else if (ctx.alcanceTerritorial.nivel === 'MINEDU') {
              Ámbito MINEDU (nacional)
            } @else if (ctx.alcanceTerritorial.ugel) {
              UGEL {{ ctx.alcanceTerritorial.ugel }}
            } @else if (ctx.alcanceTerritorial.dre) {
              DRE {{ ctx.alcanceTerritorial.dre }}
            }
          </p>
        }
      </div>
      <button class="btn btn-secondary btn-sm self-start" (click)="recargar()" [disabled]="svc.loading() || svc.saving()">
        <span class="icon icon-sm">refresh</span> Actualizar
      </button>
    </div>
  </div>

  <div class="p-6 max-w-6xl mx-auto">
    @if (errorMsg()) {
      <div class="mb-4 p-4 bg-[#fee2e2] border border-red-200 rounded-2xl text-sm text-[#b91c1c]" role="alert">{{ errorMsg() }}</div>
    }
    <router-outlet />
  </div>
</div>
  `,
})
export class TrasladosLayoutComponent implements OnInit {
  readonly svc = inject(TrasladosService);
  private readonly layout = inject(LayoutService);
  private readonly router = inject(Router);

  readonly context = signal<TrasladoContext | null>(null);
  readonly errorMsg = signal('');

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly sectionLabel = computed(() => {
    const url = this.currentUrl() ?? '';
    if (url.includes('/traslados/recibidos')) return 'Traslados recibidos';
    if (url.includes('/traslados/supervision')) return 'Supervisión territorial';
    if (url.includes('/traslados/seguimiento')) return 'Seguimiento del proceso';
    if (url.includes('/traslados/solicitar')) return 'Solicitar traslado';
    return TRASLADOS_NAV[0]?.label ?? 'Traslados';
  });

  ngOnInit(): void {
    this.layout.setTitle('Traslados');
    this.cargarContexto();
  }

  recargar(): void {
    this.cargarContexto();
    void this.router.navigate([], {
      queryParams: { t: Date.now() },
      queryParamsHandling: 'merge',
    });
  }

  private cargarContexto(): void {
    this.errorMsg.set('');
    this.svc.getContext().subscribe({
      next: (ctx) => this.context.set(ctx),
      error: (err) => this.errorMsg.set(trasladoErrorMessage(err, 'No se pudo cargar el contexto')),
    });
  }
}
