import { HttpErrorResponse } from '@angular/common/http';

/** Texto para el usuario a partir de un error de la API (usa el "detail" del ProblemDetail si lo hay). */
export function mensajeError(error: unknown, porDefecto: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return porDefecto;
  }
  if (error.status === 0 || error.status === 502 || error.status === 504) {
    return 'No se puede conectar con el servidor. Inténtalo de nuevo en unos minutos.';
  }
  if (error.status === 403) {
    return 'No tienes permiso para hacer esto.';
  }
  const detalle = error.error?.detail;
  return error.status !== 400 && typeof detalle === 'string' && detalle ? detalle : porDefecto;
}
