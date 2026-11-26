export type EstadoReparto = 'BORRADOR' | 'ABIERTO' | 'CERRADO';

export const ESTADOS_REPARTO: Record<EstadoReparto, string> = {
  BORRADOR: 'Borrador',
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
};

export interface Jornada {
  id: number;
  numero: number;
  extraordinaria: boolean;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  /** Solo en extraordinarias. Nula = la del reparto. */
  limosna: number | null;
  permiteRenovacion: boolean;
  permiteNuevaAlta: boolean;
  permiteCambio: boolean;
}

export interface PeriodoDevolucion {
  inicio: string;
  fin: string;
  plazoGraciaMeses: number;
  finPlazoGracia: string;
}

/** Importes de sanción A–F. */
export interface TarifaSanciones {
  /** A: túnica, capa o antifaz deteriorada o no entregada. */
  importePiezaPrincipal: number;
  /** B: talega no entregada. */
  importeTalega: number;
  /** C: no devuelta en plazo. */
  importeRetraso: number;
  /** D: cíngulo no entregado o deteriorado. */
  importeCingulo: number;
  /** E: devuelta sucia. */
  importeSuciedad: number;
  /** F: cargo total de la túnica. */
  importeCargoTotal: number;
}

export interface Reparto {
  id: number;
  anio: number;
  fechaJuevesSanto: string;
  juevesSantoManual: boolean;
  edadMin: number;
  edadMax: number;
  estado: EstadoReparto;
  periodoDevolucion: PeriodoDevolucion;
  lugarDevolucion: string | null;
  limosna: number;
  tarifas: TarifaSanciones;
  toleranciaMedidaCm: number;
  plantillaResguardoId: number | null;
  plantillaResguardoNombre: string | null;
  modoTransicion: boolean;
  fechaApertura: string | null;
  reservasLiberadasEn: string | null;
  fechaCierre: string | null;
  noDevueltasProcesadasEn: string | null;
  finGraciaProcesadoEn: string | null;
  jornadas: Jornada[];
}

export interface JornadaRequest {
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  limosna: number | null;
  permiteRenovacion: boolean;
  permiteNuevaAlta: boolean;
  permiteCambio: boolean;
}

export interface RepartoRequest {
  anio: number;
  /** Nulo = lo calcula el servidor (Domingo de Resurrección − 3 días). */
  fechaJuevesSanto: string | null;
  edadMin: number;
  edadMax: number;
  periodoDevolucion: { inicio: string; fin: string; plazoGraciaMeses: number };
  lugarDevolucion: string | null;
  limosna: number;
  tarifas: TarifaSanciones;
  toleranciaMedidaCm: number;
  modoTransicion: boolean;
  /** Las 3 jornadas ordinarias, en orden. */
  jornadas: JornadaRequest[];
}

export interface ParametroConfiguracion {
  id: number;
  clave: string;
  valor: string | null;
  tipo: 'TEXTO' | 'ENTERO' | 'DECIMAL' | 'BOOLEANO' | 'FECHA';
  descripcion: string | null;
}

/** Importes A–F en el orden del resguardo, con la letra y el texto que se muestran. */
export const SANCIONES: { campo: keyof TarifaSanciones; letra: string; texto: string }[] = [
  {
    campo: 'importePiezaPrincipal',
    letra: 'A',
    texto: 'Túnica, capa o antifaz deteriorado o no entregado',
  },
  { campo: 'importeTalega', letra: 'B', texto: 'Talega no entregada' },
  { campo: 'importeRetraso', letra: 'C', texto: 'No devuelta en plazo' },
  { campo: 'importeCingulo', letra: 'D', texto: 'Cíngulo no entregado o deteriorado' },
  { campo: 'importeSuciedad', letra: 'E', texto: 'Devuelta sucia' },
  { campo: 'importeCargoTotal', letra: 'F', texto: 'Cargo total de la túnica' },
];

/**
 * Qué se permite cada día por defecto (análisis §4.3): el 1 renovaciones; el 2 nuevas altas y
 * renovaciones rezagadas; el 3 cambios, renovaciones rezagadas y nuevas altas.
 */
export const OPERACIONES_POR_DIA: Pick<
  JornadaRequest,
  'permiteRenovacion' | 'permiteNuevaAlta' | 'permiteCambio'
>[] = [
  { permiteRenovacion: true, permiteNuevaAlta: false, permiteCambio: false },
  { permiteRenovacion: true, permiteNuevaAlta: true, permiteCambio: false },
  { permiteRenovacion: true, permiteNuevaAlta: true, permiteCambio: true },
];

const dos = (n: number) => String(n).padStart(2, '0');

/**
 * Jueves Santo del año, en yyyy-MM-dd: Domingo de Resurrección − 3 días. La Pascua se calcula con el
 * algoritmo de Meeus/Jones/Butcher (calendario gregoriano), igual que el servidor.
 */
export function calcularJuevesSanto(anio: number): string {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  // Fecha en UTC para que el cambio de hora no mueva el día al restar.
  const jueves = new Date(Date.UTC(anio, mes - 1, dia - 3));
  return `${jueves.getUTCFullYear()}-${dos(jueves.getUTCMonth() + 1)}-${dos(jueves.getUTCDate())}`;
}

/** yyyy-MM-dd → dd/MM/yyyy. */
export function formatoFecha(fecha: string | null | undefined): string {
  if (!fecha) {
    return '';
  }
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Importe con coma decimal y símbolo del euro: 12.5 → "12,50 €". */
export function formatoEuros(importe: number | null | undefined): string {
  if (importe === null || importe === undefined) {
    return '';
  }
  return `${importe.toFixed(2).replace('.', ',')} €`;
}
