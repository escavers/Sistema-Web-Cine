import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createAudit } from '../services/audit.service.js';
import type { AuthPayload } from '../types/auth.js';
import { fail } from '../utils/response.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await createAudit({
      tablaNombre: 'Usuario',
      accion: 'TOKEN_NO_ENVIADO',
      req,
      detalles: 'Intento de acceso a ruta protegida sin token.'
    });

    return fail(res, 'Debe iniciar sesión para continuar.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = jwt.verify(token, env.jwtSecret) as AuthPayload;
    next();
  } catch {
    await createAudit({
      tablaNombre: 'Usuario',
      accion: 'TOKEN_INVALIDO',
      req,
      detalles: 'Intento de acceso con token inválido o expirado.'
    });

    return fail(res, 'Su sesión venció o no es válida. Inicie sesión nuevamente.', 401);
  }
}
