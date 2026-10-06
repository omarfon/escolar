import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { PerfilEstudianteService } from './perfil-estudiante.service';
import { ApiExpediente } from '../../../core/api/api.models';

@Component({
  standalone: true,
  imports: [DecimalPipe, NgClass, NgTemplateOutlet],
  template: `
<div class="space-y-5 animate-fade-in">
  <div>
    <h2 class="text-xl font-bold text-gray-800">Mi ficha</h2>
    <p class="text-sm text-gray-500 mt-0.5">Datos personales, familia e historial académico</p>
  </div>

  @if (svc.loading()) {
    <div class="card p-12 flex flex-col items-center text-gray-400">
      <span class="icon icon-xl animate-spin mb-3">progress_activity</span>
      <p class="text-sm">Cargando ficha…</p>
    </div>
  } @else if (exp(); as e) {
    <div class="card p-5 bg-gradient-to-r from-indigo-50 to-white border-indigo-100">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-bold text-gray-900">{{ e.nombres }} {{ e.apellidos }}</h3>
          <p class="text-sm text-gray-500">{{ e.gradoLabel }} · Sección {{ e.seccion }}</p>
          <p class="text-xs text-gray-400 mt-1">Código {{ e.codigo }} · DNI {{ e.dni || '—' }}</p>
        </div>
        <span class="badge badge-green">{{ e.estado }}</span>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-4">
      <div class="card p-5 space-y-4">
        <h4 class="font-semibold text-gray-800 flex items-center gap-2">
          <span class="icon text-indigo-600">person</span> Datos personales
        </h4>
        <dl class="grid sm:grid-cols-2 gap-3 text-sm">
          <div><dt class="text-gray-400 text-xs">Fecha de nacimiento</dt><dd class="font-medium">{{ formatFecha(e.fechaNac) }}</dd></div>
          <div><dt class="text-gray-400 text-xs">Sexo</dt><dd class="font-medium">{{ e.sexo === 'F' ? 'Femenino' : 'Masculino' }}</dd></div>
          <div class="sm:col-span-2"><dt class="text-gray-400 text-xs">Dirección</dt><dd class="font-medium">{{ e.direccion || '—' }}</dd></div>
          <div><dt class="text-gray-400 text-xs">Grupo sanguíneo</dt><dd class="font-medium">{{ e.grupoSanguineo || '—' }}</dd></div>
          <div><dt class="text-gray-400 text-xs">Año de ingreso</dt><dd class="font-medium">{{ e.anioIngreso || '—' }}</dd></div>
          <div><dt class="text-gray-400 text-xs">Alergias</dt><dd class="font-medium">{{ e.alergias || 'Ninguna' }}</dd></div>
          <div><dt class="text-gray-400 text-xs">Condiciones de salud</dt><dd class="font-medium">{{ e.condicionesSalud || '—' }}</dd></div>
        </dl>
      </div>

      <div class="card p-5 space-y-4">
        <h4 class="font-semibold text-gray-800 flex items-center gap-2">
          <span class="icon text-emerald-600">family_restroom</span> Familia / Apoderados
        </h4>
        <ng-container *ngTemplateOutlet="repBlock; context: { $implicit: e.apoderado, titulo: 'Apoderado principal', principal: true }"></ng-container>
        <ng-container *ngTemplateOutlet="repBlock; context: { $implicit: e.padre, titulo: 'Padre', principal: false }"></ng-container>
        <ng-container *ngTemplateOutlet="repBlock; context: { $implicit: e.madre, titulo: 'Madre', principal: false }"></ng-container>
      </div>
    </div>

    <div class="card p-5">
      <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span class="icon text-amber-600">history_edu</span> Historial académico
      </h4>
      @if (!e.historialAcademico.length) {
        <p class="text-sm text-gray-400">Sin registros de historial.</p>
      } @else {
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr><th>Año</th><th>Grado</th><th>Sección</th><th>Promedio</th><th>Estado</th></tr>
            </thead>
            <tbody>
              @for (h of e.historialAcademico; track h.anio) {
                <tr>
                  <td>{{ h.anio }}</td>
                  <td>{{ h.grado }}</td>
                  <td>{{ h.seccion }}</td>
                  <td class="font-semibold">{{ h.promedio | number:'1.1-1' }}</td>
                  <td><span class="badge text-[10px]" [ngClass]="h.estado === 'Promovido' ? 'badge-green' : 'badge-orange'">{{ h.estado }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (e.documentos.length) {
      <div class="card p-5">
        <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span class="icon text-blue-600">folder</span> Documentos de matrícula
        </h4>
        <div class="divide-y divide-gray-100">
          @for (d of e.documentos; track d.id) {
            <div class="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <p class="font-medium">{{ d.tipo }}</p>
                @if (d.numero) { <p class="text-xs text-gray-400">{{ d.numero }}</p> }
              </div>
              <span class="badge text-[10px]" [ngClass]="docBadge(d.estado)">{{ docLabel(d.estado) }}</span>
            </div>
          }
        </div>
      </div>
    }
  } @else {
    <div class="card p-10 text-center text-gray-400">
      <span class="icon icon-xl mb-3">person_off</span>
      <p class="text-sm">No se pudo cargar tu ficha.</p>
    </div>
  }
</div>

<ng-template #repBlock let-rep let-titulo="titulo" let-principal="principal">
  @if (rep?.nombres) {
    <div class="p-3 rounded-xl text-sm"
      [ngClass]="principal ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-gray-50'">
      <div class="flex flex-wrap items-center gap-1.5 mb-1">
        <p class="text-xs font-semibold" [ngClass]="principal ? 'text-indigo-700' : 'text-gray-400'">{{ titulo }}</p>
        @if (principal) {
          <span class="inline-flex items-center gap-0.5 text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
            <span class="icon" style="font-size:10px">star</span> Principal
          </span>
        }
      </div>
      <p class="font-semibold">{{ rep.nombres }} {{ rep.apellidos }}</p>
      <p class="text-gray-500 text-xs mt-1">DNI {{ rep.dni || '—' }} · {{ rep.telefono || '—' }}</p>
      @if (rep.email) { <p class="text-gray-500 text-xs">{{ rep.email }}</p> }
      @if (rep.trabajo) { <p class="text-gray-400 text-xs">{{ rep.trabajo }}</p> }
    </div>
  }
</ng-template>
  `,
})
export class PerfilEstudianteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly svc = inject(PerfilEstudianteService);

  exp = this.svc.expediente;

  ngOnInit(): void {
    this.layout.setTitle('Mi ficha');
    this.svc.load().subscribe();
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  docBadge(estado: string): string {
    return estado === 'entregado' ? 'badge-green' : estado === 'vencido' ? 'badge-red' : 'badge-yellow';
  }

  docLabel(estado: string): string {
    return estado === 'entregado' ? 'Entregado' : estado === 'vencido' ? 'Vencido' : 'Pendiente';
  }
}
