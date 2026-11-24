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
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { filter, finalize, forkJoin, switchMap } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { AvisosService } from '../../comun/avisos/avisos.service';
import { ConfirmacionService } from '../../comun/confirmacion/confirmacion.service';
import { mensajeError } from '../../comun/mensaje-error';
import { DatosDialogoReparacion, DialogoReparacion } from '../dialogo/dialogo-reparacion';
import { DatosDialogoTunica, DialogoTunica } from '../dialogo/dialogo-tunica';
import { hoy } from '../fechas';
import {
  ESTADOS_PIEZA,
  ESTADOS_REPARACION,
  ESTADOS_SIN_BAJA,
  EstadoReparacion,
  PIEZAS,
  Reparacion,
  TIPOS_REPARACION,
  Tunica,
  textoEstadoTunica,
} from '../tunica.models';
import { TunicasService } from '../tunicas.service';

/** Orden fijo de las piezas en la ficha. */
const ORDEN_PIEZAS = Object.keys(PIEZAS);

/**
 * Ficha de la túnica (DESIGN.md §7.7): cabecera con su medida, datos y las pestañas Piezas y Reparaciones.
 * Editar, Registrar reparación y Dar de baja solo para quien gestiona el inventario (Administrador y Prioste).
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
    MatTabsModule,
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
  protected readonly tiposReparacion = TIPOS_REPARACION;
  protected readonly estadosReparacion = ESTADOS_REPARACION;

  protected readonly tunica = signal<Tunica | null>(null);
  protected readonly reparaciones = signal<Reparacion[]>([]);
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
  /** Las dadas de baja o que son de un hermano no se reparan. */
  protected readonly puedeReparar = computed(() => {
    const estado = this.tunica()?.estado;
    return estado !== undefined && estado !== 'BAJA' && estado !== 'PROPIEDAD_HERMANO';
  });
  protected readonly reparacionesAbiertas = computed(
    () => this.reparaciones().filter((r) => r.estado !== 'FINALIZADA').length,
  );

  ngOnInit(): void {
    const id = Number(this.id());
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('No existe esa túnica.');
      return;
    }
    this.cargar(id);
  }

  /** La túnica y sus reparaciones. Se recarga tras cada reparación, porque cambia el estado de sus piezas. */
  private cargar(id: number): void {
    this.cargando.set(true);
    forkJoin([this.tunicasService.obtener(id), this.tunicasService.reparaciones(id)])
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ([tunica, reparaciones]) => {
          this.tunica.set(tunica);
          this.reparaciones.set(reparaciones);
        },
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido cargar la túnica.')),
      });
  }

  protected registrarReparacion(): void {
    const tunica = this.tunica();
    if (!tunica) {
      return;
    }
    this.dialog
      .open<DialogoReparacion, DatosDialogoReparacion, Reparacion>(DialogoReparacion, {
        data: { tunica },
        width: '520px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .pipe(filter((registrada): registrada is Reparacion => registrada !== undefined))
      .subscribe((registrada) => {
        this.avisos.exito(
          `${TIPOS_REPARACION[registrada.tipo]} de ${PIEZAS[registrada.tipoPieza].texto.toLowerCase()} registrada`,
        );
        this.cargar(tunica.id);
      });
  }

  /** En curso, o terminada con fecha de hoy. El resto de datos se envía tal cual estaba. */
  protected cambiarEstado(reparacion: Reparacion, estado: EstadoReparacion): void {
    const tunica = this.tunica();
    if (!tunica) {
      return;
    }
    this.error.set(null);
    this.tunicasService
      .actualizarReparacion(tunica.id, reparacion.id, {
        tipoPieza: reparacion.tipoPieza,
        tipo: reparacion.tipo,
        descripcion: reparacion.descripcion,
        estado,
        fechaInicio: reparacion.fechaInicio,
        fechaFin: estado === 'FINALIZADA' ? hoy() : null,
        coste: reparacion.coste,
      })
      .subscribe({
        next: () => {
          if (estado === 'FINALIZADA') {
            this.avisos.exito(
              `${PIEZAS[reparacion.tipoPieza].texto}: ${TIPOS_REPARACION[reparacion.tipo].toLowerCase()} terminada`,
            );
          }
          this.cargar(tunica.id);
        },
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido actualizar la reparación.')),
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
