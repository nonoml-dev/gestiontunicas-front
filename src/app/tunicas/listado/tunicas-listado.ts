import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, distinctUntilChanged, filter, of, switchMap, tap } from 'rxjs';

import { mensajeError } from '../../comun/mensaje-error';
import { TablaPaginada } from '../../comun/tabla-paginada/tabla-paginada';
import {
  ESTADOS_TUNICA,
  EstadoTunica,
  FiltroTunicas,
  OrdenTunicas,
  TunicaResumen,
  textoEstadoTunica,
} from '../tunica.models';
import { TunicasService } from '../tunicas.service';

interface Consulta extends FiltroTunicas {
  pagina: number;
  tamano: number;
  orden: OrdenTunicas;
  direccion: 'asc' | 'desc';
}

interface Rango {
  min: number | null;
  max: number | null;
}

/** Medidas admitidas en una túnica (TunicaRequest): sirven de límite al filtro. */
const MEDIDA_MINIMA = 60;
const MEDIDA_MAXIMA = 250;

/** Inventario de túnicas (DESIGN.md §7.7): filtros por estado y por medida total. */
@Component({
  selector: 'app-tunicas-listado',
  imports: [
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSortModule,
    MatTableModule,
    TablaPaginada,
  ],
  templateUrl: './tunicas-listado.html',
  styleUrl: './tunicas-listado.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TunicasListado {
  private readonly tunicasService = inject(TunicasService);

  protected readonly columnas = ['codigo', 'medidaCm', 'dobladilloCm', 'medidaTotal', 'estado'];
  protected readonly estados = ESTADOS_TUNICA;
  protected readonly textoEstado = textoEstadoTunica;
  protected readonly medidaMinima = MEDIDA_MINIMA;
  protected readonly medidaMaxima = MEDIDA_MAXIMA;

  /** Medidas tal cual se escriben; el filtro espera a que se deje de teclear. */
  protected readonly medidaDesde = signal('');
  protected readonly medidaHasta = signal('');
  private readonly rango = computed<Rango>(() => ({
    min: aNumero(this.medidaDesde()),
    max: aNumero(this.medidaHasta()),
  }));
  protected readonly rangoNoValido = computed(() => {
    const { min, max } = this.rango();
    return min !== null && max !== null && min > max;
  });

  private readonly consulta = signal<Consulta>({
    estados: [],
    medidaMin: null,
    medidaMax: null,
    pagina: 0,
    tamano: 25,
    orden: 'codigo',
    direccion: 'asc',
  });

  protected readonly tunicas = signal<TunicaResumen[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = computed(() => this.consulta().pagina);
  protected readonly tamano = computed(() => this.consulta().tamano);
  protected readonly estadosElegidos = computed(() => this.consulta().estados);
  protected readonly mensajeVacio = computed(() => {
    const c = this.consulta();
    if (c.medidaMin !== null || c.medidaMax !== null) {
      return 'No hay túnicas con esa medida.';
    }
    return c.estados.length
      ? 'No hay túnicas en ese estado.'
      : 'Todavía no hay túnicas en el inventario.';
  });

  constructor() {
    toObservable(this.rango)
      .pipe(
        debounceTime(400),
        filter(({ min, max }) => min === null || max === null || min <= max),
        distinctUntilChanged((a, b) => a.min === b.min && a.max === b.max),
        filter(
          ({ min, max }) => min !== this.consulta().medidaMin || max !== this.consulta().medidaMax,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ min, max }) =>
        this.consulta.update((c) => ({ ...c, medidaMin: min, medidaMax: max, pagina: 0 })),
      );

    toObservable(this.consulta)
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap((c) =>
          this.tunicasService.buscar(c, c.pagina, c.tamano, c.orden, c.direccion).pipe(
            catchError((err: unknown) => {
              this.error.set(mensajeError(err, 'No se ha podido cargar el inventario de túnicas.'));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        this.cargando.set(false);
        this.tunicas.set(resultado?.content ?? []);
        this.total.set(resultado?.page.totalElements ?? 0);
      });
  }

  protected filtrarPorEstado(cambio: MatChipListboxChange): void {
    const elegidos = (cambio.value as EstadoTunica[] | null) ?? [];
    // Mismo orden que los chips, para que la consulta no dependa del orden en que se pulsan.
    const estados = ESTADOS_TUNICA.map((e) => e.valor).filter((valor) => elegidos.includes(valor));
    this.consulta.update((c) => ({ ...c, estados, pagina: 0 }));
  }

  protected cambiarOrden(orden: Sort): void {
    const campos: OrdenTunicas[] = ['codigo', 'medidaTotal', 'estado'];
    const campo = campos.find((c) => c === orden.active) ?? 'codigo';
    const direccion = orden.direction === 'desc' ? 'desc' : 'asc';
    this.consulta.update((c) => ({ ...c, orden: campo, direccion, pagina: 0 }));
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.consulta.update((c) => ({ ...c, pagina: evento.pageIndex, tamano: evento.pageSize }));
  }
}

/** Número entero positivo, o nulo si el campo está vacío o no es un número. */
function aNumero(texto: string): number | null {
  const limpio = texto.trim();
  if (!/^\d+$/.test(limpio)) {
    return null;
  }
  return Number(limpio);
}
