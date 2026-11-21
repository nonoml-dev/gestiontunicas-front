import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../auth/auth.service';

interface OpcionMenu {
  icono: string;
  texto: string;
  ruta: string;
}

/** Estructura común de las pantallas (DESIGN.md §6): barra lateral azul y barra superior blanca. */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Las demás opciones (Hermanos, Túnicas...) se añaden según se creen sus pantallas. */
  protected readonly opciones: OpcionMenu[] = [
    { icono: 'home', texto: 'Inicio', ruta: '/inicio' },
    { icono: 'groups', texto: 'Hermanos', ruta: '/hermanos' },
  ];

  /** Tablet (< 1024 px): la barra lateral se abre por encima con el botón de menú. */
  protected readonly esTablet = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 1023.98px)')
      .pipe(map((estado) => estado.matches)),
    { initialValue: false },
  );

  protected readonly titulo = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(() => this.tituloActual()),
    ),
    { initialValue: this.tituloActual() },
  );

  protected readonly usuario = this.auth.usuario;
  protected readonly esAdministrador = computed(() => this.usuario()?.roles.includes('ADMIN') ?? false);

  protected readonly iniciales = computed(() => {
    const usuario = this.usuario();
    if (!usuario) {
      return '';
    }
    const primera = (texto: string | null) => texto?.trim().charAt(0).toUpperCase() ?? '';
    return primera(usuario.nombre) + primera(usuario.apellidos);
  });

  protected cambiarPassword(): void {
    this.router.navigate(['/cambiar-password'], { queryParams: { volver: this.router.url } });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
  }

  private tituloActual(): string {
    let ruta = this.router.routerState.snapshot.root;
    while (ruta.firstChild) {
      ruta = ruta.firstChild;
    }
    return ruta.data['titulo'] ?? '';
  }
}
