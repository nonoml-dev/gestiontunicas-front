import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';

/**
 * Pantalla de Inicio (DESIGN.md §7.2). De momento solo el saludo: las tarjetas KPI y la de
 * "Reparto en curso" necesitan sus endpoints en el backend.
 */
@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inicio {
  private readonly usuario = inject(AuthService).usuario;

  protected readonly saludo = computed(() => {
    const hora = new Date().getHours();
    const momento = hora >= 6 && hora < 14 ? 'Buenos días' : hora >= 14 && hora < 21 ? 'Buenas tardes' : 'Buenas noches';
    const nombre = this.usuario()?.nombre;
    return nombre ? `${momento}, ${nombre}` : momento;
  });
}
