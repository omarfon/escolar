import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { LayoutService } from '../../../../core/layout/services/layout.service';
import { InstitucionalService } from '../../../administracion/institucional/institucional.service';
import { Nivel } from '../../../administracion/institucional/institucional.model';
import { MaestrosFormulasEvaluacionService } from './formulas-evaluacion.service';
import {
  COMPONENTES_SUGERIDOS,
  CreateMaestroFormulaPayload,
  ESCALA_DEFAULT,
  FormulaComponenteItem,
  MaestroFormulaEvaluacionItem,
  slugCodigo,
  sumaPesos,
} from './formulas-evaluacion.model';
import { FormulaEvaluacionDrawerComponent } from './formula-evaluacion-drawer.component';

@Component({
  selector: 'app-maestros-formulas-evaluacion',
  standalone: true,
  imports: [NgClass, FormulaEvaluacionDrawerComponent],
  template: `
<div class="space-y-4">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h3 class="text-lg font-bold text-gray-900">Fórmulas de Evaluación</h3>
      <p class="text-sm text-gray-400 mt-0.5">
        Estructura ponderada de calificación usada por el registro de notas
      </p>
    </div>
    <button class="btn btn-primary btn-sm" (click)="abrirModal()">
      <span class="icon icon-sm">add</span> Nueva fórmula
    </button>
  </div>

  @if (error()) {
    <div class="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{{ error() }}</div>
  }
  @if (toast()) {
    <div class="rounded-xl px-4 py-3 text-sm"
      [ngClass]="toast()!.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
      {{ toast()!.msg }}
    </div>
  }

  <div class="card overflow-hidden">
    @if (svc.loading()) {
      <div class="p-10 text-center text-gray-400 text-sm">Cargando fórmulas...</div>
    } @else if (!formulas().length) {
      <div class="p-10 text-center text-gray-500 text-sm">No hay fórmulas registradas.</div>
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">Fórmula</th>
              <th class="px-4 py-3 text-left">Alcance</th>
              <th class="px-4 py-3 text-left">Componentes</th>
              <th class="px-4 py-3 text-center">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (f of formulas(); track f.id) {
              <tr class="hover:bg-gray-50/80">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900">{{ f.nombre }}</div>
                  <div class="text-xs text-gray-400 font-mono">{{ f.codigo || '—' }}</div>
                  @if (f.esDefault) {
                    <span class="badge badge-indigo text-[10px] mt-1">Predeterminada</span>
                  }
                </td>
                <td class="px-4 py-3 text-gray-600 text-xs">
                  <div>{{ f.nivel || 'Todos los niveles' }}</div>
                  <div>{{ f.grado || 'Todos los grados' }} · {{ f.curso || 'Todos los cursos' }}</div>
                  @if (f.bimestre) { <div>Bimestre {{ f.bimestre }}</div> }
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    @for (c of f.componentes; track c.codigo) {
                      <span class="badge badge-gray text-[10px]">{{ c.nombre }} ({{ c.peso }}%)</span>
                    }
                  </div>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="badge" [ngClass]="f.activo ? 'badge-green' : 'badge-gray'">
                    {{ f.activo ? 'Activa' : 'Inactiva' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-0.5">
                    <button type="button" class="btn btn-ghost btn-icon text-gray-600 hover:text-indigo-600"
                      title="Editar" (click)="editar(f)">
                      <span class="icon icon-sm">edit</span>
                    </button>
                    @if (!f.esDefault) {
                      <button type="button" class="btn btn-ghost btn-icon text-red-500"
                        title="Desactivar" (click)="solicitarDesactivar(f)">
                        <span class="icon icon-sm">delete</span>
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  <app-formula-evaluacion-drawer
    [abierto]="drawerAbierto()"
    [editId]="editId()"
    [form]="form"
    [niveles]="niveles()"
    [grados]="grados()"
    [saving]="svc.saving()"
    [sumaPesos]="sumaPesosForm()"
    (cerrar)="cerrarDrawer()"
    (guardar)="guardar()"
    (nombreChange)="syncCodigo()"
    (nivelChange)="onNivelChange()"
    (agregarComponente)="agregarComponente()"
    (quitarComponente)="quitarComponente($event)"
    (componenteNombreChange)="syncComponenteCodigo($event)"
  />

  @if (confirmGuardarModal()) {
    <div class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      (click)="cerrarConfirmGuardar()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in"
        (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <span class="icon">functions</span>
            </div>
            <div>
              <h3 class="font-bold text-gray-900">Confirmar nueva fórmula</h3>
              <p class="text-xs text-gray-500">Revisa los datos antes de registrar</p>
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-icon text-gray-400" (click)="cerrarConfirmGuardar()">
            <span class="icon">close</span>
          </button>
        </div>
        <div class="px-6 py-5 space-y-4">
          <div class="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-900">
            <p class="font-semibold text-base">{{ form.nombre || 'Sin nombre' }}</p>
            <p class="mt-1 font-mono text-xs text-indigo-700">{{ form.codigo || '—' }}</p>
            <p class="mt-2 text-indigo-800">
              {{ form.nivel || 'Todos los niveles' }} · {{ form.grado || 'Todos los grados' }}
              @if (form.curso) { · {{ form.curso }} }
              @if (form.bimestre) { · Bimestre {{ form.bimestre }} }
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <p class="text-xs text-gray-500">Componentes</p>
              <p class="text-xl font-bold text-gray-900 mt-0.5">{{ form.componentes.length }}</p>
            </div>
            <div class="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <p class="text-xs text-gray-500">Suma de pesos</p>
              <p class="text-xl font-bold text-indigo-600 mt-0.5">{{ sumaPesosForm() }}%</p>
            </div>
          </div>
          @if (form.esDefault) {
            <p class="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Se marcará como fórmula predeterminada del sistema.
            </p>
          }
          <p class="text-sm text-gray-600">
            ¿Deseas registrar esta fórmula de evaluación en el catálogo?
          </p>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
          <button type="button" class="btn btn-secondary" (click)="cerrarConfirmGuardar()" [disabled]="svc.saving()">
            Cancelar
          </button>
          <button type="button" class="btn btn-primary" (click)="confirmarCreacion()" [disabled]="svc.saving()">
            <span class="icon icon-sm">check</span>
            {{ svc.saving() ? 'Guardando...' : 'Confirmar y crear' }}
          </button>
        </div>
      </div>
    </div>
  }

  @if (confirmDesactivarModal()) {
    <div class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      (click)="cerrarConfirmDesactivar()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in"
        (click)="$event.stopPropagation()">
        <div class="flex items-center gap-4 px-6 pt-6">
          <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <span class="icon text-red-600">warning</span>
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-900">Desactivar fórmula</h3>
            <p class="text-sm text-gray-500 mt-0.5">La fórmula dejará de estar disponible para nuevos registros.</p>
          </div>
        </div>
        <div class="px-6 py-4">
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-sm text-red-800">
              ¿Desactivar la fórmula <strong>{{ itemDesactivar()?.nombre }}</strong>?
            </p>
          </div>
        </div>
        <div class="px-6 pb-6 flex gap-3">
          <button type="button" class="btn btn-secondary flex-1" (click)="cerrarConfirmDesactivar()" [disabled]="svc.saving()">
            Cancelar
          </button>
          <button type="button" class="btn btn-danger flex-1 gap-1.5" (click)="confirmarDesactivar()" [disabled]="svc.saving()">
            <span class="icon icon-sm">delete</span>
            {{ svc.saving() ? 'Procesando...' : 'Sí, desactivar' }}
          </button>
        </div>
      </div>
    </div>
  }
</div>
  `,
})
export class MaestrosFormulasEvaluacionComponent implements OnInit {
  readonly svc = inject(MaestrosFormulasEvaluacionService);
  private readonly layout = inject(LayoutService);
  private readonly institucional = inject(InstitucionalService);

  readonly formulas = signal<MaestroFormulaEvaluacionItem[]>([]);
  readonly niveles = signal<Nivel[]>([]);
  readonly error = signal('');
  readonly toast = signal<{ type: 'ok' | 'err'; msg: string } | null>(null);
  readonly drawerAbierto = signal(false);
  readonly editId = signal<number | null>(null);
  readonly confirmGuardarModal = signal(false);
  readonly confirmDesactivarModal = signal(false);
  readonly itemDesactivar = signal<MaestroFormulaEvaluacionItem | null>(null);

  form: CreateMaestroFormulaPayload = this.emptyForm();
  private pendingSavePayload: CreateMaestroFormulaPayload | null = null;

  readonly grados = computed(() => {
    const nivel = this.niveles().find(n => n.nombre === this.form.nivel);
    return nivel?.grados.map(g => g.nombre) ?? [];
  });

  ngOnInit(): void {
    this.layout.setTitle('Fórmulas de Evaluación');
    this.institucional.loadEducationLevels().subscribe({
      next: niveles => this.niveles.set(niveles.filter(n => n.activo)),
    });
    this.cargar();
  }

  sumaPesosForm(): number {
    return sumaPesos(this.form.componentes);
  }

  cargar(): void {
    this.error.set('');
    this.svc.list().subscribe({
      next: rows => this.formulas.set(rows),
      error: err => this.error.set(err.message ?? 'No se pudieron cargar las fórmulas'),
    });
  }

  abrirModal(): void {
    this.editId.set(null);
    this.form = this.emptyForm();
    this.drawerAbierto.set(true);
  }

  editar(item: MaestroFormulaEvaluacionItem): void {
    this.editId.set(item.id);
    this.form = {
      nombre: item.nombre,
      codigo: item.codigo,
      nivel: item.nivel,
      grado: item.grado,
      curso: item.curso,
      bimestre: item.bimestre ?? undefined,
      componentes: item.componentes.map(c => ({ ...c })),
      escalaLogro: { ...item.escalaLogro },
      esDefault: item.esDefault,
      orden: item.orden,
      estado: item.activo ? 'activo' : 'inactivo',
    };
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
  }

  syncCodigo(): void {
    if (!this.editId() && this.form.nombre) {
      this.form.codigo = slugCodigo(this.form.nombre).toUpperCase().slice(0, 20);
    }
  }

  syncComponenteCodigo(c: FormulaComponenteItem): void {
    if (!c.codigo && c.nombre) c.codigo = slugCodigo(c.nombre);
  }

  onNivelChange(): void {
    this.form.grado = '';
  }

  agregarComponente(): void {
    const orden = this.form.componentes.length + 1;
    this.form.componentes.push({
      codigo: `componente_${orden}`,
      nombre: 'Nuevo componente',
      peso: 0,
      orden,
      activo: true,
    });
  }

  quitarComponente(index: number): void {
    this.form.componentes.splice(index, 1);
    this.form.componentes.forEach((c, i) => c.orden = i + 1);
  }

  guardar(): void {
    if (this.sumaPesosForm() !== 100) {
      this.toast.set({ type: 'err', msg: 'La suma de pesos debe ser 100%' });
      return;
    }

    const payload: CreateMaestroFormulaPayload = {
      ...this.form,
      componentes: this.form.componentes.map((c, i) => ({ ...c, orden: i + 1, peso: Number(c.peso) })),
      escalaLogro: this.form.escalaLogro ?? ESCALA_DEFAULT,
    };
    const id = this.editId();

    if (id) {
      this.ejecutarGuardado(this.svc.update(id, payload), 'Fórmula actualizada');
      return;
    }

    this.pendingSavePayload = payload;
    this.confirmGuardarModal.set(true);
  }

  cerrarConfirmGuardar(): void {
    if (this.svc.saving()) return;
    this.confirmGuardarModal.set(false);
    this.pendingSavePayload = null;
  }

  confirmarCreacion(): void {
    const payload = this.pendingSavePayload;
    if (!payload) return;
    this.ejecutarGuardado(this.svc.create(payload), 'Fórmula creada', () => {
      this.confirmGuardarModal.set(false);
      this.pendingSavePayload = null;
    });
  }

  solicitarDesactivar(item: MaestroFormulaEvaluacionItem): void {
    this.itemDesactivar.set(item);
    this.confirmDesactivarModal.set(true);
  }

  cerrarConfirmDesactivar(): void {
    if (this.svc.saving()) return;
    this.confirmDesactivarModal.set(false);
    this.itemDesactivar.set(null);
  }

  confirmarDesactivar(): void {
    const item = this.itemDesactivar();
    if (!item) return;
    this.svc.remove(item.id).subscribe({
      next: () => {
        this.toast.set({ type: 'ok', msg: 'Fórmula desactivada' });
        this.cerrarConfirmDesactivar();
        this.cargar();
      },
      error: err => this.toast.set({ type: 'err', msg: err.message ?? 'No se pudo desactivar' }),
    });
  }

  private ejecutarGuardado(
    req: ReturnType<MaestrosFormulasEvaluacionService['create']>,
    okMsg: string,
    onOk?: () => void,
  ): void {
    req.subscribe({
      next: () => {
        this.toast.set({ type: 'ok', msg: okMsg });
        onOk?.();
        this.cerrarDrawer();
        this.cargar();
      },
      error: err => this.toast.set({ type: 'err', msg: err.message ?? 'Error al guardar' }),
    });
  }

  private emptyForm(): CreateMaestroFormulaPayload {
    return {
      nombre: '',
      codigo: '',
      nivel: '',
      grado: '',
      curso: '',
      bimestre: undefined,
      componentes: COMPONENTES_SUGERIDOS.map(c => ({ ...c })),
      escalaLogro: { ...ESCALA_DEFAULT },
      esDefault: false,
      orden: 0,
      estado: 'activo',
    };
  }
}
