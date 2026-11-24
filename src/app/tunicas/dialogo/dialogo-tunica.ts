import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, switchMap } from 'rxjs';

import { mensajeError } from '../../comun/mensaje-error';
import {
  LIMITES_DOBLADILLO,
  LIMITES_MEDIDA,
  PATRON_CODIGO,
  Tunica,
  TunicaRequest,
} from '../tunica.models';
import { TunicasService } from '../tunicas.service';

export interface DatosDialogoTunica {
  /** Nula al dar de alta. */
  tunica: Tunica | null;
}

/** "Nueva túnica" y "Editar túnica" (DESIGN.md §8). Al cerrar devuelve la túnica guardada. */
@Component({
  selector: 'app-dialogo-tunica',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './dialogo-tunica.html',
  styleUrl: './dialogo-tunica.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoTunica {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly tunicas = inject(TunicasService);
  private readonly dialogRef = inject<MatDialogRef<DialogoTunica, Tunica>>(MatDialogRef);
  private readonly tunica = inject<DatosDialogoTunica>(MAT_DIALOG_DATA).tunica;

  protected readonly editando = this.tunica !== null;
  protected readonly medida = LIMITES_MEDIDA;
  protected readonly dobladillo = LIMITES_DOBLADILLO;
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    codigo: [this.tunica?.codigo ?? '', [Validators.required, Validators.pattern(PATRON_CODIGO)]],
    medidaCm: this.fb.control<number | null>(this.tunica?.medidaCm ?? null, [
      Validators.required,
      Validators.min(LIMITES_MEDIDA.min),
      Validators.max(LIMITES_MEDIDA.max),
    ]),
    dobladilloCm: this.fb.control<number | null>(this.tunica?.dobladilloCm ?? 0, [
      Validators.required,
      Validators.min(LIMITES_DOBLADILLO.min),
      Validators.max(LIMITES_DOBLADILLO.max),
    ]),
    observaciones: [this.tunica?.observaciones ?? ''],
  });

  private readonly valor = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** "158 + 6 = 164 cm" mientras se escribe; nulo hasta que las dos medidas son válidas. */
  protected readonly medidaTotal = computed(() => {
    this.valor();
    const { medidaCm, dobladilloCm } = this.form.controls;
    if (medidaCm.invalid || dobladilloCm.invalid) {
      return null;
    }
    const medida = medidaCm.value!;
    const dobladillo = dobladilloCm.value!;
    return `${medida} + ${dobladillo} = ${medida + dobladillo} cm`;
  });

  /** Aviso informativo: el código era de una túnica que ahora es propiedad de un hermano. No impide guardar. */
  protected readonly codigoFueDeHermano = signal(false);

  constructor() {
    this.form.controls.codigo.valueChanges
      .pipe(
        map((codigo) => this.normalizarCodigo(codigo)),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((codigo) =>
          // Al editar, el código que ya tenía la túnica no avisa.
          PATRON_CODIGO.test(codigo) && codigo !== this.tunica?.codigo
            ? this.tunicas.avisoCodigo(codigo).pipe(
                map((aviso) => aviso.fueDeHermano),
                catchError(() => of(false)),
              )
            : of(false),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((fueDeHermano) => this.codigoFueDeHermano.set(fueDeHermano));
  }

  /** Escribir "m-12" también vale: se guarda como "M-012"; y "042" como "42". */
  protected normalizarCampoCodigo(): void {
    const control = this.form.controls.codigo;
    const normalizado = this.normalizarCodigo(control.value);
    if (normalizado !== control.value) {
      control.setValue(normalizado);
    }
  }

  protected guardar(): void {
    this.error.set(null);
    this.normalizarCampoCodigo();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.enviando()) {
      return;
    }
    const peticion = this.tunica
      ? this.tunicas.actualizar(this.tunica.id, this.request())
      : this.tunicas.crear(this.request());
    this.enviando.set(true);
    peticion.pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: (tunica) => this.dialogRef.close(tunica),
      error: (err: unknown) =>
        this.error.set(mensajeError(err, 'No se ha podido guardar la túnica. Revisa los datos.')),
    });
  }

  private request(): TunicaRequest {
    const valor = this.form.getRawValue();
    return {
      codigo: valor.codigo,
      medidaCm: valor.medidaCm!,
      dobladilloCm: valor.dobladilloCm!,
      fechaAlta: null,
      observaciones: valor.observaciones.trim() || null,
    };
  }

  private normalizarCodigo(texto: string): string {
    const codigo = texto.trim().toUpperCase();
    const monaguillo = /^M-?(\d{1,3})$/.exec(codigo);
    if (monaguillo) {
      return `M-${monaguillo[1].padStart(3, '0')}`;
    }
    return /^\d+$/.test(codigo) ? codigo.replace(/^0+(?=\d)/, '') : codigo;
  }
}
