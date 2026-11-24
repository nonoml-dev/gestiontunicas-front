export type EstadoTunica =
  | 'DISPONIBLE'
  | 'RESERVADA'
  | 'ALQUILADA'
  | 'EN_REVISION'
  | 'EN_REPARACION'
  | 'INCOMPLETA'
  | 'NO_DEVUELTA'
  | 'PROPIEDAD_HERMANO'
  | 'BAJA';

/** Estados en el orden en que se muestran, con su texto en pantalla. */
export const ESTADOS_TUNICA: readonly { valor: EstadoTunica; texto: string }[] = [
  { valor: 'DISPONIBLE', texto: 'Disponible' },
  { valor: 'RESERVADA', texto: 'Reservada' },
  { valor: 'ALQUILADA', texto: 'Alquilada' },
  { valor: 'EN_REVISION', texto: 'En revisión' },
  { valor: 'EN_REPARACION', texto: 'En reparación' },
  { valor: 'INCOMPLETA', texto: 'Incompleta' },
  { valor: 'NO_DEVUELTA', texto: 'No devuelta' },
  { valor: 'PROPIEDAD_HERMANO', texto: 'Propiedad del hermano' },
  { valor: 'BAJA', texto: 'Baja' },
];

export function textoEstadoTunica(estado: EstadoTunica): string {
  return ESTADOS_TUNICA.find((e) => e.valor === estado)?.texto ?? estado;
}

/** Fila del inventario (TunicaResumenDTO). */
export interface TunicaResumen {
  id: number;
  /** Del 1 al 999, o M-XXX si es de monaguillo. */
  codigo: string;
  medidaCm: number;
  dobladilloCm: number;
  /** Medida + dobladillo. */
  medidaTotalCm: number;
  estado: EstadoTunica;
}

export type OrdenTunicas = 'codigo' | 'medidaTotal' | 'estado';

export interface FiltroTunicas {
  /** Vacío = todas menos las que son propiedad de un hermano. */
  estados: readonly EstadoTunica[];
  medidaMin: number | null;
  medidaMax: number | null;
}

export type TipoPieza = 'TUNICA' | 'CAPA' | 'ANTIFAZ' | 'CINGULO' | 'TALEGA';
export type EstadoPieza = 'BUEN_ESTADO' | 'DETERIORADA' | 'EN_REPARACION' | 'PERDIDA';

/** Las 5 piezas fijas, en el orden en que se muestran. */
export const PIEZAS: Readonly<Record<TipoPieza, { texto: string; icono: string }>> = {
  TUNICA: { texto: 'Túnica', icono: 'checkroom' },
  CAPA: { texto: 'Capa', icono: 'dry_cleaning' },
  ANTIFAZ: { texto: 'Antifaz', icono: 'masks' },
  CINGULO: { texto: 'Cíngulo', icono: 'gesture' },
  TALEGA: { texto: 'Talega', icono: 'shopping_bag' },
};

export const ESTADOS_PIEZA: Readonly<Record<EstadoPieza, string>> = {
  BUEN_ESTADO: 'Buen estado',
  DETERIORADA: 'Deteriorada',
  EN_REPARACION: 'En reparación',
  PERDIDA: 'Perdida',
};

/** Pieza de una túnica (PiezaDTO). */
export interface Pieza {
  id: number;
  tipo: TipoPieza;
  estado: EstadoPieza;
  observaciones: string | null;
}

/** Ficha de la túnica con sus 5 piezas (TunicaDTO). Fechas en yyyy-MM-dd. */
export interface Tunica {
  id: number;
  codigo: string;
  monaguillo: boolean;
  medidaCm: number;
  dobladilloCm: number;
  medidaTotalCm: number;
  estado: EstadoTunica;
  fechaAlta: string;
  fechaBaja: string | null;
  motivoBaja: string | null;
  /** Fecha en que pasó a ser propiedad del hermano. */
  fechaPropiedad: string | null;
  observaciones: string | null;
  piezas: Pieza[];
}

/** Alta o edición (TunicaRequest). */
export interface TunicaRequest {
  codigo: string;
  medidaCm: number;
  dobladilloCm: number;
  /** Nula = hoy. Al editar no se cambia. */
  fechaAlta: string | null;
  observaciones: string | null;
}

/** Aviso al dar de alta (AvisoCodigoDTO). */
export interface AvisoCodigo {
  codigo: string;
  fueDeHermano: boolean;
}

/** Del 1 al 999 sin ceros a la izquierda, o M-XXX para las de monaguillo (como el backend). */
export const PATRON_CODIGO = /^([1-9][0-9]{0,2}|M-[0-9]{3})$/;

/** Límites de TunicaRequest. */
export const LIMITES_MEDIDA = { min: 60, max: 220 } as const;
export const LIMITES_DOBLADILLO = { min: 0, max: 30 } as const;

/** Estados en los que la túnica está fuera de casa o ya no es de la Hermandad: no se puede dar de baja. */
export const ESTADOS_SIN_BAJA: readonly EstadoTunica[] = [
  'RESERVADA',
  'ALQUILADA',
  'NO_DEVUELTA',
  'PROPIEDAD_HERMANO',
  'BAJA',
];
