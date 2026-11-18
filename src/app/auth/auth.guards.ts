import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Pantallas de la aplicación: sin sesión se va al login, recordando a dónde se quería ir. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).autenticado()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { volver: state.url } });
};

/** Pantalla de login: si ya hay sesión se va directamente al Inicio. */
export const invitadoGuard: CanActivateFn = () =>
  inject(AuthService).autenticado() ? inject(Router).createUrlTree(['/inicio']) : true;

/** Solo para los roles indicados; si no, vuelve a la ruta indicada (el backend también lo comprueba). */
export const rolGuard =
  (roles: readonly string[], siNo: string): CanActivateFn =>
  () =>
    inject(AuthService).tieneAlgunRol(roles) ? true : inject(Router).createUrlTree([siNo]);
