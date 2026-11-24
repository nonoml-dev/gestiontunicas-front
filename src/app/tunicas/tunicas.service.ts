import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Pagina } from '../hermanos/hermano.models';
import { FiltroTunicas, OrdenTunicas, TunicaResumen } from './tunica.models';

const URL = '/api/v1/tunicas';

@Injectable({ providedIn: 'root' })
export class TunicasService {
  private readonly http = inject(HttpClient);

  /** Inventario paginado. Las medidas filtran por medida total (medida + dobladillo). */
  buscar(
    filtro: FiltroTunicas,
    pagina: number,
    tamano: number,
    orden: OrdenTunicas,
    direccion: 'asc' | 'desc',
  ): Observable<Pagina<TunicaResumen>> {
    let params = new HttpParams()
      .set('pagina', pagina)
      .set('tamano', tamano)
      .set('orden', orden)
      .set('direccion', direccion);
    for (const estado of filtro.estados) {
      params = params.append('estado', estado);
    }
    if (filtro.medidaMin !== null) {
      params = params.set('medidaMin', filtro.medidaMin);
    }
    if (filtro.medidaMax !== null) {
      params = params.set('medidaMax', filtro.medidaMax);
    }
    return this.http.get<Pagina<TunicaResumen>>(URL, { params });
  }
}
