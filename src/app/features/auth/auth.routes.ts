import { Routes } from '@angular/router';
import { noAuthGuard } from '../../core/auth/guards/auth.guard';

export const authRoutes: Routes = [
  {
    path: '',
    canActivate: [noAuthGuard],
    children: [
      { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
      { path: 'recovery', loadComponent: () => import('./recovery/recovery.component').then(m => m.PasswordRecoveryComponent) },
      { path: 'reset-password', loadComponent: () => import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  }
];


