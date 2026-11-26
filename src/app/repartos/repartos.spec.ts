import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { RepartosListado } from './listado/repartos-listado';
import { NuevoReparto } from './nuevo/nuevo-reparto';
import { Reparto, RepartoRequest, calcularJuevesSanto } from './reparto.models';

const URL = '/api/v1/repartos';
const URL_CONFIGURACION = '/api/v1/configuracion';

const reparto = (anio: number, cambios: Partial<Reparto> = {}): Reparto => ({
  id: anio,
  anio,
  fechaJuevesSanto: calcularJuevesSanto(anio),
  juevesSantoManual: false,
  edadMin: 10,
  edadMax: 15,
  estado: 'BORRADOR',
  periodoDevolucion: {
    inicio: `${anio}-04-05`,
    fin: `${anio}-04-30`,
    plazoGraciaMeses: 2,
    finPlazoGracia: `${anio}-06-30`,
  },
  lugarDevolucion: null,
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
      id: 1,
      numero: 1,
      extraordinaria: false,
      fecha: `${anio}-03-01`,
      horaInicio: null,
      horaFin: null,
      limosna: null,
      permiteRenovacion: true,
      permiteNuevaAlta: false,
      permiteCambio: false,
    },
    {
      id: 2,
      numero: 2,
      extraordinaria: false,
      fecha: `${anio}-03-02`,
      horaInicio: null,
      horaFin: null,
      limosna: null,
      permiteRenovacion: true,
      permiteNuevaAlta: true,
      permiteCambio: false,
    },
    {
      id: 3,
      numero: 3,
      extraordinaria: false,
      fecha: `${anio}-03-03`,
      horaInicio: null,
      horaFin: null,
      limosna: null,
      permiteRenovacion: true,
      permiteNuevaAlta: true,
      permiteCambio: true,
    },
  ],
  ...cambios,
});

const tolerancia = (valor: string) => [
  { id: 1, clave: 'reparto.tolerancia_medida_cm', valor, tipo: 'ENTERO', descripcion: null },
];

function configurar(componente: unknown, puede = true): void {
  TestBed.configureTestingModule({
    imports: [componente as never],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      { provide: AuthService, useValue: { puede: () => puede } },
    ],
  });
}

describe('calcularJuevesSanto', () => {
  it.each([
    [2026, '2026-04-02'],
    [2027, '2027-03-25'],
    [2028, '2028-04-13'],
    [2035, '2035-03-22'],
    [2038, '2038-04-22'],
  ])('en %i cae el %s', (anio, fecha) => {
    expect(calcularJuevesSanto(anio)).toBe(fecha);
  });
});

describe('RepartosListado', () => {
  let fixture: ComponentFixture<RepartosListado>;
  let http: HttpTestingController;
  const texto = () =>
    (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  async function crear(puede: boolean, repartos: Reparto[]): Promise<void> {
    configurar(RepartosListado, puede);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RepartosListado);
    fixture.detectChanges();
    http.expectOne(URL).flush(repartos);
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  it('muestra una tarjeta por reparto con su estado y sus datos', async () => {
    await crear(true, [reparto(2027, { estado: 'ABIERTO' })]);

    expect(texto()).toContain('Reparto 2027');
    expect(texto()).toContain('Abierto');
    expect(texto()).toContain('Jueves Santo25/03/2027');
    expect(texto()).toContain('01/03/2027 al 03/03/2027');
    expect(texto()).toContain('20,00 €');
    expect(texto()).toContain('Del 05/04/2027 al 30/04/2027');
    expect(texto()).toContain('Nuevo reparto');
  });

  it('sin repartos lo dice, y quien solo consulta no ve "Nuevo reparto"', async () => {
    await crear(false, []);

    expect(texto()).toContain('Todavía no hay ningún reparto.');
    expect(texto()).not.toContain('Nuevo reparto');
  });
});

describe('NuevoReparto', () => {
  let fixture: ComponentFixture<NuevoReparto>;
  let http: HttpTestingController;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const texto = () => elemento().textContent?.replace(/\s+/g, ' ') ?? '';
  const pasoActivo = () =>
    [...elemento().querySelectorAll<HTMLElement>('.mat-vertical-stepper-content')].find(
      (p) => p.getAttribute('aria-expanded') === 'true' || !p.hasAttribute('inert'),
    )!;
  const botones = (nombre: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('button')].filter(
      (b) => b.textContent?.trim() === nombre,
    );

  /** Escribe en el campo con esa etiqueta, del paso que se indique (0 = primero). */
  function escribir(etiqueta: string, valor: string, indice = 0): void {
    const campo = [...elemento().querySelectorAll<HTMLElement>('mat-form-field')].filter((f) =>
      f.querySelector('mat-label')?.textContent?.trim().startsWith(etiqueta),
    )[indice];
    const entrada = campo.querySelector<HTMLInputElement>('input')!;
    entrada.value = valor;
    entrada.dispatchEvent(new Event('input'));
    entrada.dispatchEvent(new Event('blur'));
  }

  async function siguiente(paso: number): Promise<void> {
    botones('Siguiente')[paso].click();
    await fixture.whenStable();
  }

  async function crear(repartos: Reparto[], configuracion = tolerancia('4')): Promise<void> {
    configurar(NuevoReparto);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NuevoReparto);
    fixture.detectChanges();
    http.expectOne(URL).flush(repartos);
    const config = http.expectOne((r) => r.url === URL_CONFIGURACION);
    expect(config.request.params.get('prefijo')).toBe('reparto.');
    config.flush(configuracion);
    await fixture.whenStable();
  }

  async function rellenarHastaElResumen(): Promise<void> {
    await siguiente(0);

    escribir('Fecha', '2027-03-08', 0);
    escribir('Fecha', '2027-03-09', 1);
    escribir('Fecha', '2027-03-10', 2);
    escribir('Desde', '18:00', 0);
    escribir('Hasta', '21:00', 0);
    await siguiente(1);

    await siguiente(2);

    escribir('Limosna del alquiler', '20');
    escribir('A ·', '30');
    escribir('B ·', '5');
    escribir('C ·', '10');
    escribir('D ·', '5');
    escribir('E ·', '10.5');
    escribir('F ·', '150');
    await siguiente(3);

    escribir('Devolución desde', '2027-04-05');
    escribir('Devolución hasta', '2027-04-30');
    escribir('Lugar de devolución', '  Casa de hermandad ');
    await siguiente(4);
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 26, 12));
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('propone el próximo año, su Jueves Santo, el modo transición y la tolerancia de la configuración', async () => {
    await crear([]);

    expect((elemento().querySelector('input[type=number]') as HTMLInputElement).value).toBe('2027');
    expect(texto()).toContain('Jueves Santo: 25/03/2027');
    const casillas = [...elemento().querySelectorAll<HTMLInputElement>('input[type=checkbox]')];
    expect(casillas[0].checked).toBe(false); // Fijar manualmente
    expect(casillas[1].checked).toBe(true); // Modo transición
    expect(fixture.componentInstance['edades'].getRawValue()).toEqual({
      edadMin: 10,
      edadMax: 15,
      toleranciaMedidaCm: 4,
    });
  });

  it('salta los años que ya tienen reparto y no propone el modo transición si hubo reparto el año anterior', async () => {
    await crear([reparto(2027)]);

    expect((elemento().querySelector('input[type=number]') as HTMLInputElement).value).toBe('2028');
    expect(texto()).toContain('Jueves Santo: 13/04/2028');
    expect(elemento().querySelectorAll<HTMLInputElement>('input[type=checkbox]')[1].checked).toBe(
      false,
    );
  });

  it('no deja seguir con un año que ya tiene reparto', async () => {
    await crear([reparto(2027)]);

    escribir('Año', '2027');
    await siguiente(0);

    expect(texto()).toContain('Ya existe el reparto de este año');
    expect(fixture.componentInstance['general'].valid).toBe(false);
  });

  it('el Jueves Santo fijado a mano tiene que ser del año del reparto', async () => {
    await crear([]);

    elemento().querySelectorAll<HTMLInputElement>('input[type=checkbox]')[0].click();
    await fixture.whenStable();
    expect(fixture.componentInstance['general'].controls.fechaJuevesSanto.value).toBe('2027-03-25');

    escribir('Jueves Santo', '2026-03-25');
    await fixture.whenStable();

    expect(texto()).toContain('El Jueves Santo tiene que ser del año del reparto.');
    expect(fixture.componentInstance['general'].valid).toBe(false);
  });

  it('las jornadas tienen que ir en orden y la hora de fin no puede ser anterior', async () => {
    await crear([]);
    await siguiente(0);

    escribir('Fecha', '2027-03-08', 0);
    escribir('Fecha', '2027-03-07', 1);
    escribir('Fecha', '2027-03-10', 2);
    escribir('Desde', '21:00', 0);
    escribir('Hasta', '18:00', 0);
    await fixture.whenStable();

    expect(texto()).toContain('Cada día tiene que ser posterior al anterior.');
    expect(texto()).toContain('La hora de fin no puede ser anterior a la de inicio.');
    expect(fixture.componentInstance['jornadas'].valid).toBe(false);
  });

  it('rechaza importes negativos o con más de 2 decimales', async () => {
    await crear([]);
    const importes = fixture.componentInstance['importes'];

    importes.controls.limosna.setValue(-1);
    expect(importes.controls.limosna.valid).toBe(false);
    importes.controls.limosna.setValue(20.555);
    expect(importes.controls.limosna.valid).toBe(false);
    importes.controls.limosna.setValue(20.5);
    expect(importes.controls.limosna.valid).toBe(true);
  });

  it('resume los datos y crea el reparto en borrador', async () => {
    await crear([]);
    await rellenarHastaElResumen();

    expect(texto()).toContain('Año 2027 · modo transición');
    expect(texto()).toContain('Jueves Santo 25/03/2027 (calculado)');
    expect(texto()).toContain('Día 1 08/03/2027 · 18:00–21:00 · renovaciones');
    expect(texto()).toContain('Día 3 10/03/2027 · renovaciones, nuevas altas, cambios');
    expect(texto()).toContain('Tolerancia de medida4 cm');
    expect(texto()).toContain('E · Devuelta sucia10,50 €');
    expect(texto()).toContain('Del 05/04/2027 al 30/04/2027 · Casa de hermandad');

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    botones('Crear reparto')[0].click();
    const peticion = http.expectOne(URL);
    expect(peticion.request.method).toBe('POST');
    const cuerpo = peticion.request.body as RepartoRequest;
    expect(cuerpo).toEqual({
      anio: 2027,
      fechaJuevesSanto: null,
      edadMin: 10,
      edadMax: 15,
      periodoDevolucion: { inicio: '2027-04-05', fin: '2027-04-30', plazoGraciaMeses: 2 },
      lugarDevolucion: 'Casa de hermandad',
      limosna: 20,
      tarifas: {
        importePiezaPrincipal: 30,
        importeTalega: 5,
        importeRetraso: 10,
        importeCingulo: 5,
        importeSuciedad: 10.5,
        importeCargoTotal: 150,
      },
      toleranciaMedidaCm: 4,
      modoTransicion: true,
      jornadas: [
        {
          fecha: '2027-03-08',
          horaInicio: '18:00',
          horaFin: '21:00',
          limosna: null,
          permiteRenovacion: true,
          permiteNuevaAlta: false,
          permiteCambio: false,
        },
        {
          fecha: '2027-03-09',
          horaInicio: null,
          horaFin: null,
          limosna: null,
          permiteRenovacion: true,
          permiteNuevaAlta: true,
          permiteCambio: false,
        },
        {
          fecha: '2027-03-10',
          horaInicio: null,
          horaFin: null,
          limosna: null,
          permiteRenovacion: true,
          permiteNuevaAlta: true,
          permiteCambio: true,
        },
      ],
    });
    peticion.flush(reparto(2027));
    await fixture.whenStable();

    expect(navegar).toHaveBeenCalledWith(['/repartos', 2027]);
  });

  it('muestra el error del servidor si no se puede crear', async () => {
    await crear([]);
    await rellenarHastaElResumen();

    botones('Crear reparto')[0].click();
    http
      .expectOne(URL)
      .flush({ detail: 'Ya existe el reparto de 2027' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(texto()).toContain('Ya existe el reparto de 2027');
  });
});
