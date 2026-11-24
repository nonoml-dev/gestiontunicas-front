import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';

import { Pagina } from '../hermanos/hermano.models';
import { TunicasListado } from './listado/tunicas-listado';
import { TunicaResumen } from './tunica.models';

const URL = '/api/v1/tunicas';

const pagina = (filas: TunicaResumen[]): Pagina<TunicaResumen> => ({
  content: filas,
  page: { size: 25, number: 0, totalElements: filas.length, totalPages: 1 },
});

const tunica: TunicaResumen = {
  id: 1,
  codigo: '42',
  medidaCm: 158,
  dobladilloCm: 6,
  medidaTotalCm: 164,
  estado: 'EN_REPARACION',
};

describe('TunicasListado', () => {
  let fixture: ComponentFixture<TunicasListado>;
  let http: HttpTestingController;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const peticion = (): TestRequest => http.expectOne((r) => r.url === URL);

  beforeEach(() => {
    // El filtro de medida espera 400 ms a que se deje de escribir.
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [TunicasListado],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TunicasListado);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('pide la primera página ordenada por código y muestra la medida total y el estado', () => {
    const inicial = peticion();
    expect(inicial.request.params.get('orden')).toBe('codigo');
    expect(inicial.request.params.get('direccion')).toBe('asc');
    expect(inicial.request.params.has('estado')).toBe(false);
    expect(inicial.request.params.has('medidaMin')).toBe(false);
    inicial.flush(pagina([tunica]));
    TestBed.tick();

    const celdas = [...elemento().querySelectorAll('td')].map((td) => td.textContent?.trim());
    expect(celdas).toEqual(['42', '158 cm', '6 cm', '164 cm', 'En reparación']);
    expect(elemento().textContent).toContain(
      'Sin filtro de estado no salen las túnicas que son propiedad de un hermano',
    );
  });

  it('filtra por varios estados en el orden de los chips', () => {
    peticion().flush(pagina([]));
    TestBed.tick();

    const chips = [...elemento().querySelectorAll<HTMLElement>('mat-chip-option')];
    chips
      .find((c) => c.textContent?.includes('Baja'))!
      .querySelector('button')!
      .click();
    TestBed.tick();
    peticion().flush(pagina([]));
    chips
      .find((c) => c.textContent?.includes('Disponible'))!
      .querySelector('button')!
      .click();
    TestBed.tick();

    const filtrada = peticion();
    expect(filtrada.request.params.getAll('estado')).toEqual(['DISPONIBLE', 'BAJA']);
    expect(filtrada.request.params.get('pagina')).toBe('0');
    filtrada.flush(pagina([]));
    TestBed.tick();
    expect(elemento().textContent).toContain('No hay túnicas en ese estado.');
  });

  it('filtra por medida total cuando se deja de escribir y no consulta con un rango al revés', () => {
    peticion().flush(pagina([]));
    TestBed.tick();

    const [desde, hasta] = [...elemento().querySelectorAll<HTMLInputElement>('input[type=number]')];
    escribir(desde, '170');
    escribir(hasta, '150');
    TestBed.tick();
    vi.advanceTimersByTime(400);
    TestBed.tick();
    http.expectNone((r) => r.url === URL);
    expect(elemento().textContent).toContain('La medida "desde" no puede ser mayor que "hasta"');

    escribir(hasta, '175');
    TestBed.tick();
    vi.advanceTimersByTime(400);
    TestBed.tick();

    const filtrada = peticion();
    expect(filtrada.request.params.get('medidaMin')).toBe('170');
    expect(filtrada.request.params.get('medidaMax')).toBe('175');
    filtrada.flush(pagina([]));
    fixture.detectChanges();
    expect(elemento().textContent).toContain('No hay túnicas con esa medida.');
  });

  it('muestra el error de la API sin romper la pantalla', () => {
    peticion().flush({ detail: 'Fallo' }, { status: 0, statusText: 'Sin conexión' });
    TestBed.tick();
    expect(elemento().textContent).toContain('No se puede conectar con el servidor');
  });
});

function escribir(campo: HTMLInputElement, valor: string): void {
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}
