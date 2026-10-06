import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { LayoutService } from '../../core/layout/services/layout.service';

function passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) return null;
  const errors: ValidationErrors = {};
  if (value.length < 8) errors['minLength'] = true;
  if (!/[A-Z]/.test(value)) errors['uppercase'] = true;
  if (!/[a-z]/.test(value)) errors['lowercase'] = true;
  if (!/\d/.test(value)) errors['digit'] = true;
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-lg mx-auto space-y-5">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Cambiar contraseña</h2>
        <p class="text-sm text-gray-500 mt-0.5">
          Actualice su clave de acceso. Al guardar se cerrarán las demás sesiones activas.
        </p>
      </div>

      <div class="card p-6">
        @if (done()) {
          <div class="text-center space-y-4" role="status" aria-live="polite">
            <span class="icon icon-xl text-emerald-500">check_circle</span>
            <p class="text-sm text-gray-700">{{ successMessage() }}</p>
            <p class="text-xs text-gray-500">Será redirigido al inicio de sesión…</p>
          </div>
        } @else {
          @if (error()) {
            <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700" role="alert">
              <span class="icon icon-sm">error_outline</span>
              {{ error() }}
            </div>
          }

          <ul class="text-xs text-gray-500 mb-4 space-y-1" aria-label="Requisitos de contraseña">
            <li>Mínimo 8 caracteres</li>
            <li>Al menos una mayúscula, una minúscula y un número</li>
            <li>Debe ser diferente a la contraseña actual</li>
          </ul>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
            <div class="form-group">
              <label class="form-label" for="passwordActual">Contraseña actual</label>
              <input id="passwordActual" [type]="showPwd() ? 'text' : 'password'" class="form-input"
                formControlName="passwordActual" autocomplete="current-password">
              @if (form.get('passwordActual')?.invalid && form.get('passwordActual')?.touched) {
                <p class="form-error">Ingrese su contraseña actual</p>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="passwordNuevo">Nueva contraseña</label>
              <input id="passwordNuevo" [type]="showPwd() ? 'text' : 'password'" class="form-input"
                formControlName="passwordNuevo" autocomplete="new-password">
              @if (form.get('passwordNuevo')?.invalid && form.get('passwordNuevo')?.touched) {
                <p class="form-error">La contraseña no cumple la política de seguridad</p>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="confirmPassword">Confirmar nueva contraseña</label>
              <input id="confirmPassword" [type]="showPwd() ? 'text' : 'password'" class="form-input"
                formControlName="confirmPassword" autocomplete="new-password">
              @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
                <p class="form-error">Las contraseñas no coinciden</p>
              }
            </div>

            <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" (change)="showPwd.set(!showPwd())">
              Mostrar contraseñas
            </label>

            <div class="flex flex-col sm:flex-row gap-2 pt-2">
              <button type="submit" class="btn btn-primary flex-1 h-11" [disabled]="form.invalid || loading()">
                @if (loading()) {
                  <span class="spinner"></span> Guardando...
                } @else {
                  Actualizar contraseña
                }
              </button>
              <a [routerLink]="homeRoute()" class="btn btn-secondary h-11 sm:w-auto">Cancelar</a>
            </div>
          </form>

          <p class="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
            ¿Olvidó su contraseña?
            <a routerLink="/auth/recovery" class="text-indigo-600 hover:underline">Solicite un enlace de recuperación</a>
          </p>
        }
      </div>
    </div>
  `,
})
export class ChangePasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly layout = inject(LayoutService);

  readonly loading = signal(false);
  readonly done = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');
  readonly showPwd = signal(false);

  form = this.fb.group(
    {
      passwordActual: ['', [Validators.required]],
      passwordNuevo: ['', [Validators.required, passwordPolicyValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: (group) => {
        const a = group.get('passwordNuevo')?.value;
        const b = group.get('confirmPassword')?.value;
        return a && b && a !== b ? { mismatch: true } : null;
      },
    },
  );

  ngOnInit(): void {
    this.layout.setTitle('Cambiar contraseña');
  }

  homeRoute(): string {
    return this.auth.defaultHomeRoute();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { passwordActual, passwordNuevo, confirmPassword } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');

    this.auth
      .changePassword({
        passwordActual: passwordActual!,
        passwordNuevo: passwordNuevo!,
        confirmPassword: confirmPassword!,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.done.set(true);
          this.successMessage.set(
            res?.message ?? 'Contraseña actualizada correctamente. Inicie sesión con su nueva clave.',
          );
          setTimeout(() => this.auth.logout(), 2500);
        },
        error: (err) => {
          this.loading.set(false);
          let msg: string;
          if (err?.status === 401) {
            msg = 'La contraseña actual no es correcta.';
          } else if (err?.status === 429) {
            msg = 'Demasiados intentos. Espere unos minutos e intente nuevamente.';
          } else {
            msg = err?.error?.message ?? err?.userMessage ?? 'No se pudo actualizar la contraseña.';
          }
          this.error.set(Array.isArray(msg) ? msg.join('. ') : msg);
        },
      });
  }
}
