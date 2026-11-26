import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';

import { routes } from './app.routes';
import { provideFechasEspanol } from './comun/fechas-material';
import { authInterceptor } from './auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // Selectores de fecha y hora de Material en español (dd/MM/aaaa, lunes primero).
    provideFechasEspanol(),
    // Iconos Material Symbols Outlined (DESIGN.md §2.4).
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } },
  ],
};
