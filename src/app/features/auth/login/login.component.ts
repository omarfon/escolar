import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 flex items-center justify-center p-4">
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>
      <div class="relative w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <span class="icon icon-2xl text-white">school</span>
          </div>
          <h1 class="text-3xl font-bold text-white">EscolarERP</h1>
          <p class="text-indigo-200 text-sm mt-1">Sistema Integral de Gestion Escolar</p>
        </div>
        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-2xl p-8">
          <h2 class="text-xl font-semibold text-gray-800 mb-4 text-center">Iniciar Sesion</h2>

          <!-- Acceso alumno destacado -->
          <button type="button"
            class="w-full flex items-center gap-4 p-4 mb-6 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 hover:border-emerald-400 hover:from-emerald-100 hover:to-teal-100 transition-all group"
            (click)="ingresarComoAlumno()"
            [disabled]="auth.isLoading()">
            <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 text-white shadow-md group-hover:scale-105 transition-transform">
              <span class="icon icon-lg">backpack</span>
            </div>
            <div class="text-left flex-1">
              <div class="font-semibold text-emerald-900">Soy alumno / estudiante</div>
              <div class="text-sm text-emerald-700">Ingresa a tu portal escolar</div>
            </div>
            <span class="icon text-emerald-500 group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
          </button>

          <div class="flex items-center gap-3 mb-6">
            <div class="flex-1 h-px bg-gray-200"></div>
            <span class="text-xs text-gray-400 uppercase tracking-wide">Personal y familias</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>

          @if (auth.error()) {
            <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">
              <span class="icon icon-sm text-red-500">error_outline</span>
              {{ auth.error() }}
            </div>
          }
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div class="form-group">
              <label class="form-label" for="username">Usuario</label>
              <div class="relative">
                <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">person_outline</span>
                <input id="username" type="text" class="form-input pl-10"
                  placeholder="usuario@escolar.pe" formControlName="username" autocomplete="username">
              </div>
              @if (form.get('username')?.invalid && form.get('username')?.touched) {
                <p class="form-error">Ingresa tu nombre de usuario</p>
              }
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Contrasena</label>
              <div class="relative">
                <span class="icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">lock_outline</span>
                <input id="password" [type]="showPwd() ? 'text' : 'password'" class="form-input pl-10 pr-10"
                  placeholder="••••••••" formControlName="password" autocomplete="current-password">
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  (click)="showPwd.set(!showPwd())">
                  <span class="icon icon-sm">{{ showPwd() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              @if (form.get('password')?.invalid && form.get('password')?.touched) {
                <p class="form-error">Ingresa tu contrasena</p>
              }
            </div>
            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" class="rounded border-gray-300 text-indigo-600" formControlName="rememberMe">
                <span class="text-gray-600">Recordarme</span>
              </label>
              <a routerLink="/auth/recovery" class="text-indigo-600 hover:underline">olvide mi contrasena</a>
            </div>
            <button type="submit" class="btn btn-primary w-full h-11 text-base font-medium mt-2"
              [disabled]="form.invalid || auth.isLoading()">
              @if (auth.isLoading()) {
                <span class="spinner"></span> Ingresando...
              } @else {
                Ingresar al Sistema
              }
            </button>
          </form>
          <!-- Usuarios demo -->
          <div class="mt-6 pt-6 border-t border-gray-100">
            <p class="text-xs text-gray-500 text-center mb-3">Acceso rapido personal (demo)</p>
            <div class="grid grid-cols-2 gap-2">
              @for (demo of demoUsers; track demo.user) {
                <button type="button"
                  class="p-2 text-left rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  (click)="loginDemo(demo.user, demo.pass)">
                  <div class="text-xs font-medium text-gray-700">{{ demo.label }}</div>
                  <div class="text-xs text-gray-400">{{ demo.user }}</div>
                </button>
              }
            </div>
          </div>
        </div>
        <p class="text-center text-indigo-200 text-xs mt-6">
          &copy; 2025 EscolarERP - Todos los derechos reservados
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  readonly auth  = inject(AuthService);
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  showPwd = signal(false);

  form = this.fb.group({
    username:   ['', Validators.required],
    password:   ['', Validators.required],
    rememberMe: [false],
  });

  demoUsers = [
    { label: 'Administrador', user: 'admin',    pass: 'admin123' },
    { label: 'Docente',       user: 'docente',  pass: 'admin123' },
    { label: 'Padre/Madre',   user: 'padre',    pass: 'admin123' },
    { label: 'Director',      user: 'director', pass: 'admin123' },
  ];

  private readonly alumnoDemo = { user: 'estudiante', pass: 'admin123' };

  ingresarComoAlumno(): void {
    this.loginDemo(this.alumnoDemo.user, this.alumnoDemo.pass, '/portal-estudiante/inicio');
  }

  loginDemo(user: string, pass: string, returnUrl?: string): void {
    this.form.patchValue({ username: user, password: pass });
    this.login(returnUrl);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.login();
  }

  private login(forcedReturnUrl?: string): void {
    const { username, password, rememberMe } = this.form.getRawValue();
    this.auth.login({ username: username!, password: password!, rememberMe: rememberMe ?? false })
      .subscribe({
        next: () => {
          const returnUrl = forcedReturnUrl
            ?? this.route.snapshot.queryParamMap.get('returnUrl')
            ?? this.defaultRouteForUser();
          this.router.navigateByUrl(returnUrl);
        },
        error: () => {}
      });
  }

  private defaultRouteForUser(): string {
    return this.auth.defaultHomeRoute();
  }
}
