import { Usuario } from '../auth/auth.models';

export const ROLES_ADMINISTRACION = ['ADMIN'];

/** Lista cerrada de cargos (CargoUsuarioEnum). */
export const CARGOS = [
  { codigo: 'PRIOSTE_PRIMERO', etiqueta: 'Prioste primero' },
  { codigo: 'PRIOSTE_SEGUNDO', etiqueta: 'Prioste segundo' },
  { codigo: 'MAYORDOMO', etiqueta: 'Mayordomo' },
  { codigo: 'SECRETARIO', etiqueta: 'Secretario' },
  { codigo: 'CAPILLER', etiqueta: 'Capiller' },
  { codigo: 'ADMINISTRADOR', etiqueta: 'Administrador' },
] as const;

/** Los 5 roles fijos (decisión D2). */
export const ROLES = [
  { codigo: 'ADMIN', etiqueta: 'Administrador' },
  { codigo: 'PRIOSTE', etiqueta: 'Prioste' },
  { codigo: 'MAYORDOMO', etiqueta: 'Mayordomo' },
  { codigo: 'SECRETARIO', etiqueta: 'Secretario' },
  { codigo: 'CAPILLER', etiqueta: 'Capiller' },
] as const;

/** Cuerpo de POST y PUT /api/v1/usuarios (UsuarioRequest). */
export interface UsuarioRequest {
  username: string;
  nombre: string;
  apellidos: string | null;
  cargo: string;
  email: string | null;
  activo: boolean;
  roles: string[];
}

/** Respuesta al crear o restablecer: la contraseña temporal solo llega esta vez. */
export interface UsuarioCreado {
  usuario: Usuario;
  passwordTemporal: string;
}

export function etiquetaRol(codigo: string): string {
  return ROLES.find((rol) => rol.codigo === codigo)?.etiqueta ?? codigo;
}

export function aRequest(usuario: Usuario): UsuarioRequest {
  const { username, nombre, apellidos, cargo, email, activo, roles } = usuario;
  return { username, nombre, apellidos, cargo, email, activo, roles };
}

/** El backend cierra las sesiones del usuario si cambian su nombre de acceso o sus roles. */
export function exigeNuevoAcceso(antes: Usuario, despues: Usuario): boolean {
  const mismosRoles =
    antes.roles.length === despues.roles.length && antes.roles.every((rol) => despues.roles.includes(rol));
  return antes.username !== despues.username || !mismosRoles;
}
