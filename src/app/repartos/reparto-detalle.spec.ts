import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { RepartoDetalle } from './detalle/reparto-detalle';
import { CambioPeriodoDevolucion, PlantillaResguardo, Reparto } from './reparto.models';

const URL = '/api/v1/repartos/7';
const URL_PLANTILLAS = '/api/v1/plantillas-resguardo';

const reparto = (cambios: Partial<Reparto> = {}): Reparto => ({
  id: 7,
  anio: 2027,
  fechaJuevesSanto: '2027-03-25',
  juevesSantoManual: false,
  edadMin: 10,
  edadMax: 15,
  estado: 'BORRADOR',
  periodoDevolucion: {
    inicio: '2027-04-05',
    fin: '2027-04-30',
    plazoGraciaMeses: 2,
    finPlazoGracia: '2027-06-30',
  },
  lugarDevolucion: 'Casa de hermandad',
  limosna: 20,
  tarifas: {
    importePiezaPrincipal: 30,
    importeTalega: 5,
    importeRetraso: 10,
    importeCingulo: 5,
    importeSuciedad: 10,
    importeCargoTotal: 150,
  },
  toleranciaMedidaCm: 3,
  plantillaResguardoId: null,
  plantillaResguardoNombre: null,
  modoTransicion: true,
  fechaApertura: null,
  reservasLiberadasEn: null,
  fechaCierre: null,
  noDevueltasProcesadasEn: null,
  finGraciaProcesadoEn: null,
  jornadas: [
    {
      id: 2,
      numero: 2,
      extraordinaria: false,
      fecha: '2027-03-09',
      horaInicio: null,
      horaFin: null,
      limosna: null,
      permiteRenovacion: true,
      permiteNuevaAlta: true,
      permiteCambio: false,
    },
    {
      id: 1,
      numero: 1,
      extraordinaria: false,
      fecha: '2027-03-08',
      horaInicio: '18:00:00',
      horaFin: '21:00:00',
      limosna: null,
      permiteRenovacion: true,
      permiteNuevaAlta: false,
      permiteCambio: false,
    },
  ],
  ...cambios,
});

const plantilla = (id: number, cambios: Partial<PlantillaResguardo> = {}): PlantillaResguardo => ({
  id,
  nombre: `Recibo ${id}`,
  nombreFichero: `recibo-${id}.docx`,
  variablesDetectadas: ['hermano.nombre', 'tunica.codigo'],
  variablesDesconocidas: [],
  subidoPor: 'prioste',
  subidoEn: '2026-11-26T18:00:00Z',
  ...cambios,
});

const cambio: CambioPeriodoDevolucion = {
  id: 1,
  anterior: {
    inicio: '2027-04-05',
    fin: '2027-04-30',
    plazoGraciaMeses: 2,
    finPlazoGracia: '2027-06-30',
  },
  nuevo: {
    inicio: '2027-04-05',
    fin: '2027-05-15',
    plazoGraciaMeses: 2,
    finPlazoGracia: '2027-07-15',
  },
  motivo: 'Lluvias en Semana Santa',
  usuario: 'prioste',
  fecha: '2026-11-26T18:30:00Z',
};

describe('RepartoDetalle', () => {
  let fixture: ComponentFixture<RepartoDetalle>;
  let http: HttpTestingController;
  const texto = () =>
    (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  const dialogo = () => document.querySelector<HTMLElement>('mat-dialog-container');
  const textoDialogo = () => dialogo()?.textContent?.replace(/\s+/g, ' ') ?? '';
  const botonDe = (raiz: ParentNode, nombre: string) =>
    [...raiz.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.trim().endsWith(nombre),
    );

  async function crear(
    gestiona: boolean,
    datos: Reparto,
    cambios: CambioPeriodoDevolucion[] = [],
    plantillas: PlantillaResguardo[] = [],
  ): Promise<void> {
    TestBed.configureTestingModule({
      imports: [RepartoDetalle],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: AuthService, useValue: { puede: () => gestiona } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RepartoDetalle);
    fixture.componentRef.setInput('id', '7');
    fixture.detectChanges();
    http.expectOne(URL).flush(datos);
    http.expectOne(`${URL}/periodo-devolucion/cambios`).flush(cambios);
    if (gestiona) {
      http.expectOne(URL_PLANTILLAS).flush(plantillas);
    } else {
      http.expectNone(URL_PLANTILLAS);
    }
    await fixture.whenStable();
  }

  function escribirEn(entrada: HTMLInputElement, valor: string): void {
    entrada.value = valor;
    entrada.dispatchEvent(new Event('input'));
  }

  async function accion(nombre: string): Promise<void> {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Acciones"]')!
      .click();
    await fixture.whenStable();
    botonDe(document, nombre)!.click();
    await fixture.whenStable();
  }

  async function pestana(nombre: string): Promise<void> {
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.mat-mdc-tab')]
      .find((t) => t.textContent?.includes(nombre))!
      .click();
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  it('muestra los datos, las jornadas en orden y los importes', async () => {
    await crear(true, reparto());

    expect(texto()).toContain('Reparto 2027');
    expect(texto()).toContain('Borrador');
    expect(texto()).toContain('Modo transición');
    expect(texto()).toContain('25/03/2027 (calculado)');
    expect(texto()).toContain('Del 05/04/2027 al 30/04/2027 · Casa de hermandad');
    expect(texto()).toContain('2 meses, hasta el 30/06/2027');
    expect(texto()).toContain('Sin plantilla');
    expect(texto()).toContain('Para abrir el reparto falta la plantilla del resguardo.');
    expect(texto()).toMatch(/Día 1 · 08\/03\/2027 · 18:00–21:00.*Día 2 · 09\/03\/2027/);
    expect(texto()).toContain('Renovación · Nueva alta');
    expect(texto()).toContain('F · Cargo total de la túnica');
    expect(texto()).toContain('150,00 €');
  });

  it('sin plantilla no deja abrir el reparto ni llama al servidor', async () => {
    await crear(true, reparto());

    await accion('Abrir reparto');

    expect(dialogo()).toBeNull();
    expect(texto()).toContain('Sube la plantilla del resguardo antes de abrir el reparto.');
  });

  it('abre el reparto tras confirmarlo', async () => {
    await crear(
      true,
      reparto({ plantillaResguardoId: 3, plantillaResguardoNombre: 'Recibo 3' }),
      [],
      [plantilla(3)],
    );

    await accion('Abrir reparto');
    expect(textoDialogo()).toContain('En modo transición no se reserva ninguna túnica');
    botonDe(dialogo()!, 'Abrir reparto')!.click();
    await fixture.whenStable();

    const abrir = http.expectOne(`${URL}/abrir`);
    expect(abrir.request.method).toBe('POST');
    abrir.flush(
      reparto({
        estado: 'ABIERTO',
        plantillaResguardoId: 3,
        fechaApertura: '2027-03-08T17:00:00Z',
      }),
    );
    await fixture.whenStable();

    expect(texto()).toContain('Abierto');
    expect(texto()).toContain('Abierto el');
  });

  it('fuera del modo transición avisa de cuántas túnicas se han reservado', async () => {
    await crear(
      true,
      reparto({ modoTransicion: false, plantillaResguardoId: 3 }),
      [],
      [plantilla(3)],
    );

    await accion('Abrir reparto');
    expect(textoDialogo()).toContain('se reserva su túnica a cada hermano que renueva');
    botonDe(dialogo()!, 'Abrir reparto')!.click();
    await fixture.whenStable();
    http.expectOne(`${URL}/abrir`).flush(reparto({ estado: 'ABIERTO', modoTransicion: false }));
    http.expectOne(`${URL}/reservas`).flush([{ id: 1 }, { id: 2 }]);
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Reparto 2027 abierto: 2 túnicas reservadas');
  });

  it('cierra el reparto abierto tras confirmarlo', async () => {
    await crear(true, reparto({ estado: 'ABIERTO', plantillaResguardoId: 3 }), [], [plantilla(3)]);

    await accion('Cerrar reparto');
    expect(textoDialogo()).toContain('No se puede deshacer');
    botonDe(dialogo()!, 'Cerrar reparto')!.click();
    await fixture.whenStable();
    http
      .expectOne(`${URL}/cerrar`)
      .flush(reparto({ estado: 'CERRADO', fechaCierre: '2027-03-12T20:00:00Z' }));
    await fixture.whenStable();

    expect(texto()).toContain('Cerrado');
    expect(texto()).toContain('Cerrado el');
  });

  it('cambia el periodo de devolución con motivo y lo muestra en el historial', async () => {
    await crear(true, reparto({ estado: 'ABIERTO' }));
    await pestana('Cambios del periodo');
    expect(texto()).toContain('El periodo de devolución no se ha cambiado.');

    await accion('Cambiar periodo de devolución');
    const campos = dialogo()!.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input, textarea',
    );
    // Sin motivo no se envía
    botonDe(dialogo()!, 'Guardar')!.click();
    await fixture.whenStable();
    http.expectNone(`${URL}/periodo-devolucion`);
    expect(textoDialogo()).toContain('Escribe el motivo del cambio');

    campos[1].value = '2027-05-15';
    campos[1].dispatchEvent(new Event('input'));
    campos[3].value = '  Lluvias en Semana Santa ';
    campos[3].dispatchEvent(new Event('input'));
    botonDe(dialogo()!, 'Guardar')!.click();
    await fixture.whenStable();

    const peticion = http.expectOne(`${URL}/periodo-devolucion`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({
      periodo: { inicio: '2027-04-05', fin: '2027-05-15', plazoGraciaMeses: 2 },
      motivo: 'Lluvias en Semana Santa',
    });
    peticion.flush(reparto({ estado: 'ABIERTO', periodoDevolucion: cambio.nuevo }));
    await fixture.whenStable();
    http.expectOne(`${URL}/periodo-devolucion/cambios`).flush([cambio]);
    await fixture.whenStable();

    expect(texto()).toContain('Cambios del periodo de devolución (1)');
    expect(texto()).toContain(
      'Del 05/04/2027 al 30/04/2027 (2 meses de gracia) → del 05/04/2027 al 15/05/2027',
    );
    expect(texto()).toContain('Lluvias en Semana Santa');
    expect(texto()).toContain('prioste ·');
  });

  it('sube una plantilla, avisa de las variables desconocidas y la asigna', async () => {
    await crear(true, reparto());
    await pestana('Plantilla del resguardo');
    expect(texto()).toContain('Este reparto todavía no tiene plantilla del resguardo.');

    botonDe(fixture.nativeElement, 'Subir nueva plantilla')!.click();
    await fixture.whenStable();
    const entrada = dialogo()!.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(entrada, 'files', {
      value: [new File(['x'], 'RECIBO.docx')],
      configurable: true,
    });
    entrada.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const subida = http.expectOne(URL_PLANTILLAS);
    expect((subida.request.body as FormData).get('fichero')).toBeInstanceOf(File);
    subida.flush(
      plantilla(4, {
        nombreFichero: 'RECIBO.docx',
        variablesDetectadas: ['hermano.nombre', '{{reparto.importe_d}'],
        variablesDesconocidas: ['{{reparto.importe_d}'],
      }),
    );
    await fixture.whenStable();
    expect(textoDialogo()).toContain('{{reparto.importe_d}');
    expect(textoDialogo()).toContain('No se reconoce 1 variable.');

    botonDe(dialogo()!, 'Usar esta plantilla')!.click();
    const asignar = http.expectOne(`${URL}/plantilla`);
    expect(asignar.request.method).toBe('PUT');
    expect(asignar.request.body).toEqual({ plantillaId: 4 });
    asignar.flush(reparto({ plantillaResguardoId: 4, plantillaResguardoNombre: 'RECIBO.docx' }));
    await fixture.whenStable();

    // Se recarga el reparto con su nueva plantilla
    http
      .expectOne(URL)
      .flush(reparto({ plantillaResguardoId: 4, plantillaResguardoNombre: 'RECIBO.docx' }));
    http.expectOne(`${URL}/periodo-devolucion/cambios`).flush([]);
    http.expectOne(URL_PLANTILLAS).flush([plantilla(4, { nombreFichero: 'RECIBO.docx' })]);
    await fixture.whenStable();

    expect(texto()).not.toContain('Para abrir el reparto falta la plantilla del resguardo.');
    expect(texto()).toContain('RECIBO.docx');
  });

  it('rechaza en el diálogo un fichero que no es .docx sin subirlo', async () => {
    await crear(true, reparto());
    await pestana('Plantilla del resguardo');
    botonDe(fixture.nativeElement, 'Subir nueva plantilla')!.click();
    await fixture.whenStable();

    const entrada = dialogo()!.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(entrada, 'files', {
      value: [new File(['x'], 'recibo.pdf')],
      configurable: true,
    });
    entrada.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    http.expectNone(URL_PLANTILLAS);
    expect(textoDialogo()).toContain('La plantilla tiene que ser un documento Word (.docx).');
  });

  it('reutiliza una plantilla de otro año', async () => {
    await crear(true, reparto(), [], [plantilla(2, { nombre: 'Recibo 2026' })]);
    await pestana('Plantilla del resguardo');
    expect(texto()).toContain('Otras plantillas subidas');

    botonDe(fixture.nativeElement, 'Usar esta')!.click();
    http
      .expectOne(`${URL}/plantilla`)
      .flush(reparto({ plantillaResguardoId: 2, plantillaResguardoNombre: 'Recibo 2026' }));
    await fixture.whenStable();

    expect(texto()).toContain('recibo-2.docx');
    expect(texto()).not.toContain('Otras plantillas subidas');
  });

  it('añade una jornada extraordinaria con su limosna y la muestra en la configuración', async () => {
    await crear(true, reparto({ estado: 'ABIERTO' }));

    await accion('Añadir jornada extraordinaria');
    expect(textoDialogo()).toContain('Vacío = la del reparto (20,00 €)');
    const campos = dialogo()!.querySelectorAll<HTMLInputElement>('input');
    escribirEn(campos[0], '2027-03-15');
    escribirEn(campos[1], '10:00');
    escribirEn(campos[2], '13:00');
    escribirEn(campos[6], '15.5');
    botonDe(dialogo()!, 'Añadir')!.click();
    await fixture.whenStable();

    const peticion = http.expectOne(`${URL}/jornadas-extraordinarias`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      fecha: '2027-03-15',
      horaInicio: '10:00',
      horaFin: '13:00',
      limosna: 15.5,
      permiteRenovacion: true,
      permiteNuevaAlta: true,
      permiteCambio: true,
    });
    const conJornada = reparto({ estado: 'ABIERTO' });
    conJornada.jornadas.push({
      id: 9,
      numero: 4,
      extraordinaria: true,
      fecha: '2027-03-15',
      horaInicio: '10:00:00',
      horaFin: '13:00:00',
      limosna: 15.5,
      permiteRenovacion: true,
      permiteNuevaAlta: true,
      permiteCambio: true,
    });
    peticion.flush(conJornada);
    await fixture.whenStable();

    expect(texto()).toContain('Extraordinaria · 15/03/2027 · 10:00–13:00');
    expect(texto()).toContain('15,50 €');
  });

  it('sin limosna envía nula, y no deja un día ocupado ni sin operaciones', async () => {
    await crear(true, reparto());

    await accion('Añadir jornada extraordinaria');
    const campos = dialogo()!.querySelectorAll<HTMLInputElement>('input');
    escribirEn(campos[0], '2027-03-08');
    dialogo()!
      .querySelectorAll<HTMLInputElement>('input[type=checkbox]')
      .forEach((casilla) => casilla.click());
    await fixture.whenStable();
    botonDe(dialogo()!, 'Añadir')!.click();
    await fixture.whenStable();

    http.expectNone(`${URL}/jornadas-extraordinarias`);
    expect(textoDialogo()).toContain('Ese día ya tiene jornada');
    expect(textoDialogo()).toContain('Marca al menos una operación.');

    escribirEn(campos[0], '2027-03-16');
    dialogo()!.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    await fixture.whenStable();
    botonDe(dialogo()!, 'Añadir')!.click();
    await fixture.whenStable();

    const peticion = http.expectOne(`${URL}/jornadas-extraordinarias`);
    expect(peticion.request.body).toMatchObject({
      fecha: '2027-03-16',
      horaInicio: null,
      horaFin: null,
      limosna: null,
      permiteRenovacion: true,
      permiteNuevaAlta: false,
      permiteCambio: false,
    });
    peticion.flush(reparto());
  });

  it('un reparto cerrado no admite jornadas extraordinarias', async () => {
    await crear(true, reparto({ estado: 'CERRADO', finGraciaProcesadoEn: '2027-07-01T00:00:00Z' }));

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Acciones"]'),
    ).toBeNull();
  });

  it('quien solo consulta ve el reparto y su historial, sin acciones ni plantilla', async () => {
    await crear(false, reparto({ estado: 'ABIERTO' }), [cambio]);

    expect(texto()).toContain('Reparto 2027');
    expect(texto()).toContain('Cambios del periodo de devolución (1)');
    expect(texto()).not.toContain('Plantilla del resguardo Subir');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Acciones"]'),
    ).toBeNull();
    expect(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('.mat-mdc-tab')].map((t) =>
        t.textContent?.trim(),
      ),
    ).not.toContain('Plantilla del resguardo');
  });

  it('un id que no es un número no llama al servidor', () => {
    TestBed.configureTestingModule({
      imports: [RepartoDetalle],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { puede: () => true } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RepartoDetalle);
    fixture.componentRef.setInput('id', 'abc');
    fixture.detectChanges();

    expect(texto()).toContain('No existe ese reparto.');
  });
});
