import { pool } from '../config/db.js';
import type { RowDataPacket } from 'mysql2';
import type { Rol } from '../types/auth.js';

export interface UsuarioRow extends RowDataPacket {
  idUsuario: number;
  nombre1: string;
  nombre2: string | null;
  apellidoP: string;
  apellidoM: string | null;
  ci: string | null;
  correo: string;
  telefono: string | null;
  fechaNacimiento: string | null;
  contrasena: string;
  idRol: Rol;
  estado: number | boolean;
  estadoA: number | boolean;
  fechaA: string | null;
  usuarioA: number | null;
}

export async function findUserByEmail(correo: string): Promise<UsuarioRow | null> {
  const [rows] = await pool.query<UsuarioRow[]>(
    `
    SELECT
      idUsuario,
      nombre1,
      nombre2,
      apellidoP,
      apellidoM,
      ci,
      correo,
      telefono,
      fechaNacimiento,
      contrasena,
      idRol,
      estado,
      estadoA,
      fechaA,
      usuarioA
    FROM Usuario
    WHERE correo = ?
    LIMIT 1
    `,
    [correo]
  );

  return rows[0] ?? null;
}

export function publicUser(usuario: UsuarioRow) {
  return {
    idUsuario: usuario.idUsuario,
    nombreCompleto: `${usuario.nombre1} ${usuario.apellidoP}`.trim(),
    correo: usuario.correo,
    idRol: usuario.idRol,
    ci: usuario.ci,
    telefono: usuario.telefono
  };
}
