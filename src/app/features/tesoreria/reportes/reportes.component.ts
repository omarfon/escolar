import { Component, inject, OnInit } from '@angular/core';
import { LayoutService } from '../../../core/layout/services/layout.service';

@Component({
  selector: 'app-tesoreria-reportes',
  standalone: true,
  imports: [],
  template: `
    <div class="space-y-5">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Tesorería</h3>
        <p class="text-xs text-gray-400 mt-1">
          Ruta: <span class="font-mono">/reportes/tesoreria</span>
          · Menú: Reportería → Tesorería
        </p>
      </div>
      <div class="card p-16 flex flex-col items-center justify-center text-center">
        <span class="icon icon-2xl text-indigo-300 mb-4">construction</span>
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Reportes Financieros</h3>
        <p class="text-gray-500 text-sm">Modulo en desarrollo.</p>
      </div>
    </div>
  `
})
export class TesoreriaReportesComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  ngOnInit(): void { this.layout.setTitle('Reportes Financieros'); }
}


