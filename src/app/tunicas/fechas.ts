/** Fecha de hoy en la hora local, en yyyy-MM-dd (toISOString usaría UTC y de noche daría el día anterior o siguiente). */
export function hoy(): string {
  const ahora = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}
