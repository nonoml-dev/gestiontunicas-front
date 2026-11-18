import { HermanoResumen } from '../hermano.models';

export type EstadoImportacion = 'PREVISUALIZADA' | 'CONFIRMADA' | 'CANCELADA';
export type EstadoFila = 'OK' | 'ERROR' | 'POSIBLE_DUPLICADO' | 'INCOMPLETA';
export type DecisionFila = 'CREAR' | 'ACTUALIZAR' | 'IGNORAR';

/** ImportacionDTO. */
export interface Importacion {
  id: number;
  nombreFichero: string;
  estado: EstadoImportacion;
  totalFilas: number;
  filasOk: number;
  filasError: number;
  filasDuplicadas: number;
}

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
