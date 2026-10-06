import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutService } from '../../../core/layout/services/layout.service';
import { ExceptionalEnrollmentAgeCheck, ExceptionalEnrollmentContext } from '../../../core/api/student-exceptional-enrollment-api.service';
import {
  formularioExcepcionalListo,
  MatriculaExcepcionalErrores,
  validarMatriculaExcepcionalForm,
} from './matricula-excepcional-form.validation';
import { httpErrorMessage, MatriculaExcepcionalService } from './matricula-excepcional.service';

@Component({
  selector: 'app-matricula-excepcional',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  template: `
<div class="min-h-screen bg-[#f4f6fb] animate-fade-in">
  <div class="bg-white border-b border-[#e8eaf0] px-6 py-4 sticky top-0 z-20">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-1.5 text-xs text-[#94a3b8] mb-1">
          <span>Gestión de Matrícula</span><span>›</span>
          <span class="text-indigo-700 font-medium">Matrícula excepcional</span>
        </div>
        <h1 class="text-2xl font-bold text-[#1a202c]">Matrícula excepcional (edad)</h1>
        @if (context(); as ctx) {
          <p class="text-sm text-[#64748b] mt-0.5">
            {{ ctx.institucion.nombre }} · A.E. {{ ctx.institucion.anioEscolar }}
            · Corte normativo {{ ctx.institucion.fechaCorteNormativa }}
          </p>
        }
      </div>
      <div class="flex items-center gap-2">
        <a routerLink="/matricula/nueva" class="btn btn-secondary text-sm">Matrícula regular</a>
        <button class="btn btn-secondary btn-sm" (click)="cargar()" [disabled]="svc.loading() || svc.saving()">
          <span class="icon icon-sm">refresh</span> Actualizar
        </button>
      </div>
    </div>
  </div>

  <div class="p-6 max-w-3xl mx-auto space-y-4">
    <div class="card p-4 bg-indigo-50 border border-indigo-100 text-sm text-indigo-800" role="note">
      Use este flujo solo cuando la edad del estudiante <strong>no cumple</strong> la normativa MINEDU al 31/03 del año escolar.
      Debe registrar motivo y sustento documentado. La matrícula regular validará edad normativa automáticamente.
    </div>

    @if (errorMsg()) {
      <div class="p-4 bg-[#fee2e2] border border-red-200 rounded-2xl text-sm text-[#b91c1c]" role="alert">
        {{ errorMsg() }}
      </div>
    }
    @if (successMsg()) {
      <div class="p-4 bg-[#dcfce7] border border-green-200 rounded-2xl text-sm text-[#15803d]" role="status">
        {{ successMsg() }}
      </div>
    }

    @if (svc.loading()) {
      <div class="card p-6 text-sm text-indigo-700 bg-indigo-50">Cargando contexto…</div>
    } @else {
      <form class="card overflow-hidden" (ngSubmit)="enviar()">
        <div class="px-6 py-5 border-b border-[#f1f3f7] flex items-center gap-4 bg-gradient-to-r from-indigo-50 via-indigo-50/50 to-transparent">
          <div class="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
            <span class="icon text-indigo-600" style="font-size:22px">person</span>
          </div>
          <div>
            <h2 class="font-bold text-[#1a202c]">Datos del estudiante</h2>
            <p class="text-xs text-[#94a3b8]">Información para la matrícula excepcional</p>
          </div>
        </div>
        <div class="p-6 space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="form-label" for="nombres">Nombres <span class="text-red-400">*</span></label>
            <input id="nombres" class="form-input w-full" [ngClass]="claseCampo('nombres')" [ngModel]="nombres" name="nombres" (ngModelChange)="nombres = $event; revisarFormulario()" (blur)="onCampoBlur('nombres')" />
            @if (campoError('nombres'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label" for="apellidos">Apellidos <span class="text-red-400">*</span></label>
            <input id="apellidos" class="form-input w-full" [ngClass]="claseCampo('apellidos')" [ngModel]="apellidos" name="apellidos" (ngModelChange)="apellidos = $event; revisarFormulario()" (blur)="onCampoBlur('apellidos')" />
            @if (campoError('apellidos'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label" for="dni">DNI / documento <span class="text-red-400">*</span></label>
            <input id="dni" class="form-input w-full" [ngClass]="claseCampo('dni')" [ngModel]="dni" name="dni" (ngModelChange)="dni = $event; revisarFormulario()" (blur)="onCampoBlur('dni')" />
            @if (campoError('dni'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label" for="fechaNac">Fecha de nacimiento <span class="text-red-400">*</span></label>
            <input id="fechaNac" type="date" class="form-input w-full" [ngClass]="claseCampo('fechaNac')" [ngModel]="fechaNac" name="fechaNac" (ngModelChange)="fechaNac = $event; revisarFormulario()" (change)="verificarEdad()" (blur)="onCampoBlur('fechaNac')" />
            @if (campoError('fechaNac'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label" for="grado">Grado <span class="text-red-400">*</span></label>
            <select id="grado" class="form-select w-full" [ngClass]="claseCampo('gradoLabel')" [ngModel]="gradoLabel" name="gradoLabel" (ngModelChange)="gradoLabel = $event; revisarFormulario()" (change)="verificarEdad()" (blur)="onCampoBlur('gradoLabel')">
              <option value="">Seleccione…</option>
              @for (g of grados(); track g.label) {
                <option [value]="g.label">{{ g.label }}</option>
              }
            </select>
            @if (campoError('gradoLabel'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label" for="seccion">Sección <span class="text-red-400">*</span></label>
            <input id="seccion" class="form-input w-full uppercase" [ngClass]="claseCampo('seccion')" maxlength="5" [ngModel]="seccion" name="seccion" (ngModelChange)="seccion = $event; revisarFormulario()" (blur)="onCampoBlur('seccion')" />
            @if (campoError('seccion'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label" for="sexo">Sexo</label>
            <select id="sexo" class="form-select w-full" [(ngModel)]="sexo" name="sexo">
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
        </div>

        @if (ageCheck(); as age) {
          <div
            class="rounded-xl px-4 py-3 text-sm border"
            [ngClass]="age.requiereExcepcional ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 'bg-[#fee2e2] border-red-200 text-[#b91c1c]'"
            role="status"
          >
            @if (age.requiereExcepcional) {
              Edad al {{ age.fechaCorte }}: <strong>{{ age.edadActual }} años</strong>
              (normativa: {{ age.edadEsperada }}). Procede matrícula excepcional.
            } @else if (age.cumpleEdadNormativa) {
              La edad cumple la normativa. Use <a routerLink="/matricula/nueva" class="font-medium text-indigo-700 underline">matrícula regular</a>.
            } @else {
              {{ age.mensaje }}
            }
          </div>
        } @else if (svc.checkingAge()) {
          <p class="text-sm text-indigo-600">Verificando edad normativa…</p>
        }

        <div class="pt-2 border-t border-[#f1f3f7]">
          <h2 class="font-bold text-[#1a202c]">Justificación</h2>
          <p class="text-xs text-[#94a3b8] mt-0.5">Motivo y sustento documentado</p>
        </div>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="form-label" for="motivo">Motivo <span class="text-red-400">*</span></label>
            <select id="motivo" class="form-select w-full" [ngClass]="claseCampo('excepcionalMotivo')" [ngModel]="excepcionalMotivo" name="excepcionalMotivo" (ngModelChange)="excepcionalMotivo = $event; revisarFormulario()" (blur)="onCampoBlur('excepcionalMotivo')">
              <option value="">Seleccione…</option>
              @for (m of motivos(); track m) {
                <option [value]="m">{{ m }}</option>
              }
            </select>
            @if (campoError('excepcionalMotivo'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <div>
            <label class="form-label" for="sustento">Sustento / resolución <span class="text-red-400">*</span></label>
            <textarea id="sustento" class="form-input w-full min-h-[88px]" [ngClass]="claseCampo('excepcionalSustento')" [ngModel]="excepcionalSustento" name="excepcionalSustento" (ngModelChange)="excepcionalSustento = $event; revisarFormulario()" (blur)="onCampoBlur('excepcionalSustento')" placeholder="Resolución directoral, informe psicopedagógico u otro sustento…"></textarea>
            @if (campoError('excepcionalSustento'); as err) { <p class="form-error mt-1">{{ err }}</p> }
          </div>
          <label class="flex items-start gap-2 text-sm text-[#374151]">
            <input type="checkbox" class="mt-1 accent-indigo-600" [(ngModel)]="confirmarDuplicado" name="confirmarDuplicado" />
            Confirmo que revisé posibles duplicados y deseo registrar de todas formas
          </label>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="submit" class="btn btn-primary" [disabled]="svc.saving()">
            @if (svc.saving()) { Registrando… } @else { Registrar matrícula excepcional }
          </button>
        </div>
        </div>
      </form>
    }
  </div>
</div>
  `,
})
export class MatriculaExcepcionalComponent implements OnInit {
  readonly svc = inject(MatriculaExcepcionalService);
  private readonly layout = inject(LayoutService);

  readonly context = signal<ExceptionalEnrollmentContext | null>(null);
  readonly ageCheck = signal<ExceptionalEnrollmentAgeCheck | null>(null);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');

  nombres = '';
  apellidos = '';
  dni = '';
  fechaNac = '';
  gradoLabel = '';
  seccion = '';
  sexo: 'M' | 'F' = 'M';
  excepcionalMotivo = '';
  excepcionalSustento = '';
  confirmarDuplicado = false;

  readonly camposTocados = signal<Partial<Record<keyof MatriculaExcepcionalErrores, true>>>({});
  readonly intentoEnvio = signal(false);
  private readonly formRevision = signal(0);

  readonly grados = computed(() => this.context()?.gradosDisponibles ?? []);
  readonly motivos = computed(() => this.context()?.motivos ?? []);

  readonly errores = computed(() => {
    this.formRevision();
    return validarMatriculaExcepcionalForm({
      nombres: this.nombres,
      apellidos: this.apellidos,
      dni: this.dni,
      fechaNac: this.fechaNac,
      gradoLabel: this.gradoLabel,
      seccion: this.seccion,
      excepcionalMotivo: this.excepcionalMotivo,
      excepcionalSustento: this.excepcionalSustento,
    });
  });

  readonly puedeEnviar = computed(() => {
    if (!formularioExcepcionalListo(this.errores())) return false;
    const age = this.ageCheck();
    return !!age?.requiereExcepcional;
  });

  ngOnInit(): void {
    this.layout.setTitle('Matrícula excepcional');
    this.cargar();
  }

  cargar(): void {
    this.errorMsg.set('');
    this.svc.loadContext().subscribe({
      next: (ctx) => this.context.set(ctx),
      error: (err) => this.errorMsg.set(httpErrorMessage(err, 'No se pudo cargar el contexto')),
    });
  }

  revisarFormulario(): void {
    this.formRevision.update((n) => n + 1);
  }

  onCampoBlur(campo: keyof MatriculaExcepcionalErrores): void {
    this.camposTocados.update((t) => ({ ...t, [campo]: true }));
    this.revisarFormulario();
  }

  campoError(campo: keyof MatriculaExcepcionalErrores): string | null {
    if (!this.camposTocados()[campo] && !this.intentoEnvio()) return null;
    return this.errores()[campo] ?? null;
  }

  claseCampo(campo: keyof MatriculaExcepcionalErrores): string {
    return this.campoError(campo) ? 'input-error' : '';
  }

  verificarEdad(): void {
    this.ageCheck.set(null);
    if (!this.fechaNac || !this.gradoLabel) return;
    this.svc.verifyAge(this.fechaNac, this.gradoLabel).subscribe({
      next: (res) => this.ageCheck.set(res),
      error: (err) => this.errorMsg.set(httpErrorMessage(err, 'Error al verificar edad')),
    });
  }

  enviar(): void {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.intentoEnvio.set(true);
    this.revisarFormulario();
    if (!this.puedeEnviar()) return;

    this.svc.register({
      nombres: this.nombres.trim(),
      apellidos: this.apellidos.trim(),
      dni: this.dni.trim(),
      fechaNac: this.fechaNac,
      sexo: this.sexo,
      gradoLabel: this.gradoLabel,
      seccion: this.seccion.trim().toUpperCase(),
      excepcionalMotivo: this.excepcionalMotivo.trim(),
      excepcionalSustento: this.excepcionalSustento.trim(),
      confirmarDuplicado: this.confirmarDuplicado,
    }).subscribe({
      next: (res) => {
        this.successMsg.set(
          `Matrícula excepcional registrada: ${res.apellidos}, ${res.nombres} (${res.codigo}) — edad al corte: ${res.edadNormativaAlRegistro ?? '—'} años.`,
        );
        this.nombres = '';
        this.apellidos = '';
        this.dni = '';
        this.fechaNac = '';
        this.gradoLabel = '';
        this.seccion = '';
        this.excepcionalMotivo = '';
        this.excepcionalSustento = '';
        this.confirmarDuplicado = false;
        this.ageCheck.set(null);
        this.camposTocados.set({});
        this.intentoEnvio.set(false);
        this.revisarFormulario();
      },
      error: (err) => this.errorMsg.set(httpErrorMessage(err, 'No se pudo registrar')),
    });
  }
}
