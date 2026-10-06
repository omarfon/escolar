import { inject, PLATFORM_ID } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, switchMap, filter, take, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TenantContextService } from '../../tenant/tenant-context.service';
import {
  TENANT_INSTITUTION_HEADER,
} from '../../tenant/tenant.constants';

let isRefreshing = false;
let refreshSubject$ = new BehaviorSubject<string | null>(null);

function resetRefreshQueue(): void {
  refreshSubject$ = new BehaviorSubject<string | null>(null);
}

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const auth = inject(AuthService);
  const tenant = inject(TenantContextService);

  if (
    req.url.includes('/auth/login')
    || req.url.includes('/auth/refresh')
    || req.url.includes('/auth/forgot-password')
    || req.url.includes('/auth/reset-password')
    || req.url.includes('/auth/password-recovery/')
  ) {
    return next(req);
  }

  const token = auth.accessToken();
  const tenantReq = withTenantInstitutionRequest(req, tenant);
  const tenantHeaders = tenantInstitutionHeaders(tenant);
  return next(token ? _addToken(tenantReq, token, tenantHeaders) : tenantReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);
      if (!auth.isAuthenticated()) return throwError(() => err);
      return _handle401(req, next, auth, tenant);
    }),
  );
}

function _addToken(
  req: HttpRequest<unknown>,
  token: string,
  extraHeaders: Record<string, string> = {},
) {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}`, ...extraHeaders },
  });
}

/** Rutas globales que no deben recibir institutionId automático. */
const TENANT_QUERY_EXEMPT = [
  '/auth/',
  '/instituciones/directorio',
  '/institution/directory',
];

/** Añade/sobrescribe institutionId en query cuando hay IE efectiva (toda la app). */
function withTenantInstitutionRequest(
  req: HttpRequest<unknown>,
  tenant: TenantContextService,
): HttpRequest<unknown> {
  const id = tenant.effectiveInstitutionId();
  if (id == null || id < 1) return req;
  if (TENANT_QUERY_EXEMPT.some((p) => req.url.includes(p))) return req;

  const params = req.params
    .set('institutionId', String(id))
    .set('_tenant', String(tenant.changeToken()));

  return req.clone({
    params,
    setHeaders: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
}

/** Header tenant (CORS debe permitir X-Institution-Id). */
function tenantInstitutionHeaders(
  tenant: TenantContextService,
): Record<string, string> {
  const id = tenant.effectiveInstitutionId();
  if (id == null || id < 1) return {};
  return { [TENANT_INSTITUTION_HEADER]: String(id) };
}

function _handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  tenant: TenantContextService,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject$.next(null);
    return auth.refreshToken().pipe(
      switchMap(res => {
        isRefreshing = false;
        refreshSubject$.next(res.accessToken);
        return next(_addToken(withTenantInstitutionRequest(req, tenant), res.accessToken, tenantInstitutionHeaders(tenant)));
      }),
      catchError(err => {
        isRefreshing = false;
        resetRefreshQueue();
        return throwError(() => err);
      }),
    );
  }
  return refreshSubject$.pipe(
    filter((t): t is string => !!t),
    take(1),
    switchMap(t => next(_addToken(withTenantInstitutionRequest(req, tenant), t, tenantInstitutionHeaders(tenant)))),
  );
}
