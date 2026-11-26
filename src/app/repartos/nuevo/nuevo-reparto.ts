import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepperIntl, MatStepperModule } from '@angular/material/stepper';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, map, startWith } from 'rxjs';

import { AvisosService } from '../../comun/avisos/avisos.service';
import {
  aFechaIso,
  aHora,
  deFechaIso,
  esAnterior,
  minutosDelDia,
} from '../../comun/fechas-material';
import { CALENDARIO_ESPANOL } from '../../comun/calendario-espanol';
import { mensajeError } from '../../comun/mensaje-error';
import { hoy } from '../../tunicas/fechas';
import {
  OPERACIONES_POR_DIA,
  Reparto,
  RepartoRequest,
  SANCIONES,
  TarifaSanciones,
  calcularJuevesSanto,
  formatoEuros,
  formatoFecha,
} from '../reparto.models';
import {
  ImportarHermanos,
  ResumenImportacionHermanos,
} from '../../hermanos/importacion/importar-hermanos';
import { RepartosService } from '../repartos.service';

/** Límites del servidor (RepartoRequest, JornadaRequest y PeriodoDevolucionRequest). */
const ANIO_MINIMO = 2026;
const ANIO_MAXIMO = 2100;
const EDAD_MINIMA = 1;
const EDAD_MAXIMA = 25;
const TOLERANCIA_MAXIMA = 30;
const PLAZO_GRACIA_MAXIMO = 12;
const IMPORTE_MAXIMO = 999999.99;
const LONGITUD_LUGAR = 255;

/** Valores por defecto si la configuración no tiene otros. */
const EDADES_POR_DEFECTO = { min: 10, max: 15 };
const TOLERANCIA_POR_DEFECTO = 3;
const PLAZO_GRACIA_POR_DEFECTO = 2;
const CLAVE_TOLERANCIA = 'reparto.tolerancia_medida_cm';

/** Como mucho 2 decimales. */
const dosDecimales: ValidatorFn = (control) => {
  const valor = control.value;
  if (valor === null || valor === '') {
    return null;
  }
  return /^-?\d+(\.\d{1,2})?$/.test(String(valor)) ? null : { decimales: true };
};

/** Si se fija a mano, el Jueves Santo tiene que caer en el año del reparto. */
const juevesSantoDelAnio: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const { anio, juevesSantoManual, fechaJuevesSanto } = grupo.getRawValue() as {
    anio: number | null;
    juevesSantoManual: boolean;
    fechaJuevesSanto: Date | null;
  };
  return juevesSantoManual &&
    anio &&
    fechaJuevesSanto &&
    !isNaN(fechaJuevesSanto.getTime()) &&
    fechaJuevesSanto.getFullYear() !== anio
    ? { juevesSantoOtroAnio: true }
    : null;
};

const importe = () =>
  new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(0),
    Validators.max(IMPORTE_MAXIMO),
    dosDecimales,
  ]);

/** El número de {@code mayor} no puede quedar por debajo del de {@code menor}. */
function noMenorQue(menor: string, mayor: string, error: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const a = grupo.get(menor)?.value;
    const b = grupo.get(mayor)?.value;
    return a !== null && a !== '' && b !== null && b !== '' && b < a ? { [error]: true } : null;
  };
}

/** La fecha de {@code fin} no puede ser anterior a la de {@code inicio}. */
function fechaNoAnterior(inicio: string, fin: string, error: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null =>
    esAnterior(grupo.get(fin)?.value, grupo.get(inicio)?.value) ? { [error]: true } : null;
}

/** La hora de fin no puede ser anterior a la de inicio (solo cuenta la hora, no el día). */
const horarioCoherente: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const inicio = minutosDelDia(grupo.get('horaInicio')?.value);
  const fin = minutosDelDia(grupo.get('horaFin')?.value);
  return inicio !== null && fin !== null && fin < inicio ? { horario: true } : null;
};

/** Cada jornada, en un día posterior a la anterior. */
const fechasEnOrden: ValidatorFn = (jornadas: AbstractControl): ValidationErrors | null => {
  const fechas = (jornadas as FormArray).controls.map((j) => j.get('fecha')?.value as Date | null);
  return fechas.every(
    (fecha, i) => i === 0 || (!esAnterior(fecha, fechas[i - 1]) && !mismoDia(fecha, fechas[i - 1])),
  )
    ? null
    : { desordenadas: true };
};

function mismoDia(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && aFechaIso(a) !== null && aFechaIso(a) === aFechaIso(b);
}

/** Textos del stepper en español ("Opcional" bajo el paso del censo). */
function pasosEnEspanol(): MatStepperIntl {
  const textos = new MatStepperIntl();
  textos.optionalLabel = 'Opcional';
  textos.completedLabel = 'Completado';
  textos.editableLabel = 'Editable';
  return textos;
}

/**
 * Asistente "Nuevo reparto" (DESIGN.md §7.8): crea el reparto en borrador. El censo (REP-07) y la
 * plantilla del resguardo se añaden después, antes de abrirlo.
 */
@Component({
  selector: 'app-nuevo-reparto',
  imports: [
    ImportarHermanos,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatStepperModule,
    MatTimepickerModule,
  ],
  templateUrl: './nuevo-reparto.html',
  styleUrl: './nuevo-reparto.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CALENDARIO_ESPANOL, { provide: MatStepperIntl, useFactory: pasosEnEspanol }],
})
export class NuevoReparto implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly repartos = inject(RepartosService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);

  protected readonly sanciones = SANCIONES;
  protected readonly limites = {
    anioMinimo: ANIO_MINIMO,
    anioMaximo: ANIO_MAXIMO,
    edadMinima: EDAD_MINIMA,
    edadMaxima: EDAD_MAXIMA,
    toleranciaMaxima: TOLERANCIA_MAXIMA,
    plazoGraciaMaximo: PLAZO_GRACIA_MAXIMO,
    longitudLugar: LONGITUD_LUGAR,
  };
  protected readonly formatoFecha = formatoFecha;
  protected readonly formatoEuros = formatoEuros;

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Años que ya tienen reparto. */
  private readonly aniosExistentes = signal<number[]>([]);

  protected readonly general = this.fb.group(
    {
      anio: this.fb.control<number | null>(null, [
        Validators.required,
        Validators.min(ANIO_MINIMO),
        Validators.max(ANIO_MAXIMO),
        Validators.pattern(/^\d+$/),
        (control: AbstractControl) =>
          this.aniosExistentes().includes(control.value) ? { repetido: true } : null,
      ]),
      juevesSantoManual: false,
      fechaJuevesSanto: this.fb.control<Date | null>(null),
      modoTransicion: false,
    },
    { validators: juevesSantoDelAnio },
  );

  protected readonly jornadas = this.fb.array(
    OPERACIONES_POR_DIA.map((operaciones) =>
      this.fb.group(
        {
          fecha: this.fb.control<Date | null>(null, Validators.required),
          horaInicio: this.fb.control<Date | null>(null),
          horaFin: this.fb.control<Date | null>(null),
          ...operaciones,
        },
        { validators: horarioCoherente },
      ),
    ),
    { validators: fechasEnOrden },
  );

  protected readonly edades = this.fb.group(
    {
      edadMin: this.fb.control<number | null>(EDADES_POR_DEFECTO.min, [
        Validators.required,
        Validators.min(EDAD_MINIMA),
        Validators.max(EDAD_MAXIMA),
        Validators.pattern(/^\d+$/),
      ]),
      edadMax: this.fb.control<number | null>(EDADES_POR_DEFECTO.max, [
        Validators.required,
        Validators.min(EDAD_MINIMA),
        Validators.max(EDAD_MAXIMA),
        Validators.pattern(/^\d+$/),
      ]),
      toleranciaMedidaCm: this.fb.control<number | null>(TOLERANCIA_POR_DEFECTO, [
        Validators.required,
        Validators.min(0),
        Validators.max(TOLERANCIA_MAXIMA),
        Validators.pattern(/^\d+$/),
      ]),
    },
    { validators: noMenorQue('edadMin', 'edadMax', 'edades') },
  );

  protected readonly importes = new FormGroup({
    limosna: importe(),
    importePiezaPrincipal: importe(),
    importeTalega: importe(),
    importeRetraso: importe(),
    importeCingulo: importe(),
    importeSuciedad: importe(),
    importeCargoTotal: importe(),
  });

  protected readonly devolucion = this.fb.group(
    {
      inicio: this.fb.control<Date | null>(null, Validators.required),
      fin: this.fb.control<Date | null>(null, Validators.required),
      plazoGraciaMeses: this.fb.control<number | null>(PLAZO_GRACIA_POR_DEFECTO, [
        Validators.required,
        Validators.min(0),
        Validators.max(PLAZO_GRACIA_MAXIMO),
        Validators.pattern(/^\d+$/),
      ]),
      lugarDevolucion: ['', Validators.maxLength(LONGITUD_LUGAR)],
    },
    { validators: fechaNoAnterior('inicio', 'fin', 'periodo') },
  );

  private readonly valorGeneral = toSignal(
    this.general.valueChanges.pipe(
      startWith(null),
      map(() => this.general.getRawValue()),
    ),
    { requireSync: true },
  );

  /** Jueves Santo calculado para el año escrito, o nulo si el año no es válido. */
  protected readonly juevesSantoCalculado = computed(() => {
    const anio = this.valorGeneral().anio;
    return anio && anio >= ANIO_MINIMO && anio <= ANIO_MAXIMO ? calcularJuevesSanto(anio) : null;
  });

  /** Lo que se enviará, para el resumen. */
  protected readonly resumen = signal<RepartoRequest | null>(null);
  /** Índice del paso del resumen, el último. */
  protected readonly pasoResumen = 6;
  /** Cifras del censo si se ha cargado en el paso 3. */
  protected readonly censo = signal<ResumenImportacionHermanos | null>(null);

  constructor() {
    // Al fijar la fecha a mano se propone la calculada; al quitarlo, deja de ser obligatoria.
    this.general.controls.juevesSantoManual.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((manual) => {
        const fecha = this.general.controls.fechaJuevesSanto;
        fecha.setValidators(manual ? Validators.required : null);
        if (manual && !fecha.value) {
          fecha.setValue(deFechaIso(this.juevesSantoCalculado()));
        }
        fecha.updateValueAndValidity();
      });
    // Sin reparto el año anterior no hay histórico del que renovar: se propone el modo transición.
    this.general.controls.anio.valueChanges.pipe(takeUntilDestroyed()).subscribe((anio) => {
      if (anio !== null) {
        this.general.controls.modoTransicion.setValue(!this.aniosExistentes().includes(anio - 1));
      }
    });
  }

  ngOnInit(): void {
    forkJoin({
      repartos: this.repartos.listar(),
      configuracion: this.repartos.configuracionPorDefecto(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ repartos, configuracion }) => {
          this.aniosExistentes.set(repartos.map((r) => r.anio));
          const tolerancia = Number(configuracion.find((p) => p.clave === CLAVE_TOLERANCIA)?.valor);
          if (Number.isInteger(tolerancia)) {
            this.edades.controls.toleranciaMedidaCm.setValue(tolerancia);
          }
          this.general.controls.anio.setValue(this.anioPropuesto(repartos));
        },
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se han podido cargar los datos para el reparto.')),
      });
  }

  /** Paso del resumen: se prepara la petición con los datos de todos los pasos. */
  protected prepararResumen(): void {
    this.resumen.set(this.peticion());
  }

  protected crear(): void {
    const request = this.resumen();
    this.error.set(null);
    if (!request || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.repartos
      .crear(request)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (reparto: Reparto) => {
          this.avisos.exito(`Reparto ${reparto.anio} creado en borrador`);
          this.router.navigate(['/repartos', reparto.id]);
        },
        error: (err: unknown) =>
          this.error.set(mensajeError(err, 'No se ha podido crear el reparto.')),
      });
  }

  protected operaciones(i: number): string {
    const jornada = this.resumen()?.jornadas[i];
    if (!jornada) {
      return '';
    }
    const lista = [
      jornada.permiteRenovacion && 'renovaciones',
      jornada.permiteNuevaAlta && 'nuevas altas',
      jornada.permiteCambio && 'cambios',
    ].filter(Boolean);
    return lista.length ? lista.join(', ') : 'ninguna operación';
  }

  protected importeDe(campo: keyof TarifaSanciones): string {
    return formatoEuros(this.resumen()?.tarifas[campo]);
  }

  /**
   * El primer año sin reparto a partir del actual. Si ya ha pasado el Jueves Santo de este año, a partir
   * del siguiente.
   */
  private anioPropuesto(repartos: Reparto[]): number {
    const fechaHoy = hoy();
    let anio = Number(fechaHoy.slice(0, 4));
    if (fechaHoy > calcularJuevesSanto(anio)) {
      anio++;
    }
    const existentes = new Set(repartos.map((r) => r.anio));
    while (existentes.has(anio)) {
      anio++;
    }
    return Math.max(anio, ANIO_MINIMO);
  }

  private peticion(): RepartoRequest {
    const general = this.general.getRawValue();
    const edades = this.edades.getRawValue();
    const importes = this.importes.getRawValue();
    const devolucion = this.devolucion.getRawValue();
    const lugar = devolucion.lugarDevolucion.trim();
    return {
      anio: general.anio!,
      fechaJuevesSanto: general.juevesSantoManual ? aFechaIso(general.fechaJuevesSanto) : null,
      edadMin: edades.edadMin!,
      edadMax: edades.edadMax!,
      periodoDevolucion: {
        inicio: aFechaIso(devolucion.inicio)!,
        fin: aFechaIso(devolucion.fin)!,
        plazoGraciaMeses: devolucion.plazoGraciaMeses!,
      },
      lugarDevolucion: lugar || null,
      limosna: importes.limosna!,
      tarifas: {
        importePiezaPrincipal: importes.importePiezaPrincipal!,
        importeTalega: importes.importeTalega!,
        importeRetraso: importes.importeRetraso!,
        importeCingulo: importes.importeCingulo!,
        importeSuciedad: importes.importeSuciedad!,
        importeCargoTotal: importes.importeCargoTotal!,
      },
      toleranciaMedidaCm: edades.toleranciaMedidaCm!,
      modoTransicion: general.modoTransicion,
      jornadas: this.jornadas.getRawValue().map((j) => ({
        fecha: aFechaIso(j.fecha)!,
        horaInicio: aHora(j.horaInicio),
        horaFin: aHora(j.horaFin),
        limosna: null,
        permiteRenovacion: j.permiteRenovacion,
        permiteNuevaAlta: j.permiteNuevaAlta,
        permiteCambio: j.permiteCambio,
      })),
    };
  }
}
