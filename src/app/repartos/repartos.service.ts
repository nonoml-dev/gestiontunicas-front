import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ParametroConfiguracion, Reparto, RepartoRequest } from './reparto.models';

const URL = '/api/v1/repartos';

@Injectable({ providedIn: 'root' })
export class RepartosService {
  private readonly http = inject(HttpClient);

  /** Del más reciente al más antiguo. */
  listar(): Observable<Reparto[]> {
    return this.http.get<Reparto[]>(URL);
  }

  obtener(id: number): Observable<Reparto> {
    return this.http.get<Reparto>(`${URL}/${id}`);
  }

  /** Nace en borrador con sus 3 jornadas. */
  crear(request: RepartoRequest): Observable<Reparto> {
    return this.http.post<Reparto>(URL, request);
  }

  /** Valores por defecto del reparto (tolerancia de medida...). */
  configuracionPorDefecto(): Observable<ParametroConfiguracion[]> {
    return this.http.get<ParametroConfiguracion[]>('/api/v1/configuracion', {
      params: { prefijo: 'reparto.' },
    });
  }
}
