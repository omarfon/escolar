import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { PortalEstudianteService } from '../services/portal-estudiante.service';
import { ContactosEstudianteService } from './contactos-estudiante.service';
import { ContactosVista } from './contactos.model';

@Component({
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Contactos</h2>
          <p class="text-sm text-gray-400 mt-0.5">
            {{ auth.nombreCompleto() }} · {{ perfil()?.aulaLabel ?? 'Mi aula' }} ·
            Comunícate con compañeros y docentes
          </p>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="svc.loading()">
          <span class="icon icon-sm">refresh</span> Actualizar
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button type="button" class="card p-4 text-left hover:shadow-md transition-shadow"
          [ngClass]="vista() === 'companeros' ? 'ring-2 ring-indigo-400' : ''"
          (click)="vista.set('companeros')">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <span class="icon text-indigo-600">groups</span>
            </div>
            <div>
              <p class="text-xs text-gray-400">Compañeros</p>
              <p class="text-xl font-bold text-gray-900">{{ svc.totalCompaneros() }}</p>
            </div>
          </div>
        </button>
        <button type="button" class="card p-4 text-left hover:shadow-md transition-shadow"
          [ngClass]="vista() === 'docentes' ? 'ring-2 ring-emerald-400' : ''"
          (click)="vista.set('docentes')">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <span class="icon text-emerald-600">school</span>
            </div>
            <div>
              <p class="text-xs text-gray-400">Mis docentes</p>
              <p class="text-xl font-bold text-gray-900">{{ svc.totalDocentes() }}</p>
            </div>
          </div>
        </button>
      </div>

      <div class="card p-4">
        <div class="relative">
          <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input class="form-input pl-10" placeholder="Buscar por nombre, correo o curso..."
            [ngModel]="filtroBusqueda()" (ngModelChange)="filtroBusqueda.set($event)">
        </div>
      </div>

      @if (svc.loading()) {
        <div class="card p-10 text-center text-gray-400">
          <span class="icon animate-spin text-2xl">progress_activity</span>
          <p class="mt-2 text-sm">Cargando contactos...</p>
        </div>
      } @else if (svc.error()) {
        <div class="card p-8 text-center">
          <p class="text-red-600 font-medium">{{ svc.error() }}</p>
          <button class="btn btn-primary btn-sm mt-4" (click)="cargar()">Reintentar</button>
        </div>
      } @else if (vista() === 'companeros') {
        @if (!companerosFiltrados().length) {
          <div class="card p-8 text-center text-gray-400">
            <span class="icon text-3xl mb-2">group_off</span>
            <p class="text-sm">No hay compañeros para mostrar en tu salón.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (c of companerosFiltrados(); track c.id) {
              <div class="card p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start gap-3">
                  <div class="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center shrink-0">
                    {{ c.iniciales }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-gray-900 truncate">{{ c.nombreCompleto }}</p>
                    <div class="mt-3 space-y-2">
                      @if (c.email) {
                        <a [href]="'mailto:' + c.email"
                          class="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 truncate">
                          <span class="icon text-base shrink-0">mail</span>
                          <span class="truncate">{{ c.email }}</span>
                        </a>
                      }
                      @if (c.telefono) {
                        <a [href]="'tel:' + c.telefono"
                          class="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-800">
                          <span class="icon text-base shrink-0">call</span>
                          {{ c.telefono }}
                        </a>
                      } @else {
                        <p class="text-xs text-gray-400 flex items-center gap-2">
                          <span class="icon text-base">call</span> Sin teléfono registrado
                        </p>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      } @else {
        @if (!docentesFiltrados().length) {
          <div class="card p-8 text-center text-gray-400">
            <span class="icon text-3xl mb-2">person_off</span>
            <p class="text-sm">No hay docentes asignados a tus cursos.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (d of docentesFiltrados(); track d.id) {
              <div class="card p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start gap-3">
                  <div class="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center shrink-0">
                    {{ d.iniciales }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-gray-900 truncate">{{ d.nombreCompleto }}</p>
                    <p class="text-xs text-gray-400 mt-0.5 truncate">{{ d.especialidad || d.abrev }}</p>
                    @if (d.cursos.length) {
                      <div class="flex flex-wrap gap-1 mt-2">
                        @for (curso of d.cursos; track curso) {
                          <span class="badge badge-gray text-[10px]">{{ curso }}</span>
                        }
                      </div>
                    }
                    <div class="mt-3 space-y-2">
                      @if (d.email) {
                        <a [href]="'mailto:' + d.email"
                          class="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 truncate">
                          <span class="icon text-base shrink-0">mail</span>
                          <span class="truncate">{{ d.email }}</span>
                        </a>
                      }
                      @if (d.telefono) {
                        <a [href]="'tel:' + d.telefono"
                          class="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-800">
                          <span class="icon text-base shrink-0">call</span>
                          {{ d.telefono }}
                        </a>
                      } @else {
                        <p class="text-xs text-gray-400 flex items-center gap-2">
                          <span class="icon text-base">call</span> Sin teléfono registrado
                        </p>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class ContactosEstudianteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly portal = inject(PortalEstudianteService);
  readonly svc = inject(ContactosEstudianteService);

  readonly vista = signal<ContactosVista>('companeros');
  readonly filtroBusqueda = signal('');

  readonly perfil = this.portal.perfil;

  readonly companerosFiltrados = computed(() => {
    const q = this.filtroBusqueda().trim().toLowerCase();
    const items = this.svc.data()?.companeros ?? [];
    if (!q) return items;
    return items.filter(c =>
      c.nombreCompleto.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.telefono.includes(q),
    );
  });

  readonly docentesFiltrados = computed(() => {
    const q = this.filtroBusqueda().trim().toLowerCase();
    const items = this.svc.data()?.docentes ?? [];
    if (!q) return items;
    return items.filter(d =>
      d.nombreCompleto.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.telefono.includes(q) ||
      d.especialidad.toLowerCase().includes(q) ||
      d.cursos.some(c => c.toLowerCase().includes(q)),
    );
  });

  ngOnInit(): void {
    this.layout.setTitle('Contactos');
    this.portal.ensureLoaded().subscribe(() => this.cargar());
  }

  cargar(): void {
    this.svc.load().subscribe();
  }
}
