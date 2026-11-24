import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';

import { mensajeError } from '../../comun/mensaje-error';
import {
  ESTADOS_PIEZA,
  PIEZAS,
  Reparacion,
  TIPOS_REPARACION,
  TipoPieza,
  TipoReparacion,
  Tunica,
} from '../tunica.models';
import { TunicasService } from '../tunicas.service';
import { hoy } from '../fechas';

export interface DatosDialogoReparacion {
  tunica: Tunica;
}

/** Longitud máxima de la descripción (ReparacionRequest). */
const LONGITUD_DESCRIPCION = 500;

/** "Registrar reparación" (DESIGN.md §8): pieza, tipo y descripción. Empieza hoy, pendiente. */
@Component({
  selector: 'app-dialogo-reparacion',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './dialogo-reparacion.html',
  styleUrl: './dialogo-tunica.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoReparacion {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly tunicas = inject(TunicasService);
  private readonly dialogRef = inject<MatDialogRef<DialogoReparacion, Reparacion>>(MatDialogRef);
  protected readonly tunica = inject<DatosDialogoReparacion>(MAT_DIALOG_DATA).tunica;

  protected readonly piezas = (Object.keys(PIEZAS) as TipoPieza[]).map((tipo) => ({
    tipo,
    ...PIEZAS[tipo],
    estado: ESTADOS_PIEZA[this.tunica.piezas.find((p) => p.tipo === tipo)?.estado ?? 'BUEN_ESTADO'],
  }));
  protected readonly tipos = Object.entries(TIPOS_REPARACION) as [TipoReparacion, string][];
  protected readonly longitudDescripcion = LONGITUD_DESCRIPCION;
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    tipoPieza: this.fb.control<TipoPieza | null>(null, Validators.required),
    tipo: this.fb.control<TipoReparacion>('REPARACION', Validators.required),
    descripcion: [
      '',
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(LONGITUD_DESCRIPCION)],
    ],
  });

  protected guardar(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.enviando()) {
      return;
    }
    const valor = this.form.getRawValue();
    this.enviando.set(true);
    this.tunicas
      .registrarReparacion(this.tunica.id, {
        tipoPieza: valor.tipoPieza!,
        tipo: valor.tipo,
        descripcion: valor.descripcion.trim(),
        estado: null,
        fechaInicio: hoy(),
        fechaFin: null,
        coste: null,
      })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (reparacion) => this.dialogRef.close(reparacion),
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido registrar la reparación.')),
      });
  }
}
