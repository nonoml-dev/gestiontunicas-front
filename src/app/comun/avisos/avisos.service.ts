import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

const DURACION_MS = 4000;

/** Avisos breves de operación correcta (DESIGN.md §9). Los errores se muestran junto a lo que ha fallado. */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly snackBar = inject(MatSnackBar);

  exito(mensaje: string, accion?: string): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(mensaje, accion, {
      duration: DURACION_MS,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'aviso-exito',
    });
  }
}
