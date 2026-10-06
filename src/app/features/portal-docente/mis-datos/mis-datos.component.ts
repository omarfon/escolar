import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { PortalDocenteService } from '../portal-docente.service';
import { DocenteDetail } from '../../matricula/maestros/docentes/docentes.model';

@Component({
  selector: 'app-mis-datos-docente',
  standalone: true,
  imports: [NgClass, FormsModule],
  template: `
    <div class="animate-fade-in space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Mi Perfil</h2>
          <p class="text-sm text-gray-500 mt-0.5">
            Consulta tu información y actualiza teléfono y dirección
          </p>
        </div>
        <span class="badge badge-indigo">A.E. {{ anioEscolar }}</span>
      </div>

      @if (mensaje()) {
        <div class="rounded-xl px-4 py-3 text-sm border"
          [ngClass]="mensaje()!.tipo === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-700'">
          {{ mensaje()!.texto }}
        </div>
      }

      @if (error()) {
        <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {{ error() }}
        </div>
      }

      @if (svc.loadingPerfil()) {
        <div class="card p-10 text-center text-gray-400 text-sm">Cargando tu perfil...</div>
      } @else if (docente(); as d) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          @for (kpi of kpis(); track kpi.label) {
            <div class="card px-3 py-2.5">
              <p class="text-[11px] text-gray-400">{{ kpi.label }}</p>
              <p class="text-xl font-bold text-gray-900 mt-0.5">{{ kpi.value }}</p>
            </div>
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="card p-5 lg:col-span-1 space-y-5">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold shrink-0">
                {{ iniciales() }}
              </div>
              <div class="min-w-0">
                <h3 class="text-lg font-bold text-gray-900 truncate">{{ d.nombreCompleto }}</h3>
                <p class="text-sm text-indigo-600 truncate">{{ d.especialidad }}</p>
                <span class="badge mt-2" [ngClass]="estadoBadge(d.estado)">{{ estadoLabel(d.estado) }}</span>
              </div>
            </div>

            <dl class="space-y-3 text-sm">
              @for (campo of datosSoloLectura(); track campo.label) {
                <div>
                  <dt class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{{ campo.label }}</dt>
                  <dd class="text-gray-800 mt-0.5 break-all">{{ campo.value || '—' }}</dd>
                </div>
              }
            </dl>

            <div class="pt-4 border-t border-gray-100 space-y-3">
              <div class="flex items-center justify-between gap-2">
                <h4 class="text-sm font-semibold text-gray-800">Contacto</h4>
                @if (!editando()) {
                  <button type="button" class="btn-icon text-indigo-600 hover:bg-indigo-50"
                    title="Editar teléfono y dirección"
                    (click)="iniciarEdicion()">
                    <span class="icon icon-sm">edit</span>
                  </button>
                } @else {
                  <span class="text-[11px] text-indigo-600 font-medium">Editando</span>
                }
              </div>

              @if (!editando()) {
                <dl class="space-y-3 text-sm">
                  <div>
                    <dt class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Teléfono</dt>
                    <dd class="text-gray-800 mt-0.5 break-all">{{ valorMostrar(d.telefono) }}</dd>
                  </div>
                  <div>
                    <dt class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Dirección</dt>
                    <dd class="text-gray-800 mt-0.5 break-all whitespace-pre-line">{{ valorMostrar(d.direccion) }}</dd>
                  </div>
                </dl>
              } @else {
                <div class="space-y-4">
                  <div>
                    <label class="form-label" for="telefono-docente">Teléfono</label>
                    <input id="telefono-docente" type="tel" class="form-input w-full"
                      [(ngModel)]="telefonoEdit"
                      [disabled]="svc.savingPerfil()"
                      maxlength="30"
                      placeholder="Ej. 987 654 321" />
                  </div>

                  <div>
                    <label class="form-label" for="direccion-docente">Dirección</label>
                    <textarea id="direccion-docente" class="form-input w-full min-h-[88px] resize-y"
                      [(ngModel)]="direccionEdit"
                      [disabled]="svc.savingPerfil()"
                      maxlength="200"
                      placeholder="Av. o calle, número, distrito"></textarea>
                    <p class="text-[11px] text-gray-400 mt-1">{{ direccionEdit.length }}/200</p>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="btn btn-primary btn-sm"
                      (click)="guardar()"
                      [disabled]="svc.savingPerfil() || !hayCambios()">
                      {{ svc.savingPerfil() ? 'Guardando…' : 'Guardar' }}
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm"
                      (click)="cancelarEdicion()"
                      [disabled]="svc.savingPerfil()">
                      Cancelar
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="card p-5 lg:col-span-2 space-y-5">
            <div>
              <h3 class="text-base font-bold text-gray-800 flex items-center gap-2 mb-3">
                <span class="icon text-indigo-600">work</span> Información laboral
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                @for (campo of datosLaborales(); track campo.label) {
                  <div class="rounded-xl bg-gray-50 px-4 py-3">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{{ campo.label }}</p>
                    <p class="text-sm font-medium text-gray-800 mt-1">{{ campo.value }}</p>
                  </div>
                }
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
                  <span class="icon text-indigo-600">menu_book</span> Asignaciones {{ anioEscolar }}
                </h3>
                <p class="text-xs text-gray-400">{{ d.asignaciones.length }} asignación(es)</p>
              </div>

              @if (!d.asignaciones.length) {
                <div class="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  No tienes cursos asignados para este año escolar.
                </div>
              } @else {
                <div class="overflow-x-auto rounded-xl border border-gray-100">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                      <tr>
                        <th class="px-4 py-3 font-semibold">Curso</th>
                        <th class="px-4 py-3 font-semibold">Nivel</th>
                        <th class="px-4 py-3 font-semibold">Grado</th>
                        <th class="px-4 py-3 font-semibold">Secciones</th>
                        <th class="px-4 py-3 font-semibold">Horas/sem</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      @for (a of d.asignaciones; track a.id) {
                        <tr class="hover:bg-gray-50/80">
                          <td class="px-4 py-3 font-medium text-gray-800">{{ a.cursoNombre }}</td>
                          <td class="px-4 py-3 text-gray-600">{{ a.nivel }}</td>
                          <td class="px-4 py-3 text-gray-600">{{ a.grado }}</td>
                          <td class="px-4 py-3 text-gray-600">{{ a.secciones.join(', ') || '—' }}</td>
                          <td class="px-4 py-3 text-gray-600">{{ a.horasSemanales }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>

            <div>
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
                  <span class="icon text-indigo-600">meeting_room</span> Salones asignados
                </h3>
                <p class="text-xs text-gray-400">{{ d.salones.length }} salón(es)</p>
              </div>

              @if (!d.salones.length) {
                <div class="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  No hay salones registrados para tus asignaciones.
                </div>
              } @else {
                <div class="flex flex-wrap gap-2">
                  @for (s of d.salones; track salonKey(s)) {
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-700 px-3 py-1.5 text-xs font-medium">
                      <span class="icon icon-sm">class</span>
                      {{ s.nivel }} · {{ s.grado }} {{ s.seccion }}
                      @if (s.aforo) {
                        <span class="text-indigo-400">({{ s.aforo }} plazas)</span>
                      }
                    </span>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class MisDatosDocenteComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  readonly svc = inject(PortalDocenteService);

  readonly anioEscolar = 2026;

  private readonly _docente = signal<DocenteDetail | null>(null);
  readonly docente = this._docente.asReadonly();
  readonly error = signal('');
  readonly mensaje = signal<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  readonly editando = signal(false);

  telefonoEdit = '';
  direccionEdit = '';
  private telefonoOriginal = '';
  private direccionOriginal = '';

  readonly kpis = computed(() => {
    const d = this._docente();
    return [
      { label: 'Horas asignadas', value: d?.horasAsignadas ?? 0 },
      { label: 'Máximo permitido', value: d?.maxHoras ?? 0 },
      { label: 'Asignaciones', value: d?.totalAsignaciones ?? 0 },
      { label: 'Salones', value: d?.totalSalones ?? 0 },
    ];
  });

  readonly datosSoloLectura = computed(() => {
    const d = this._docente();
    if (!d) return [];
    return [
      { label: 'Nombres', value: d.nombres },
      { label: 'Apellidos', value: d.apellidos },
      { label: 'DNI', value: d.dni },
      { label: 'Correo', value: d.email },
      { label: 'Usuario', value: d.username },
    ];
  });

  readonly datosLaborales = computed(() => {
    const d = this._docente();
    if (!d) return [];
    return [
      { label: 'Especialidad', value: d.especialidad },
      { label: 'Sede', value: d.sede },
      { label: 'Tipo de contrato', value: d.tipo === 'nombrado' ? 'Nombrado' : 'Contratado' },
      { label: 'Estado', value: this.estadoLabel(d.estado) },
    ];
  });

  ngOnInit(): void {
    this.layout.setTitle('Mi Perfil');
    this.cargar();
  }

  cargar(): void {
    this.error.set('');
    this.mensaje.set(null);
    this.svc.loadMisDatos(this.anioEscolar).subscribe({
      next: (res) => {
        this._docente.set(res);
        this.syncCamposEditables(res);
        this.editando.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.error.set(
          Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo cargar tu perfil docente',
        );
        this._docente.set(null);
      },
    });
  }

  iniciarEdicion(): void {
    const d = this._docente();
    if (!d) return;
    this.syncCamposEditables(d);
    this.editando.set(true);
    this.mensaje.set(null);
  }

  cancelarEdicion(): void {
    this.telefonoEdit = this.telefonoOriginal;
    this.direccionEdit = this.direccionOriginal;
    this.editando.set(false);
  }

  hayCambios(): boolean {
    return (
      this.telefonoEdit.trim() !== this.telefonoOriginal ||
      this.direccionEdit.trim() !== this.direccionOriginal
    );
  }

  guardar(): void {
    if (!this.hayCambios()) return;
    this.mensaje.set(null);
    this.error.set('');

    this.svc.updateMiPerfil(
      {
        telefono: this.telefonoEdit.trim(),
        direccion: this.direccionEdit.trim(),
      },
      this.anioEscolar,
    ).subscribe({
      next: (res) => {
        this._docente.set(res);
        this.syncCamposEditables(res);
        this.editando.set(false);
        this.mensaje.set({ tipo: 'ok', texto: 'Teléfono y dirección actualizados correctamente.' });
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.mensaje.set({
          tipo: 'err',
          texto: Array.isArray(msg) ? msg.join(', ') : msg ?? 'No se pudo guardar los cambios',
        });
      },
    });
  }

  private syncCamposEditables(d: DocenteDetail): void {
    this.telefonoOriginal = d.telefono?.trim() ?? '';
    this.direccionOriginal = d.direccion?.trim() ?? '';
    this.telefonoEdit = this.telefonoOriginal;
    this.direccionEdit = this.direccionOriginal;
  }

  iniciales(): string {
    const d = this._docente();
    if (!d) return '?';
    const n = d.nombres.trim().charAt(0);
    const a = d.apellidos.trim().charAt(0);
    return `${n}${a}`.toUpperCase();
  }

  salonKey(s: { nivel: string; grado: string; seccion: string }): string {
    return `${s.nivel}|${s.grado}|${s.seccion}`;
  }

  estadoLabel(estado: string): string {
    if (estado === 'activo') return 'Activo';
    if (estado === 'inactivo') return 'Inactivo';
    if (estado === 'bloqueado') return 'Bloqueado';
    return estado;
  }

  estadoBadge(estado: string): string {
    if (estado === 'activo') return 'badge-green';
    if (estado === 'bloqueado') return 'badge-red';
    return 'badge-gray';
  }

  valorMostrar(valor?: string | null): string {
    const v = valor?.trim();
    return v && v !== '—' ? v : '—';
  }
}
