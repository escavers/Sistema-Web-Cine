export type Rol = 'ADMINISTRADOR' | 'BOLETERIA' | 'CLIENTE' | 'ACCESO';

export interface AuthPayload {
  idUsuario: number;
  correo: string;
  idRol: Rol[];
}
