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
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { Observable, filter, finalize, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { AvisosService } from '../../comun/avisos/avisos.service';
import { ConfirmacionService } from '../../comun/confirmacion/confirmacion.service';
import { guardarFichero } from '../../comun/importacion/importacion-api';
import { mensajeError } from '../../comun/mensaje-error';
import {
  DatosDialogoJornada,
  DialogoJornadaExtraordinaria,
} from '../dialogos/dialogo-jornada-extraordinaria';
import {
  DatosDialogoPeriodo,
  DialogoPeriodoDevolucion,
} from '../dialogos/dialogo-periodo-devolucion';
import {
  DatosDialogoSubirPlantilla,
  DialogoSubirPlantilla,
} from '../dialogos/dialogo-subir-plantilla';
import {
  CambioPeriodoDevolucion,
  ESTADOS_REPARTO,
  Jornada,
  PlantillaResguardo,
  Reparto,
  SANCIONES,
  formatoEuros,
  formatoFecha,
} from '../reparto.models';
import { RepartosService } from '../repartos.service';

/**
 * Detalle del reparto (DESIGN.md §7.8): datos, configuración, plantilla del resguardo y cambios del
 * periodo de devolución. Abrir, cerrar y cambiar el periodo solo para Administrador y Prioste.
 */
@Component({
  selector: 'app-reparto-detalle',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  templateUrl: './reparto-detalle.html',
  styleUrl: './reparto-detalle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepartoDetalle implements OnInit {
  private readonly repartosService = inject(RepartosService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly avisos = inject(AvisosService);
  private readonly auth = inject(AuthService);

  /** Parámetro de la ruta /repartos/:id. */
  readonly id = input.required<string>();

  protected readonly puedeGestionar = this.auth.puede('repartos', 'G');
  protected readonly puedeCambiarPeriodo = this.auth.puede('periodoDevolucion', 'G');
  protected readonly gestionaPlantilla = this.auth.puede('plantillaResguardo', 'G');
  protected readonly puedeAnadirJornada = this.auth.puede('jornadasExtraordinarias', 'G');
  protected readonly estados = ESTADOS_REPARTO;
  protected readonly sanciones = SANCIONES;
  protected readonly formatoFecha = formatoFecha;
  protected readonly formatoEuros = formatoEuros;

  protected readonly reparto = signal<Reparto | null>(null);
  protected readonly cambios = signal<CambioPeriodoDevolucion[]>([]);
  protected readonly plantillas = signal<PlantillaResguardo[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly jornadas = computed(() =>
    [...(this.reparto()?.jornadas ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha)),
  );
  protected readonly plantillaVigente = computed(() => {
    const id = this.reparto()?.plantillaResguardoId;
    return this.plantillas().find((p) => p.id === id) ?? null;
  });
  /** Las demás plantillas subidas, por si se quiere volver a usar la de otro año. */
  protected readonly otrasPlantillas = computed(() => {
    const id = this.reparto()?.plantillaResguardoId;
    return this.plantillas().filter((p) => p.id !== id);
  });
  protected readonly puedeAbrir = computed(() => this.reparto()?.estado === 'BORRADOR');
  protected readonly puedeCerrar = computed(() => this.reparto()?.estado === 'ABIERTO');
  /** Las jornadas extraordinarias se añaden mientras el reparto no está cerrado. */
  protected readonly admiteJornadas = computed(() => {
    const estado = this.reparto()?.estado;
    return estado === 'BORRADOR' || estado === 'ABIERTO';
  });
  /** El periodo ya no se cambia cuando se ha cerrado el plazo de gracia. */
  protected readonly periodoEditable = computed(() => {
    const reparto = this.reparto();
    return !!reparto && !reparto.finGraciaProcesadoEn;
  });
  protected readonly hayAcciones = computed(
    () =>
      (this.puedeGestionar && (this.puedeAbrir() || this.puedeCerrar())) ||
      (this.puedeCambiarPeriodo && this.periodoEditable()) ||
      (this.puedeAnadirJornada && this.admiteJornadas()),
  );

  ngOnInit(): void {
    const id = Number(this.id());
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('No existe ese reparto.');
      return;
    }
    this.cargar(id);
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    const plantillas: Observable<PlantillaResguardo[]> = this.gestionaPlantilla
      ? this.repartosService.plantillas()
      : of([]);
    forkJoin([
      this.repartosService.obtener(id),
      this.repartosService.cambiosPeriodoDevolucion(id),
      plantillas,
    ])
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ([reparto, cambios, lista]) => {
          this.reparto.set(reparto);
          this.cambios.set(cambios);
          this.plantillas.set(lista);
        },
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido cargar el reparto.')),
      });
  }

  protected operaciones(jornada: Jornada): string {
    const lista = [
      jornada.permiteRenovacion && 'Renovación',
      jornada.permiteNuevaAlta && 'Nueva alta',
      jornada.permiteCambio && 'Cambio',
    ].filter(Boolean);
    return lista.length ? lista.join(' · ') : 'Ninguna operación';
  }

  protected horario(jornada: Jornada): string {
    if (!jornada.horaInicio && !jornada.horaFin) {
      return '';
    }
    const hora = (h: string | null) => (h ? h.slice(0, 5) : '…');
    return `${hora(jornada.horaInicio)}–${hora(jornada.horaFin)}`;
  }

  protected abrir(): void {
    const reparto = this.reparto();
    if (!reparto) {
      return;
    }
    this.error.set(null);
    if (!reparto.plantillaResguardoId) {
      this.error.set('Sube la plantilla del resguardo antes de abrir el reparto.');
      return;
    }
    this.confirmacion
      .confirmar({
        titulo: 'Abrir reparto',
        destacado: `Reparto ${reparto.anio}:`,
        mensaje: reparto.modoTransicion
          ? 'empieza el reparto. En modo transición no se reserva ninguna túnica: la renovación se registra con el resguardo en papel.'
          : 'empieza el reparto y se reserva su túnica a cada hermano que renueva (la devolvió en plazo el año pasado).',
        textoConfirmar: 'Abrir reparto',
      })
      .pipe(
        switchMap(() => this.repartosService.abrir(reparto.id)),
        switchMap((abierto) =>
          forkJoin([
            of(abierto),
            abierto.modoTransicion ? of([]) : this.repartosService.reservas(abierto.id),
          ]),
        ),
      )
      .subscribe({
        next: ([abierto, reservas]) => {
          this.reparto.set(abierto);
          this.avisos.exito(
            abierto.modoTransicion
              ? `Reparto ${abierto.anio} abierto`
              : `Reparto ${abierto.anio} abierto: ${reservas.length === 1 ? '1 túnica reservada' : reservas.length + ' túnicas reservadas'}`,
          );
        },
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido abrir el reparto.')),
      });
  }

  protected cerrar(): void {
    const reparto = this.reparto();
    if (!reparto) {
      return;
    }
    this.error.set(null);
    this.confirmacion
      .confirmar({
        titulo: 'Cerrar reparto',
        destacado: `Reparto ${reparto.anio}:`,
        mensaje:
          'termina el reparto. No se podrán entregar más túnicas y se liberan las reservas que no se hayan recogido. No se puede deshacer.',
        textoConfirmar: 'Cerrar reparto',
        destructiva: true,
      })
      .pipe(switchMap(() => this.repartosService.cerrar(reparto.id)))
      .subscribe({
        next: (cerrado) => {
          this.reparto.set(cerrado);
          this.avisos.exito(`Reparto ${cerrado.anio} cerrado`);
        },
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido cerrar el reparto.')),
      });
  }

  protected anadirJornada(): void {
    const reparto = this.reparto();
    if (!reparto) {
      return;
    }
    this.dialog
      .open<DialogoJornadaExtraordinaria, DatosDialogoJornada, Reparto>(
        DialogoJornadaExtraordinaria,
        { data: { reparto }, width: '480px', maxWidth: '95vw' },
      )
      .afterClosed()
      .pipe(filter((actualizado): actualizado is Reparto => actualizado !== undefined))
      .subscribe((actualizado) => {
        this.reparto.set(actualizado);
        this.avisos.exito('Jornada extraordinaria añadida');
      });
  }

  protected cambiarPeriodo(): void {
    const reparto = this.reparto();
    if (!reparto) {
      return;
    }
    this.dialog
      .open<DialogoPeriodoDevolucion, DatosDialogoPeriodo, Reparto>(DialogoPeriodoDevolucion, {
        data: { reparto },
        width: '480px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .pipe(filter((actualizado): actualizado is Reparto => actualizado !== undefined))
      .subscribe((actualizado) => {
        this.avisos.exito('Periodo de devolución cambiado');
        this.reparto.set(actualizado);
        this.repartosService.cambiosPeriodoDevolucion(actualizado.id).subscribe({
          next: (cambios) => this.cambios.set(cambios),
          error: (err: unknown) =>
            this.error.set(mensajeError(err, 'No se ha podido cargar el historial de cambios.')),
        });
      });
  }

  protected subirPlantilla(): void {
    const reparto = this.reparto();
    if (!reparto) {
      return;
    }
    this.dialog
      .open<DialogoSubirPlantilla, DatosDialogoSubirPlantilla, Reparto>(DialogoSubirPlantilla, {
        data: { reparto },
        width: '640px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .pipe(filter((actualizado): actualizado is Reparto => actualizado !== undefined))
      .subscribe((actualizado) => {
        this.avisos.exito('Plantilla del resguardo asignada');
        this.cargar(actualizado.id);
      });
  }

  protected usarPlantilla(plantilla: PlantillaResguardo): void {
    const reparto = this.reparto();
    if (!reparto) {
      return;
    }
    this.error.set(null);
    this.repartosService.asignarPlantilla(reparto.id, plantilla.id).subscribe({
      next: (actualizado) => {
        this.reparto.set(actualizado);
        this.avisos.exito(`Plantilla «${plantilla.nombre}» asignada`);
      },
      error: (err: unknown) =>
        this.error.set(mensajeError(err, 'No se ha podido asignar la plantilla.')),
    });
  }

  protected descargar(plantilla: PlantillaResguardo): void {
    this.error.set(null);
    this.repartosService.descargarPlantilla(plantilla.id).subscribe({
      next: (fichero) => guardarFichero(fichero, plantilla.nombreFichero),
      error: (err: unknown) =>
        this.error.set(mensajeError(err, 'No se ha podido descargar la plantilla.')),
    });
  }
}
