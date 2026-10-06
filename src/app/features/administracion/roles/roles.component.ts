import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { RbacService } from '../rbac/rbac.service';
import { RbacAuditItem, RbacContext } from '../rbac/rbac.model';
import { RolesService } from './roles.service';
import { RolDto, SeccionPermisos } from './roles.model';

interface Rol {
  codigo: string;
  label: string;
  descripcion: string;
  color: string;
  esAdmin: boolean;
  esSistema: boolean;
  institutionId: number | null;
  institucionNombre: string | null;
  permisos: Set<string>;
  usuariosCount: number;
}

function mapRol(dto: RolDto): Rol {
  return {
    codigo: dto.codigo,
    label: dto.label,
    descripcion: dto.descripcion,
    color: dto.color,
    esAdmin: dto.esAdmin,
    esSistema: !!dto.esSistema,
    institutionId: dto.institutionId ?? null,
    institucionNombre: dto.institucionNombre ?? null,
    permisos: new Set(dto.permisos),
    usuariosCount: dto.usuariosCount,
  };
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="space-y-4">
      @if (rbacContext(); as ctx) {
        <div class="card p-4 text-sm text-gray-600">
          <p class="font-semibold text-gray-800">{{ ctx.institucion.nombre }} · RBAC multi-rol</p>
          <p class="mt-1">{{ ctx.reglaResolucion }}</p>
          <p class="text-xs text-gray-400 mt-1">Ámbitos: {{ ambitosLabel(ctx) }}</p>
        </div>
      }

      <div class="flex gap-2">
        <button class="btn btn-sm" [class.btn-primary]="vistaActiva() === 'permisos'" [class.btn-secondary]="vistaActiva() !== 'permisos'"
          (click)="vistaActiva.set('permisos')">Permisos por rol</button>
        <button class="btn btn-sm" [class.btn-primary]="vistaActiva() === 'auditoria'" [class.btn-secondary]="vistaActiva() !== 'auditoria'"
          (click)="mostrarAuditoria()">Auditoría RBAC</button>
      </div>
    </div>

    @if (vistaActiva() === 'auditoria') {
      <div class="card mt-4 divide-y divide-gray-100">
        @if (rbacSvc.loadingAudit()) {
          <div class="p-8 text-center text-gray-400">Cargando auditoría…</div>
        } @else if (!auditItems().length) {
          <div class="p-12 text-center text-gray-500">Sin eventos RBAC registrados.</div>
        } @else {
          @for (item of auditItems(); track item.id) {
            <div class="px-4 py-3 text-sm">
              <div class="flex flex-wrap gap-2 mb-1">
                <span class="font-medium">{{ item.descripcion }}</span>
                <span class="badge badge-gray text-[10px]">{{ entidadLabel(item.entidad) }}</span>
              </div>
              <p class="text-xs text-gray-500">{{ item.actorNombre }} · {{ item.fechaDisplay }} {{ item.horaDisplay }}</p>
            </div>
          }
        }
      </div>
    } @else {
    <div class="flex gap-5 h-full mt-4">
      <div class="w-72 shrink-0 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-xl font-bold text-gray-800">Roles</h2>
          <button type="button" class="btn btn-primary btn-sm" (click)="abrirCrear()">Nuevo rol</button>
        </div>
        @if (creando()) {
          <div class="card p-4 space-y-3">
            <p class="text-sm font-semibold text-gray-800">Rol de esta sede</p>
            <input class="form-input" placeholder="Nombre, ej. Secretaría" [(ngModel)]="nuevoLabel" name="nuevoLabel" />
            <input class="form-input" placeholder="Descripción" [(ngModel)]="nuevoDescripcion" name="nuevoDescripcion" />
            <select class="form-select" [(ngModel)]="nuevoBasadoEn" name="nuevoBasadoEn">
              <option value="">Seleccione una plantilla</option>
              <option value="DIRECTOR">Partir de Director</option>
              <option value="SECRETARIA">Partir de Secretaría</option>
              <option value="DOCENTE">Partir de Docente</option>
              <option value="TESORERO">Partir de Tesorero</option>
              <option value="BIBLIOTECARIO">Partir de Bibliotecario</option>
            </select>
            @if (puedeElegirInstitucion()) {
              <select class="form-select" [(ngModel)]="nuevoInstitucionId" name="nuevoInstitucionId">
                <option [ngValue]="null">Institución</option>
                @for (ie of instituciones(); track ie.id) {
                  <option [ngValue]="ie.id">{{ ie.nombre }}</option>
                }
              </select>
            }
            <div class="flex gap-2">
              <button type="button" class="btn btn-primary btn-sm" [disabled]="guardando()" (click)="crearRol()">Crear</button>
              <button type="button" class="btn btn-secondary btn-sm" (click)="creando.set(false)">Cancelar</button>
            </div>
          </div>
        }

        @if (cargando()) {
          <div class="card p-6 text-center text-sm text-gray-500">Cargando roles...</div>
        } @else if (error()) {
          <div class="card p-6 text-center text-sm text-red-600">{{ error() }}</div>
        } @else {
          @for (rol of roles(); track rol.codigo) {
            <button class="w-full text-left card p-4 hover:shadow-md transition-shadow border-2"
              [ngClass]="rolActivo()?.codigo === rol.codigo ? 'border-indigo-400 bg-indigo-50' : 'border-transparent'"
              (click)="seleccionarRol(rol)">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shrink-0"
                    [ngClass]="rol.color">
                    <span class="icon text-base">shield</span>
                  </div>
                  <span class="font-semibold text-gray-800 text-sm">{{ rol.label }}</span>
                  @if (rol.institucionNombre) {
                    <span class="text-[10px] text-gray-400">{{ rol.institucionNombre }}</span>
                  }
                </div>
                @if (rol.esAdmin) {
                  <span class="badge badge-indigo text-xs">Admin</span>
                }
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ rol.descripcion }}</p>
              <div class="flex items-center justify-between mt-2">
                <span class="text-xs text-gray-400">
                  <span class="icon text-sm align-middle">group</span>
                  {{ rol.usuariosCount }} usuario(s)
                </span>
                <span class="text-xs font-medium text-indigo-600">
                  {{ permisosActivos(rol) }} permisos
                </span>
              </div>
            </button>
          }
        }
      </div>

      <div class="flex-1 min-w-0">
        @if (!rolActivo()) {
          <div class="card p-16 flex flex-col items-center justify-center text-center h-full">
            <span class="icon icon-2xl text-indigo-200 mb-3">touch_app</span>
            <p class="text-gray-500">Selecciona un rol para ver y editar sus permisos</p>
          </div>
        } @else {
          <div class="space-y-4 animate-fade-in">
            <div class="card p-5">
              <div class="flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    [ngClass]="rolActivo()!.color">
                    <span class="icon">shield</span>
                  </div>
                  <div>
                    <h3 class="font-bold text-gray-900 text-lg">{{ rolActivo()!.label }}</h3>
                    <p class="text-sm text-gray-500">{{ rolActivo()!.descripcion }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  @if (!rolFijo()) {
                    <button class="btn btn-secondary btn-sm" (click)="desmarcarTodos()">
                      <span class="icon">remove_done</span> Quitar todos
                    </button>
                    <button class="btn btn-secondary btn-sm" (click)="marcarTodos()">
                      <span class="icon">done_all</span> Marcar todos
                    </button>
                  }
                  @if (!rolFijo()) {
                  <button class="btn btn-primary btn-sm" (click)="guardarPermisos()"
                    [disabled]="!cambiosPendientes() || guardando()">
                    <span class="icon">save</span> {{ guardando() ? 'Guardando...' : 'Guardar' }}
                  </button>
                  }
                </div>
              </div>

              @if (rolFijo()) {
                <div class="mt-3 flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700">
                  <span class="icon icon-sm">info</span>
                  @if (rolActivo()!.esSistema) {
                    Este rol administra la sede: configura la institución y crea los demás roles. Sus permisos se conservan.
                  } @else {
                    El rol Administrador tiene acceso total al sistema y no puede ser modificado.
                  }
                </div>
              }

              <div class="mt-4">
                <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Permisos asignados</span>
                  <span class="font-semibold text-indigo-600">{{ permisosSeleccionados() }} / {{ totalPermisos() }}</span>
                </div>
                <div class="progress">
                  <div class="progress-bar bg-indigo-500 transition-all duration-500"
                    [style.width]="(permisosSeleccionados() / totalPermisos() * 100) + '%'"></div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              @for (sec of secciones(); track sec.modulo) {
                <div class="card p-4">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="icon text-indigo-500">{{ sec.icono }}</span>
                      <span class="font-semibold text-gray-800 text-sm">{{ sec.modulo }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-400">
                        {{ permisosSeccion(sec) }}/{{ sec.permisos.length }}
                      </span>
                      @if (!rolFijo()) {
                        <button class="text-xs text-indigo-500 hover:underline"
                          (click)="toggleSeccion(sec)">
                          {{ todaSeccionActiva(sec) ? 'Quitar' : 'Todos' }}
                        </button>
                      }
                    </div>
                  </div>
                  <div class="h-1 bg-gray-100 rounded-full mb-3">
                    <div class="h-1 rounded-full transition-all duration-300"
                      [ngClass]="permisosSeccion(sec) === sec.permisos.length ? 'bg-green-400' : permisosSeccion(sec) > 0 ? 'bg-indigo-400' : 'bg-gray-200'"
                      [style.width]="(permisosSeccion(sec) / sec.permisos.length * 100) + '%'"></div>
                  </div>
                  <div class="space-y-1.5">
                    @for (permiso of sec.permisos; track permiso.codigo) {
                      <label class="flex items-center gap-2.5 cursor-pointer group"
                        [class.opacity-60]="rolFijo()">
                        <input type="checkbox"
                          class="w-4 h-4 rounded border-gray-300 text-indigo-600 accent-indigo-600 shrink-0"
                          [checked]="tienePermiso(permiso.codigo)"
                          [disabled]="rolFijo()"
                          (change)="togglePermiso(permiso.codigo, $event)">
                        <span class="text-xs text-gray-600 group-hover:text-gray-900 transition-colors leading-tight">
                          {{ permiso.label }}
                        </span>
                        @if (rolActivo()!.esAdmin) {
                          <span class="icon text-green-500 ml-auto text-sm shrink-0">check</span>
                        }
                      </label>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
    }

    @if (notificacion(); as n) {
      <div class="fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in z-50"
        [ngClass]="n.tipo === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'">
        <span class="icon">{{ n.tipo === 'success' ? 'check_circle' : 'error' }}</span>
        {{ n.mensaje }}
      </div>
    }
  `
})
export class RolesComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private readonly rolesService = inject(RolesService);
  readonly rbacSvc = inject(RbacService);
  private readonly auth = inject(AuthService);

  readonly vistaActiva = signal<'permisos' | 'auditoria'>('permisos');
  readonly rbacContext = signal<RbacContext | null>(null);
  readonly auditItems = signal<RbacAuditItem[]>([]);

  readonly secciones = signal<SeccionPermisos[]>([]);
  readonly totalPermisos = computed(() =>
    this.secciones().reduce((acc, s) => acc + s.permisos.length, 0),
  );

  readonly cargando = this.rolesService.loading;
  readonly guardando = this.rolesService.saving;
  readonly error = signal<string | null>(null);
  readonly notificacion = signal<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);
  readonly creando = signal(false);
  readonly instituciones = signal<{ id: number; nombre: string }[]>([]);
  readonly puedeElegirInstitucion = computed(() => this.auth.hasRole('SIAGIE'));
  nuevoLabel = '';
  nuevoDescripcion = '';
  nuevoBasadoEn = '';
  nuevoInstitucionId: number | null = null;

  private readonly _roles = signal<Rol[]>([]);
  readonly roles = this._roles.asReadonly();

  private readonly _rolActivo = signal<Rol | null>(null);
  readonly rolActivo = this._rolActivo.asReadonly();

  private readonly _permisosEditando = signal<Set<string>>(new Set());

  readonly cambiosPendientes = computed(() => {
    const r = this._rolActivo();
    if (!r) return false;
    const orig = [...r.permisos].sort().join(',');
    const edit = [...this._permisosEditando()].sort().join(',');
    return orig !== edit;
  });

  readonly permisosSeleccionados = computed(() => this._permisosEditando().size);

  ngOnInit(): void {
    this.layout.setTitle('Roles y Permisos');
    this.cargarRoles();
    this.rbacSvc.loadContext().subscribe({
      next: ctx => this.rbacContext.set(ctx),
      error: () => this.rbacContext.set(null),
    });
  }

  mostrarAuditoria(): void {
    this.vistaActiva.set('auditoria');
    this.rbacSvc.loadAudit({ page: 1, pageSize: 50 }).subscribe({
      next: res => this.auditItems.set(res.items),
      error: () => this.auditItems.set([]),
    });
  }

  entidadLabel(entidad: string): string {
    return entidad === 'user_role_assignment' ? 'Asignación usuario' : 'Permisos de rol';
  }

  ambitosLabel(ctx: RbacContext): string {
    return ctx.ambitos.map(a => a.label).join(' · ');
  }

  private cargarRoles(): void {
    this.rolesService.load().subscribe({
      next: (data) => {
        this.secciones.set(data.catalog);
        this._roles.set(data.roles.map(mapRol));
        this.error.set(null);
      },
      error: () => {
        this.error.set('No se pudieron cargar los roles. Verifica que el backend este activo.');
      },
    });
  }

  rolFijo(): boolean {
    const rol = this.rolActivo();
    return !!rol && (rol.esAdmin || rol.esSistema);
  }

  abrirCrear(): void {
    this.creando.set(true);
    this.nuevoLabel = '';
    this.nuevoDescripcion = '';
    this.nuevoBasadoEn = '';
    this.nuevoInstitucionId = null;
    if (this.puedeElegirInstitucion() && !this.instituciones().length) {
      this.rolesService.instituciones().subscribe({
        next: (rows) => this.instituciones.set(rows),
        error: () => this.instituciones.set([]),
      });
    }
  }

  crearRol(): void {
    const label = this.nuevoLabel.trim();
    if (!label) {
      this.mostrarNotificacion('Indique el nombre del rol', 'error');
      return;
    }
    if (!this.nuevoBasadoEn) {
      this.mostrarNotificacion('Elija una plantilla de permisos para el rol', 'error');
      return;
    }
    this.rolesService.crear({
      label,
      descripcion: this.nuevoDescripcion.trim(),
      basadoEn: this.nuevoBasadoEn,
      institutionId: this.puedeElegirInstitucion() ? this.nuevoInstitucionId ?? undefined : undefined,
    }).subscribe({
      next: (creado) => {
        const rol = mapRol(creado);
        this._roles.update((list) => [...list, rol]);
        this.seleccionarRol(rol);
        this.creando.set(false);
        this.mostrarNotificacion(`Rol ${rol.label} creado para la sede`, 'success');
      },
      error: (err) => {
        const message = err?.error?.message;
        this.mostrarNotificacion(Array.isArray(message) ? message[0] : message || 'No se pudo crear el rol', 'error');
      },
    });
  }

  seleccionarRol(rol: Rol): void {
    this._rolActivo.set(rol);
    this._permisosEditando.set(new Set(rol.permisos));
  }

  tienePermiso(codigo: string): boolean {
    return this._rolActivo()?.esAdmin || this._permisosEditando().has(codigo);
  }

  togglePermiso(codigo: string, e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this._permisosEditando.update((set) => {
      const next = new Set(set);
      if (checked) next.add(codigo);
      else next.delete(codigo);
      return next;
    });
  }

  toggleSeccion(sec: SeccionPermisos): void {
    const todos = sec.permisos.every((p) => this._permisosEditando().has(p.codigo));
    this._permisosEditando.update((set) => {
      const next = new Set(set);
      sec.permisos.forEach((p) =>
        todos ? next.delete(p.codigo) : next.add(p.codigo),
      );
      return next;
    });
  }

  marcarTodos(): void {
    this._permisosEditando.set(
      new Set(this.secciones().flatMap((s) => s.permisos.map((p) => p.codigo))),
    );
  }

  desmarcarTodos(): void {
    this._permisosEditando.set(new Set());
  }

  permisosActivos(rol: Rol): number {
    return rol.esAdmin ? this.totalPermisos() : rol.permisos.size;
  }

  permisosSeccion(sec: SeccionPermisos): number {
    if (this._rolActivo()?.esAdmin) return sec.permisos.length;
    return sec.permisos.filter((p) => this._permisosEditando().has(p.codigo)).length;
  }

  todaSeccionActiva(sec: SeccionPermisos): boolean {
    return sec.permisos.every((p) => this._permisosEditando().has(p.codigo));
  }

  guardarPermisos(): void {
    const rol = this._rolActivo();
    if (!rol || rol.esAdmin || rol.esSistema) return;

    const permisos = [...this._permisosEditando()];
    this.rolesService.updatePermissions(rol.codigo, {
      permisos,
      motivo: `Actualización de permisos del rol ${rol.label}`,
    }).subscribe({
      next: (actualizado) => {
        const actualizadoRol = mapRol(actualizado);
        this._roles.update((list) =>
          list.map((r) => (r.codigo === rol.codigo ? actualizadoRol : r)),
        );
        this._rolActivo.set(actualizadoRol);
        this._permisosEditando.set(new Set(actualizadoRol.permisos));
        this.mostrarNotificacion(
          this.auth.userRoles().some((codigo) => codigo === rol.codigo)
            ? `Permisos guardados para ${actualizadoRol.label}. Tu sesión se actualizó.`
            : `Permisos guardados para ${actualizadoRol.label}. Los usuarios con ese rol deben refrescar la página o volver a iniciar sesión.`,
          'success',
        );
        if (this.auth.userRoles().some((codigo) => codigo === rol.codigo)) {
          this.auth.syncSessionFromServer().subscribe({ error: () => {} });
        }
      },
      error: () => {
        this.mostrarNotificacion('Error al guardar los permisos', 'error');
      },
    });
  }

  private mostrarNotificacion(mensaje: string, tipo: 'success' | 'error'): void {
    this.notificacion.set({ mensaje, tipo });
    setTimeout(() => this.notificacion.set(null), 3000);
  }
}
