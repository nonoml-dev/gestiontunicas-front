import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { filter, finalize, switchMap } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { AvisosService } from '../../comun/avisos/avisos.service';
import { ConfirmacionService } from '../../comun/confirmacion/confirmacion.service';
import { mensajeError } from '../../comun/mensaje-error';
import { DatosDialogoTunica, DialogoTunica } from '../dialogo/dialogo-tunica';
import {
  ESTADOS_PIEZA,
  ESTADOS_SIN_BAJA,
  PIEZAS,
  Tunica,
  textoEstadoTunica,
} from '../tunica.models';
import { TunicasService } from '../tunicas.service';

/** Orden fijo de las piezas en la ficha. */
const ORDEN_PIEZAS = Object.keys(PIEZAS);

/**
 * Ficha de la túnica (DESIGN.md §7.7): cabecera con su medida, datos y sus 5 piezas.
 * Editar y Dar de baja solo para quien gestiona el inventario (Administrador y Prioste).
 */
@Component({
  selector: 'app-tunica-ficha',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './tunica-ficha.html',
  styleUrl: './tunica-ficha.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TunicaFicha implements OnInit {
  private readonly tunicasService = inject(TunicasService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly avisos = inject(AvisosService);

  /** Parámetro de la ruta /tunicas/:id. */
  readonly id = input.required<string>();

  protected readonly puedeGestionar = inject(AuthService).puede('tunicas', 'G');
  protected readonly piezasInfo = PIEZAS;
  protected readonly estadosPieza = ESTADOS_PIEZA;
  protected readonly textoEstado = textoEstadoTunica;

  protected readonly tunica = signal<Tunica | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly piezas = computed(() =>
    [...(this.tunica()?.piezas ?? [])].sort(
      (a, b) => ORDEN_PIEZAS.indexOf(a.tipo) - ORDEN_PIEZAS.indexOf(b.tipo),
    ),
  );
  /** La que es propiedad de un hermano ya no es de la Hermandad: no se edita. */
  protected readonly puedeEditar = computed(() => this.tunica()?.estado !== 'PROPIEDAD_HERMANO');
  protected readonly puedeDarDeBaja = computed(() => {
    const estado = this.tunica()?.estado;
    return estado !== undefined && !ESTADOS_SIN_BAJA.includes(estado);
  });

  ngOnInit(): void {
    const id = Number(this.id());
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('No existe esa túnica.');
      return;
    }
    this.cargando.set(true);
    this.tunicasService
      .obtener(id)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (tunica) => this.tunica.set(tunica),
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido cargar la túnica.')),
      });
  }

  protected editar(): void {
    const tunica = this.tunica();
    if (!tunica) {
      return;
    }
    this.dialog
      .open<DialogoTunica, DatosDialogoTunica, Tunica>(DialogoTunica, {
        data: { tunica },
        width: '520px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .pipe(filter((guardada): guardada is Tunica => guardada !== undefined))
      .subscribe((guardada) => {
        this.tunica.set(guardada);
        this.avisos.exito(`Túnica ${guardada.codigo} guardada`);
      });
  }

  protected darDeBaja(): void {
    const tunica = this.tunica();
    if (!tunica) {
      return;
    }
    this.error.set(null);
    this.confirmacion
      .confirmar({
        titulo: 'Dar de baja',
        destacado: `Túnica ${tunica.codigo}`,
        mensaje:
          'dejará de estar disponible para el reparto con fecha de hoy. Se conserva con su historial.',
        textoConfirmar: 'Dar de baja',
        destructiva: true,
        pedirMotivo: true,
      })
      .pipe(switchMap(({ motivo }) => this.tunicasService.darDeBaja(tunica.id, motivo ?? '')))
      .subscribe({
        next: (actualizada) => {
          this.tunica.set(actualizada);
          this.avisos.exito(`Túnica ${actualizada.codigo} dada de baja`);
        },
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido dar de baja la túnica.')),
      });
  }
}
