import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { DecisionFila, Importacion, ImportacionFila } from './importacion.models';

const URL = '/api/v1/hermanos/importaciones';

/** Asistente de importación del Excel de Secretaría. */
@Injectable({ providedIn: 'root' })
export class ImportacionService {
  private readonly http = inject(HttpClient);

  /** Sube el Excel; la importación queda PREVISUALIZADA y aún no toca los hermanos. */
  subir(fichero: File): Observable<Importacion> {
    const datos = new FormData();
    datos.append('fichero', fichero, fichero.name);
    return this.http.post<Importacion>(URL, datos);
  }

  filas(id: number): Observable<ImportacionFila[]> {
    return this.http.get<ImportacionFila[]>(`${URL}/${id}/filas`);
  }

  decidir(filaId: number, decision: DecisionFila): Observable<ImportacionFila> {
    return this.http.put<ImportacionFila>(`${URL}/filas/${filaId}/decision`, { decision });
  }

  confirmar(id: number): Observable<Importacion> {
    return this.http.post<Importacion>(`${URL}/${id}/confirmar`, null);
  }

  cancelar(id: number): Observable<Importacion> {
    return this.http.post<Importacion>(`${URL}/${id}/cancelar`, null);
  }

  /** Va con el token, así que no vale un enlace normal: se descarga como Blob. */
  plantilla(): Observable<Blob> {
    return this.http.get(`${URL}/plantilla`, { responseType: 'blob' });
  }
}
