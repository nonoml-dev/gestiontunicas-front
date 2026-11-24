import { DecisionFila, EstadoFila } from '../../comun/importacion/importacion-api';
import { HermanoResumen } from '../hermano.models';

export type {
  DecisionFila,
  EstadoFila,
  EstadoImportacion,
  Importacion,
} from '../../comun/importacion/importacion-api';

/** ImportacionFilaDTO: una fila del Excel ya interpretada. */
export interface ImportacionFila {
  id: number;
  numFila: number;
  datos: {
    /** Primera columna tal cual venía en el Excel. */
    nombreOriginal: string | null;
    apellidos: string | null;
    nombre: string | null;
    numeroHermano: string | null;
    /** yyyy-MM-dd */
    fechaNacimiento: string | null;
  };
  estado: EstadoFila;
  errores: string[];
  hermanoCoincidente: HermanoResumen | null;
  decision: DecisionFila | null;
}
