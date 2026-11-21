import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { UsuarioCreado } from '../usuario.models';

/** Muestra la contraseña temporal. No se guarda en ningún sitio: al cerrar ya no se puede recuperar. */
@Component({
  selector: 'app-dialogo-password-temporal',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="titulo">Contraseña temporal</h2>
    <mat-dialog-content>
      <p>
        Entrégasela a <strong>{{ datos.usuario.nombre }} {{ datos.usuario.apellidos }}</strong>
        (usuario <strong>{{ datos.usuario.username }}</strong>). Tendrá que cambiarla al entrar.
      </p>
      <div class="clave">
        <code>{{ datos.passwordTemporal }}</code>
        <button mat-button type="button" (click)="copiar()">
          <mat-icon>{{ copiada() ? 'check' : 'content_copy' }}</mat-icon>
          {{ copiada() ? 'Copiada' : 'Copiar' }}
        </button>
      </div>
      <p class="aviso">Solo se muestra ahora. Si se pierde, habrá que restablecerla.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button type="button" mat-dialog-close>Hecho</button>
    </mat-dialog-actions>
  `,
  styles: `
    .titulo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 24px;
      font-weight: 600;
    }
    .clave {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 8px 8px 16px;
      border: 1px solid rgb(6 8 48 / 38%);
      border-radius: 4px;
    }
    code {
      font-size: 18px;
      letter-spacing: 1px;
      overflow-wrap: anywhere;
    }
    .aviso {
      margin: 12px 0 0;
      color: rgb(6 8 48 / 70%);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoPasswordTemporal {
  private readonly portapapeles = inject(Clipboard);

  protected readonly datos = inject<UsuarioCreado>(MAT_DIALOG_DATA);
  protected readonly copiada = signal(false);

  protected copiar(): void {
    this.copiada.set(this.portapapeles.copy(this.datos.passwordTemporal));
  }
}
