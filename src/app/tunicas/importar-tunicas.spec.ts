import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';

import { Importacion } from '../comun/importacion/importacion-api';
import { ImportacionService } from '../hermanos/importacion/importacion.service';
import { ImportacionFilaTunica } from './importacion/importacion-tunicas';
import { ImportarTunicas } from './importacion/importar-tunicas';

const URL = '/api/v1/tunicas/importaciones';

const importacion: Importacion = {
  id: 9,
  nombreFichero: 'inventario.xlsx',
  estado: 'PREVISUALIZADA',
  totalFilas: 4,
  filasOk: 2,
  filasError: 1,
  filasDuplicadas: 1,
};

const fila = (id: number, cambios: Partial<ImportacionFilaTunica>): ImportacionFilaTunica => ({
  id,
  numFila: id + 1,
  datos: {
    codigoOriginal: String(id),
    medidaOriginal: '158+6',
    codigo: String(id),
    medidaCm: 158,
    dobladilloCm: 6,
    medidaTotalCm: 164,
    codigoFueDeHermano: false,
  },
  estado: 'OK',
  errores: [],
  decision: 'CREAR',
  ...cambios,
});

const filas: ImportacionFilaTunica[] = [
  fila(1, {}),
  fila(2, { datos: { ...fila(2, {}).datos, codigoFueDeHermano: true } }),
  fila(3, {
    estado: 'ERROR',
    decision: null,
    errores: ['Falta la medida'],
    datos: {
      codigoOriginal: '248',
      medidaOriginal: '',
      codigo: '248',
      medidaCm: null,
      dobladilloCm: null,
      medidaTotalCm: null,
    },
  }),
  fila(4, {
    estado: 'POSIBLE_DUPLICADO',
    decision: null,
    datos: {
      ...fila(4, {}).datos,
      medidaCm: 135,
      dobladilloCm: 5,
      medidaTotalCm: 140,
      existente: {
        id: 40,
        medidaCm: 130,
        dobladilloCm: 5,
        medidaTotalCm: 135,
        estado: 'EN_REPARACION',
      },
    },
  }),
];

describe('ImportarTunicas', () => {
  let fixture: ComponentFixture<ImportarTunicas>;
  let http: HttpTestingController;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const texto = () => elemento().textContent?.replace(/\s+/g, ' ') ?? '';
  const boton = (nombre: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === nombre,
    )!;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ImportarTunicas],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ImportarTunicas);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function subir(nombre = 'inventario.xlsx'): Promise<void> {
    const entrada = elemento().querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(entrada, 'files', {
      value: [new File(['x'], nombre)],
      configurable: true,
    });
    entrada.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function subirYRevisar(): Promise<void> {
    await subir();
    const subida = http.expectOne(URL);
    expect(subida.request.method).toBe('POST');
    expect((subida.request.body as FormData).get('fichero')).toBeInstanceOf(File);
    subida.flush(importacion);
    http.expectOne(`${URL}/9/filas`).flush(filas);
    await fixture.whenStable();
  }

  it('explica el formato del inventario y rechaza lo que no es un Excel sin subirlo', async () => {
    expect(texto()).toContain('Medida («medida+dobladillo», por ejemplo 158+6)');

    await subir('inventario.csv');

    http.expectNone(URL);
    expect(texto()).toContain('El fichero tiene que ser un Excel (.xlsx o .xls).');
  });

  it('separa las filas en correctas, con errores y posibles duplicados', async () => {
    await subirYRevisar();

    expect(texto()).toContain('inventario.xlsx · 4 filas');
    expect(texto()).toContain('Correctas (2)');
    expect(texto()).toContain('Con errores (1)');
    expect(texto()).toContain('Posibles duplicados (1)');
    expect(texto()).toContain('Un código era de una túnica que ahora es propiedad de un hermano.');
    expect(texto()).toContain('Falta 1 duplicado por decidir');
    expect(boton('Siguiente').disabled).toBe(true);
  });

  it('decide un duplicado, resume y confirma la importación', async () => {
    await subirYRevisar();

    // Pestaña de duplicados: se comparan los dos registros
    elemento().querySelectorAll<HTMLElement>('.mat-mdc-tab')[2].click();
    await fixture.whenStable();
    expect(texto()).toContain('135 + 5 = 140 cm');
    expect(texto()).toContain('Túnica 4 · En reparación');
    expect(texto()).toContain('130 + 5 = 135 cm');
    expect(texto()).not.toContain('Crear nuevo');

    [...elemento().querySelectorAll<HTMLButtonElement>('mat-button-toggle button')]
      .find((b) => b.textContent?.includes('Actualizar medidas'))!
      .click();
    const decision = http.expectOne(`${URL}/filas/4/decision`);
    expect(decision.request.body).toEqual({ decision: 'ACTUALIZAR' });
    decision.flush({ ...filas[3], decision: 'ACTUALIZAR' });
    await fixture.whenStable();

    boton('Siguiente').click();
    await fixture.whenStable();
    expect(texto()).toContain('2 túnicas nuevas, con sus 5 piezas en buen estado');
    expect(texto()).toContain('1 túnica que ya existía actualiza sus medidas');
    expect(texto()).toContain('1 fila con errores que no se importa');

    boton('Importar').click();
    http.expectOne(`${URL}/9/confirmar`).flush({ ...importacion, estado: 'CONFIRMADA' });
    await fixture.whenStable();
    expect(texto()).toContain('Importación terminada.');
  });

  it('muestra el motivo si la confirmación falla', async () => {
    await subirYRevisar();
    http.expectNone(`${URL}/9/confirmar`);
    (fixture.componentInstance as unknown as { importar(): void }).importar();
    http
      .expectOne(`${URL}/9/confirmar`)
      .flush(
        { detail: 'La túnica 1 se ha dado de alta después de subir el fichero. Vuelve a subirlo' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    expect(texto()).toContain('La túnica 1 se ha dado de alta después de subir el fichero');
  });
});

describe('ImportacionService de hermanos', () => {
  it('sigue usando su propia URL', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    TestBed.inject(ImportacionService).confirmar(3).subscribe();

    http.expectOne('/api/v1/hermanos/importaciones/3/confirmar').flush({});
    http.verify();
  });
});
