import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Usuario } from '../auth/auth.models';
import { UsuarioCreado, UsuarioRequest } from './usuario.models';

const URL = '/api/v1/usuarios';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(URL);
  }

  crear(request: UsuarioRequest): Observable<UsuarioCreado> {
    return this.http.post<UsuarioCreado>(URL, request);
  }

  actualizar(id: number, request: UsuarioRequest): Observable<Usuario> {
    return this.http.put<Usuario>(`${URL}/${id}`, request);
  }

  /** Genera una temporal, desbloquea al usuario y cierra sus sesiones. */
  restablecerPassword(id: number): Observable<UsuarioCreado> {
    return this.http.post<UsuarioCreado>(`${URL}/${id}/restablecer-password`, null);
  }
}
