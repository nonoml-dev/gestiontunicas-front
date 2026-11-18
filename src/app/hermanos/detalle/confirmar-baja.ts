import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

/** Confirmación de la baja de un hermano. Devuelve true si se confirma. */
@Component({
  selector: 'app-confirmar-baja',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title class="titulo">Dar de baja</h2>
    <mat-dialog-content>
      <p>
        <strong>{{ nombre }}</strong> dejará de aparecer en el listado y en el buscador de hermanos.
        Su historial de túnicas se conserva.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button type="button" class="confirmar" [mat-dialog-close]="true">Dar de baja</button>
    </mat-dialog-actions>
  `,
  styles: `
    .titulo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 24px;
      font-weight: 600;
    }
    .confirmar {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmarBaja {
  protected readonly nombre = inject<string>(MAT_DIALOG_DATA);
}
