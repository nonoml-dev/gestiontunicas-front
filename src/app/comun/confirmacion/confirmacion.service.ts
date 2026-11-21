import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, filter } from 'rxjs';

import { DialogoConfirmacion, OpcionesConfirmacion, ResultadoConfirmacion } from './dialogo-confirmacion';

@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  private readonly dialog = inject(MatDialog);

  /** Abre la confirmación. Solo emite si el usuario confirma; al cancelar se completa sin emitir. */
  confirmar(opciones: OpcionesConfirmacion): Observable<ResultadoConfirmacion> {
    return this.dialog
      .open<DialogoConfirmacion, OpcionesConfirmacion, ResultadoConfirmacion>(DialogoConfirmacion, {
        data: opciones,
        width: '480px',
        autoFocus: opciones.pedirMotivo ? 'first-tabbable' : 'dialog',
      })
      .afterClosed()
      .pipe(filter((resultado): resultado is ResultadoConfirmacion => resultado !== undefined));
  }
}
