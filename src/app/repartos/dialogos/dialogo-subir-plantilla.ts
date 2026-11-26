import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';

import { mensajeError } from '../../comun/mensaje-error';
import { PlantillaResguardo, Reparto } from '../reparto.models';
import { RepartosService } from '../repartos.service';

export interface DatosDialogoSubirPlantilla {
  reparto: Reparto;
}

/**
 * "Subir plantilla del resguardo" (DESIGN.md §8): sube el Word, enseña las variables que contiene y avisa
 * de las que no reconoce (erratas o llaves mal escritas). "Usar esta plantilla" la asigna al reparto.
 */
@Component({
  selector: 'app-dialogo-subir-plantilla',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressBarModule],
  template: `
    <h2 mat-dialog-title class="titulo">Subir plantilla del resguardo</h2>
    <mat-dialog-content class="campos">
      @if (ocupado()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (plantilla(); as p) {
        <p class="fichero">
          <mat-icon>description</mat-icon>
          {{ p.nombreFichero }}
        </p>
        @if (p.variablesDetectadas.length) {
          <p class="nota">Variables que contiene el Word:</p>
          <ul class="variables">
            @for (variable of p.variablesDetectadas; track variable) {
              <li class="variable" [class.desconocida]="esDesconocida(variable)">
                @if (esDesconocida(variable)) {
                  <mat-icon aria-label="No se reconoce">help</mat-icon>
                }
                {{ variable }}
              </li>
            }
          </ul>
        } @else {
          <p class="aviso" role="status">
            <mat-icon>info</mat-icon>
            El Word no tiene ninguna variable: el resguardo saldrá sin los datos del hermano ni de
            la túnica.
          </p>
        }
        @if (p.variablesDesconocidas.length) {
          <p class="aviso" role="alert">
            <mat-icon>help</mat-icon>
            {{
              p.variablesDesconocidas.length === 1
                ? 'No se reconoce 1 variable.'
                : 'No se reconocen ' + p.variablesDesconocidas.length + ' variables.'
            }}
            Revisa el Word: saldrán tal cual en el resguardo.
          </p>
        }
      } @else {
        <label
          class="zona"
          [class.arrastrando]="arrastrando()"
          (dragover)="arrastrarEncima($event)"
          (dragleave)="arrastrando.set(false)"
          (drop)="soltar($event)"
        >
          <mat-icon class="icono-zona">upload_file</mat-icon>
          <span>Arrastra aquí el Word del resguardo o <u>elige un fichero</u></span>
          <span class="ayuda">Documento .docx con las variables entre llaves dobles</span>
          <input
            type="file"
            accept=".docx"
            class="oculto"
            [disabled]="ocupado()"
            (change)="elegirFichero($event)"
          />
        </label>
      }
      @if (error(); as mensaje) {
        <p class="error" role="alert">{{ mensaje }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="undefined">Cancelar</button>
      @if (plantilla()) {
        <button mat-flat-button type="button" [disabled]="ocupado()" (click)="usar()">
          Usar esta plantilla
        </button>
      }
    </mat-dialog-actions>
  `,
  styleUrl: './dialogos-reparto.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoSubirPlantilla {
  private readonly repartos = inject(RepartosService);
  private readonly dialogRef = inject<MatDialogRef<DialogoSubirPlantilla, Reparto>>(MatDialogRef);
  private readonly reparto = inject<DatosDialogoSubirPlantilla>(MAT_DIALOG_DATA).reparto;

  protected readonly plantilla = signal<PlantillaResguardo | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly arrastrando = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly desconocidas = computed(() => new Set(this.plantilla()?.variablesDesconocidas));

  protected esDesconocida(variable: string): boolean {
    return this.desconocidas().has(variable);
  }

  protected arrastrarEncima(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(true);
  }

  protected soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    const fichero = evento.dataTransfer?.files[0];
    if (fichero) {
      this.subir(fichero);
    }
  }

  protected elegirFichero(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const fichero = entrada.files?.[0];
    entrada.value = '';
    if (fichero) {
      this.subir(fichero);
    }
  }

  protected usar(): void {
    const plantilla = this.plantilla();
    if (!plantilla || this.ocupado()) {
      return;
    }
    this.error.set(null);
    this.ocupado.set(true);
    this.repartos
      .asignarPlantilla(this.reparto.id, plantilla.id)
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (reparto) => this.dialogRef.close(reparto),
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido asignar la plantilla al reparto.')),
      });
  }

  private subir(fichero: File): void {
    this.error.set(null);
    if (!fichero.name.toLowerCase().endsWith('.docx')) {
      this.error.set('La plantilla tiene que ser un documento Word (.docx).');
      return;
    }
    this.ocupado.set(true);
    this.repartos
      .subirPlantilla(fichero)
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (plantilla) => this.plantilla.set(plantilla),
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido subir la plantilla.')),
      });
  }
}
