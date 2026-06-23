import type { Response } from 'express';

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ ok: true, ...data });
}

export function fail(res: Response, mensaje: string, status = 400, extra: Record<string, unknown> = {}) {
  return res.status(status).json({ ok: false, mensaje, ...extra });
}
