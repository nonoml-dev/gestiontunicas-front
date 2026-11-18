import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService, URL_AUTH } from './auth.service';

/**
 * Añade "Authorization: Bearer <token>" a las peticiones a la API.
 * Si el backend responde 401 (token de acceso caducado), renueva la sesión y repite la petición una vez;
 * si tampoco se puede renovar, lleva al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/') || req.url.startsWith(`${URL_AUTH}/`)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const conToken = (peticion: HttpRequest<unknown>) => {
    const token = auth.token();
    return token ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : peticion;
  };

  return next(conToken(req)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !auth.token()) {
        return throwError(() => error);
      }
      return auth.refrescar().pipe(
        catchError((errorRenovacion: unknown) => {
          router.navigate(['/login'], { queryParams: { volver: router.url } });
          return throwError(() => errorRenovacion);
        }),
        switchMap(() => next(conToken(req))),
      );
    }),
  );
};
