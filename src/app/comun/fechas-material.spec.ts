import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';

import {
  aFechaIso,
  aHora,
  deFechaIso,
  deHora,
  esAnterior,
  minutosDelDia,
  provideFechasEspanol,
} from './fechas-material';

describe('Fechas en español para Material', () => {
  let adaptador: DateAdapter<Date>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFechasEspanol()] });
    adaptador = TestBed.inject(DateAdapter<Date>);
  });

  it.each([
    ['08/03/2027', new Date(2027, 2, 8)],
    ['8/3/2027', new Date(2027, 2, 8)],
    ['08-03-2027', new Date(2027, 2, 8)],
    ['2027-03-08', new Date(2027, 2, 8)],
    [' 25/03/2027 ', new Date(2027, 2, 25)],
  ])('lee %s como día/mes/año', (texto, fecha) => {
    expect(adaptador.parse(texto, null)).toEqual(fecha);
  });

  it.each(['31/02/2027', '13/13/2027', 'mañana', '03/08'])('%s no es una fecha válida', (texto) => {
    const fecha = adaptador.parse(texto, null)!;
    expect(adaptador.isValid(fecha)).toBe(false);
  });

  it('un campo vacío no tiene fecha', () => {
    expect(adaptador.parse('', null)).toBeNull();
  });

  it('muestra las fechas como dd/MM/aaaa y las horas como HH:mm', () => {
    const formatos = TestBed.inject(MAT_DATE_FORMATS);
    expect(adaptador.format(new Date(2027, 2, 8), formatos.display.dateInput)).toBe('08/03/2027');
    expect(adaptador.format(new Date(2027, 2, 8, 18, 5), formatos.display.timeInput!)).toBe(
      '18:05',
    );
  });

  it('lee las horas escritas a mano', () => {
    const hora = adaptador.parseTime('9:30', null)!;
    expect([hora.getHours(), hora.getMinutes()]).toEqual([9, 30]);
  });

  it('la semana empieza en lunes', () => {
    expect(adaptador.getFirstDayOfWeek()).toBe(1);
  });

  it('convierte las fechas y horas al formato de la API y al revés', () => {
    expect(aFechaIso(new Date(2027, 2, 8, 23, 59))).toBe('2027-03-08');
    expect(aFechaIso(null)).toBeNull();
    expect(aFechaIso(new Date(NaN))).toBeNull();
    expect(deFechaIso('2027-03-08')).toEqual(new Date(2027, 2, 8));
    expect(deFechaIso(null)).toBeNull();
    expect(aHora(new Date(2027, 2, 8, 9, 5))).toBe('09:05');
    expect(aHora(null)).toBeNull();
    const hora = deHora('18:30:00')!;
    expect([hora.getHours(), hora.getMinutes()]).toEqual([18, 30]);
    expect(deHora('')).toBeNull();
  });

  it('compara fechas y horas', () => {
    expect(esAnterior(new Date(2027, 2, 8), new Date(2027, 2, 9))).toBe(true);
    expect(esAnterior(new Date(2027, 2, 9), new Date(2027, 2, 9))).toBe(false);
    expect(esAnterior(null, new Date(2027, 2, 9))).toBe(false);
    expect(minutosDelDia(new Date(2020, 0, 1, 18, 30))).toBe(18 * 60 + 30);
    expect(minutosDelDia(null)).toBeNull();
  });
});
