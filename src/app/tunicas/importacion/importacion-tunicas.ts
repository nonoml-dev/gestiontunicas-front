import { Injectable } from '@angular/core';

import { DecisionFila, EstadoFila, ImportacionApi } from '../../comun/importacion/importacion-api';
import { EstadoTunica } from '../tunica.models';

/** ImportacionFilaDTO de túnicas: una fila del inventario ya interpretada. */
export interface ImportacionFilaTunica {
  id: number;
  numFila: number;
  datos: {
    /** Las dos columnas tal cual venían en el Excel. */
    codigoOriginal: string | null;
    medidaOriginal: string | null;
    /** Normalizado ("042" → "42", "m-7" → "M-007"). Nulo si no es válido. */
    codigo: string | null;
    medidaCm: number | null;
    dobladilloCm: number | null;
    medidaTotalCm: number | null;
    /** El código era de una túnica que ahora es propiedad de un hermano (solo informa). */
    codigoFueDeHermano?: boolean;
    /** Túnica del inventario con el mismo código (solo en los posibles duplicados). */
    existente?: {
      id: number;
      medidaCm: number;
      dobladilloCm: number;
      medidaTotalCm: number;
      estado: EstadoTunica;
    };
  };
  estado: EstadoFila;
  errores: string[];
  decision: DecisionFila | null;
}

/** Asistente de importación del inventario de túnicas (solo Administrador y Prioste). */
@Injectable({ providedIn: 'root' })
export class ImportacionTunicasService extends ImportacionApi<ImportacionFilaTunica> {
  constructor() {
    super('/api/v1/tunicas/importaciones');
  }
}
