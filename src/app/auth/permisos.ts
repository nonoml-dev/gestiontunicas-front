/** G = gestionar · C = consultar · - = sin acceso. */
type Acceso = 'G' | 'C' | '-';
export type Nivel = 'G' | 'C';

const ORDEN_ROLES = ['ADMIN', 'PRIOSTE', 'MAYORDOMO', 'SECRETARIO', 'CAPILLER'] as const;

const fila = (admin: Acceso, prioste: Acceso, mayordomo: Acceso, secretario: Acceso, capiller: Acceso) =>
  [admin, prioste, mayordomo, secretario, capiller] as const;

/**
 * Matriz de permisos del análisis §3 (roles fijos, decisión D2), en el mismo orden.
 * Solo sirve para mostrar u ocultar: quien decide es el backend.
 */
const MATRIZ = {
  usuarios: fila('G', '-', '-', '-', '-'),
  configuracion: fila('G', 'C', 'C', 'C', '-'),
  hermanos: fila('G', 'G', 'G', 'G', 'C'),
  importarHermanos: fila('G', 'G', 'G', 'G', '-'),
  tunicas: fila('G', 'G', 'C', 'C', 'C'),
  repartos: fila('G', 'G', 'C', 'C', '-'),
  jornadasExtraordinarias: fila('G', 'G', 'C', '-', '-'),
  periodoDevolucion: fila('G', 'G', '-', '-', '-'),
  noDevueltas: fila('G', 'G', 'G', '-', '-'),
  importes: fila('G', 'C', 'G', 'C', '-'),
  entregas: fila('G', 'G', '-', 'G', 'G'),
  resguardo: fila('G', 'G', 'C', 'G', 'G'),
  plantillaResguardo: fila('G', 'G', '-', '-', '-'),
  devoluciones: fila('G', 'G', 'C', '-', 'G'),
  sanciones: fila('G', 'C', 'G', 'C', '-'),
  imponerVeto: fila('G', 'G', 'C', 'C', '-'),
  levantarVeto: fila('G', 'G', 'G', '-', '-'),
  historiales: fila('C', 'C', 'C', 'C', 'C'),
  informes: fila('G', 'G', 'G', 'G', 'C'),
  auditoria: fila('C', '-', '-', '-', '-'),
} as const;

export type Funcionalidad = keyof typeof MATRIZ;

/** Si alguno de los roles llega al nivel pedido. Quien gestiona también puede consultar. */
export function tienePermiso(roles: readonly string[], funcionalidad: Funcionalidad, nivel: Nivel = 'C'): boolean {
  return ORDEN_ROLES.some((rol, i) => {
    const acceso: Acceso = MATRIZ[funcionalidad][i];
    return roles.includes(rol) && (acceso === 'G' || acceso === nivel);
  });
}
