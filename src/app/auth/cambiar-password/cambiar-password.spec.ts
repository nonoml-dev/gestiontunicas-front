import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, provideRouter } from '@angular/router';

import { authInterceptor } from '../auth.interceptor';
import { Sesion } from '../auth.models';
import { AuthService } from '../auth.service';
import { destinoSeguro } from '../destino';
import { CambiarPassword } from './cambiar-password';

const sesion = (debeCambiarPassword: boolean, accessToken = 'token-inicial'): Sesion => ({
  accessToken,
  tipo: 'Bearer',
  expiraEn: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: 'refresh',
  refreshExpiraEn: new Date(Date.now() + 3_600_000).toISOString(),
  usuario: {
    id: 1,
    username: 'usuario.prueba',
    nombre: 'Prueba',
    apellidos: null,
    cargo: 'CAPILLER',
    cargoEtiqueta: 'Capiller',
    email: null,
    activo: true,
    debeCambiarPassword,
    bloqueado: false,
    ultimoAcceso: null,
    roles: ['CAPILLER'],
  },
});

describe('CambiarPassword', () => {
  let fixture: ComponentFixture<CambiarPassword>;
  let http: HttpTestingController;
  let auth: AuthService;
  const elemento = () => fixture.nativeElement as HTMLElement;

  const escribir = async (actual: string, nueva: string, confirmacion: string) => {
    const valores: Record<string, string> = { passwordActual: actual, passwordNueva: nueva, confirmacion };
    for (const [campo, valor] of Object.entries(valores)) {
      const input = elemento().querySelector<HTMLInputElement>(`input[formcontrolname="${campo}"]`)!;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    }
    await fixture.whenStable();
  };
  const enviar = async () => {
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  const crear = async (pendiente: boolean) => {
    sessionStorage.setItem('gestiontunicas.sesion', JSON.stringify(sesion(pendiente)));
    TestBed.configureTestingModule({
      imports: [CambiarPassword],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(CambiarPassword);
    await fixture.whenStable();
  };

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('no envía nada si las contraseñas nuevas no coinciden', async () => {
    await crear(true);
    await escribir('temporal-1', 'contrasena-nueva', 'otra-distinta');
    await enviar();

    expect(elemento().textContent).toContain('no coinciden');
    http.expectNone('/api/v1/auth/cambiar-password');
  });

  it('no envía nada si la nueva es igual que la actual o demasiado corta', async () => {
    await crear(true);
    await escribir('temporal-1', 'temporal-1', 'temporal-1');
    await enviar();
    expect(elemento().textContent).toContain('distinta de la actual');

    await escribir('temporal-1', 'corta', 'corta');
    await enviar();
    expect(elemento().textContent).toContain('al menos 8 caracteres');
    http.expectNone('/api/v1/auth/cambiar-password');
  });

  it('envía el cambio con el token, guarda la sesión nueva y sale de la pantalla', async () => {
    await crear(true);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await escribir('temporal-1', 'contrasena-nueva', 'contrasena-nueva');
    await enviar();

    const peticion = http.expectOne('/api/v1/auth/cambiar-password');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-inicial');
    expect(peticion.request.body).toEqual({ passwordActual: 'temporal-1', passwordNueva: 'contrasena-nueva' });
    peticion.flush(sesion(false, 'token-nuevo'));

    expect(auth.token()).toBe('token-nuevo');
    expect(auth.usuario()?.debeCambiarPassword).toBe(false);
    expect(navegar).toHaveBeenCalledWith('/inicio');
  });

  it('muestra el motivo si el backend lo rechaza', async () => {
    await crear(true);
    await escribir('mala-clave', 'contrasena-nueva', 'contrasena-nueva');
    await enviar();

    http
      .expectOne('/api/v1/auth/cambiar-password')
      .flush({ detail: 'La contraseña actual no es correcta' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(elemento().textContent).toContain('La contraseña actual no es correcta');
    expect(auth.usuario()?.debeCambiarPassword).toBe(true);
  });

  it('si es obligatorio no se puede cancelar', async () => {
    await crear(true);

    expect(elemento().textContent).toContain('Cerrar sesión');
    expect(elemento().textContent).not.toContain('Cancelar');
  });

  it('si es voluntario se puede cancelar', async () => {
    await crear(false);

    expect(elemento().textContent).toContain('Cancelar');
  });
});

describe('destinoSeguro', () => {
  it('solo admite rutas internas que no sean de acceso', () => {
    expect(destinoSeguro('/hermanos/7')).toBe('/hermanos/7');
    expect(destinoSeguro(null)).toBe('/inicio');
    expect(destinoSeguro('https://otro-sitio.example')).toBe('/inicio');
    expect(destinoSeguro('//otro-sitio.example')).toBe('/inicio');
    expect(destinoSeguro('/login')).toBe('/inicio');
    expect(destinoSeguro('/cambiar-password')).toBe('/inicio');
  });
});
