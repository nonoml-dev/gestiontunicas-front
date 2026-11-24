import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { Sesion, Usuario } from '../auth/auth.models';
import { DatosDialogoTunica, DialogoTunica } from './dialogo/dialogo-tunica';
import { TunicaFicha } from './ficha/tunica-ficha';
import { EstadoTunica, Tunica, TunicaRequest } from './tunica.models';

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

  function abrir(rol: string, datos: Tunica): void {
    iniciarSesion(rol);
    TestBed.configureTestingModule({ imports: [TunicaFicha], providers: proveedores });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TunicaFicha);
    fixture.componentRef.setInput('id', String(datos.id));
    fixture.detectChanges();
    http.expectOne(`${URL}/${datos.id}`).flush(datos);
    fixture.detectChanges();
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
