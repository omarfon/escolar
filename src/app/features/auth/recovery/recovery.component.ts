import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/services/auth.service';
import { environment } from '@environments/environment';

interface RecoveryContext {
  institucion: {
    nombre: string;
    siglas: string;
    anioEscolar: number;
    ugel?: string;
    dre?: string;
  };
  politicaPassword: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigit: boolean;
  };
  soporteEmail: string;
}

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 flex items-center justify-center p-4">
      <div class="relative w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <span class="icon icon-2xl text-white">lock_reset</span>
          </div>
          <h1 class="text-2xl font-bold text-white">Recuperar contraseña</h1>
          @if (context(); as ctx) {
            <p class="text-indigo-200 text-sm mt-2">{{ ctx.institucion.nombre }}</p>
            <p class="text-indigo-300 text-xs">Año escolar {{ ctx.institucion.anioEscolar }}</p>
          }
        </div>

        <div class="bg-white rounded-2xl shadow-2xl p-8">
          @if (submitted()) {
            <div class="text-center space-y-4" role="status" aria-live="polite">
              <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600">
                <span class="icon icon-lg">mark_email_read</span>
              </div>
              <h2 class="text-lg font-semibold text-gray-800">Revise su correo</h2>
              <p class="text-sm text-gray-600">{{ successMessage() }}</p>
              <a routerLink="/auth/login" class="btn btn-primary w-full">Volver al inicio de sesión</a>
            </div>
          } @else {
            <p class="text-sm text-gray-600 mb-5">
              Ingrese el correo asociado a su cuenta. Si está registrado, recibirá un enlace seguro de un solo uso.
            </p>

            @if (error()) {
              <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700" role="alert">
                <span class="icon icon-sm">error_outline</span>
                {{ error() }}
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
              <div class="form-group">
                <label class="form-label" for="email">Correo electrónico</label>
                <div class="relative">
                  <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">mail_outline</span>
                  <input id="email" type="email" class="form-input pl-10" formControlName="email"
                    autocomplete="email" placeholder="usuario@colegio.edu.pe">
                </div>
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                  <p class="form-error">Ingrese un correo válido</p>
                }
              </div>

              <button type="submit" class="btn btn-primary w-full h-11" [disabled]="form.invalid || loading()">
                @if (loading()) {
                  <span class="spinner"></span> Enviando...
                } @else {
                  Enviar enlace de recuperación
                }
              </button>
            </form>

            <div class="mt-6 text-center">
              <a routerLink="/auth/login" class="text-sm text-indigo-600 hover:underline">← Volver al login</a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PasswordRecoveryComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');
  readonly context = signal<RecoveryContext | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.http
      .get<RecoveryContext>(`${environment.apiUrl}/auth/password-recovery/context`)
      .subscribe({
        next: (ctx) => this.context.set(ctx),
        error: () => this.context.set(null),
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const email = this.form.getRawValue().email!;

    this.auth.forgotPassword({ email }).subscribe({
      next: (res: { message?: string }) => {
        this.loading.set(false);
        this.submitted.set(true);
        this.successMessage.set(
          res?.message ??
            'Si el correo está registrado y activo, recibirá instrucciones para restablecer su contraseña.',
        );
      },
      error: (err) => {
        this.loading.set(false);
        let msg: string;
        if (err?.status === 0 || err?.message === 'Failed to fetch') {
          msg = `No se pudo conectar con el servidor (${environment.apiUrl}). Verifique que el backend esté en ejecución.`;
        } else if (err?.status === 429) {
          msg = 'Demasiados intentos. Espere unos minutos e intente nuevamente.';
        } else {
          msg = err?.error?.message ?? err?.userMessage ?? 'No se pudo procesar la solicitud. Intente más tarde.';
        }
        this.error.set(Array.isArray(msg) ? msg.join('. ') : msg);
      },
    });
  }
}
