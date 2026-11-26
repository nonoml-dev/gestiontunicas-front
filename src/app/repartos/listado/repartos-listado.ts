import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { mensajeError } from '../../comun/mensaje-error';
import { ESTADOS_REPARTO, Reparto, formatoEuros, formatoFecha } from '../reparto.models';
import { RepartosService } from '../repartos.service';

/** Listado de repartos (DESIGN.md §7.8): una tarjeta por año con su estado y sus datos principales. */
@Component({
  selector: 'app-repartos-listado',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  templateUrl: './repartos-listado.html',
  styleUrl: './repartos-listado.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepartosListado implements OnInit {
  private readonly repartosService = inject(RepartosService);

  protected readonly puedeCrear = inject(AuthService).puede('repartos', 'G');
  protected readonly estados = ESTADOS_REPARTO;
  protected readonly formatoFecha = formatoFecha;
  protected readonly formatoEuros = formatoEuros;

  protected readonly repartos = signal<Reparto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.repartosService
      .listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (repartos) => this.repartos.set(repartos),
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se han podido cargar los repartos.')),
      });
  }

  /** Del primer al último día ordinario. */
  protected dias(reparto: Reparto): string {
    const ordinarias = reparto.jornadas
      .filter((j) => !j.extraordinaria)
      .map((j) => j.fecha)
      .sort();
    if (!ordinarias.length) {
      return '';
    }
    return `${formatoFecha(ordinarias[0])} al ${formatoFecha(ordinarias[ordinarias.length - 1])}`;
  }

  protected extraordinarias(reparto: Reparto): number {
    return reparto.jornadas.filter((j) => j.extraordinaria).length;
  }
}
