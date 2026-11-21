import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { Funcionalidad, Nivel } from './permisos';

/** Pantallas de la aplicación: sin sesión se va al login, recordando a dónde se quería ir. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).autenticado()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { volver: state.url } });
};

/** Con la contraseña pendiente de cambiar solo se puede ir a cambiarla (el backend también lo exige). */
export const passwordAlDiaGuard: CanActivateFn = (_route, state) => {
  if (!inject(AuthService).usuario()?.debeCambiarPassword) {
    return true;
  }
  return inject(Router).createUrlTree(['/cambiar-password'], { queryParams: { volver: state.url } });
};

/** Pantalla de login: si ya hay sesión se va directamente al Inicio. */
export const invitadoGuard: CanActivateFn = () =>
  inject(AuthService).autenticado() ? inject(Router).createUrlTree(['/inicio']) : true;

/** Solo con ese permiso de la matriz; si no, vuelve a la ruta indicada (el backend también lo comprueba). */
export const permisoGuard =
  (funcionalidad: Funcionalidad, nivel: Nivel, siNo: string): CanActivateFn =>
  () =>
    inject(AuthService).puede(funcionalidad, nivel) ? true : inject(Router).createUrlTree([siNo]);
