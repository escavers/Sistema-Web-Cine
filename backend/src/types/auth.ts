export type Rol = 'ADMINISTRADOR' | 'BOLETERIA' | 'CLIENTE';

export interface AuthPayload {
  idUsuario: number;
  correo: string;
  idRol: Rol;
}
