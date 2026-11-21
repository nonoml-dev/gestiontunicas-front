import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { filter, switchMap } from 'rxjs';

import { Usuario } from '../../auth/auth.models';
import { AuthService } from '../../auth/auth.service';
import { AvisosService } from '../../comun/avisos/avisos.service';
import { ConfirmacionService } from '../../comun/confirmacion/confirmacion.service';
import { mensajeError } from '../../comun/mensaje-error';
import { TablaPaginada } from '../../comun/tabla-paginada/tabla-paginada';
import { DialogoPasswordTemporal } from '../dialogos/dialogo-password-temporal';
import { DatosDialogoUsuario, DialogoUsuario, ResultadoDialogoUsuario } from '../dialogos/dialogo-usuario';
import { UsuarioCreado, aRequest, etiquetaRol, exigeNuevoAcceso } from '../usuario.models';
import { UsuariosService } from '../usuarios.service';

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const nombreCompleto = (u: Usuario) => `${u.nombre} ${u.apellidos ?? ''}`.trim();

/** Administración de usuarios (DESIGN.md §7.10). Son pocos: se filtra y pagina en el navegador. */
@Component({
  selector: 'app-usuarios-listado',
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatTableModule,
    TablaPaginada,
  ],
  templateUrl: './usuarios-listado.html',
  styleUrl: './usuarios-listado.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosListado {
  private readonly servicio = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly avisos = inject(AvisosService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columnas = ['nombre', 'cargo', 'roles', 'estado', 'acciones'];
  protected readonly etiquetaRol = etiquetaRol;
  protected readonly nombreCompleto = nombreCompleto;

  private readonly usuarios = signal<Usuario[]>([]);
  protected readonly texto = signal('');
  private readonly paginaPedida = signal(0);
  protected readonly tamano = signal(25);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  /** Fallo de una acción de la tabla; se muestra aparte para no ocultar el listado. */
  protected readonly errorAccion = signal<string | null>(null);

  protected readonly filtrados = computed(() => {
    const busqueda = normalizar(this.texto().trim());
    return this.usuarios()
      .filter((u) => normalizar(`${nombreCompleto(u)} ${u.username} ${u.cargoEtiqueta}`).includes(busqueda))
      .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'));
  });
  /** Si al filtrar quedan menos páginas, se muestra la última que exista. */
  protected readonly pagina = computed(() =>
    Math.min(this.paginaPedida(), Math.max(0, Math.ceil(this.filtrados().length / this.tamano()) - 1)),
  );
  protected readonly filas = computed(() => {
    const inicio = this.pagina() * this.tamano();
    return this.filtrados().slice(inicio, inicio + this.tamano());
  });
  protected readonly mensajeVacio = computed(() =>
    this.texto().trim() ? 'Ningún usuario coincide con la búsqueda.' : 'Todavía no hay usuarios.',
  );

  constructor() {
    this.cargar();
  }

  protected esPropio(usuario: Usuario): boolean {
    return usuario.id === this.auth.usuario()?.id;
  }

  protected buscar(texto: string): void {
    this.texto.set(texto);
    this.paginaPedida.set(0);
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.paginaPedida.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
  }

  protected nuevo(): void {
    this.abrirDialogo(null);
  }

  protected editar(usuario: Usuario): void {
    this.abrirDialogo(usuario);
  }

  protected restablecer(usuario: Usuario): void {
    this.errorAccion.set(null);
    this.confirmacion
      .confirmar({
        titulo: 'Restablecer contraseña',
        destacado: nombreCompleto(usuario),
        mensaje: 'recibirá una contraseña temporal, se desbloqueará su cuenta y se cerrarán sus sesiones abiertas.',
        textoConfirmar: 'Restablecer',
      })
      .pipe(
        switchMap(() => this.servicio.restablecerPassword(usuario.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (creado) => {
          this.cargar();
          this.mostrarTemporal(creado);
        },
        error: (err: unknown) => this.errorAccion.set(mensajeError(err, 'No se ha podido restablecer la contraseña.')),
      });
  }

  protected desactivar(usuario: Usuario): void {
    this.errorAccion.set(null);
    this.confirmacion
      .confirmar({
        titulo: 'Desactivar usuario',
        destacado: nombreCompleto(usuario),
        mensaje: 'no podrá entrar en la aplicación. Se conserva todo lo que ha registrado.',
        textoConfirmar: 'Desactivar',
        destructiva: true,
      })
      .pipe(
        switchMap(() => this.servicio.actualizar(usuario.id, { ...aRequest(usuario), activo: false })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.avisos.exito('Usuario desactivado');
          this.cargar();
        },
        error: (err: unknown) => this.errorAccion.set(mensajeError(err, 'No se ha podido desactivar el usuario.')),
      });
  }

  protected activar(usuario: Usuario): void {
    this.errorAccion.set(null);
    this.servicio
      .actualizar(usuario.id, { ...aRequest(usuario), activo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.avisos.exito('Usuario activado');
          this.cargar();
        },
        error: (err: unknown) => this.errorAccion.set(mensajeError(err, 'No se ha podido activar el usuario.')),
      });
  }

  private abrirDialogo(usuario: Usuario | null): void {
    this.errorAccion.set(null);
    this.dialog
      .open<DialogoUsuario, DatosDialogoUsuario, ResultadoDialogoUsuario>(DialogoUsuario, {
        data: { usuario, esPropio: usuario !== null && this.esPropio(usuario) },
        width: '640px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .pipe(
        filter((resultado): resultado is ResultadoDialogoUsuario => resultado !== undefined),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => this.trasGuardar(usuario, resultado));
  }

  private trasGuardar(antes: Usuario | null, { usuario, passwordTemporal }: ResultadoDialogoUsuario): void {
    if (antes && this.esPropio(antes)) {
      if (exigeNuevoAcceso(antes, usuario)) {
        this.avisos.exito('Datos guardados. Vuelve a iniciar sesión');
        this.auth.cerrarSesion();
        return;
      }
      this.auth.actualizarUsuario(usuario);
    }
    if (passwordTemporal) {
      this.mostrarTemporal({ usuario, passwordTemporal });
    } else {
      this.avisos.exito('Usuario guardado');
    }
    this.cargar();
  }

  private mostrarTemporal(creado: UsuarioCreado): void {
    // Sin cierre accidental: la contraseña no se puede volver a consultar.
    this.dialog.open(DialogoPasswordTemporal, { data: creado, width: '480px', maxWidth: '95vw', disableClose: true });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (usuarios) => {
          this.usuarios.set(usuarios);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.usuarios.set([]);
          this.error.set(mensajeError(err, 'No se ha podido cargar el listado de usuarios.'));
          this.cargando.set(false);
        },
      });
  }
}
