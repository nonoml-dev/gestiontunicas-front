import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // El login no depende de la sesión: se puede generar de antemano.
  { path: 'login', renderMode: RenderMode.Prerender },
  // El resto depende de la sesión, que solo existe en el navegador (sessionStorage).
  { path: '**', renderMode: RenderMode.Client },
];
