import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { REPORTES_NAV_ITEMS } from './reportes-nav.model';

@Component({
  selector: 'app-reportes-redirect',
  standalone: true,
  template: '',
})
export class ReportesRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    for (const item of REPORTES_NAV_ITEMS) {
      if (this.puedeVer(item.permisos)) {
        void this.router.navigate(['/reportes', item.id], { replaceUrl: true });
        return;
      }
    }
    void this.router.navigate(['/sin-permiso'], { replaceUrl: true });
  }

  private puedeVer(permisos: string[]): boolean {
    if (this.auth.isAdmin() || this.auth.hasRole('DIRECTOR')) return true;
    return this.auth.hasAnyPermiso(...permisos);
  }
}
