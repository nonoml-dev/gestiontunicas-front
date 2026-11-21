import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Observable, finalize, map } from 'rxjs';

import { Usuario } from '../../auth/auth.models';
import { mensajeError } from '../../comun/mensaje-error';
import { CARGOS, ROLES, UsuarioRequest } from '../usuario.models';
import { UsuariosService } from '../usuarios.service';

export interface DatosDialogoUsuario {
  /** Nulo al crear. */
  usuario: Usuario | null;
  /** Es la cuenta de quien está editando: no puede desactivarse ni quitarse el rol de administrador. */
  esPropio: boolean;
}

export interface ResultadoDialogoUsuario {
  usuario: Usuario;
  /** Solo al crear. */
  passwordTemporal: string | null;
}

const CON_TEXTO = /\S/;

/** Alta y edición de usuarios (DESIGN.md §8). */
@Component({
  selector: 'app-dialogo-usuario',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './dialogo-usuario.html',
  styleUrl: './dialogo-usuario.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoUsuario {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly usuarios = inject(UsuariosService);
  private readonly dialogRef = inject<MatDialogRef<DialogoUsuario, ResultadoDialogoUsuario>>(MatDialogRef);
  private readonly datos = inject<DatosDialogoUsuario>(MAT_DIALOG_DATA);

  protected readonly cargos = CARGOS;
  protected readonly roles = ROLES;
  protected readonly editando = this.datos.usuario !== null;
  protected readonly esPropio = this.datos.esPropio;
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nombre: [
      this.datos.usuario?.nombre ?? '',
      [Validators.required, Validators.pattern(CON_TEXTO), Validators.maxLength(100)],
    ],
    apellidos: [this.datos.usuario?.apellidos ?? '', Validators.maxLength(150)],
    username: [
      this.datos.usuario?.username ?? '',
      [Validators.required, Validators.pattern(/^\s*[a-zA-Z0-9._-]+\s*$/), Validators.maxLength(50)],
    ],
    cargo: [this.datos.usuario?.cargo ?? '', Validators.required],
    email: [this.datos.usuario?.email ?? '', [Validators.email, Validators.maxLength(150)]],
    roles: this.fb.control<string[]>([...(this.datos.usuario?.roles ?? [])], Validators.required),
    activo: [{ value: this.datos.usuario?.activo ?? true, disabled: this.datos.esPropio }],
  });

  protected rolBloqueado(codigo: string): boolean {
    return this.esPropio && codigo === 'ADMIN';
  }

  protected guardar(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.peticion(this.request())
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (resultado) => this.dialogRef.close(resultado),
        error: (err: unknown) => this.error.set(mensajeError(err, 'No se ha podido guardar el usuario. Revisa los datos.')),
      });
  }

  private peticion(request: UsuarioRequest): Observable<ResultadoDialogoUsuario> {
    const usuario = this.datos.usuario;
    if (usuario) {
      return this.usuarios
        .actualizar(usuario.id, request)
        .pipe(map((actualizado) => ({ usuario: actualizado, passwordTemporal: null })));
    }
    return this.usuarios.crear(request);
  }

  private request(): UsuarioRequest {
    const valor = this.form.getRawValue();
    return {
      username: valor.username.trim(),
      nombre: valor.nombre.trim(),
      apellidos: valor.apellidos.trim() || null,
      cargo: valor.cargo,
      email: valor.email.trim() || null,
      activo: valor.activo,
      roles: valor.roles,
    };
  }
}
