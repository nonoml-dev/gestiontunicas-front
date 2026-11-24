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
