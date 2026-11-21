import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  QueryList,
  ViewChild,
  ViewEncapsulation,
  input,
  output,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatColumnDef, MatTable, MatTableModule } from '@angular/material/table';

import { PaginadorEs } from '../paginador-es';

/**
 * Tabla con paginación en servidor, barra de carga y mensajes de vacío y error.
 * Las columnas se declaran dentro con matColumnDef. Para ordenar, se pone matSort en app-tabla-paginada:
 *
 * <app-tabla-paginada matSort (matSortChange)="..." [filas]="filas()" [columnas]="columnas" ...>
 *   <ng-container matColumnDef="codigo">
 *     <th mat-header-cell *matHeaderCellDef mat-sort-header>Código</th>
 *     <td mat-cell *matCellDef="let fila">{{ fila.codigo }}</td>
 *   </ng-container>
 * </app-tabla-paginada>
 */
@Component({
  selector: 'app-tabla-paginada',
  imports: [MatCardModule, MatPaginatorModule, MatProgressBarModule, MatTableModule],
  providers: [{ provide: MatPaginatorIntl, useClass: PaginadorEs }],
  templateUrl: './tabla-paginada.html',
  styleUrl: './tabla-paginada.css',
  // Sin encapsular: las celdas se declaran en la pantalla que usa la tabla.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablaPaginada<T> implements AfterContentInit {
  readonly filas = input.required<readonly T[]>();
  readonly columnas = input.required<readonly string[]>();
  readonly total = input.required<number>();
  readonly pagina = input.required<number>();
  readonly tamano = input.required<number>();
  readonly tamanos = input<readonly number[]>([10, 25, 50]);
  readonly cargando = input(false);
  readonly error = input<string | null>(null);
  readonly mensajeVacio = input('No hay datos.');
  /** Si las filas se pueden pulsar o abrir con Enter. */
  readonly clicable = input(true);

  readonly filaPulsada = output<T>();
  readonly paginaCambiada = output<PageEvent>();

  @ViewChild(MatTable, { static: true }) private readonly tabla!: MatTable<T>;
  @ContentChildren(MatColumnDef) private readonly columnasDeclaradas!: QueryList<MatColumnDef>;

  ngAfterContentInit(): void {
    this.columnasDeclaradas.forEach((columna) => this.tabla.addColumnDef(columna));
  }

  protected pulsar(fila: T): void {
    if (this.clicable()) {
      this.filaPulsada.emit(fila);
    }
  }
}
