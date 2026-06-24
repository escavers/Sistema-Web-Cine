import type { NextFunction, Request, Response } from 'express';
import type { Rol } from '../types/auth.js';
import { createAudit } from '../services/audit.service.js';
import { fail } from '../utils/response.js';

export function requireRoles(...rolesPermitidos: Rol[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.user;

    if (!usuario) {
      return fail(res, 'Debe iniciar sesión para continuar.', 401);
    }

    const tienePermiso = usuario.idRol.some(r => rolesPermitidos.includes(r));

    if (!tienePermiso) {
      await createAudit({
        tablaNombre: 'Usuario',
        registroId: usuario.idUsuario,
        accion: 'ROL_NO_AUTORIZADO',
        usuarioA: usuario.idUsuario,
        req,
        detalles: `Los roles [${usuario.idRol.join(', ')}] intentaron acceder a una operación permitida para: ${rolesPermitidos.join(', ')}.`
      });

      return fail(res, 'No tiene permisos para realizar esta acción.', 403);
    }

    next();
  };
}
