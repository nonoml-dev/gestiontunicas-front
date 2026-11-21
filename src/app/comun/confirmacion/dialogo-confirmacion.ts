import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  /** Texto en negrita delante del mensaje, por ejemplo el nombre del hermano. */
  destacado?: string;
  textoConfirmar: string;
  /** Pinta el botón de confirmar con el color de error (DESIGN.md §8). */
  destructiva?: boolean;
  /** Pide un motivo obligatorio antes de habilitar el botón de confirmar. */
  pedirMotivo?: boolean;
}

export interface ResultadoConfirmacion {
  /** Motivo escrito, sin espacios sobrantes. Nulo si el diálogo no lo pide. */
  motivo: string | null;
}

/** Longitud máxima del motivo en la API (MotivoRequest). */
export const LONGITUD_MAXIMA_MOTIVO = 500;

/** Diálogo común de confirmación. Se abre con ConfirmacionService. */
@Component({
  selector: 'app-dialogo-confirmacion',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title class="titulo">{{ opciones.titulo }}</h2>
    <mat-dialog-content>
      <p>
        @if (opciones.destacado) {
          <strong>{{ opciones.destacado }}</strong>
        }
        {{ opciones.mensaje }}
      </p>
      @if (opciones.pedirMotivo) {
        <mat-form-field appearance="outline" class="motivo">
          <mat-label>Motivo</mat-label>
          <textarea
            #campoMotivo
            matInput
            rows="3"
            required
            [attr.maxlength]="longitudMaxima"
            [value]="motivo()"
            (input)="motivo.set(campoMotivo.value)"
          ></textarea>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" class="cancelar" (click)="cancelar()">Cancelar</button>
      <button
        mat-flat-button
        type="button"
        class="confirmar"
        [class.destructiva]="opciones.destructiva"
        [disabled]="!puedeConfirmar()"
        (click)="confirmar()"
      >
        {{ opciones.textoConfirmar }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .titulo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 24px;
      font-weight: 600;
    }
    .motivo {
      width: 100%;
    }
    .destructiva:not(:disabled) {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoConfirmacion {
  private readonly dialogRef = inject<MatDialogRef<DialogoConfirmacion, ResultadoConfirmacion>>(MatDialogRef);

  protected readonly opciones = inject<OpcionesConfirmacion>(MAT_DIALOG_DATA);
  protected readonly longitudMaxima = LONGITUD_MAXIMA_MOTIVO;
  protected readonly motivo = signal('');
  protected readonly puedeConfirmar = computed(() => !this.opciones.pedirMotivo || this.motivo().trim().length > 0);

  protected cancelar(): void {
    this.dialogRef.close();
  }

  protected confirmar(): void {
    if (this.puedeConfirmar()) {
      this.dialogRef.close({ motivo: this.opciones.pedirMotivo ? this.motivo().trim() : null });
    }
  }
}
