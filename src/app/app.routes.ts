import { Routes } from '@angular/router';

import { authGuard, invitadoGuard, passwordAlDiaGuard, permisoGuard } from './auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · Hermandad de la Quinta Angustia',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'cambiar-password',
    title: 'Cambiar contraseña · Hermandad de la Quinta Angustia',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/cambiar-password/cambiar-password').then((m) => m.CambiarPassword),
  },
  {
    path: '',
    canActivate: [authGuard, passwordAlDiaGuard],
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
        canActivate: [permisoGuard('importarHermanos', 'G', '/hermanos')],
        loadComponent: () => import('./hermanos/importacion/importar-hermanos').then((m) => m.ImportarHermanos),
      },
      {
        path: 'hermanos/nuevo',
        canActivate: [permisoGuard('hermanos', 'G', '/hermanos')],
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
      {
        path: 'tunicas',
        title: 'Túnicas · Hermandad de la Quinta Angustia',
        data: { titulo: 'Túnicas' },
        loadComponent: () => import('./tunicas/listado/tunicas-listado').then((m) => m.TunicasListado),
      },
      {
        path: 'administracion/usuarios',
        title: 'Usuarios · Hermandad de la Quinta Angustia',
        data: { titulo: 'Usuarios' },
        canActivate: [permisoGuard('usuarios', 'G', '/inicio')],
        loadComponent: () => import('./usuarios/listado/usuarios-listado').then((m) => m.UsuariosListado),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
