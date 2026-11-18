import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ContactoHermanoRequest, CriterioEdad, Hermano, HermanoRequest, HermanoResumen, OrdenHermanos, Pagina } from './hermano.models';

const URL = '/api/v1/hermanos';

@Injectable({ providedIn: 'root' })
export class HermanosService {
  private readonly http = inject(HttpClient);

  buscar(
    texto: string,
    pagina: number,
    tamano: number,
    orden: OrdenHermanos,
    direccion: 'asc' | 'desc',
    enEdad: boolean,
  ): Observable<Pagina<HermanoResumen>> {
    const params = new HttpParams()
      .set('enEdad', enEdad)
      .set('q', texto.trim())
      .set('pagina', pagina)
      .set('tamano', tamano)
      .set('orden', orden)
      .set('direccion', direccion);
    return this.http.get<Pagina<HermanoResumen>>(URL, { params });
  }

  /** Jueves Santo y rango de edad del filtro "En edad". */
  criterioEdad(): Observable<CriterioEdad> {
    return this.http.get<CriterioEdad>(`${URL}/criterio-edad`);
  }

  obtener(id: number): Observable<Hermano> {
    return this.http.get<Hermano>(`${URL}/${id}`);
  }

  crear(request: HermanoRequest): Observable<Hermano> {
    return this.http.post<Hermano>(URL, request);
  }

  /** Solo el contacto: los datos del hermano vienen del Excel de Secretaría y no se editan. */
  actualizarContacto(id: number, request: ContactoHermanoRequest): Observable<Hermano> {
    return this.http.put<Hermano>(`${URL}/${id}`, request);
  }

  /** Baja lógica: deja de salir en el listado, pero se conserva su historial. */
  darDeBaja(id: number): Observable<void> {
    return this.http.delete<void>(`${URL}/${id}`);
  }
}
