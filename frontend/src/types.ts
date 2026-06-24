export type Rol = 'ADMINISTRADOR' | 'BOLETERIA' | 'CLIENTE' | 'ACCESO';

export interface AuthUser {
  idUsuario: number;
  nombreCompleto: string;
  correo: string;
  idRol: Rol | Rol[] | string;
  ci: string | null;
  telefono: string | null;
}

export interface Usuario {
  idUsuario: number;
  nombre1: string;
  nombre2: string | null;
  apellidoP: string;
  apellidoM: string | null;
  ci: string | null;
  correo: string;
  telefono: string | null;
  fechaNacimiento: string | null;
  nit: string | null;
  razonSocial: string | null;
  idRol: Rol[];
  estado: boolean | number;
  estadoA: boolean | number;
  fechaA: string | null;
  usuarioA: number | null;
}

export interface LoginResponse {
  ok: boolean;
  mensaje: string;
  token: string;
  usuario: AuthUser;
}
