import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { Sesion, Usuario } from '../auth/auth.models';
import { DialogoReparacion } from './dialogo/dialogo-reparacion';
import { DatosDialogoTunica, DialogoTunica } from './dialogo/dialogo-tunica';
import { TunicaFicha } from './ficha/tunica-ficha';
import {
  EstadoTunica,
  Reparacion,
  ReparacionRequest,
  Tunica,
  TunicaRequest,
} from './tunica.models';

const URL = '/api/v1/tunicas';

const proveedores = [
  provideRouter([]),
  provideHttpClient(),
  provideHttpClientTesting(),
  { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
];

const tunica = (cambios: Partial<Tunica> = {}): Tunica => ({
  id: 7,
  codigo: '42',
  monaguillo: false,
  medidaCm: 158,
  dobladilloCm: 6,
  medidaTotalCm: 164,
  estado: 'DISPONIBLE',
  fechaAlta: '2026-11-24',
  fechaBaja: null,
  motivoBaja: null,
  fechaPropiedad: null,
  observaciones: null,
  // Desordenadas a propósito: la ficha las muestra en el orden fijo.
  piezas: [
    { id: 5, tipo: 'TALEGA', estado: 'BUEN_ESTADO', observaciones: null },
    { id: 1, tipo: 'TUNICA', estado: 'BUEN_ESTADO', observaciones: null },
    { id: 2, tipo: 'CAPA', estado: 'DETERIORADA', observaciones: null },
    { id: 3, tipo: 'ANTIFAZ', estado: 'BUEN_ESTADO', observaciones: null },
    { id: 4, tipo: 'CINGULO', estado: 'PERDIDA', observaciones: null },
  ],
  ...cambios,
});

const reparacion = (cambios: Partial<Reparacion> = {}): Reparacion => ({
  id: 1,
  piezaId: 2,
  tipoPieza: 'CAPA',
  devolucionId: null,
  tipo: 'REPARACION',
  descripcion: 'Escudo JHS despegado',
  estado: 'PENDIENTE',
  fechaInicio: '2026-11-18',
  fechaFin: null,
  coste: null,
  ...cambios,
});

function iniciarSesion(rol: string): void {
  const usuario: Usuario = {
    id: 1,
    username: 'usuario.prueba',
    nombre: 'Usuario',
    apellidos: 'Prueba',
    cargo: 'CAPILLER',
    cargoEtiqueta: 'Capiller',
    email: null,
    activo: true,
    debeCambiarPassword: false,
    bloqueado: false,
    ultimoAcceso: null,
    roles: [rol],
  };
  const sesion: Sesion = {
    accessToken: 'token',
    tipo: 'Bearer',
    expiraEn: new Date(Date.now() + 900_000).toISOString(),
    refreshToken: 'refresh',
    refreshExpiraEn: new Date(Date.now() + 3_600_000).toISOString(),
    usuario,
  };
  sessionStorage.setItem('gestiontunicas.sesion', JSON.stringify(sesion));
}

describe('TunicaFicha', () => {
  let fixture: ComponentFixture<TunicaFicha>;
  let http: HttpTestingController;
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const boton = (nombre: string) =>
    document.querySelector<HTMLElement>(`[aria-label="${nombre}"]`) ??
    [...document.querySelectorAll<HTMLElement>('button')].find((b) =>
      b.textContent?.includes(nombre),
    );

  function abrir(rol: string, datos: Tunica, reparaciones: Reparacion[] = []): void {
    iniciarSesion(rol);
    TestBed.configureTestingModule({ imports: [TunicaFicha], providers: proveedores });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TunicaFicha);
    fixture.componentRef.setInput('id', String(datos.id));
    fixture.detectChanges();
    cargar(datos, reparaciones);
  }

  /** Respuestas a la carga de la ficha: la túnica y sus reparaciones. */
  function cargar(datos: Tunica, reparaciones: Reparacion[]): void {
    http.expectOne(`${URL}/${datos.id}`).flush(datos);
    http.expectOne(`${URL}/${datos.id}/reparaciones`).flush(reparaciones);
    fixture.detectChanges();
  }

  async function abrirPestana(nombre: string): Promise<void> {
    [...document.querySelectorAll<HTMLElement>('.mat-mdc-tab')]
      .find((t) => t.textContent?.includes(nombre))!
      .click();
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('muestra la medida total y las 5 piezas en orden con su estado', () => {
    abrir('CAPILLER', tunica());

    expect(texto()).toContain('Túnica 42');
    expect(texto().replace(/\s+/g, ' ')).toContain('158 + 6 = 164 cm');
    const piezas = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.pieza')].map(
      (p) =>
        `${p.querySelector('.nombre')?.textContent?.trim()}: ${p.querySelector('mat-chip')?.textContent?.trim()}`,
    );
    expect(piezas).toEqual([
      'Túnica: Buen estado',
      'Capa: Deteriorada',
      'Antifaz: Buen estado',
      'Cíngulo: Perdida',
      'Talega: Buen estado',
    ]);
  });

  it('el capiller solo consulta: no ve las acciones', () => {
    abrir('CAPILLER', tunica());
    expect(boton('Acciones')).toBeFalsy();
  });

  it.each<[EstadoTunica, boolean, boolean]>([
    ['DISPONIBLE', true, true],
    ['EN_REPARACION', true, true],
    ['ALQUILADA', true, false],
    ['BAJA', true, false],
  ])('con la túnica %s el prioste puede editar (%s) y dar de baja (%s)', (estado, editar, baja) => {
    abrir('PRIOSTE', tunica({ estado }));
    boton('Acciones')!.click();
    fixture.detectChanges();
    expect(!!boton('Editar')).toBe(editar);
    expect(!!boton('Dar de baja')).toBe(baja);
  });

  it('una túnica que es propiedad de un hermano no tiene acciones', () => {
    abrir('ADMIN', tunica({ estado: 'PROPIEDAD_HERMANO', fechaPropiedad: '2027-06-20' }));
    expect(boton('Acciones')).toBeFalsy();
    expect(texto()).toContain('Propiedad del hermano desde');
  });

  it('dar de baja pide el motivo y muestra la túnica actualizada', async () => {
    abrir('PRIOSTE', tunica());
    boton('Acciones')!.click();
    fixture.detectChanges();
    boton('Dar de baja')!.click();
    await fixture.whenStable();

    const motivo = document.querySelector<HTMLTextAreaElement>('mat-dialog-container textarea')!;
    motivo.value = 'Rota sin arreglo';
    motivo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLButtonElement>('mat-dialog-container button')]
      .find((b) => b.textContent?.includes('Dar de baja'))!
      .click();
    await fixture.whenStable();

    const baja = http.expectOne(`${URL}/7/baja`);
    expect(baja.request.body).toEqual({ motivo: 'Rota sin arreglo' });
    baja.flush(tunica({ estado: 'BAJA', fechaBaja: '2026-11-24', motivoBaja: 'Rota sin arreglo' }));
    await fixture.whenStable();
    expect(texto()).toContain('Motivo de la baja');
    expect(texto()).toContain('Rota sin arreglo');
  });

  it('lista las reparaciones con su estado y cuenta las abiertas', async () => {
    abrir('CAPILLER', tunica(), [
      reparacion({ id: 2, estado: 'EN_CURSO' }),
      reparacion({
        id: 1,
        tipoPieza: 'TALEGA',
        tipo: 'REPOSICION',
        estado: 'FINALIZADA',
        fechaFin: '2026-11-20',
      }),
    ]);

    await abrirPestana('Reparaciones');

    expect(texto()).toContain('Reparaciones (1 abierta)');
    expect(texto()).toContain('Capa · Reparación');
    expect(texto()).toContain('Escudo JHS despegado');
    expect(texto()).toContain('Talega · Reposición');
    expect(texto()).toContain('terminada el 20/11/2026');
    // El capiller solo consulta
    expect(document.querySelector('[aria-label^="Acciones de la reparación"]')).toBeNull();
  });

  it('marcar como terminada envía la fecha de hoy y recarga la túnica', async () => {
    const abierta = reparacion({ id: 2, estado: 'PENDIENTE' });
    abrir('PRIOSTE', tunica({ estado: 'EN_REPARACION' }), [abierta]);
    await abrirPestana('Reparaciones');

    (
      document.querySelector('[aria-label="Acciones de la reparación de Capa"]') as HTMLElement
    ).click();
    await fixture.whenStable();
    expect(boton('Marcar en curso')).toBeTruthy();
    boton('Marcar como terminada')!.click();

    const peticion = http.expectOne(`${URL}/7/reparaciones/2`);
    expect(peticion.request.method).toBe('PUT');
    const cuerpo = peticion.request.body as ReparacionRequest;
    expect(cuerpo.estado).toBe('FINALIZADA');
    expect(cuerpo.fechaFin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cuerpo.descripcion).toBe('Escudo JHS despegado');
    peticion.flush({ ...abierta, estado: 'FINALIZADA', fechaFin: cuerpo.fechaFin });

    cargar(tunica({ estado: 'DISPONIBLE' }), [
      { ...abierta, estado: 'FINALIZADA', fechaFin: cuerpo.fechaFin },
    ]);
    expect(texto()).toContain('Disponible');
    expect(texto()).not.toContain('abierta');
  });

  it('registrar una reparación solo se ofrece si la túnica no está de baja', () => {
    abrir('PRIOSTE', tunica({ estado: 'BAJA', fechaBaja: '2026-11-24', motivoBaja: 'Rota' }));
    boton('Acciones')!.click();
    fixture.detectChanges();
    expect(boton('Registrar reparación')).toBeFalsy();
  });
});

describe('DialogoTunica', () => {
  let fixture: ComponentFixture<DialogoTunica>;
  let http: HttpTestingController;
  let cerrada: Tunica | undefined;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const campo = (nombre: string) =>
    elemento().querySelector<HTMLInputElement>(`[formcontrolname="${nombre}"]`)!;

  function abrir(datos: DatosDialogoTunica): void {
    vi.useFakeTimers();
    cerrada = undefined;
    TestBed.configureTestingModule({
      imports: [DialogoTunica],
      providers: [
        ...proveedores,
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: { close: (t: Tunica) => (cerrada = t) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DialogoTunica);
    fixture.detectChanges();
  }

  function escribir(nombre: string, valor: string): void {
    const input = campo(nombre);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('calcula la medida total mientras se escribe', () => {
    abrir({ tunica: null });
    expect(elemento().textContent).toContain('indica la medida y el dobladillo');

    escribir('medidaCm', '158');
    escribir('dobladilloCm', '6');
    expect(elemento().textContent).toContain('158 + 6 = 164 cm');

    escribir('medidaCm', '30');
    expect(elemento().textContent).toContain('indica la medida y el dobladillo');
  });

  it('avisa si el código fue de un hermano, sin impedir el alta', () => {
    abrir({ tunica: null });
    escribir('codigo', '42');
    vi.advanceTimersByTime(300);
    http.expectOne(`${URL}/aviso-codigo?codigo=42`).flush({ codigo: '42', fueDeHermano: true });
    fixture.detectChanges();
    expect(elemento().textContent).toContain(
      'Este código era de una túnica que ahora es propiedad de un hermano',
    );

    escribir('medidaCm', '158');
    escribir('dobladilloCm', '6');
    (elemento().querySelector('button[type=submit]') as HTMLButtonElement).click();

    const alta = http.expectOne(URL);
    expect(alta.request.method).toBe('POST');
    expect(alta.request.body).toEqual<TunicaRequest>({
      codigo: '42',
      medidaCm: 158,
      dobladilloCm: 6,
      fechaAlta: null,
      observaciones: null,
    });
    alta.flush(tunica());
    expect(cerrada?.id).toBe(7);
  });

  it('normaliza el código de monaguillo y no consulta códigos no válidos', () => {
    abrir({ tunica: null });
    escribir('codigo', '1000');
    vi.advanceTimersByTime(300);
    http.expectNone((r) => r.url.endsWith('aviso-codigo'));
    expect(elemento().textContent).not.toContain('Este código era');

    escribir('codigo', 'm-12');
    campo('codigo').dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(campo('codigo').value).toBe('M-012');
    vi.advanceTimersByTime(300);
    http
      .expectOne(`${URL}/aviso-codigo?codigo=M-012`)
      .flush({ codigo: 'M-012', fueDeHermano: false });
  });

  it('al editar no avisa por su propio código y guarda con PUT', () => {
    abrir({ tunica: tunica({ observaciones: 'Botón flojo' }) });
    expect(elemento().textContent).toContain('158 + 6 = 164 cm');
    escribir('dobladilloCm', '8');
    vi.advanceTimersByTime(300);
    http.expectNone((r) => r.url.endsWith('aviso-codigo'));

    (elemento().querySelector('button[type=submit]') as HTMLButtonElement).click();
    const edicion = http.expectOne(`${URL}/7`);
    expect(edicion.request.method).toBe('PUT');
    expect(edicion.request.body).toEqual<TunicaRequest>({
      codigo: '42',
      medidaCm: 158,
      dobladilloCm: 8,
      fechaAlta: null,
      observaciones: 'Botón flojo',
    });
    edicion.flush(tunica({ dobladilloCm: 8, medidaTotalCm: 166 }));
  });

  it('muestra el motivo si el código ya está en uso', () => {
    abrir({ tunica: null });
    escribir('codigo', '42');
    vi.advanceTimersByTime(300);
    http.expectOne(`${URL}/aviso-codigo?codigo=42`).flush({ codigo: '42', fueDeHermano: false });
    escribir('medidaCm', '158');
    (elemento().querySelector('button[type=submit]') as HTMLButtonElement).click();
    http
      .expectOne(URL)
      .flush(
        { detail: 'Ya hay una túnica en el inventario con el código 42' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();
    expect(elemento().textContent).toContain('Ya hay una túnica en el inventario con el código 42');
    expect(cerrada).toBeUndefined();
  });
});

describe('DialogoReparacion', () => {
  let fixture: ComponentFixture<DialogoReparacion>;
  let http: HttpTestingController;
  let cerrada: Reparacion | undefined;
  const elemento = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    cerrada = undefined;
    TestBed.configureTestingModule({
      imports: [DialogoReparacion],
      providers: [
        ...proveedores,
        { provide: MAT_DIALOG_DATA, useValue: { tunica: tunica() } },
        { provide: MatDialogRef, useValue: { close: (r: Reparacion) => (cerrada = r) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DialogoReparacion);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('pide la pieza y la descripción antes de registrar', async () => {
    (elemento().querySelector('button[type=submit]') as HTMLButtonElement).click();
    await fixture.whenStable();

    http.expectNone(`${URL}/7/reparaciones`);
    expect(elemento().textContent).toContain('Elige la pieza');
    expect(elemento().textContent).toContain('Describe qué hay que hacer');
  });

  it('registra la reposición de la pieza elegida, pendiente y con fecha de hoy', async () => {
    (elemento().querySelector('mat-select') as HTMLElement).click();
    await fixture.whenStable();
    const opciones = [...document.querySelectorAll<HTMLElement>('mat-option')];
    // Cada opción muestra el estado actual de la pieza
    expect(opciones.map((o) => o.textContent?.trim())).toContain('Cíngulo · Perdida');
    opciones.find((o) => o.textContent?.includes('Cíngulo'))!.click();
    [...elemento().querySelectorAll<HTMLButtonElement>('mat-button-toggle button')]
      .find((b) => b.textContent?.includes('Reposición'))!
      .click();
    const descripcion = elemento().querySelector('textarea')!;
    descripcion.value = '  Cíngulo nuevo  ';
    descripcion.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    (elemento().querySelector('button[type=submit]') as HTMLButtonElement).click();

    const peticion = http.expectOne(`${URL}/7/reparaciones`);
    const cuerpo = peticion.request.body as ReparacionRequest;
    expect(cuerpo).toEqual({
      tipoPieza: 'CINGULO',
      tipo: 'REPOSICION',
      descripcion: 'Cíngulo nuevo',
      estado: null,
      fechaInicio: cuerpo.fechaInicio,
      fechaFin: null,
      coste: null,
    });
    expect(cuerpo.fechaInicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    peticion.flush(reparacion({ id: 9, tipoPieza: 'CINGULO', tipo: 'REPOSICION' }));
    expect(cerrada?.id).toBe(9);
  });
});
