/** Fila del listado: solo los datos que vienen en el Excel de Secretaría (HermanoResumenDTO). */
export interface HermanoResumen {
  id: number;
  numeroHermano: string | null;
  /** "Apellidos, Nombre". */
  nombreCompleto: string;
  /** yyyy-MM-dd. Nula = ficha incompleta. */
  fechaNacimiento: string | null;
  fichaCompleta: boolean;
}

/** Detalle del hermano (HermanoDTO). */
export interface Hermano {
  id: number;
  numeroHermano: string | null;
  nombre: string;
  apellidos: string;
  nombreCompleto: string;
  fechaNacimiento: string | null;
  telefono1: string | null;
  telefono2: string | null;
  email: string | null;
  activo: boolean;
  fichaCompleta: boolean;
}

/** Alta de un hermano (HermanoRequest). */
export interface HermanoRequest {
  numeroHermano: string | null;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string | null;
  telefono1: string | null;
  telefono2: string | null;
  email: string | null;
}

/** Criterio del filtro "En edad" (CriterioEdadDTO). */
export interface CriterioEdad {
  /** yyyy-MM-dd */
  juevesSanto: string;
  edadMin: number;
  edadMax: number;
  /** Nulo si no hay reparto abierto (se usa el próximo Jueves Santo). */
  repartoAnio: number | null;
}

/** Edición de un hermano: solo el contacto (ContactoHermanoRequest). Los datos del hermano no se editan. */
export interface ContactoHermanoRequest {
  telefono1: string | null;
  telefono2: string | null;
  email: string | null;
}

export type OrdenHermanos = 'numeroHermano' | 'nombreCompleto' | 'fechaNacimiento';

/** Página de Spring Data serializada VIA_DTO. */
export interface Pagina<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}
