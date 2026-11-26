import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CambioPeriodoDevolucion,
  CambioPeriodoDevolucionRequest,
  ParametroConfiguracion,
  PlantillaResguardo,
  Reparto,
  RepartoRequest,
  Reserva,
} from './reparto.models';

const URL = '/api/v1/repartos';
const URL_PLANTILLAS = '/api/v1/plantillas-resguardo';

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

  /** Pasa a abierto y reserva la túnica de quien renueva (salvo en modo transición). */
  abrir(id: number): Observable<Reparto> {
    return this.http.post<Reparto>(`${URL}/${id}/abrir`, null);
  }

  /** Pasa a cerrado y libera las reservas que queden. */
  cerrar(id: number): Observable<Reparto> {
    return this.http.post<Reparto>(`${URL}/${id}/cerrar`, null);
  }

  /** Queda en el historial con el motivo y quién lo cambió. */
  cambiarPeriodoDevolucion(
    id: number,
    request: CambioPeriodoDevolucionRequest,
  ): Observable<Reparto> {
    return this.http.patch<Reparto>(`${URL}/${id}/periodo-devolucion`, request);
  }

  /** Del más reciente al más antiguo. */
  cambiosPeriodoDevolucion(id: number): Observable<CambioPeriodoDevolucion[]> {
    return this.http.get<CambioPeriodoDevolucion[]>(`${URL}/${id}/periodo-devolucion/cambios`);
  }

  /** Reservas activas. */
  reservas(id: number): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${URL}/${id}/reservas`);
  }

  asignarPlantilla(id: number, plantillaId: number): Observable<Reparto> {
    return this.http.put<Reparto>(`${URL}/${id}/plantilla`, { plantillaId });
  }

  /** Plantillas del resguardo, de la más reciente a la más antigua. */
  plantillas(): Observable<PlantillaResguardo[]> {
    return this.http.get<PlantillaResguardo[]>(URL_PLANTILLAS);
  }

  /** Sube el Word y devuelve las variables que contiene, con las desconocidas aparte. */
  subirPlantilla(fichero: File): Observable<PlantillaResguardo> {
    const datos = new FormData();
    datos.append('fichero', fichero, fichero.name);
    return this.http.post<PlantillaResguardo>(URL_PLANTILLAS, datos);
  }

  descargarPlantilla(id: number): Observable<Blob> {
    return this.http.get(`${URL_PLANTILLAS}/${id}/fichero`, { responseType: 'blob' });
  }

  /** Valores por defecto del reparto (tolerancia de medida...). */
  configuracionPorDefecto(): Observable<ParametroConfiguracion[]> {
    return this.http.get<ParametroConfiguracion[]>('/api/v1/configuracion', {
      params: { prefijo: 'reparto.' },
    });
  }
}
