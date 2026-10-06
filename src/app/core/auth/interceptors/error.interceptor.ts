import { HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, catchError } from 'rxjs';

export function errorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const messages: Record<number, string> = {
        400: err.error?.message ?? 'Solicitud inválida.',
        403: err.error?.message ?? 'No tiene permisos para realizar esta acción.',
        404: 'El recurso solicitado no fue encontrado.',
        409: err.error?.message ?? 'Conflicto en los datos.',
        422: err.error?.message ?? 'Error de validación.',
        500: 'Error interno del servidor. Contacte al administrador.',
        503: 'Servicio no disponible. Intente más tarde.',
      };
      const userMessage = messages[err.status] ?? err.error?.message ?? 'Ha ocurrido un error inesperado.';
      return throwError(() => ({ ...err, userMessage }));
    })
  );
}
