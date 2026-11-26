import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';

import { aFechaIso, deFechaIso, esAnterior } from '../../comun/fechas-material';
import { CALENDARIO_ESPANOL } from '../../comun/calendario-espanol';
import { mensajeError } from '../../comun/mensaje-error';
import { Reparto } from '../reparto.models';
import { RepartosService } from '../repartos.service';

export interface DatosDialogoPeriodo {
  reparto: Reparto;
}

/** Límites del servidor (PeriodoDevolucionRequest y CambioPeriodoDevolucionRequest). */
const PLAZO_GRACIA_MAXIMO = 12;
const LONGITUD_MOTIVO = 255;

const periodoCoherente = (grupo: AbstractControl): ValidationErrors | null => {
  const { inicio, fin } = grupo.getRawValue();
  return esAnterior(fin, inicio) ? { periodo: true } : null;
};

/**
 * "Cambiar periodo de devolución" (DESIGN.md §8): fechas, plazo de gracia y motivo obligatorio. El cambio
 * queda en el historial del reparto con el motivo y quién lo hizo.
 */
@Component({
  selector: 'app-dialogo-periodo-devolucion',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title class="titulo">Cambiar periodo de devolución</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content class="campos">
        <div class="fila">
          <mat-form-field appearance="outline">
            <mat-label>Devolución desde</mat-label>
            <input
              matInput
              [matDatepicker]="selectorInicio"
              formControlName="inicio"
              placeholder="dd/mm/aaaa"
              required
            />
            <mat-datepicker-toggle matIconSuffix [for]="selectorInicio" />
            <mat-datepicker #selectorInicio />
            @if (form.controls.inicio.hasError('matDatepickerParse')) {
              <mat-error>Fecha no válida (dd/mm/aaaa)</mat-error>
            } @else if (form.controls.inicio.invalid) {
              <mat-error>Indica la fecha</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Devolución hasta</mat-label>
            <input
              matInput
              [matDatepicker]="selectorFin"
              formControlName="fin"
              placeholder="dd/mm/aaaa"
              required
            />
            <mat-datepicker-toggle matIconSuffix [for]="selectorFin" />
            <mat-datepicker #selectorFin />
            @if (form.controls.fin.hasError('matDatepickerParse')) {
              <mat-error>Fecha no válida (dd/mm/aaaa)</mat-error>
            } @else if (form.controls.fin.invalid) {
              <mat-error>Indica la fecha</mat-error>
            }
          </mat-form-field>
        </div>
        @if (form.hasError('periodo')) {
          <p class="error" role="alert">La fecha fin no puede ser anterior a la de inicio.</p>
        }
        <mat-form-field appearance="outline">
          <mat-label>Plazo de gracia</mat-label>
          <input
            matInput
            type="number"
            inputmode="numeric"
            formControlName="plazoGraciaMeses"
            required
            min="0"
            [max]="plazoGraciaMaximo"
          />
          <span matTextSuffix>meses</span>
          @if (form.controls.plazoGraciaMeses.invalid) {
            <mat-error>Entre 0 y {{ plazoGraciaMaximo }} meses</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Motivo</mat-label>
          <textarea
            matInput
            formControlName="motivo"
            rows="3"
            required
            [attr.maxlength]="longitudMotivo"
          ></textarea>
          <mat-hint>Queda en el historial del reparto</mat-hint>
          @if (form.controls.motivo.invalid) {
            <mat-error>Escribe el motivo del cambio</mat-error>
          }
        </mat-form-field>
        @if (error(); as mensaje) {
          <p class="error" role="alert">{{ mensaje }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="undefined">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="enviando()">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: './dialogos-reparto.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CALENDARIO_ESPANOL],
})
export class DialogoPeriodoDevolucion {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly repartos = inject(RepartosService);
  private readonly dialogRef =
    inject<MatDialogRef<DialogoPeriodoDevolucion, Reparto>>(MatDialogRef);
  private readonly reparto = inject<DatosDialogoPeriodo>(MAT_DIALOG_DATA).reparto;

  protected readonly plazoGraciaMaximo = PLAZO_GRACIA_MAXIMO;
  protected readonly longitudMotivo = LONGITUD_MOTIVO;
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group(
    {
      inicio: this.fb.control<Date | null>(
        deFechaIso(this.reparto.periodoDevolucion.inicio),
        Validators.required,
      ),
      fin: this.fb.control<Date | null>(
        deFechaIso(this.reparto.periodoDevolucion.fin),
        Validators.required,
      ),
      plazoGraciaMeses: this.fb.control<number | null>(
        this.reparto.periodoDevolucion.plazoGraciaMeses,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(PLAZO_GRACIA_MAXIMO),
          Validators.pattern(/^\d+$/),
        ],
      ),
      motivo: [
        '',
        [Validators.required, Validators.pattern(/\S/), Validators.maxLength(LONGITUD_MOTIVO)],
      ],
    },
    { validators: periodoCoherente },
  );

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
    this.repartos
      .cambiarPeriodoDevolucion(this.reparto.id, {
        periodo: {
          inicio: aFechaIso(valor.inicio)!,
          fin: aFechaIso(valor.fin)!,
          plazoGraciaMeses: valor.plazoGraciaMeses!,
        },
        motivo: valor.motivo.trim(),
      })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (reparto) => this.dialogRef.close(reparto),
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido cambiar el periodo de devolución.')),
      });
  }
}
