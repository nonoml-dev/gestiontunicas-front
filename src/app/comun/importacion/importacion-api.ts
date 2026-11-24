import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

export type EstadoImportacion = 'PREVISUALIZADA' | 'CONFIRMADA' | 'CANCELADA';
export type EstadoFila = 'OK' | 'ERROR' | 'POSIBLE_DUPLICADO' | 'INCOMPLETA';
export type DecisionFila = 'CREAR' | 'ACTUALIZAR' | 'IGNORAR';

/** ImportacionDTO: igual para hermanos y túnicas. */
export interface Importacion {
  id: number;
  nombreFichero: string;
  estado: EstadoImportacion;
  totalFilas: number;
  filasOk: number;
  filasError: number;
  filasDuplicadas: number;
}

/**
 * Llamadas del asistente "Importar Excel" (DESIGN.md §7.6): subir → revisar → confirmar.
 * Hermanos y túnicas tienen la misma API, cada una en su URL. {@code F} es la fila de cada tipo.
 */
export abstract class ImportacionApi<F extends { id: number }> {
  protected readonly http = inject(HttpClient);

  protected constructor(private readonly url: string) {}

  /** Sube el Excel; la importación queda PREVISUALIZADA y aún no se guarda nada. */
  subir(fichero: File): Observable<Importacion> {
    const datos = new FormData();
    datos.append('fichero', fichero, fichero.name);
    return this.http.post<Importacion>(this.url, datos);
  }

  filas(id: number): Observable<F[]> {
    return this.http.get<F[]>(`${this.url}/${id}/filas`);
  }

  decidir(filaId: number, decision: DecisionFila): Observable<F> {
    return this.http.put<F>(`${this.url}/filas/${filaId}/decision`, { decision });
  }

  confirmar(id: number): Observable<Importacion> {
    return this.http.post<Importacion>(`${this.url}/${id}/confirmar`, null);
  }

  cancelar(id: number): Observable<Importacion> {
    return this.http.post<Importacion>(`${this.url}/${id}/cancelar`, null);
  }

  /** Va con el token, así que no vale un enlace normal: se descarga como Blob. */
  plantilla(): Observable<Blob> {
    return this.http.get(`${this.url}/plantilla`, { responseType: 'blob' });
  }
}

/** Guarda un Blob descargado de la API con el nombre indicado. */
export function guardarFichero(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
