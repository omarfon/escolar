import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { environment } from '@environments/environment';

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
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 flex items-center justify-center p-4">
      <div class="relative w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <span class="icon icon-2xl text-white">vpn_key</span>
          </div>
          <h1 class="text-2xl font-bold text-white">Nueva contraseña</h1>
          <p class="text-indigo-200 text-sm mt-1">Enlace de un solo uso</p>
        </div>

        <div class="bg-white rounded-2xl shadow-2xl p-8">
          @if (!token()) {
            <div class="text-center space-y-4" role="alert">
              <span class="icon icon-xl text-red-500">link_off</span>
              <p class="text-sm text-gray-600">El enlace no es válido. Solicite uno nuevo desde recuperación de contraseña.</p>
              <a routerLink="/auth/recovery" class="btn btn-primary w-full">Solicitar enlace</a>
            </div>
          } @else if (done()) {
            <div class="text-center space-y-4" role="status" aria-live="polite">
              <span class="icon icon-xl text-emerald-500">check_circle</span>
              <p class="text-sm text-gray-700">{{ successMessage() }}</p>
              <a routerLink="/auth/login" class="btn btn-primary w-full">Iniciar sesión</a>
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
            </ul>

            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
              <div class="form-group">
                <label class="form-label" for="passwordNuevo">Nueva contraseña</label>
                <input id="passwordNuevo" [type]="showPwd() ? 'text' : 'password'" class="form-input"
                  formControlName="passwordNuevo" autocomplete="new-password">
                @if (form.get('passwordNuevo')?.invalid && form.get('passwordNuevo')?.touched) {
                  <p class="form-error">La contraseña no cumple la política de seguridad</p>
                }
              </div>
              <div class="form-group">
                <label class="form-label" for="confirmPassword">Confirmar contraseña</label>
                <input id="confirmPassword" [type]="showPwd() ? 'text' : 'password'" class="form-input"
                  formControlName="confirmPassword" autocomplete="new-password">
                @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
                  <p class="form-error">Las contraseñas no coinciden</p>
                }
              </div>

              <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" (change)="showPwd.set(!showPwd())">
                Mostrar contraseña
              </label>

              <button type="submit" class="btn btn-primary w-full h-11" [disabled]="form.invalid || loading()">
                @if (loading()) {
                  <span class="spinner"></span> Guardando...
                } @else {
                  Restablecer contraseña
                }
              </button>
            </form>
          }
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly token = signal('');
  readonly loading = signal(false);
  readonly done = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');
  readonly showPwd = signal(false);

  form = this.fb.group(
    {
      passwordNuevo: ['', [Validators.required, passwordPolicyValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: (group) => {
      const a = group.get('passwordNuevo')?.value;
      const b = group.get('confirmPassword')?.value;
      return a && b && a !== b ? { mismatch: true } : null;
    }},
  );

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.token.set(params.get('token')?.trim() ?? '');
    });
  }

  submit(): void {
    if (this.form.invalid || !this.token()) {
      this.form.markAllAsTouched();
      return;
    }

    const { passwordNuevo, confirmPassword } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');

    this.auth
      .resetPassword({
        token: this.token(),
        passwordNuevo: passwordNuevo!,
        confirmPassword: confirmPassword!,
      })
      .subscribe({
        next: (res: { message?: string }) => {
          this.loading.set(false);
          this.done.set(true);
          this.successMessage.set(
            res?.message ?? 'Contraseña actualizada. Inicie sesión con su nueva contraseña.',
          );
          this.auth.logout(false);
        },
        error: (err) => {
          this.loading.set(false);
          let msg: string;
          if (err?.status === 0 || err?.message === 'Failed to fetch') {
            msg = `No se pudo conectar con el servidor (${environment.apiUrl}). Verifique que el backend esté en ejecución.`;
          } else {
            msg = err?.error?.message ?? err?.userMessage ?? 'No se pudo restablecer la contraseña.';
          }
          this.error.set(Array.isArray(msg) ? msg.join('. ') : msg);
        },
      });
  }
}
