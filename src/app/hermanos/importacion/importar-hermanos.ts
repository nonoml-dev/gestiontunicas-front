import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { finalize, switchMap, tap } from 'rxjs';

import { mensajeError } from '../../comun/mensaje-error';
import { DecisionFila, Importacion, ImportacionFila } from './importacion.models';
import { ImportacionService } from './importacion.service';

/** Asistente "Importar Excel" de hermanos (DESIGN.md §7.6): subir → revisar → confirmar. */
@Component({
  selector: 'app-importar-hermanos',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatStepperModule,
    MatTableModule,
    MatTabsModule,
  ],
  templateUrl: './importar-hermanos.html',
  styleUrl: './importar-hermanos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportarHermanos {
  private readonly importacionService = inject(ImportacionService);
  private readonly stepper = viewChild.required(MatStepper);

  protected readonly columnasCorrectas = ['fila', 'numero', 'apellidos', 'nombre', 'fecha', 'accion'];
  protected readonly columnasErrores = ['fila', 'contenido', 'motivo'];

  protected readonly importacion = signal<Importacion | null>(null);
  protected readonly filas = signal<ImportacionFila[]>([]);
  protected readonly ocupado = signal(false);
  protected readonly arrastrando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly terminada = signal(false);

  protected readonly correctas = computed(() =>
    this.filas().filter((f) => f.estado === 'OK' || f.estado === 'INCOMPLETA'),
  );
  protected readonly conErrores = computed(() => this.filas().filter((f) => f.estado === 'ERROR'));
  protected readonly duplicados = computed(() => this.filas().filter((f) => f.estado === 'POSIBLE_DUPLICADO'));
  protected readonly sinDecidir = computed(() => this.duplicados().filter((f) => f.decision === null).length);

  /** Cifras del paso "Confirmar". */
  protected readonly resumen = computed(() => {
    const importables = this.filas().filter((f) => f.estado !== 'ERROR');
    const cuenta = (decision: DecisionFila) => importables.filter((f) => f.decision === decision).length;
    return {
      crear: cuenta('CREAR'),
      actualizar: cuenta('ACTUALIZAR'),
      ignorar: cuenta('IGNORAR'),
      errores: this.conErrores().length,
    };
  });

  // Paso 1: subir el fichero

  protected elegirFichero(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const fichero = entrada.files?.[0];
    entrada.value = '';
    if (fichero) {
      this.subir(fichero);
    }
  }

  protected soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    const fichero = evento.dataTransfer?.files?.[0];
    if (fichero) {
      this.subir(fichero);
    }
  }

  protected arrastrarEncima(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(true);
  }

  protected descargarPlantilla(): void {
    this.error.set(null);
    this.importacionService.plantilla().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'plantilla-hermanos.xlsx';
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => this.error.set(mensajeError(err, 'No se ha podido descargar la plantilla.')),
    });
  }

  private subir(fichero: File): void {
    const nombre = fichero.name.toLowerCase();
    if (!nombre.endsWith('.xlsx') && !nombre.endsWith('.xls')) {
      this.error.set('El fichero tiene que ser un Excel (.xlsx o .xls).');
      return;
    }
    this.error.set(null);
    this.ocupado.set(true);
    this.importacionService
      .subir(fichero)
      .pipe(
        tap((importacion) => this.importacion.set(importacion)),
        switchMap((importacion) => this.importacionService.filas(importacion.id)),
        finalize(() => this.ocupado.set(false)),
      )
      .subscribe({
        next: (filas) => {
          this.filas.set(filas);
          // El [completed] del paso 1 aún no se ha refrescado: se marca a mano para poder avanzar.
          const stepper = this.stepper();
          if (stepper.selected) {
            stepper.selected.completed = true;
          }
          stepper.next();
        },
        error: (err: unknown) => this.error.set(mensajeError(err, 'No se ha podido leer el fichero.')),
      });
  }

  // Paso 2: revisar

  protected decidir(fila: ImportacionFila, decision: DecisionFila): void {
    this.error.set(null);
    this.importacionService.decidir(fila.id, decision).subscribe({
      next: (actualizada) => this.filas.update((filas) => filas.map((f) => (f.id === actualizada.id ? actualizada : f))),
      error: (err: unknown) => this.error.set(mensajeError(err, 'No se ha podido guardar la decisión.')),
    });
  }

  protected cancelar(): void {
    const importacion = this.importacion();
    if (!importacion) {
      return;
    }
    this.ocupado.set(true);
    this.importacionService
      .cancelar(importacion.id)
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: () => {
          this.importacion.set(null);
          this.filas.set([]);
          this.error.set(null);
          this.stepper().reset();
        },
        error: (err: unknown) => this.error.set(mensajeError(err, 'No se ha podido cancelar la importación.')),
      });
  }

  // Paso 3: confirmar

  protected importar(): void {
    const importacion = this.importacion();
    if (!importacion) {
      return;
    }
    this.error.set(null);
    this.ocupado.set(true);
    this.importacionService
      .confirmar(importacion.id)
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (confirmada) => {
          this.importacion.set(confirmada);
          this.terminada.set(true);
        },
        error: (err: unknown) => this.error.set(mensajeError(err, 'No se ha podido importar.')),
      });
  }

  /** Lo que ponía la primera columna del Excel, para identificar las filas con errores. */
  protected nombreLeido(fila: ImportacionFila): string {
    return fila.datos.nombreOriginal?.trim() || '(vacío)';
  }
}
