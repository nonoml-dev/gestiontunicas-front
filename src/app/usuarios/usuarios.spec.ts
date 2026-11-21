import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

import { Sesion, Usuario } from '../auth/auth.models';
import { DatosDialogoUsuario, DialogoUsuario } from './dialogos/dialogo-usuario';
import { UsuariosListado } from './listado/usuarios-listado';
import { exigeNuevoAcceso } from './usuario.models';

const URL = '/api/v1/usuarios';

const usuario = (id: number, nombre: string, cambios: Partial<Usuario> = {}): Usuario => ({
  id,
  username: `usuario.${id}`,
  nombre,
  apellidos: 'Prueba',
  cargo: 'CAPILLER',
  cargoEtiqueta: 'Capiller',
  email: null,
  activo: true,
  debeCambiarPassword: false,
  bloqueado: false,
  ultimoAcceso: null,
  roles: ['CAPILLER'],
  ...cambios,
});

const admin = usuario(1, 'Admin', { roles: ['ADMIN'], cargo: 'ADMINISTRADOR', cargoEtiqueta: 'Administrador' });

const proveedores = [
  provideRouter([]),
  provideHttpClient(),
  provideHttpClientTesting(),
  { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
];

function iniciarSesion(): void {
  const sesion: Sesion = {
    accessToken: 'token',
    tipo: 'Bearer',
    expiraEn: new Date(Date.now() + 900_000).toISOString(),
    refreshToken: 'refresh',
    refreshExpiraEn: new Date(Date.now() + 3_600_000).toISOString(),
    usuario: admin,
  };
  sessionStorage.setItem('gestiontunicas.sesion', JSON.stringify(sesion));
}

describe('UsuariosListado', () => {
  let fixture: ComponentFixture<UsuariosListado>;
  let http: HttpTestingController;
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    iniciarSesion();
    TestBed.configureTestingModule({ imports: [UsuariosListado], providers: proveedores });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UsuariosListado);
    http.expectOne(URL).flush([usuario(3, 'Ángela'), admin, usuario(2, 'Benito', { activo: false })]);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('lista los usuarios por nombre y marca la cuenta propia', () => {
    const nombres = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.nombre')].map((e) => e.textContent);
    expect(nombres).toEqual(['Admin Prueba', 'Ángela Prueba', 'Benito Prueba']);
    expect(texto()).toContain('(tú)');
    expect(texto()).toContain('Inactivo');
  });

  it('busca sin distinguir acentos ni mayúsculas', async () => {
    const buscador = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type=search]')!;
    buscador.value = 'ANGELA';
    buscador.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(texto()).toContain('Ángela Prueba');
    expect(texto()).not.toContain('Benito Prueba');
  });
});

describe('DialogoUsuario', () => {
  let fixture: ComponentFixture<DialogoUsuario>;
  let http: HttpTestingController;
  const cerrar = vi.fn();
  const elemento = () => fixture.nativeElement as HTMLElement;

  const crear = async (datos: DatosDialogoUsuario) => {
    TestBed.configureTestingModule({
      imports: [DialogoUsuario],
      providers: [
        ...proveedores,
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: { close: cerrar } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DialogoUsuario);
    await fixture.whenStable();
  };
  const enviar = async () => {
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  afterEach(() => {
    http.verify();
    cerrar.mockClear();
  });

  it('al cancelar cierra sin resultado', async () => {
    await crear({ usuario: null, esPropio: false });
    elemento().querySelector<HTMLButtonElement>('button.cancelar')!.click();

    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(cerrar.mock.calls[0][0]).toBeUndefined();
    http.expectNone(URL);
  });

  it('no envía un alta incompleta', async () => {
    await crear({ usuario: null, esPropio: false });
    await enviar();

    expect(elemento().textContent).toContain('Elige al menos un rol');
    http.expectNone(URL);
  });

  it('al editar envía los campos vacíos como nulos y cierra con el resultado', async () => {
    await crear({ usuario: usuario(5, 'Carmen', { email: 'prueba@example.test' }), esPropio: false });
    const email = elemento().querySelector<HTMLInputElement>('input[formcontrolname="email"]')!;
    email.value = '  ';
    email.dispatchEvent(new Event('input'));
    await enviar();

    const peticion = http.expectOne(`${URL}/5`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body.email).toBeNull();
    const respuesta = usuario(5, 'Carmen');
    peticion.flush(respuesta);

    expect(cerrar).toHaveBeenCalledWith({ usuario: respuesta, passwordTemporal: null });
  });

  it('en la cuenta propia mantiene activo y el rol de administrador', async () => {
    await crear({ usuario: admin, esPropio: true });
    await enviar();

    const peticion = http.expectOne(`${URL}/1`);
    expect(peticion.request.body.activo).toBe(true);
    expect(peticion.request.body.roles).toEqual(['ADMIN']);
    peticion.flush(admin);
  });

  it('muestra el motivo si el backend lo rechaza', async () => {
    await crear({ usuario: usuario(5, 'Carmen'), esPropio: false });
    await enviar();

    http
      .expectOne(`${URL}/5`)
      .flush({ detail: 'Ya existe un usuario con el nombre usuario.5' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(elemento().textContent).toContain('Ya existe un usuario');
    expect(cerrar).not.toHaveBeenCalled();
  });
});

describe('exigeNuevoAcceso', () => {
  it('solo si cambian el nombre de acceso o los roles', () => {
    const base = usuario(1, 'Prueba');
    expect(exigeNuevoAcceso(base, { ...base, nombre: 'Otro' })).toBe(false);
    expect(exigeNuevoAcceso(base, { ...base, username: 'otro' })).toBe(true);
    expect(exigeNuevoAcceso(base, { ...base, roles: ['CAPILLER', 'PRIOSTE'] })).toBe(true);
  });
});
