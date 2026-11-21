import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs';

import { Sesion } from './auth.models';

const CLAVE_SESION = 'gestiontunicas.sesion';
export const URL_AUTH = '/api/v1/auth';

/**
 * Sesión del usuario. Se guarda en sessionStorage: al cerrar el navegador hay que volver a entrar
 * (los portátiles del reparto los comparten varios usuarios).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sesion = signal<Sesion | null>(this.leerSesion());
  /** Renovación en curso: si varias peticiones reciben 401 a la vez, todas esperan a la misma. */
  private renovacion: Observable<Sesion> | null = null;

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);

  /** Si el usuario tiene alguno de los roles (ADMIN, PRIOSTE...). Solo sirve para mostrar u ocultar; el backend lo vuelve a comprobar. */
  tieneAlgunRol(roles: readonly string[]): boolean {
    return this.usuario()?.roles.some((rol) => roles.includes(rol)) ?? false;
  }

  /** Hay sesión mientras el refresh token no haya caducado (el token de acceso se renueva solo). */
  autenticado(): boolean {
    const sesion = this.sesion();
    if (sesion && new Date(sesion.refreshExpiraEn).getTime() <= Date.now()) {
      this.borrarSesion();
      return false;
    }
    return sesion !== null;
  }

  token(): string | null {
    return this.sesion()?.accessToken ?? null;
  }

  login(username: string, password: string): Observable<Sesion> {
    return this.http
      .post<Sesion>(`${URL_AUTH}/login`, { username, password })
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  /** Pide un token de acceso nuevo con el refresh token. Si falla, la sesión se borra. */
  refrescar(): Observable<Sesion> {
    const refreshToken = this.sesion()?.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No hay sesión'));
    }
    this.renovacion ??= this.http.post<Sesion>(`${URL_AUTH}/refresh`, { refreshToken }).pipe(
      tap({
        next: (sesion) => this.guardarSesion(sesion),
        error: () => this.borrarSesion(),
      }),
      finalize(() => (this.renovacion = null)),
      shareReplay(1),
    );
    return this.renovacion;
  }

  /** Revoca el refresh token en el servidor, borra la sesión y vuelve al login. */
  cerrarSesion(): void {
    const refreshToken = this.sesion()?.refreshToken;
    if (refreshToken) {
      // Si falla (p. ej. sin conexión) da igual: la sesión local se borra y el token caduca solo.
      this.http.post(`${URL_AUTH}/logout`, { refreshToken }).subscribe({ error: () => undefined });
    }
    this.borrarSesion();
    this.router.navigateByUrl('/login');
  }

  /** Borra la sesión local sin llamar al servidor (sesión caducada o rechazada). */
  borrarSesion(): void {
    this.sesion.set(null);
    sessionStorage.removeItem(CLAVE_SESION);
  }

  private guardarSesion(sesion: Sesion): void {
    this.sesion.set(sesion);
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  }

  private leerSesion(): Sesion | null {
    const guardada = sessionStorage.getItem(CLAVE_SESION);
    if (!guardada) {
      return null;
    }
    try {
      const sesion = JSON.parse(guardada) as Sesion;
      return new Date(sesion.refreshExpiraEn).getTime() > Date.now() ? sesion : null;
    } catch {
      return null;
    }
  }
}
