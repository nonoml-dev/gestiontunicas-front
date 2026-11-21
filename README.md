# Gestión de túnicas · Frontend

Aplicación web para gestionar el reparto anual de túnicas de la Hermandad de la Quinta Angustia. Está hecha con Angular 21 y Angular Material.

## Requisitos

- Node `^20.19`, `^22.12` o `24` y superiores.
- npm 11.
- El [backend](https://github.com/nonoml-dev/gestiontunicas-back) arrancado en `http://localhost:8080`.

No necesita variables de entorno. En desarrollo, las llamadas a `/api` se redirigen al backend con `proxy.conf.json`.

## Arranque desde cero

```powershell
npm ci
npm start
```

La aplicación queda en `http://localhost:4200`. Con el backend en perfil `dev`, se entra con el usuario `admin` y la contraseña `1234`.

## Comandos

| Comando | Uso |
|---|---|
| `npm start` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compilación de producción: ficheros estáticos en `dist/gestiontunicas-front/browser` |
| `npx ng test --watch=false` | Ejecuta los tests una vez |
| `npm test` | Ejecuta los tests y sigue vigilando los cambios |

## Despliegue

La aplicación no necesita un servidor Node: Nginx sirve los ficheros estáticos. Debe devolver `index.html` en las rutas que no sean un fichero, para que funcionen los enlaces directos y la recarga de página, y redirigir `/api` al backend.

## Trabajo con Git

- Flujo de ramas: **tarea → rama del hito → `develop`**, siempre por PR. `main` no se toca hasta la v1.0.
- Para cambiar solo mayúsculas o minúsculas de un fichero, usa `git mv -f viejo.ts Nuevo.ts`. Windows no distingue el cambio y, sin esto, el proyecto puede fallar en un clon nuevo.
- No subas nunca secretos ni ficheros con datos de hermanos.
