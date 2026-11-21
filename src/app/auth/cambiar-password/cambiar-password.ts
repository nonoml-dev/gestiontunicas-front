import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AvisosService } from '../../comun/avisos/avisos.service';
import { mensajeError } from '../../comun/mensaje-error';
import { AuthService } from '../auth.service';
import { destinoSeguro } from '../destino';

const LONGITUD_MINIMA = 8;
/** Límite de BCrypt en el backend. */
const LONGITUD_MAXIMA = 72;

function contrasenasValidas(grupo: AbstractControl): ValidationErrors | null {
  const { passwordActual, passwordNueva, confirmacion } = grupo.getRawValue();
  const errores: ValidationErrors = {};
  if (passwordNueva && passwordNueva === passwordActual) {
    errores['igualQueActual'] = true;
  }
  if (confirmacion && passwordNueva !== confirmacion) {
    errores['noCoinciden'] = true;
  }
  return Object.keys(errores).length ? errores : null;
}

/** Cambio de contraseña: obligatorio en el primer acceso y disponible después desde el menú del usuario. */
@Component({
  selector: 'app-cambiar-password',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './cambiar-password.html',
  styleUrl: './cambiar-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiarPassword {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Se fija al entrar: al guardar, la sesión deja de tener el cambio pendiente. */
  protected readonly obligatorio = this.auth.usuario()?.debeCambiarPassword === true;
  protected readonly longitudMinima = LONGITUD_MINIMA;
  protected readonly longitudMaxima = LONGITUD_MAXIMA;

  protected readonly form = this.fb.group(
    {
      passwordActual: ['', Validators.required],
      passwordNueva: [
        '',
        [Validators.required, Validators.minLength(LONGITUD_MINIMA), Validators.maxLength(LONGITUD_MAXIMA)],
      ],
      confirmacion: ['', Validators.required],
    },
    { validators: contrasenasValidas },
  );

  protected readonly mostrar = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected alternarMostrar(): void {
    this.mostrar.update((visible) => !visible);
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
    const { passwordActual, passwordNueva } = this.form.getRawValue();
    this.enviando.set(true);
    this.auth
      .cambiarPassword(passwordActual, passwordNueva)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.avisos.exito('Contraseña actualizada');
          this.volver();
        },
        error: (err: unknown) => this.error.set(mensajeError(err, 'No se ha podido cambiar la contraseña.')),
      });
  }

  protected volver(): void {
    this.router.navigateByUrl(destinoSeguro(this.route.snapshot.queryParamMap.get('volver')));
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}
