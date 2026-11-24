import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Pagina } from '../hermanos/hermano.models';
import {
  AvisoCodigo,
  Reparacion,
  ReparacionRequest,
  FiltroTunicas,
  OrdenTunicas,
  Tunica,
  TunicaRequest,
  TunicaResumen,
} from './tunica.models';

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

  obtener(id: number): Observable<Tunica> {
    return this.http.get<Tunica>(`${URL}/${id}`);
  }

  /** Alta con sus 5 piezas en buen estado. */
  crear(request: TunicaRequest): Observable<Tunica> {
    return this.http.post<Tunica>(URL, request);
  }

  actualizar(id: number, request: TunicaRequest): Observable<Tunica> {
    return this.http.put<Tunica>(`${URL}/${id}`, request);
  }

  /** Baja con motivo obligatorio. La túnica se conserva con su historial. */
  darDeBaja(id: number, motivo: string): Observable<Tunica> {
    return this.http.post<Tunica>(`${URL}/${id}/baja`, { motivo });
  }

  /** Si el código perteneció a una túnica que ahora es propiedad de un hermano. Solo informa. */
  avisoCodigo(codigo: string): Observable<AvisoCodigo> {
    return this.http.get<AvisoCodigo>(`${URL}/aviso-codigo`, { params: { codigo } });
  }

  /** Reparaciones de sus piezas, de la más reciente a la más antigua. */
  reparaciones(tunicaId: number): Observable<Reparacion[]> {
    return this.http.get<Reparacion[]>(`${URL}/${tunicaId}/reparaciones`);
  }

  registrarReparacion(tunicaId: number, request: ReparacionRequest): Observable<Reparacion> {
    return this.http.post<Reparacion>(`${URL}/${tunicaId}/reparaciones`, request);
  }

  actualizarReparacion(
    tunicaId: number,
    id: number,
    request: ReparacionRequest,
  ): Observable<Reparacion> {
    return this.http.put<Reparacion>(`${URL}/${tunicaId}/reparaciones/${id}`, request);
  }
}
