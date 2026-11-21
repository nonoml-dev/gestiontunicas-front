import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';

import { ConfirmacionService } from './confirmacion.service';
import { ResultadoConfirmacion } from './dialogo-confirmacion';

describe('ConfirmacionService', () => {
  let servicio: ConfirmacionService;
  let emitido: ResultadoConfirmacion[];
  let completado: boolean;

  const pintar = async () => {
    TestBed.inject(ApplicationRef).tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  const boton = (clase: string) => document.querySelector<HTMLButtonElement>(`app-dialogo-confirmacion .${clase}`)!;
  const abrir = async (pedirMotivo: boolean) => {
    servicio
      .confirmar({ titulo: 'Título', destacado: 'Nombre', mensaje: 'mensaje', textoConfirmar: 'Aceptar', destructiva: true, pedirMotivo })
      .subscribe({ next: (r) => emitido.push(r), complete: () => (completado = true) });
    await pintar();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
    });
    servicio = TestBed.inject(ConfirmacionService);
    emitido = [];
    completado = false;
  });

  afterEach(async () => {
    TestBed.inject(MatDialog).closeAll();
    await pintar();
  });

  it('emite al confirmar', async () => {
    await abrir(false);
    expect(document.querySelector('app-dialogo-confirmacion')?.textContent).toContain('Nombre');

    boton('confirmar').click();
    await pintar();

    expect(emitido).toEqual([{ motivo: null }]);
    expect(completado).toBe(true);
  });

  it('no emite al cancelar', async () => {
    await abrir(false);

    boton('cancelar').click();
    await pintar();

    expect(emitido).toEqual([]);
    expect(completado).toBe(true);
  });

  it('exige el motivo y lo devuelve sin espacios sobrantes', async () => {
    await abrir(true);
    expect(boton('confirmar').disabled).toBe(true);

    const motivo = document.querySelector<HTMLTextAreaElement>('app-dialogo-confirmacion textarea')!;
    motivo.value = '   ';
    motivo.dispatchEvent(new Event('input'));
    await pintar();
    expect(boton('confirmar').disabled).toBe(true);

    motivo.value = '  Error de registro  ';
    motivo.dispatchEvent(new Event('input'));
    await pintar();
    expect(boton('confirmar').disabled).toBe(false);

    boton('confirmar').click();
    await pintar();

    expect(emitido).toEqual([{ motivo: 'Error de registro' }]);
  });
});
