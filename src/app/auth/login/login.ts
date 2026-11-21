import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../auth.service';
import { destinoSeguro } from '../destino';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.group({
    usuario: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected readonly mostrarPassword = signal(false);

  /** Error de credenciales: se muestra como texto bajo el formulario, no como snackbar (DESIGN.md §7.1). */
  protected readonly error = signal<string | null>(null);

  protected alternarPassword(): void {
    this.mostrarPassword.update((visible) => !visible);
  }

  /** Mientras se espera la respuesta del backend, para no enviar el formulario dos veces. */
  protected readonly enviando = signal(false);

  protected entrar(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.enviando()) {
      return;
    }

    const { usuario, password } = this.form.getRawValue();
    this.enviando.set(true);
    this.authService
      .login(usuario.trim(), password)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.destino()),
        error: (err: HttpErrorResponse) => this.error.set(this.mensajeError(err)),
      });
  }

  /** Vuelve a la pantalla que se intentaba abrir (solo rutas internas) o al Inicio. */
  private destino(): string {
    return destinoSeguro(this.route.snapshot.queryParamMap.get('volver'));
  }

  private mensajeError(err: HttpErrorResponse): string {
    if (err.status === 401 && typeof err.error?.detail === 'string') {
      return err.error.detail;
    }
    if (err.status === 0 || err.status === 502 || err.status === 504) {
      return 'No se puede conectar con el servidor. Inténtalo de nuevo en unos minutos.';
    }
    return 'No se ha podido iniciar sesión. Inténtalo de nuevo.';
  }
}
