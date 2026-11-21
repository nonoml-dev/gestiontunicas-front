import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { TablaPaginada } from './tabla-paginada';

interface Fila {
  nombre: string;
}

@Component({
  imports: [MatTableModule, TablaPaginada],
  template: `
    <app-tabla-paginada
      [filas]="filas()"
      [columnas]="['nombre']"
      [total]="total()"
      [pagina]="0"
      [tamano]="2"
      [cargando]="cargando()"
      [error]="error()"
      [clicable]="clicable()"
      mensajeVacio="Sin datos"
      (filaPulsada)="pulsadas.push($event)"
      (paginaCambiada)="paginas.push($event)"
    >
      <ng-container matColumnDef="nombre">
        <th mat-header-cell *matHeaderCellDef>Nombre</th>
        <td mat-cell *matCellDef="let fila">{{ fila.nombre }}</td>
      </ng-container>
    </app-tabla-paginada>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Anfitrion {
  readonly filas = signal<Fila[]>([{ nombre: 'Primera' }, { nombre: 'Segunda' }]);
  readonly total = signal(5);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly clicable = signal(true);
  readonly pulsadas: Fila[] = [];
  readonly paginas: PageEvent[] = [];
}

describe('TablaPaginada', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let anfitrion: Anfitrion;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const filas = () => Array.from(elemento().querySelectorAll<HTMLElement>('tr.mat-mdc-row'));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
    });
    fixture = TestBed.createComponent(Anfitrion);
    anfitrion = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('pinta las columnas declaradas por la pantalla', () => {
    expect(elemento().querySelector('th')?.textContent).toContain('Nombre');
    expect(filas().map((f) => f.textContent?.trim())).toEqual(['Primera', 'Segunda']);
  });

  it('avisa al pulsar una fila o abrirla con Enter', () => {
    filas()[0].click();
    filas()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(anfitrion.pulsadas).toEqual([{ nombre: 'Primera' }, { nombre: 'Segunda' }]);
  });

  it('no reacciona si las filas no son pulsables', async () => {
    anfitrion.clicable.set(false);
    await fixture.whenStable();

    filas()[0].click();

    expect(anfitrion.pulsadas).toEqual([]);
    expect(filas()[0].hasAttribute('tabindex')).toBe(false);
  });

  it('avisa al cambiar de página', () => {
    elemento().querySelector<HTMLButtonElement>('.mat-mdc-paginator-navigation-next')!.click();

    expect(anfitrion.paginas[0].pageIndex).toBe(1);
  });

  it('muestra el paginador en español', () => {
    expect(elemento().querySelector('.mat-mdc-paginator-range-label')?.textContent).toContain('1 – 2 de 5');
  });

  it('muestra el mensaje de vacío, y el de error si lo hay', async () => {
    anfitrion.filas.set([]);
    anfitrion.total.set(0);
    await fixture.whenStable();
    expect(elemento().querySelector('.vacio')?.textContent).toContain('Sin datos');

    anfitrion.error.set('Ha fallado');
    await fixture.whenStable();
    expect(elemento().querySelector('.vacio')?.textContent).toContain('Ha fallado');
    expect(elemento().querySelector('.vacio')?.textContent).not.toContain('Sin datos');
  });

  it('no muestra el mensaje de vacío mientras carga', async () => {
    anfitrion.filas.set([]);
    anfitrion.cargando.set(true);
    await fixture.whenStable();

    expect(elemento().querySelector('mat-progress-bar')).not.toBeNull();
    expect(elemento().querySelector('.vacio')?.textContent).not.toContain('Sin datos');
  });
});
