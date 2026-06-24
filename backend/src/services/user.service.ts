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
  nit: string | null;
  razonSocial: string | null;
  idRol: Rol[];
  estado: number | boolean;
  estadoA: number | boolean;
  fechaA: string | null;
  usuarioA: number | null;
}

export async function findUserByEmail(correo: string): Promise<UsuarioRow | null> {
  const [rows] = await pool.query(
    `
    SELECT
      u.idUsuario,
      u.nombre1,
      u.nombre2,
      u.apellidoP,
      u.apellidoM,
      u.ci,
      u.correo,
      u.telefono,
      u.fechaNacimiento,
      u.contrasena,
      u.nit,
      u.razonSocial,
      u.estado,
      u.estadoA,
      u.fechaA,
      u.usuarioA,
      GROUP_CONCAT(ur.idRol) AS idRol
    FROM Usuario u
    LEFT JOIN Usuario_Rol ur ON u.idUsuario = ur.idUsuario
    WHERE u.correo = ?
    GROUP BY u.idUsuario
    LIMIT 1
    `,
    [correo]
  );

  const raw = (rows as any[])[0] ?? null;
  if (!raw) return null;

  const user = raw as UsuarioRow;
  user.idRol = (raw.idRol ? raw.idRol.split(',') : []) as Rol[];
  return user;
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
