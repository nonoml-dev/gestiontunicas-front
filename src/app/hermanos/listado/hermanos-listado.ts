import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { mensajeError } from '../../comun/mensaje-error';
import { PaginadorEs } from '../../comun/paginador-es';
import { CriterioEdad, HermanoResumen, OrdenHermanos, ROLES_GESTION_HERMANOS } from '../hermano.models';
import { HermanosService } from '../hermanos.service';

interface Consulta {
  texto: string;
  pagina: number;
  tamano: number;
  orden: OrdenHermanos;
  direccion: 'asc' | 'desc';
  enEdad: boolean;
}

/** Listado de hermanos (DESIGN.md §7.4): solo los datos del Excel de Secretaría. */
@Component({
  selector: 'app-hermanos-listado',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: PaginadorEs }],
  templateUrl: './hermanos-listado.html',
  styleUrl: './hermanos-listado.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'atajoBuscador($event)' },
})
export class HermanosListado {
  private readonly hermanosService = inject(HermanosService);
  private readonly router = inject(Router);

  protected readonly columnas = ['numeroHermano', 'nombreCompleto', 'fechaNacimiento'];
  protected readonly tamanos = [10, 25, 50];
  protected readonly puedeGestionar = inject(AuthService).tieneAlgunRol(ROLES_GESTION_HERMANOS);

  private readonly buscador = viewChild.required<ElementRef<HTMLInputElement>>('buscador');

  /** Texto tal cual se escribe; la búsqueda espera a que se deje de teclear. */
  protected readonly texto = signal('');
  private readonly consulta = signal<Consulta>({
    texto: '',
    pagina: 0,
    tamano: 25,
    orden: 'nombreCompleto',
    direccion: 'asc',
    enEdad: false,
  });

  protected readonly hermanos = signal<HermanoResumen[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = computed(() => this.consulta().pagina);
  protected readonly tamano = computed(() => this.consulta().tamano);
  protected readonly enEdad = computed(() => this.consulta().enEdad);
  protected readonly criterioEdad = signal<CriterioEdad | null>(null);

  constructor() {
    this.hermanosService
      .criterioEdad()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (criterio) => this.criterioEdad.set(criterio), error: () => undefined });

    // Al escribir: vuelve a la primera página cuando se deja de teclear 300 ms.
    toObservable(this.texto)
      .pipe(
        map((texto) => texto.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((texto) => this.consulta.update((c) => ({ ...c, texto, pagina: 0 })));

    toObservable(this.consulta)
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap((c) =>
          this.hermanosService.buscar(c.texto, c.pagina, c.tamano, c.orden, c.direccion, c.enEdad).pipe(
            catchError((err: unknown) => {
              this.error.set(mensajeError(err, 'No se ha podido cargar el listado de hermanos.'));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        this.cargando.set(false);
        this.hermanos.set(resultado?.content ?? []);
        this.total.set(resultado?.page.totalElements ?? 0);
      });
  }

  protected filtrarPorEdad(activo: boolean): void {
    this.consulta.update((c) => ({ ...c, enEdad: activo, pagina: 0 }));
  }

  protected cambiarOrden(orden: Sort): void {
    const campos: OrdenHermanos[] = ['numeroHermano', 'nombreCompleto', 'fechaNacimiento'];
    const campo = campos.find((c) => c === orden.active) ?? 'nombreCompleto';
    const direccion = orden.direction === 'desc' ? 'desc' : 'asc';
    this.consulta.update((c) => ({ ...c, orden: campo, direccion, pagina: 0 }));
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.consulta.update((c) => ({ ...c, pagina: evento.pageIndex, tamano: evento.pageSize }));
  }

  protected abrir(hermano: HermanoResumen): void {
    this.router.navigate(['/hermanos', hermano.id]);
  }

  /** "/" enfoca el buscador (DESIGN.md §9), salvo si ya se está escribiendo en otro campo. */
  protected atajoBuscador(evento: KeyboardEvent): void {
    const destino = evento.target as HTMLElement | null;
    const escribiendo = destino?.closest('input, textarea, select, [contenteditable="true"]');
    if (evento.key === '/' && !escribiendo) {
      evento.preventDefault();
      this.buscador().nativeElement.focus();
    }
  }
}
