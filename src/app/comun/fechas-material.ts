import {
  EnvironmentProviders,
  Injectable,
  Provider,
  makeEnvironmentProviders,
} from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatDateFormats,
  NativeDateAdapter,
} from '@angular/material/core';

/** dd/MM/aaaa (también d/M/aaaa, con / o -) o aaaa-MM-dd. */
const FECHA_ESPANOLA = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const dos = (n: number) => String(n).padStart(2, '0');

/**
 * Adaptador de fechas de Angular Material en español: escribe y lee dd/MM/aaaa, y la semana empieza en
 * lunes. El nativo lee las fechas con Date.parse, que entiende 08/03/2027 como 3 de agosto.
 */
@Injectable()
export class FechaEspanolaAdapter extends NativeDateAdapter {
  override parse(valor: unknown, formato?: object): Date | null {
    if (typeof valor === 'string') {
      const texto = valor.trim();
      if (!texto) {
        return null;
      }
      const espanola = FECHA_ESPANOLA.exec(texto);
      if (espanola) {
        return fechaLocal(+espanola[3], +espanola[2], +espanola[1]);
      }
      const iso = FECHA_ISO.exec(texto);
      if (iso) {
        return fechaLocal(+iso[1], +iso[2], +iso[3]);
      }
      return this.invalid();
    }
    return super.parse(valor, formato);
  }

  override getFirstDayOfWeek(): number {
    return 1;
  }
}

/** Fecha a las 00:00 locales, o inválida si el día no existe (31/02...). */
function fechaLocal(anio: number, mes: number, dia: number): Date {
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia
    ? fecha
    : new Date(NaN);
}

export const FORMATOS_FECHA: MatDateFormats = {
  parse: { dateInput: null, timeInput: null },
  display: {
    dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' },
    timeInput: { hour: '2-digit', minute: '2-digit' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
    timeOptionLabel: { hour: '2-digit', minute: '2-digit' },
  },
};

/**
 * Selector de fecha y de hora de Material en español, para toda la aplicación (y los tests). Los textos
 * del calendario van aparte ({@link CALENDARIO_ESPANOL}), en cada componente con datepicker, para no
 * cargar el datepicker al arrancar.
 */
export function provideFechasEspanol(): EnvironmentProviders {
  const proveedores: Provider[] = [
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    { provide: DateAdapter, useClass: FechaEspanolaAdapter },
    { provide: MAT_DATE_FORMATS, useValue: FORMATOS_FECHA },
  ];
  return makeEnvironmentProviders(proveedores);
}

/** Date → aaaa-MM-dd (día local), como lo espera la API. */
export function aFechaIso(fecha: Date | null | undefined): string | null {
  if (!fecha || isNaN(fecha.getTime())) {
    return null;
  }
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** aaaa-MM-dd de la API → Date a las 00:00 locales. */
export function deFechaIso(texto: string | null | undefined): Date | null {
  const partes = texto ? FECHA_ISO.exec(texto) : null;
  return partes ? fechaLocal(+partes[1], +partes[2], +partes[3]) : null;
}

/** Date del selector de hora → HH:mm, como lo espera la API. */
export function aHora(fecha: Date | null | undefined): string | null {
  if (!fecha || isNaN(fecha.getTime())) {
    return null;
  }
  return `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/** HH:mm o HH:mm:ss de la API → Date de hoy a esa hora, para el selector de hora. */
export function deHora(texto: string | null | undefined): Date | null {
  const partes = texto ? /^(\d{2}):(\d{2})/.exec(texto) : null;
  if (!partes) {
    return null;
  }
  const fecha = new Date();
  fecha.setHours(+partes[1], +partes[2], 0, 0);
  return fecha;
}

/** Compara dos fechas u horas por su instante; nulas o inválidas no se comparan. */
export function esAnterior(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return !!a && !!b && !isNaN(a.getTime()) && !isNaN(b.getTime()) && a.getTime() < b.getTime();
}

/** Solo la hora del día en minutos, para comparar horarios sin que importe el día. */
export function minutosDelDia(fecha: Date | null | undefined): number | null {
  return fecha && !isNaN(fecha.getTime()) ? fecha.getHours() * 60 + fecha.getMinutes() : null;
}
