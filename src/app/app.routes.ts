import { Routes } from '@angular/router';

import { authGuard, invitadoGuard, rolGuard } from './auth/auth.guards';
import { ROLES_GESTION_HERMANOS } from './hermanos/hermano.models';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · Hermandad de la Quinta Angustia',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        title: 'Inicio · Hermandad de la Quinta Angustia',
        data: { titulo: 'Inicio' },
        loadComponent: () => import('./inicio/inicio').then((m) => m.Inicio),
      },
      {
        path: 'hermanos',
        title: 'Hermanos · Hermandad de la Quinta Angustia',
        data: { titulo: 'Hermanos' },
        loadComponent: () => import('./hermanos/listado/hermanos-listado').then((m) => m.HermanosListado),
      },
      {
        path: 'hermanos/importar',
        title: 'Importar Excel · Hermandad de la Quinta Angustia',
        data: { titulo: 'Hermanos' },
        canActivate: [rolGuard(ROLES_GESTION_HERMANOS, '/hermanos')],
        loadComponent: () => import('./hermanos/importacion/importar-hermanos').then((m) => m.ImportarHermanos),
      },
      {
        path: 'hermanos/nuevo',
        canActivate: [rolGuard(ROLES_GESTION_HERMANOS, '/hermanos')],
        title: 'Nuevo hermano · Hermandad de la Quinta Angustia',
        data: { titulo: 'Hermanos' },
        loadComponent: () => import('./hermanos/detalle/hermano-detalle').then((m) => m.HermanoDetalle),
      },
      {
        path: 'hermanos/:id',
        title: 'Hermano · Hermandad de la Quinta Angustia',
        data: { titulo: 'Hermanos' },
        loadComponent: () => import('./hermanos/detalle/hermano-detalle').then((m) => m.HermanoDetalle),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
