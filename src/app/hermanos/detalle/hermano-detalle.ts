import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { Observable, finalize, switchMap } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { AvisosService } from '../../comun/avisos/avisos.service';
import { ConfirmacionService } from '../../comun/confirmacion/confirmacion.service';
import { mensajeError } from '../../comun/mensaje-error';
import { ContactoHermanoRequest, Hermano, HermanoRequest } from '../hermano.models';
import { HermanosService } from '../hermanos.service';

const PATRON_TELEFONO = /^[0-9+()\s-]*$/;

/** Campos que vienen del Excel de Secretaría: solo se rellenan al dar de alta un hermano a mano. */
const CAMPOS_DEL_HERMANO = ['numeroHermano', 'apellidos', 'nombre', 'fechaNacimiento'] as const;

/**
 * Detalle del hermano: los datos del Excel de Secretaría más un email y dos teléfonos.
 * Sin id es el alta de un hermano nuevo. El Capiller lo ve en solo lectura.
 */
@Component({
  selector: 'app-hermano-detalle',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  templateUrl: './hermano-detalle.html',
  styleUrl: './hermano-detalle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HermanoDetalle {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly hermanosService = inject(HermanosService);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly avisos = inject(AvisosService);

  /** Parámetro de la ruta /hermanos/:id (vacío en /hermanos/nuevo). */
  readonly id = input<string>();

  protected readonly puedeGestionar = inject(AuthService).puede('hermanos', 'G');
  protected readonly hoy = new Date().toISOString().slice(0, 10);

  protected readonly hermano = signal<Hermano | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    numeroHermano: ['', Validators.maxLength(10)],
    apellidos: ['', [Validators.required, Validators.maxLength(150)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    fechaNacimiento: [''],
    telefono1: ['', [Validators.maxLength(20), Validators.pattern(PATRON_TELEFONO)]],
    telefono2: ['', [Validators.maxLength(20), Validators.pattern(PATRON_TELEFONO)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
  });

  constructor() {
    if (!this.puedeGestionar) {
      this.form.disable();
    }
  }

  ngOnInit(): void {
    const id = this.idNumerico();
    if (id === null) {
      return;
    }
    this.cargando.set(true);
    this.hermanosService
      .obtener(id)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (hermano) => this.mostrar(hermano),
        error: (err: unknown) => this.error.set(mensajeError(err, 'No se ha podido cargar el hermano.')),
      });
  }

  protected guardar(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.idNumerico();
    const peticion: Observable<Hermano> =
      id === null
        ? this.hermanosService.crear(this.request())
        : this.hermanosService.actualizarContacto(id, this.contacto());

    this.guardando.set(true);
    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (hermano) => {
        this.avisos.exito('Hermano guardado');
        if (id === null) {
          this.router.navigate(['/hermanos', hermano.id], { replaceUrl: true });
        } else {
          this.mostrar(hermano);
        }
      },
      error: (err: unknown) => this.error.set(mensajeError(err, 'No se ha podido guardar. Revisa los datos.')),
    });
  }

  protected darDeBaja(): void {
    const hermano = this.hermano();
    if (!hermano) {
      return;
    }
    this.confirmacion
      .confirmar({
        titulo: 'Dar de baja',
        destacado: hermano.nombreCompleto,
        mensaje: 'dejará de aparecer en el listado y en el buscador de hermanos. Su historial de túnicas se conserva.',
        textoConfirmar: 'Dar de baja',
        destructiva: true,
      })
      .pipe(switchMap(() => this.hermanosService.darDeBaja(hermano.id)))
      .subscribe({
        next: () => {
          this.avisos.exito(`${hermano.nombreCompleto} se ha dado de baja`);
          this.router.navigate(['/hermanos']);
        },
        error: (err: unknown) => this.error.set(mensajeError(err, 'No se ha podido dar de baja.')),
      });
  }

  private mostrar(hermano: Hermano): void {
    this.hermano.set(hermano);
    // Los datos del hermano vienen del Excel de Secretaría: en un hermano que ya existe no se editan.
    for (const campo of CAMPOS_DEL_HERMANO) {
      this.form.controls[campo].disable();
    }
    this.form.reset({
      numeroHermano: hermano.numeroHermano ?? '',
      apellidos: hermano.apellidos,
      nombre: hermano.nombre,
      fechaNacimiento: hermano.fechaNacimiento ?? '',
      telefono1: hermano.telefono1 ?? '',
      telefono2: hermano.telefono2 ?? '',
      email: hermano.email ?? '',
    });
  }

  private contacto(): ContactoHermanoRequest {
    const { telefono1, telefono2, email } = this.request();
    return { telefono1, telefono2, email };
  }

  private request(): HermanoRequest {
    const valor = this.form.getRawValue();
    const texto = (v: string) => (v.trim() ? v.trim() : null);
    return {
      numeroHermano: texto(valor.numeroHermano),
      apellidos: valor.apellidos.trim(),
      nombre: valor.nombre.trim(),
      fechaNacimiento: texto(valor.fechaNacimiento),
      telefono1: texto(valor.telefono1),
      telefono2: texto(valor.telefono2),
      email: texto(valor.email),
    };
  }

  private idNumerico(): number | null {
    const id = Number(this.id());
    return Number.isInteger(id) && id > 0 ? id : null;
  }
}
