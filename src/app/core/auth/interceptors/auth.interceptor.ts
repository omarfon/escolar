import { inject } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, switchMap, filter, take, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshSubject$ = new BehaviorSubject<string | null>(null);

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const auth = inject(AuthService);

  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) return next(req);

  const token = auth.accessToken();
  return next(token ? _addToken(req, token) : req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);
      if (!auth.isAuthenticated()) return throwError(() => err);
      return _handle401(req, next, auth);
    }),
  );
}

function _addToken(req: HttpRequest<unknown>, token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function _handle401(req: HttpRequest<unknown>, next: HttpHandlerFn, auth: AuthService): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject$.next(null);
    return auth.refreshToken().pipe(
      switchMap(res => { isRefreshing = false; refreshSubject$.next(res.accessToken); return next(_addToken(req, res.accessToken)); }),
      catchError(err => { isRefreshing = false; return throwError(() => err); })
    );
  }
  return refreshSubject$.pipe(filter(t => t !== null), take(1), switchMap(t => next(_addToken(req, t!))));
}
