import type { Request } from 'express';
import { pool } from '../config/db.js';

interface AuditInput {
  tablaNombre: string | null;
  registroId?: string | number | null;
  accion: string;
  campo?: string | null;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  usuarioA?: number | null;
  req?: Request;
  detalles?: string;
}

function getIp(req?: Request): string | null {
  if (!req) return null;

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || null;
}

function toText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export async function createAudit(data: AuditInput): Promise<void> {
  try {
    const userAgent = data.req?.headers['user-agent'];
    const detalles = data.detalles
      ? `${data.detalles}${userAgent ? ` | Navegador: ${userAgent}` : ''}`.slice(0, 500)
      : (userAgent ? `Navegador: ${userAgent}` : null);

    await pool.query(
      `
      INSERT INTO Auditoria
      (
        TablaNombre,
        RegistroId,
        Accion,
        Campo,
        ValorAnterior,
        ValorNuevo,
        UsuarioA,
        FechaA,
        DireccionIP,
        Detalles
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
      `,
      [
        data.tablaNombre,
        data.registroId === undefined || data.registroId === null ? null : String(data.registroId),
        data.accion,
        data.campo ?? null,
        toText(data.valorAnterior),
        toText(data.valorNuevo),
        data.usuarioA ?? null,
        getIp(data.req),
        detalles
      ]
    );
  } catch (error) {
    console.error('No se pudo registrar auditoría:', error);
  }
}
