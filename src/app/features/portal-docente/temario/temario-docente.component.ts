import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { NgClass } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';

import { forkJoin, of } from 'rxjs';

import { switchMap } from 'rxjs/operators';

import { LayoutService } from '../../../core/layout/services/layout.service';
import { OverlayPortalDirective } from '../../../core/overlay/overlay-portal.directive';

import { AsistenciaDocenteService } from '../asistencia/asistencia-docente.service';

import { DocenteSalonAsignado } from '../asistencia/asistencia-docente.model';

import { PortalDocenteService } from '../portal-docente.service';

import { PortalDocenteCursoCard } from '../portal-docente.model';

import { RecursosService } from '../recursos/recursos.service';
import { uploadTipoForFile } from '../recursos/recursos.model';

import { TemarioDocenteService } from './temario-docente.service';

import {

  ESTADOS_TEMARIO,

  esImagenClasePermitida,

  IMAGENES_CLASE_ACCEPT,

  MODOS_LIBERACION,

  TIPOS_MATERIAL_TEMARIO,

  estadoTemarioBadge,

  estadoTemarioLabel,

  liberacionTemarioBadge,

  materialTemarioLabel,

  ModoLiberacionTemario,

  resumenClase,

  temarioImagenUrl,

  temarioMaterialUrl,

  TemarioClaseEstado,

  TemarioClaseItem,

  TemarioImagenClase,

  TemarioImagenFormItem,

  TemarioMaterialTipo,

  toImagenesClasePayload,

  tieneContenidoClase,

} from './temario.model';



interface CursoTemarioView {

  cursoId: number;

  assignmentId: number;

  nombre: string;

  nivel: string;

  grado: string;

  seccion: string;

}



type PanelModo = 'ver' | 'editar';



@Component({

  selector: 'app-temario-docente',

  standalone: true,

  imports: [FormsModule, NgClass, OverlayPortalDirective],

  template: `

<div class="space-y-5 animate-fade-in">



  @if (toast()) {
    <div appOverlayPortal
      class="fixed bottom-6 right-6 z-[200] flex items-start gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-slide-in-r max-w-sm"
      [ngClass]="toast()!.tipo === 'ok'
        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
        : 'bg-white border-red-300'">
      <span class="text-lg shrink-0">{{ toast()!.tipo === 'ok' ? '✓' : '✕' }}</span>
      <p class="text-sm font-semibold flex-1 leading-snug">{{ toast()!.msg }}</p>
      <button type="button" (click)="toast.set(null)" class="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">×</button>
    </div>
  }



  @if (!salonSeleccionado()) {

    <div>

      <h2 class="text-xl font-bold text-gray-800">Temario por salón</h2>

      <p class="text-sm text-gray-500 mt-1">

        Planifica las clases que dictarás. Tus alumnos podrán consultarlas en su portal.

        @if (anioEscolar()) { · Año {{ anioEscolar() }} }

      </p>

    </div>



    @if (errorSalones()) {

      <div class="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">{{ errorSalones() }}</div>

    }



    @if (salonesSvc.loading()) {

      <div class="card p-10 text-center text-gray-500">Cargando salones asignados…</div>

    } @else if (!salones().length) {

      <div class="card p-10 text-center text-gray-500">

        <div class="text-4xl mb-3">📅</div>

        <p class="font-medium text-gray-700">No tienes salones asignados</p>

      </div>

    } @else {

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">

        @for (s of salones(); track salonKey(s)) {

          <button type="button"

            class="card px-3 py-3 text-left hover:shadow-md border-l-4 border-l-teal-500 transition-all"

            (click)="seleccionarSalon(s)">

            <div class="text-[10px] font-semibold uppercase tracking-wide text-teal-600">{{ s.nivel }}</div>

            <h3 class="font-bold text-gray-800 text-base leading-snug mt-0.5">{{ s.grado }} "{{ s.seccion }}"</h3>

            <p class="text-xs text-gray-500 mt-0.5">{{ s.totalAlumnos }} alumno(s) · {{ s.cursos.length }} curso(s)</p>

          </button>

        }

      </div>

    }

  } @else {

    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

      <div class="flex items-center gap-3">

        <button type="button" class="btn btn-secondary btn-sm" (click)="volverASalones()">

          <span class="icon icon-sm">arrow_back</span> Mis salones

        </button>

        <div>

          <h2 class="text-lg font-bold text-gray-800">{{ salonSeleccionado()!.label }}</h2>

          <p class="text-sm text-gray-500">Temario de clases · visible para alumnos</p>

        </div>

      </div>

      <div class="flex gap-2">

        <button type="button" class="btn btn-secondary btn-sm" (click)="cargarClases()" [disabled]="svc.loading()">

          <span class="icon icon-sm">refresh</span> Actualizar

        </button>

        <button type="button" class="btn btn-primary btn-sm" (click)="abrirPanel(undefined, 'editar')" [disabled]="!cursoActivo()">

          <span class="icon icon-sm">add</span> Agregar clase

        </button>

      </div>

    </div>



    <div class="card p-4">

      <label class="form-label mb-2 block">Curso</label>

      <div class="flex flex-wrap gap-2">

        @for (c of cursosSalon(); track c.nombre) {

          <button type="button"

            class="px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all"

            [ngClass]="cursoActivo()?.nombre === c.nombre

              ? 'border-teal-500 bg-teal-50 text-teal-800'

              : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-teal-200'"

            (click)="seleccionarCurso(c)">

            {{ c.nombre }}

          </button>

        }

      </div>

    </div>



    @if (cursoActivo(); as curso) {

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">

        @for (kpi of kpis(); track kpi.label) {

          <div class="card p-4">

            <p class="text-xs text-gray-400">{{ kpi.label }}</p>

            <p class="text-2xl font-bold text-gray-900 mt-1">{{ kpi.value }}</p>

          </div>

        }

      </div>



      @if (svc.loading()) {

        <div class="card p-12 text-center text-gray-400 text-sm">Cargando temario…</div>

      } @else if (!clases().length) {

        <div class="card p-16 text-center">

          <span class="text-4xl mb-4 block">📚</span>

          <h3 class="text-lg font-semibold text-gray-700 mb-2">Sin clases registradas</h3>

          <p class="text-gray-500 text-sm mb-4">Agrega la primera clase con su fecha y contenido.</p>

          <button type="button" class="btn btn-primary btn-sm" (click)="abrirPanel(undefined, 'editar')">

            <span class="icon icon-sm">add</span> Agregar clase

          </button>

        </div>

      } @else {

        <div class="space-y-3">

          @for (c of clases(); track c.id) {

            <div class="card p-4 hover:shadow-md transition-shadow border-l-4 cursor-pointer"

              [ngClass]="c.estado === 'dictada' ? 'border-l-emerald-400' : c.estado === 'cancelada' ? 'border-l-red-300' : 'border-l-teal-400'"

              (click)="abrirPanel(c, 'ver')">

              <div class="flex flex-col lg:flex-row lg:items-start gap-4">

                <div class="flex items-start gap-4 flex-1 min-w-0">

                  <div class="w-14 h-14 rounded-xl bg-teal-50 text-teal-700 flex flex-col items-center justify-center shrink-0">

                    <span class="text-[10px] uppercase font-bold">Clase</span>

                    <span class="text-lg font-bold leading-none">{{ c.numero }}</span>

                  </div>

                  <div class="min-w-0 flex-1">

                    <div class="flex flex-wrap items-center gap-2 mb-1">

                      <h3 class="font-semibold text-gray-900">{{ c.titulo }}</h3>

                      <span class="badge text-xs" [ngClass]="estadoBadge(c.estado)">{{ estadoLabel(c.estado) }}</span>

                      <span class="badge text-xs" [ngClass]="liberacionBadge(c)">{{ c.liberacionLabel }}</span>

                    </div>

                    <p class="text-sm font-medium text-teal-700">{{ c.fechaClaseDisplay }}</p>

                    @if (resumen(c); as txt) {

                      <p class="text-sm text-gray-600 mt-2 line-clamp-2">{{ txt }}</p>

                    }

                    <div class="flex flex-wrap gap-2 mt-2">

                      @if (tieneContenido(c)) {

                        <span class="badge badge-gray text-xs">{{ c.imagenesClase.length || 0 }} img · contenido</span>

                      }

                      @if (c.tieneMaterial) {

                        <span class="badge badge-indigo text-xs">Material adjunto</span>

                      }

                    </div>

                  </div>

                </div>

                <div class="flex flex-wrap gap-2 shrink-0" (click)="$event.stopPropagation()">

                  <button type="button" class="btn btn-secondary btn-sm" (click)="abrirPanel(c, 'ver')">Ver</button>

                  <button type="button" class="btn btn-secondary btn-sm" (click)="abrirPanel(c, 'editar')">Editar</button>

                  @if (!c.liberadoAlumno && c.modoLiberacion !== 'oculto') {

                    <button type="button" class="btn btn-secondary btn-sm" (click)="liberarAhora(c)">Liberar</button>

                  }

                  <button type="button" class="btn btn-secondary btn-sm text-red-600" (click)="eliminarTarget.set(c)">Eliminar</button>

                </div>

              </div>

            </div>

          }

        </div>

      }

    }

  }



  @if (panelAbierto()) {

    <div class="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" (click)="cerrarPanel()"></div>

    <div class="fixed right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in-l">



      <div class="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100 shrink-0">

        <div class="min-w-0">

          @if (panelModo() === 'ver' && claseVista(); as v) {

            <p class="text-xs font-semibold uppercase tracking-wide text-teal-600">Clase {{ v.numero }} · {{ v.fechaClaseDisplay }}</p>

            <h3 class="text-lg font-bold text-gray-900 mt-0.5 truncate">{{ v.titulo }}</h3>

            <div class="flex flex-wrap gap-2 mt-2">

              <span class="badge text-xs" [ngClass]="estadoBadge(v.estado)">{{ estadoLabel(v.estado) }}</span>

              <span class="badge text-xs" [ngClass]="liberacionBadge(v)">{{ v.liberacionLabel }}</span>

            </div>

            @if (v.fechaLiberacion && v.modoLiberacion !== 'oculto') {

              <p class="text-xs text-gray-500 mt-2">

                <span class="font-semibold">Liberación programada:</span> {{ v.fechaLiberacionDisplay }}

              </p>

            }

          } @else {

            <h3 class="text-lg font-bold text-gray-900">{{ editId() ? 'Editar clase' : 'Nueva clase' }}</h3>

            <p class="text-xs text-gray-500 mt-0.5">Redacta el desarrollo de la sesión, imágenes y material</p>

          }

        </div>

        <div class="flex items-center gap-1 shrink-0">

          @if (panelModo() === 'ver') {

            <button type="button" class="btn btn-secondary btn-sm" (click)="pasarAEditar()">

              <span class="icon icon-sm">edit</span> Editar

            </button>

          }

          <button type="button" class="btn-icon text-gray-400" (click)="cerrarPanel()">

            <span class="icon">close</span>

          </button>

        </div>

      </div>



      <div class="flex-1 overflow-y-auto px-6 py-5">

        @if (panelModo() === 'ver' && claseVista(); as v) {

          <div class="space-y-6">

            @if (v.contenidoClase) {

              <section>

                <h4 class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Desarrollo de la clase</h4>

                <div class="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-800 whitespace-pre-line leading-relaxed">{{ v.contenidoClase }}</div>

              </section>

            }

            @if (v.descripcion) {

              <section>

                <h4 class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Resumen</h4>

                <p class="text-sm text-gray-700 whitespace-pre-line">{{ v.descripcion }}</p>

              </section>

            }

            @if (v.objetivos) {

              <section>

                <h4 class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Objetivos</h4>

                <p class="text-sm text-gray-600 whitespace-pre-line">{{ v.objetivos }}</p>

              </section>

            }

            @if (v.imagenesClase.length) {

              <section>

                <h4 class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Imágenes y recursos visuales</h4>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  @for (img of v.imagenesClase; track img.url) {

                    <figure class="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
                      <button type="button"
                        class="block w-full text-left group"
                        (click)="abrirImagenAmpliada(imagenUrl(img), img.nombre, img.leyenda)"
                        title="Clic para ampliar">
                        <img [src]="imagenUrl(img)" [alt]="img.nombre"
                          class="w-full h-40 object-cover bg-white cursor-zoom-in transition-opacity group-hover:opacity-90">
                      </button>

                      <figcaption class="p-3">

                        <p class="text-sm font-medium text-gray-900">{{ img.nombre }}</p>

                        @if (img.leyenda) {

                          <p class="text-xs text-gray-500 mt-1">{{ img.leyenda }}</p>

                        }

                      </figcaption>

                    </figure>

                  }

                </div>

              </section>

            }

            @if (v.tieneMaterial) {

              <section class="rounded-xl bg-slate-50 border border-slate-100 p-4">

                <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Material de clase</p>

                <p class="text-sm font-medium text-slate-800">{{ v.materialTitulo || 'Material adjunto' }}</p>

                @if (v.materialDescripcion) {

                  <p class="text-xs text-slate-600 mt-1 whitespace-pre-line">{{ v.materialDescripcion }}</p>

                }

                <p class="text-xs text-slate-400 mt-1">{{ materialLabel(v.materialTipo) }}</p>

                @if (materialLink(v); as link) {

                  <a [href]="link" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs font-medium text-teal-700 mt-2 hover:underline">

                    <span class="icon icon-sm">open_in_new</span> Ver material

                  </a>

                }

              </section>

            }

            @if (!tieneContenido(v) && !v.tieneMaterial) {

              <p class="text-sm text-gray-400 italic text-center py-8">Esta clase aún no tiene contenido registrado.</p>

            }

          </div>

        } @else {

          <div class="space-y-5">

            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos de la sesión</p>

            <div class="grid grid-cols-2 gap-3">

              <div>

                <label class="form-label">N° de clase</label>

                <input type="number" min="1" class="form-input" [(ngModel)]="mNumero">

              </div>

              <div>

                <label class="form-label">Fecha</label>

                <input type="date" class="form-input" [(ngModel)]="mFecha">

              </div>

            </div>

            <div>

              <label class="form-label">Título</label>

              <input class="form-input" [(ngModel)]="mTitulo" placeholder="Tema de la sesión">

            </div>

            <div>

              <label class="form-label">Resumen breve (opcional)</label>

              <textarea class="form-input min-h-[70px]" [(ngModel)]="mDescripcion" placeholder="Una línea para identificar la clase en el listado"></textarea>

            </div>

            <div>

              <label class="form-label">Objetivos de aprendizaje</label>

              <textarea class="form-input min-h-[80px]" [(ngModel)]="mObjetivos" placeholder="Qué aprenderán los alumnos"></textarea>

            </div>



            <div class="border-t border-gray-100 pt-5">

              <label class="form-label">Desarrollo de la clase</label>

              <p class="text-xs text-gray-400 mb-2">Guion, explicaciones, actividades, datos y notas para dictar la sesión</p>

              <textarea class="form-input min-h-[320px] font-mono text-sm leading-relaxed" [(ngModel)]="mContenidoClase"

                placeholder="Inicio (10 min):&#10;...&#10;&#10;Desarrollo (30 min):&#10;1. ...&#10;2. ...&#10;&#10;Cierre (10 min):&#10;..."></textarea>

            </div>



            <div class="border-t border-gray-100 pt-5">

              <div class="flex items-center justify-between mb-3">

                <div>

                  <h4 class="text-sm font-bold text-gray-800">Imágenes y datos visuales</h4>

                  <p class="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP, GIF, BMP o SVG · máx. 10 MB</p>

                </div>

                <label class="btn btn-secondary btn-sm cursor-pointer">

                  <span class="icon icon-sm">add_photo_alternate</span> Agregar

                  <input type="file" class="hidden" [accept]="imagenesClaseAccept" multiple (change)="onImagenesFile($event)">

                </label>

              </div>

              @if (mImagenes.length) {

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  @for (img of mImagenes; track $index; let i = $index) {

                    <div class="rounded-xl border border-gray-100 overflow-hidden">

                      @if (imagenPreview(img); as src) {
                        <button type="button"
                          class="block w-full"
                          (click)="abrirImagenAmpliada(src, img.nombre, img.leyenda)"
                          title="Clic para ampliar">
                          <img [src]="src" [alt]="img.nombre"
                            class="w-full h-32 object-cover bg-gray-50 cursor-zoom-in hover:opacity-90 transition-opacity">
                        </button>
                      }

                      <div class="p-3 space-y-2">

                        <input class="form-input text-sm" [(ngModel)]="img.nombre" placeholder="Nombre">

                        <input class="form-input text-sm" [(ngModel)]="img.leyenda" placeholder="Descripción (opcional)">

                        <button type="button" class="text-xs text-red-600 hover:underline" (click)="quitarImagen(i)">Quitar</button>

                      </div>

                    </div>

                  }

                </div>

              } @else {

                <p class="text-sm text-gray-400 italic py-4 text-center border border-dashed border-gray-200 rounded-xl">Sin imágenes agregadas</p>

              }

            </div>



            <div class="border-t border-gray-100 pt-5">

              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Publicación y estado</p>

              <div class="grid grid-cols-2 gap-3">

                <div>

                  <label class="form-label">Estado de la clase</label>

                  <select class="form-select" [(ngModel)]="mEstado">

                    @for (e of estadosOpts; track e.value) {

                      <option [ngValue]="e.value">{{ e.label }}</option>

                    }

                  </select>

                </div>

                <div>

                  <label class="form-label">Publicación para alumnos</label>

                  <select class="form-select" [(ngModel)]="mModoLiberacion">

                    @for (m of modosLiberacion; track m.value) {

                      <option [ngValue]="m.value">{{ m.label }}</option>

                    }

                  </select>

                  <p class="text-xs text-gray-400 mt-1">{{ modoLiberacionHint() }}</p>

                </div>

              </div>

              @if (mModoLiberacion === 'programada') {

                <div class="mt-3 grid grid-cols-2 gap-3">

                  <div>

                    <label class="form-label">Fecha de liberación</label>

                    <input type="date" class="form-input" [(ngModel)]="mFechaLiberacion">

                  </div>

                  <div>

                    <label class="form-label">Hora de liberación</label>

                    <input type="time" class="form-input" [(ngModel)]="mHoraLiberacion">

                  </div>

                </div>

              }

              @if (mModoLiberacion === 'dias_antes') {

                <div class="mt-3 grid grid-cols-2 gap-3">

                  <div>

                    <label class="form-label">Días antes de la clase</label>

                    <input type="number" min="0" max="365" class="form-input" [(ngModel)]="mDiasAntes">

                  </div>

                  <div>

                    <label class="form-label">Hora de liberación</label>

                    <input type="time" class="form-input" [(ngModel)]="mHoraLiberacion">

                  </div>

                </div>

              }

            </div>



            <div class="border-t border-gray-100 pt-5">

              <h4 class="text-sm font-bold text-gray-800 mb-3">Material adjunto para alumnos</h4>

              <div class="space-y-3">

                <div>

                  <label class="form-label">Título del material</label>

                  <input class="form-input" [(ngModel)]="mMaterialTitulo" placeholder="Ej. Guía de ejercicios semana 3">

                </div>

                <div>

                  <label class="form-label">Descripción</label>

                  <textarea class="form-input min-h-[60px]" [(ngModel)]="mMaterialDescripcion" placeholder="Indicaciones para el alumno"></textarea>

                </div>

                <div class="grid grid-cols-2 gap-3">

                  <div>

                    <label class="form-label">Tipo</label>

                    <select class="form-select" [(ngModel)]="mMaterialTipo">

                      @for (t of tiposMaterial; track t.value) {

                        <option [ngValue]="t.value">{{ t.label }}</option>

                      }

                    </select>

                  </div>

                  <div>

                    <label class="form-label">Enlace (URL)</label>

                    <input class="form-input" [(ngModel)]="mMaterialUrl" placeholder="https://...">

                  </div>

                </div>

                <div>

                  <label class="form-label">Archivo (opcional)</label>

                  <input type="file" class="form-input" (change)="onMaterialFile($event)" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*,video/*">

                  @if (mMaterialArchivoNombre) {

                    <p class="text-xs text-gray-500 mt-1">Archivo: {{ mMaterialArchivoNombre }}</p>

                  }

                </div>

              </div>

            </div>

          </div>

        }

      </div>



      @if (panelModo() === 'editar') {

        <div class="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">

          <button type="button" class="btn btn-primary flex-1" (click)="guardar()" [disabled]="!puedeGuardar() || svc.saving() || recursosSvc.uploading()">

            {{ editId() ? 'Guardar cambios' : 'Agregar clase' }}

          </button>

          <button type="button" class="btn btn-secondary" (click)="cerrarPanel()">Cancelar</button>

        </div>

      } @else if (claseVista(); as v) {

        <div class="flex flex-wrap gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">

          @if (!v.liberadoAlumno && v.modoLiberacion !== 'oculto') {

            <button type="button" class="btn btn-secondary btn-sm" (click)="liberarAhora(v)">Liberar ahora</button>

          }

          @if (v.modoLiberacion !== 'oculto') {

            <button type="button" class="btn btn-secondary btn-sm" (click)="ocultar(v)">Ocultar</button>

          }

          <button type="button" class="btn btn-secondary btn-sm text-red-600 ml-auto" (click)="eliminarTarget.set(v); cerrarPanel()">Eliminar</button>

        </div>

      }

    </div>

  }



  @if (imagenAmpliada(); as img) {
    <div appOverlayPortal
      class="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-sm"
      (click)="cerrarImagenAmpliada()">
      <button type="button"
        class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
        (click)="cerrarImagenAmpliada(); $event.stopPropagation()"
        title="Cerrar">
        <span class="icon">close</span>
      </button>
      <figure class="max-w-[min(100%,56rem)] max-h-[90vh] flex flex-col items-center gap-3" (click)="$event.stopPropagation()">
        <img [src]="img.src" [alt]="img.alt"
          class="max-w-full max-h-[calc(90vh-4rem)] object-contain rounded-lg shadow-2xl bg-white">
        @if (img.leyenda || img.alt) {
          <figcaption class="text-sm text-white/90 text-center max-w-lg px-2">
            @if (img.alt) { <span class="font-semibold">{{ img.alt }}</span> }
            @if (img.leyenda) {
              <span [class.block]="!!img.alt" [class.mt-1]="!!img.alt">{{ img.leyenda }}</span>
            }
          </figcaption>
        }
      </figure>
    </div>
  }

  @if (eliminarTarget(); as target) {

    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">

      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

        <h3 class="text-lg font-bold text-gray-900 mb-2">Eliminar clase</h3>

        <p class="text-sm text-gray-600">¿Eliminar la clase <strong>{{ target.titulo }}</strong> del {{ target.fechaClaseDisplay }}?</p>

        <div class="flex justify-end gap-2 mt-6">

          <button type="button" class="btn btn-secondary btn-sm" (click)="eliminarTarget.set(null)">Cancelar</button>

          <button type="button" class="btn btn-primary btn-sm bg-red-600 hover:bg-red-700" (click)="eliminar()">Eliminar</button>

        </div>

      </div>

    </div>

  }

</div>

  `,

})

export class TemarioDocenteComponent implements OnInit {

  private readonly layout = inject(LayoutService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  readonly salonesSvc = inject(AsistenciaDocenteService);

  readonly portalSvc = inject(PortalDocenteService);

  readonly svc = inject(TemarioDocenteService);

  readonly recursosSvc = inject(RecursosService);



  readonly salones = signal<DocenteSalonAsignado[]>([]);

  readonly salonSeleccionado = signal<DocenteSalonAsignado | null>(null);

  readonly cursosAsignados = signal<PortalDocenteCursoCard[]>([]);

  readonly cursoActivo = signal<CursoTemarioView | null>(null);

  readonly clases = signal<TemarioClaseItem[]>([]);

  readonly anioEscolar = signal(2026);

  readonly errorSalones = signal('');



  readonly panelAbierto = signal(false);

  readonly panelModo = signal<PanelModo>('ver');

  readonly claseVista = signal<TemarioClaseItem | null>(null);

  readonly editId = signal<number | null>(null);

  readonly eliminarTarget = signal<TemarioClaseItem | null>(null);

  readonly toast = signal<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

  readonly imagenAmpliada = signal<{ src: string; alt: string; leyenda?: string } | null>(null);



  mNumero = 1;

  mFecha = '';

  mTitulo = '';

  mDescripcion = '';

  mObjetivos = '';

  mContenidoClase = '';

  mImagenes: TemarioImagenFormItem[] = [];

  mEstado: TemarioClaseEstado = 'programada';

  mModoLiberacion: ModoLiberacionTemario = 'inmediato';

  mFechaLiberacion = '';

  mHoraLiberacion = '08:00';

  mDiasAntes = 3;

  mMaterialTitulo = '';

  mMaterialDescripcion = '';

  mMaterialTipo: TemarioMaterialTipo = 'texto';

  mMaterialUrl = '';

  mMaterialArchivoNombre = '';

  private mMaterialFile: File | null = null;



  readonly estadosOpts = ESTADOS_TEMARIO;

  readonly modosLiberacion = MODOS_LIBERACION;

  readonly tiposMaterial = TIPOS_MATERIAL_TEMARIO;

  readonly estadoBadge = estadoTemarioBadge;

  readonly estadoLabel = estadoTemarioLabel;

  readonly liberacionBadge = liberacionTemarioBadge;

  readonly materialLabel = materialTemarioLabel;

  readonly materialLink = temarioMaterialUrl;

  readonly imagenUrl = temarioImagenUrl;
  readonly imagenesClaseAccept = IMAGENES_CLASE_ACCEPT;

  readonly resumen = resumenClase;

  readonly tieneContenido = tieneContenidoClase;



  readonly cursosSalon = computed((): CursoTemarioView[] => {

    const salon = this.salonSeleccionado();

    if (!salon) return [];

    const seen = new Set<string>();

    return this.cursosAsignados()

      .filter((c) =>

        c.nivel === salon.nivel &&

        c.grado === salon.grado &&

        c.seccion.toUpperCase() === salon.seccion.toUpperCase(),

      )

      .filter((c) => {

        if (seen.has(c.cursoNombre)) return false;

        seen.add(c.cursoNombre);

        return true;

      })

      .map((c) => ({

        cursoId: c.cursoId,

        assignmentId: c.assignmentId,

        nombre: c.cursoNombre,

        nivel: c.nivel,

        grado: c.grado,

        seccion: c.seccion,

      }));

  });



  readonly kpis = computed(() => {

    const items = this.clases();

    return [

      { label: 'Total clases', value: items.length },

      { label: 'Programadas', value: items.filter((c) => c.estado === 'programada').length },

      { label: 'Dictadas', value: items.filter((c) => c.estado === 'dictada').length },

      { label: 'Liberadas alumnos', value: items.filter((c) => c.liberadoAlumno).length },

    ];

  });



  readonly puedeGuardar = computed(() =>

    !!this.cursoActivo() && !!this.mTitulo.trim() && !!this.mFecha && this.mNumero >= 1,

  );



  ngOnInit(): void {

    this.layout.setTitle('Temario');

    this.cargarSalones();

    this.route.queryParamMap.subscribe((params) => {

      const nivel = params.get('nivel');

      const grado = params.get('grado');

      const seccion = params.get('seccion');

      const curso = params.get('curso');

      if (!nivel || !grado || !seccion) return;

      const found = this.salones().find(

        (s) =>

          s.nivel === nivel &&

          s.grado === grado &&

          s.seccion.toUpperCase() === seccion.toUpperCase(),

      );

      if (found) {

        this.salonSeleccionado.set(found);

        const cursos = this.cursosSalon();

        if (curso) {

          const match = cursos.find((c) => c.nombre === curso);

          if (match) this.seleccionarCurso(match, false);

        } else if (cursos.length) {

          this.seleccionarCurso(cursos[0], false);

        }

        this.cargarClases();

      }

    });

  }



  cargarSalones(): void {

    this.errorSalones.set('');

    this.salonesSvc.loadMisSalones(2026).subscribe({

      next: (res) => {

        this.salones.set(res.salones);

        this.anioEscolar.set(res.anioEscolar);

        this.portalSvc.loadMiAula(2026).subscribe({

          next: (aula) => this.cursosAsignados.set(aula.cursos),

        });

      },

      error: (err) => {

        this.errorSalones.set(err?.error?.message ?? 'No se pudieron cargar tus salones');

      },

    });

  }



  seleccionarSalon(salon: DocenteSalonAsignado): void {

    this.salonSeleccionado.set(salon);

    this.cursoActivo.set(null);

    this.clases.set([]);

    this.router.navigate([], {

      relativeTo: this.route,

      queryParams: { nivel: salon.nivel, grado: salon.grado, seccion: salon.seccion, curso: null },

      queryParamsHandling: 'merge',

    });

    const cursos = this.cursosSalon();

    if (cursos.length) this.seleccionarCurso(cursos[0]);

  }



  volverASalones(): void {

    this.cerrarPanel();

    this.salonSeleccionado.set(null);

    this.cursoActivo.set(null);

    this.clases.set([]);

    this.router.navigate([], { relativeTo: this.route, queryParams: {} });

  }



  seleccionarCurso(curso: CursoTemarioView, reload = true): void {

    this.cursoActivo.set(curso);

    this.router.navigate([], {

      relativeTo: this.route,

      queryParams: { curso: curso.nombre },

      queryParamsHandling: 'merge',

    });

    if (reload) this.cargarClases();

  }



  cargarClases(): void {

    const salon = this.salonSeleccionado();

    const curso = this.cursoActivo();

    if (!salon || !curso) return;



    this.svc.list({

      nivel: salon.nivel,

      grado: salon.grado,

      seccion: salon.seccion,

      curso: curso.nombre,

      anioEscolar: this.anioEscolar(),

    }).subscribe({

      next: (rows) => {

        this.clases.set(rows);

        const vista = this.claseVista();

        if (vista) {

          const actualizada = rows.find((r) => r.id === vista.id);

          if (actualizada) this.claseVista.set(actualizada);

        }

      },

      error: (err) => this.mostrarToast(err?.error?.message ?? 'Error al cargar temario', 'err'),

    });

  }



  abrirPanel(item?: TemarioClaseItem, modo: PanelModo = 'ver'): void {

    this.panelModo.set(modo);

    this.mMaterialFile = null;



    if (item) {

      this.claseVista.set(item);

      if (modo === 'editar') this.cargarFormulario(item);

    } else {

      this.claseVista.set(null);

      this.resetFormulario();

    }



    this.panelAbierto.set(true);

  }



  pasarAEditar(): void {

    const item = this.claseVista();

    if (!item) return;

    this.cargarFormulario(item);

    this.panelModo.set('editar');

  }



  private cargarFormulario(item: TemarioClaseItem): void {

    this.editId.set(item.id);

    this.mNumero = item.numero;

    this.mFecha = item.fechaClase;

    this.mTitulo = item.titulo;

    this.mDescripcion = item.descripcion;

    this.mObjetivos = item.objetivos;

    this.mContenidoClase = item.contenidoClase ?? '';

    this.mImagenes = (item.imagenesClase ?? []).map((img) => ({

      url: img.url,

      nombre: img.nombre,

      leyenda: img.leyenda ?? '',

    }));

    this.mEstado = item.estado;

    this.mModoLiberacion = item.modoLiberacion;

    this.mFechaLiberacion = item.fechaLiberacion ?? '';

    this.mHoraLiberacion = item.horaLiberacion || '08:00';

    this.mDiasAntes = item.diasAntesLiberacion ?? 3;

    this.mMaterialTitulo = item.materialTitulo;

    this.mMaterialDescripcion = item.materialDescripcion;

    this.mMaterialTipo = item.materialTipo;

    this.mMaterialUrl = item.materialUrl;

    this.mMaterialArchivoNombre = item.materialNombreArchivo;

  }



  private resetFormulario(): void {

    this.editId.set(null);

    this.mNumero = (this.clases().length || 0) + 1;

    this.mFecha = new Date().toISOString().slice(0, 10);

    this.mTitulo = '';

    this.mDescripcion = '';

    this.mObjetivos = '';

    this.mContenidoClase = '';

    this.mImagenes = [];

    this.mEstado = 'programada';

    this.mModoLiberacion = 'dias_antes';

    this.mFechaLiberacion = '';

    this.mHoraLiberacion = '08:00';

    this.mDiasAntes = 3;

    this.mMaterialTitulo = '';

    this.mMaterialDescripcion = '';

    this.mMaterialTipo = 'texto';

    this.mMaterialUrl = '';

    this.mMaterialArchivoNombre = '';

  }



  modoLiberacionHint(): string {

    return this.modosLiberacion.find((m) => m.value === this.mModoLiberacion)?.hint ?? '';

  }



  onMaterialFile(event: Event): void {

    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) return;

    this.mMaterialFile = file;

    this.mMaterialArchivoNombre = file.name;

    if (!this.mMaterialTitulo.trim()) this.mMaterialTitulo = file.name;

  }



  onImagenesFile(event: Event): void {

    const input = event.target as HTMLInputElement;

    const files = input.files;

    if (!files?.length) return;



    let rechazados = 0;

    for (const file of Array.from(files)) {

      if (!esImagenClasePermitida(file)) {
        rechazados++;
        continue;
      }

      this.mImagenes.push({

        url: '',

        nombre: file.name.replace(/\.[^.]+$/, ''),

        leyenda: '',

        preview: URL.createObjectURL(file),

        pendingFile: file,

      });

    }

    if (rechazados) {
      this.mostrarToast(
        `${rechazados} archivo(s) no admitido(s). Use JPG, PNG, WEBP, GIF, BMP o SVG.`,
        'err',
      );
    }

    input.value = '';

  }



  quitarImagen(index: number): void {

    const img = this.mImagenes[index];

    if (img?.preview) URL.revokeObjectURL(img.preview);

    this.mImagenes.splice(index, 1);

  }



  imagenPreview(img: TemarioImagenFormItem): string {

    if (img.preview) return img.preview;

    if (img.url) return temarioImagenUrl(img as TemarioImagenClase);

    return '';

  }



  private buildPayloadBase() {

    return {

      numero: this.mNumero,

      titulo: this.mTitulo.trim(),

      descripcion: this.mDescripcion.trim(),

      objetivos: this.mObjetivos.trim(),

      contenidoClase: this.mContenidoClase.trim(),

      fechaClase: this.mFecha,

      estado: this.mEstado,

      modoLiberacion: this.mModoLiberacion,

      visibleEstudiante: this.mModoLiberacion !== 'oculto',

      fechaLiberacion:

        this.mModoLiberacion === 'programada' ? this.mFechaLiberacion || null : null,

      horaLiberacion:

        this.mModoLiberacion === 'oculto' || this.mModoLiberacion === 'inmediato'

          ? undefined

          : this.mHoraLiberacion,

      diasAntesLiberacion:

        this.mModoLiberacion === 'dias_antes' ? this.mDiasAntes : null,

      materialTitulo: this.mMaterialTitulo.trim(),

      materialDescripcion: this.mMaterialDescripcion.trim(),

      materialTipo: this.mMaterialTipo,

      materialUrl: this.mMaterialUrl.trim(),

      materialNombreArchivo: this.mMaterialArchivoNombre,

    };

  }



  guardar(): void {

    const salon = this.salonSeleccionado();

    const curso = this.cursoActivo();

    if (!salon || !curso || !this.puedeGuardar()) return;

    if (this.mModoLiberacion === 'programada' && !this.mFechaLiberacion) {

      this.mostrarToast('Indica la fecha de liberación', 'err');

      return;

    }

    if (this.mModoLiberacion === 'programada' && !this.mHoraLiberacion) {

      this.mostrarToast('Indica la hora de liberación', 'err');

      return;

    }



    const id = this.editId();

    const meta = {

      tipo: 'clase',

      nivel: salon.nivel,

      grado: salon.grado,

      seccion: salon.seccion,

    };



    const subirImagenes$ = this.mImagenes.some((img) => img.pendingFile)

      ? forkJoin(

          this.mImagenes.map((img) => {

            if (!img.pendingFile) return of(img);

            return this.recursosSvc.upload(img.pendingFile, {
              ...meta,
              tipo: 'imagen',
            }).pipe(

              switchMap((uploaded) =>

                of({

                  url: uploaded.url,

                  nombre: img.nombre.trim() || uploaded.nombreArchivo,

                  leyenda: img.leyenda.trim(),

                } as TemarioImagenFormItem),

              ),

            );

          }),

        )

      : of(this.mImagenes);



    subirImagenes$.pipe(

      switchMap((imagenes) => {

        const imagenesPayload = toImagenesClasePayload(imagenes);



        const basePayload = {

          ...this.buildPayloadBase(),

          imagenesClase: imagenesPayload,

        };



        if (this.mMaterialFile) {

          return this.recursosSvc.upload(this.mMaterialFile, {
            ...meta,
            tipo: uploadTipoForFile(this.mMaterialFile),
          }).pipe(

            switchMap((uploaded) => {

              const payload = {

                ...basePayload,

                materialUrl: uploaded.url,

                materialNombreArchivo: uploaded.nombreArchivo,

                materialMimeType: uploaded.mimeType,

              };

              return id

                ? this.svc.update(id, payload)

                : this.svc.create({

                    ...payload,

                    cursoId: curso.cursoId,

                    cursoNombre: curso.nombre,

                    nivel: salon.nivel,

                    grado: salon.grado,

                    seccion: salon.seccion,

                    anioEscolar: this.anioEscolar(),

                    assignmentId: curso.assignmentId,

                  });

            }),

          );

        }



        const payload = {

          ...basePayload,

          materialMimeType: '',

        };

        return id

          ? this.svc.update(id, payload)

          : this.svc.create({

              ...payload,

              cursoId: curso.cursoId,

              cursoNombre: curso.nombre,

              nivel: salon.nivel,

              grado: salon.grado,

              seccion: salon.seccion,

              anioEscolar: this.anioEscolar(),

              assignmentId: curso.assignmentId,

            });

      }),

    ).subscribe({

      next: (saved) => {

        this.mostrarToast(
          id ? 'Clase actualizada exitosamente' : 'Clase guardada exitosamente',
          'ok',
        );

        this.claseVista.set(saved);

        this.panelModo.set('ver');

        this.cargarClases();

      },

      error: (err) => {

        const msg = err?.error?.message;

        this.mostrarToast(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Error al guardar', 'err');

      },

    });

  }



  liberarAhora(item: TemarioClaseItem): void {

    this.svc.update(item.id, {

      modoLiberacion: 'inmediato',

      visibleEstudiante: true,

      fechaLiberacion: null,

      horaLiberacion: '08:00',

      diasAntesLiberacion: null,

    }).subscribe({

      next: () => {

        this.mostrarToast('Tema liberado para alumnos', 'ok');

        this.cargarClases();

      },

      error: () => this.mostrarToast('No se pudo liberar el tema', 'err'),

    });

  }



  ocultar(item: TemarioClaseItem): void {

    this.svc.update(item.id, {

      modoLiberacion: 'oculto',

      visibleEstudiante: false,

    }).subscribe({

      next: () => {

        this.mostrarToast('Tema oculto para alumnos', 'ok');

        this.cargarClases();

      },

      error: () => this.mostrarToast('No se pudo ocultar el tema', 'err'),

    });

  }



  cerrarPanel(): void {

    for (const img of this.mImagenes) {

      if (img.preview) URL.revokeObjectURL(img.preview);

    }

    this.panelAbierto.set(false);

    this.editId.set(null);

  }



  eliminar(): void {

    const target = this.eliminarTarget();

    if (!target) return;

    this.svc.remove(target.id).subscribe({

      next: () => {

        this.eliminarTarget.set(null);

        this.mostrarToast('Clase eliminada', 'ok');

        this.cargarClases();

      },

      error: () => this.mostrarToast('No se pudo eliminar', 'err'),

    });

  }



  salonKey(s: DocenteSalonAsignado): string {

    return `${s.nivel}|${s.grado}|${s.seccion}`;

  }



  abrirImagenAmpliada(src: string, alt: string, leyenda?: string): void {
    if (!src?.trim()) return;
    this.imagenAmpliada.set({
      src,
      alt: alt?.trim() || 'Imagen de clase',
      leyenda: leyenda?.trim() || undefined,
    });
  }

  cerrarImagenAmpliada(): void {
    this.imagenAmpliada.set(null);
  }

  private mostrarToast(msg: string, tipo: 'ok' | 'err'): void {

    this.toast.set({ msg, tipo });

    setTimeout(() => this.toast.set(null), tipo === 'ok' ? 5000 : 3500);

  }

}


