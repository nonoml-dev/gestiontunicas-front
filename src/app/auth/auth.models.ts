/** Datos del usuario que devuelve el backend (UsuarioDTO). */
export interface Usuario {
  id: number;
  username: string;
  nombre: string;
  apellidos: string | null;
  cargo: string;
  cargoEtiqueta: string;
  email: string | null;
  activo: boolean;
  debeCambiarPassword: boolean;
  bloqueado: boolean;
  ultimoAcceso: string | null;
  roles: string[];
}

/** Respuesta de POST /api/v1/auth/login y /refresh (LoginDTO). */
export interface Sesion {
  accessToken: string;
  tipo: string;
  expiraEn: string;
  refreshToken: string;
  refreshExpiraEn: string;
  usuario: Usuario;
}
