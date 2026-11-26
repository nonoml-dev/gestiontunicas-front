import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { finalize } from 'rxjs';

import { aFechaIso, aHora, minutosDelDia } from '../../comun/fechas-material';
import { CALENDARIO_ESPANOL } from '../../comun/calendario-espanol';
import { mensajeError } from '../../comun/mensaje-error';
import { Reparto, formatoEuros } from '../reparto.models';
import { RepartosService } from '../repartos.service';

export interface DatosDialogoJornada {
  reparto: Reparto;
}

const IMPORTE_MAXIMO = 999999.99;

const validarJornada = (grupo: AbstractControl): ValidationErrors | null => {
  const { horaInicio, horaFin, permiteRenovacion, permiteNuevaAlta, permiteCambio } =
    grupo.getRawValue();
  const errores: ValidationErrors = {};
  const inicio = minutosDelDia(horaInicio);
  const fin = minutosDelDia(horaFin);
  if (inicio !== null && fin !== null && fin < inicio) {
    errores['horario'] = true;
  }
  if (!permiteRenovacion && !permiteNuevaAlta && !permiteCambio) {
    errores['sinOperaciones'] = true;
  }
  return Object.keys(errores).length ? errores : null;
};

/**
 * "Añadir jornada extraordinaria" (DESIGN.md §8): fecha, horario, operaciones permitidas y limosna
 * propia opcional. Las entregas de ese día guardan la limosna que se les aplica.
 */
@Component({
  selector: 'app-dialogo-jornada-extraordinaria',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTimepickerModule,
  ],
  template: `
    <h2 mat-dialog-title class="titulo">Añadir jornada extraordinaria</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content class="campos">
        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input
            matInput
            [matDatepicker]="selectorFecha"
            formControlName="fecha"
            placeholder="dd/mm/aaaa"
            required
          />
          <mat-datepicker-toggle matIconSuffix [for]="selectorFecha" />
          <mat-datepicker #selectorFecha />
          @if (form.controls.fecha.hasError('matDatepickerParse')) {
            <mat-error>Fecha no válida (dd/mm/aaaa)</mat-error>
          } @else if (form.controls.fecha.hasError('ocupada')) {
            <mat-error>Ese día ya tiene jornada</mat-error>
          } @else if (form.controls.fecha.invalid) {
            <mat-error>Indica la fecha</mat-error>
          }
        </mat-form-field>
        <div class="fila">
          <mat-form-field appearance="outline">
            <mat-label>Desde</mat-label>
            <input matInput [matTimepicker]="selectorDesde" formControlName="horaInicio" />
            <mat-timepicker-toggle matIconSuffix [for]="selectorDesde" />
            <mat-timepicker #selectorDesde interval="15m" />
            @if (form.controls.horaInicio.invalid) {
              <mat-error>Hora no válida</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hasta</mat-label>
            <input matInput [matTimepicker]="selectorHasta" formControlName="horaFin" />
            <mat-timepicker-toggle matIconSuffix [for]="selectorHasta" />
            <mat-timepicker #selectorHasta interval="15m" />
            @if (form.controls.horaFin.invalid) {
              <mat-error>Hora no válida</mat-error>
            }
          </mat-form-field>
        </div>
        @if (form.hasError('horario')) {
          <p class="error" role="alert">La hora de fin no puede ser anterior a la de inicio.</p>
        }
        <div>
          <mat-checkbox formControlName="permiteRenovacion">Renovación</mat-checkbox>
          <mat-checkbox formControlName="permiteNuevaAlta">Nueva alta</mat-checkbox>
          <mat-checkbox formControlName="permiteCambio">Cambio</mat-checkbox>
        </div>
        @if (form.hasError('sinOperaciones')) {
          <p class="error" role="alert">Marca al menos una operación.</p>
        }
        <mat-form-field appearance="outline">
          <mat-label>Limosna</mat-label>
          <input
            matInput
            type="number"
            inputmode="decimal"
            step="0.01"
            min="0"
            formControlName="limosna"
          />
          <span matTextSuffix>€</span>
          <mat-hint>Vacío = la del reparto ({{ limosnaReparto }})</mat-hint>
          @if (form.controls.limosna.invalid) {
            <mat-error>Importe de 0 o más, con 2 decimales como mucho</mat-error>
          }
        </mat-form-field>
        @if (error(); as mensaje) {
          <p class="error" role="alert">{{ mensaje }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="undefined">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="enviando()">Añadir</button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: './dialogos-reparto.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CALENDARIO_ESPANOL],
})
export class DialogoJornadaExtraordinaria {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly repartos = inject(RepartosService);
  private readonly dialogRef =
    inject<MatDialogRef<DialogoJornadaExtraordinaria, Reparto>>(MatDialogRef);
  private readonly reparto = inject<DatosDialogoJornada>(MAT_DIALOG_DATA).reparto;

  protected readonly limosnaReparto = formatoEuros(this.reparto.limosna);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly fechasOcupadas = new Set(this.reparto.jornadas.map((j) => j.fecha));

  protected readonly form = this.fb.group(
    {
      fecha: this.fb.control<Date | null>(null, [
        Validators.required,
        (control: AbstractControl) =>
          this.fechasOcupadas.has(aFechaIso(control.value) ?? '') ? { ocupada: true } : null,
      ]),
      horaInicio: this.fb.control<Date | null>(null),
      horaFin: this.fb.control<Date | null>(null),
      permiteRenovacion: true,
      permiteNuevaAlta: true,
      permiteCambio: true,
      limosna: new FormControl<number | null>(null, [
        Validators.min(0),
        Validators.max(IMPORTE_MAXIMO),
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
      ]),
    },
    { validators: validarJornada },
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
      .anadirJornadaExtraordinaria(this.reparto.id, {
        fecha: aFechaIso(valor.fecha)!,
        horaInicio: aHora(valor.horaInicio),
        horaFin: aHora(valor.horaFin),
        limosna: valor.limosna === null || (valor.limosna as unknown) === '' ? null : valor.limosna,
        permiteRenovacion: valor.permiteRenovacion,
        permiteNuevaAlta: valor.permiteNuevaAlta,
        permiteCambio: valor.permiteCambio,
      })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (reparto) => this.dialogRef.close(reparto),
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido añadir la jornada extraordinaria.')),
      });
  }
}
