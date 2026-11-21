/** Pantalla a la que volver: solo rutas internas que no sean las de acceso. Si no, el Inicio. */
export function destinoSeguro(volver: string | null): string {
  const valido =
    volver?.startsWith('/') &&
    !volver.startsWith('//') &&
    !volver.startsWith('/login') &&
    !volver.startsWith('/cambiar-password');
  return valido ? volver! : '/inicio';
}
