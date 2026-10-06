import { Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { Estudiante } from '../../estudiantes/services/expedientes.service';
import {
  combinarRequisitosConDocumentos,
  DocumentoMatriculaVista,
} from '../../estudiantes/shared/documentos-requisitos';

@Component({
  selector: 'app-fut-detalle',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" (click)="closed.emit()">
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        (click)="$event.stopPropagation()"
      >
        <!-- Encabezado institucional -->
        <div class="px-6 py-5 border-b bg-gradient-to-r from-teal-700 to-teal-600 text-white shrink-0">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] uppercase tracking-widest text-teal-200 font-semibold">Ministerio de Educación · Perú</p>
              <h2 class="text-lg font-bold mt-1">Ficha Única de Matrícula (FUT)</h2>
              <p class="text-sm text-teal-100 mt-0.5">{{ institucionNombre() }}</p>
              <p class="text-xs text-teal-200 mt-1">Año lectivo {{ anioLectivo() }}</p>
            </div>
            <button
              type="button"
              class="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
              (click)="closed.emit()"
            >
              <span class="icon text-white">close</span>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-slate-50/60">
          <!-- Identificación FUT -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="px-4 py-2 rounded-xl bg-white border border-teal-100 shadow-sm">
              <div class="text-[10px] text-gray-400 uppercase font-semibold">N° FUT</div>
              <div class="font-mono font-bold text-teal-800">{{ futNumero() }}</div>
            </div>
            <div class="px-4 py-2 rounded-xl bg-white border border-teal-100 shadow-sm">
              <div class="text-[10px] text-gray-400 uppercase font-semibold">Código alumno</div>
              <div class="font-mono font-bold text-gray-800">{{ e().codigo }}</div>
            </div>
            <span class="badge text-xs"
              [ngClass]="futEstado() === 'entregado' ? 'badge-green' : futEstado() === 'vencido' ? 'badge-red' : 'badge-gray'">
              {{ futEstado() }}
            </span>
            @if (futFechaEntrega()) {
              <span class="text-xs text-gray-500">Entregada: {{ futFechaEntrega() }}</span>
            }
          </div>

          <!-- I. Datos del estudiante -->
          <section class="card p-4 space-y-3">
            <h3 class="text-xs font-bold text-teal-700 uppercase tracking-wide flex items-center gap-2">
              <span class="icon icon-sm">person</span> I. Datos del estudiante
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span class="text-xs text-gray-400 block">Apellidos y nombres</span><span class="font-semibold text-gray-900">{{ e().apellidos }}, {{ e().nombres }}</span></div>
              <div><span class="text-xs text-gray-400 block">DNI</span><span class="font-medium">{{ e().dni || '—' }}</span></div>
              <div><span class="text-xs text-gray-400 block">Fecha de nacimiento</span><span class="font-medium">{{ formatFecha(e().fechaNac) }}</span></div>
              <div><span class="text-xs text-gray-400 block">Sexo</span><span class="font-medium">{{ e().sexo === 'F' ? 'Femenino' : 'Masculino' }}</span></div>
              <div class="sm:col-span-2"><span class="text-xs text-gray-400 block">Dirección</span><span class="font-medium">{{ e().direccion || '—' }}</span></div>
              <div><span class="text-xs text-gray-400 block">Correo</span><span class="font-medium">{{ e().email || '—' }}</span></div>
              <div><span class="text-xs text-gray-400 block">Grupo sanguíneo</span><span class="font-medium">{{ e().grupoSanguineo || '—' }}</span></div>
              @if (e().alergias) {
                <div class="sm:col-span-2"><span class="text-xs text-gray-400 block">Alergias</span><span class="font-medium">{{ e().alergias }}</span></div>
              }
              @if (e().condicionesSalud) {
                <div class="sm:col-span-2"><span class="text-xs text-gray-400 block">Condiciones de salud</span><span class="font-medium">{{ e().condicionesSalud }}</span></div>
              }
            </div>
          </section>

          <!-- II. Datos académicos -->
          <section class="card p-4 space-y-3">
            <h3 class="text-xs font-bold text-teal-700 uppercase tracking-wide flex items-center gap-2">
              <span class="icon icon-sm">school</span> II. Datos académicos
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span class="text-xs text-gray-400 block">Grado</span><span class="font-semibold">{{ e().grado }}</span></div>
              <div><span class="text-xs text-gray-400 block">Sección</span><span class="font-semibold">{{ e().seccion }}</span></div>
              <div><span class="text-xs text-gray-400 block">Año de ingreso</span><span class="font-semibold">{{ e().anioIngreso }}</span></div>
              <div><span class="text-xs text-gray-400 block">Estado matrícula</span>
                <span class="badge text-xs mt-0.5"
                  [ngClass]="e().estado === 'activo' ? 'badge-green' : e().estado === 'retirado' ? 'badge-red' : 'badge-gray'">
                  {{ e().estado }}
                </span>
              </div>
            </div>
          </section>

          <!-- III. Representantes -->
          <section class="card p-4 space-y-3">
            <h3 class="text-xs font-bold text-teal-700 uppercase tracking-wide flex items-center gap-2">
              <span class="icon icon-sm">supervisor_account</span> III. Padres / apoderados
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              @for (rep of representantes(); track rep.label) {
                <div class="rounded-xl border p-3 text-sm"
                  [ngClass]="rep.esPrincipal
                    ? 'border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-white shadow-sm'
                    : 'border-gray-100 bg-gray-50/80'">
                  <div class="flex flex-wrap items-center gap-1.5 mb-2">
                    <div class="text-xs font-bold uppercase"
                      [ngClass]="rep.esPrincipal ? 'text-indigo-800' : 'text-gray-500'">
                      {{ rep.esPrincipal ? 'Apoderado principal' : rep.label }}
                    </div>
                    @if (rep.esPrincipal) {
                      <span class="inline-flex items-center gap-0.5 text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-semibold normal-case">
                        <span class="icon" style="font-size:10px">star</span> Principal
                      </span>
                    }
                  </div>
                  @if (rep.datos.nombres) {
                    <div class="font-semibold text-gray-900">{{ rep.datos.nombres }} {{ rep.datos.apellidos }}</div>
                    <div class="text-xs text-gray-500 mt-1 space-y-0.5">
                      <div>DNI: {{ rep.datos.dni || '—' }}</div>
                      <div>Tel: {{ rep.datos.telefono || '—' }}</div>
                      <div>{{ rep.datos.email || '—' }}</div>
                      @if (rep.datos.trabajo) { <div>{{ rep.datos.trabajo }}</div> }
                    </div>
                  } @else {
                    <p class="text-gray-400 italic text-xs">No registrado</p>
                  }
                </div>
              }
            </div>
          </section>

          <!-- IV. Documentos presentados -->
          <section class="card p-4 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-xs font-bold text-teal-700 uppercase tracking-wide flex items-center gap-2">
                <span class="icon icon-sm">checklist</span> IV. Documentos de matrícula
              </h3>
              <span class="text-xs text-gray-500">{{ docsEntregados() }}/{{ documentos().length }} entregados</span>
            </div>
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-teal-500 rounded-full transition-all" [style.width]="pctDocs() + '%'"></div>
            </div>
            <div class="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
              @for (doc of documentos(); track doc.tipo) {
                <div class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm bg-white">
                  <div class="min-w-0">
                    <div class="font-medium text-gray-800 truncate">{{ doc.tipo }}</div>
                    @if (doc.numero) {
                      <div class="text-xs text-gray-400">N° {{ doc.numero }}</div>
                    }
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    @if (doc.obligatorio) {
                      <span class="text-[10px] text-red-500 font-semibold">Obl.</span>
                    }
                    <span class="badge text-[10px]"
                      [ngClass]="doc.estado === 'entregado' ? 'badge-green' : doc.estado === 'vencido' ? 'badge-red' : 'badge-gray'">
                      {{ doc.estado }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- V. Declaración -->
          <section class="card p-4 text-xs text-gray-500 leading-relaxed border-dashed">
            <p>
              Declaro bajo responsabilidad que la información consignada es verídica y me comprometo a presentar
              los documentos pendientes dentro del plazo establecido por la institución educativa.
            </p>
            <p class="mt-2 text-gray-400">Generado el {{ fechaGeneracion() }} · Sistema Escolar</p>
          </section>
        </div>

        <div class="px-6 py-4 border-t bg-white flex gap-2 shrink-0">
          <button type="button" class="btn btn-secondary flex-1" (click)="imprimir()">
            <span class="icon icon-sm">print</span> Imprimir FUT
          </button>
          <button type="button" class="btn btn-primary flex-1" (click)="closed.emit()">Cerrar</button>
        </div>
      </div>
    </div>
  `,
})
export class FutDetalleComponent {
  readonly estudiante = input.required<Estudiante>();
  readonly institucion = input<string>('I.E.P. San Martín de Porres');
  readonly closed = output<void>();

  readonly e = computed(() => this.estudiante());

  readonly documentos = computed((): DocumentoMatriculaVista[] =>
    combinarRequisitosConDocumentos(this.e().grado, this.e().documentos),
  );

  readonly docsEntregados = computed(
    () => this.documentos().filter((d) => d.estado === 'entregado').length,
  );

  readonly pctDocs = computed(() => {
    const total = this.documentos().length;
    return total ? Math.round((this.docsEntregados() / total) * 100) : 0;
  });

  readonly futRegistro = computed(() => {
    const doc = this.e().documentos.find(
      (d) => d.tipo.includes('FUT') || d.tipo.includes('Matrícula'),
    );
    return doc ?? null;
  });

  readonly futNumero = computed(
    () => this.futRegistro()?.numero || `FUT-${this.e().codigo}`,
  );

  readonly futEstado = computed(
    () => this.futRegistro()?.estado ?? 'pendiente',
  );

  readonly futFechaEntrega = computed(
    () => this.futRegistro()?.fechaEntrega ?? '',
  );

  readonly representantes = computed(() => {
    const s = this.e();
    return [
      { label: 'Apoderado', datos: s.apoderado, esPrincipal: true },
      { label: 'Padre', datos: s.padre, esPrincipal: false },
      { label: 'Madre', datos: s.madre, esPrincipal: false },
    ];
  });

  institucionNombre(): string {
    return this.institucion();
  }

  anioLectivo(): string {
    return String(new Date().getFullYear());
  }

  fechaGeneracion(): string {
    return new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  formatFecha(f: string): string {
    if (!f) return '—';
    const [y, m, d] = f.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return f;
  }

  imprimir(): void {
    window.print();
  }
}
