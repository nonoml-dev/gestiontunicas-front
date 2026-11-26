import { Injectable, Provider } from '@angular/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';

/** Textos del calendario en español. */
@Injectable()
export class CalendarioEspanol extends MatDatepickerIntl {
  override calendarLabel = 'Calendario';
  override openCalendarLabel = 'Abrir el calendario';
  override closeCalendarLabel = 'Cerrar el calendario';
  override prevMonthLabel = 'Mes anterior';
  override nextMonthLabel = 'Mes siguiente';
  override prevYearLabel = 'Año anterior';
  override nextYearLabel = 'Año siguiente';
  override prevMultiYearLabel = '24 años anteriores';
  override nextMultiYearLabel = '24 años siguientes';
  override switchToMonthViewLabel = 'Elegir día';
  override switchToMultiYearViewLabel = 'Elegir mes y año';
  override startDateLabel = 'Fecha de inicio';
  override endDateLabel = 'Fecha de fin';
}

/** Se pone en {@code providers} de cada componente que usa {@code mat-datepicker}. */
export const CALENDARIO_ESPANOL: Provider = {
  provide: MatDatepickerIntl,
  useClass: CalendarioEspanol,
};
