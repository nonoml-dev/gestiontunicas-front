import { Injectable } from '@angular/core';

import { ImportacionApi } from '../../comun/importacion/importacion-api';
import { ImportacionFila } from './importacion.models';

/** Asistente de importación del Excel de Secretaría. */
@Injectable({ providedIn: 'root' })
export class ImportacionService extends ImportacionApi<ImportacionFila> {
  constructor() {
    super('/api/v1/hermanos/importaciones');
  }
}
