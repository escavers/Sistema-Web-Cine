import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { fail, ok } from '../utils/response.js';

const router = Router();

// GET /api/promociones/funciones
router.get('/funciones', authMiddleware, requireRoles('ADMINISTRADOR'), async (req: Request, res: Response) => {
  try {
    // Obtener funciones futuras o de hoy con información de la sala y película
    const query = `
      SELECT 
        f.idFuncion, 
        f.fecha, 
        f.horaInicio, 
        f.horaFin, 
        f.precioBase, 
        f.promocionActiva,
        s.idSala,
        s.tipo as salaTipo,
        s.capacidadTotal, 
        p.idPelicula,
        p.titulo as peliculaTitulo, 
        p.fechaEstreno
      FROM Funcion f
      JOIN Sala s ON f.idSala = s.idSala
      JOIN Pelicula p ON f.idPelicula = p.idPelicula
      WHERE f.estadoA = 1 
        AND f.fecha >= CURDATE()
      ORDER BY f.fecha ASC, f.horaInicio ASC
    `;

    const [funciones] = await pool.query<any[]>(query);

    // Para cada función, obtener la cantidad de boletos vendidos
    const result = [];
    for (const f of funciones) {
      const [boletos] = await pool.query<any[]>(
        `SELECT COUNT(*) as vendidos
         FROM Boleto b
         JOIN Venta v ON b.idVenta = v.idVenta
         WHERE v.idFuncion = ? AND b.estadoA = 1`,
        [f.idFuncion]
      );
      
      const vendidos = boletos[0]?.vendidos || 0;
      const capacidad = f.capacidadTotal;
      const porcentajeOcupacion = capacidad > 0 ? (vendidos / capacidad) * 100 : 0;

      // Calcular si cumple con >30 días en cartelera
      const [dateRows] = await pool.query<any[]>(
        `SELECT ? <= DATE_SUB(CURDATE(), INTERVAL 30 DAY) as masDe30Dias`,
        [f.fechaEstreno]
      );
      const masDe30Dias = dateRows[0]?.masDe30Dias === 1;

      result.push({
        idFuncion: f.idFuncion,
        fecha: f.fecha,
        horaInicio: f.horaInicio,
        horaFin: f.horaFin,
        precioBase: f.precioBase,
        promocionActiva: f.promocionActiva === 1 || f.promocionActiva === true,
        idSala: f.idSala,
        salaTipo: f.salaTipo,
        capacidadTotal: capacidad,
        vendidos,
        porcentajeOcupacion,
        idPelicula: f.idPelicula,
        peliculaTitulo: f.peliculaTitulo,
        fechaEstreno: f.fechaEstreno,
        masDe30Dias
      });
    }

    return ok(res, {
      funciones: result,
      reglas: {
        nombre: "2x1 Automático",
        condiciones: [
          "Película con más de 30 días en cartelera desde su fecha de estreno.",
          "Ocupación de la sala menor al 70% en la función evaluada."
        ]
      }
    });

  } catch (error) {
    console.error('Error al obtener funciones de promoción:', error);
    return fail(res, 'Error al obtener las funciones de promoción.', 500);
  }
});

export default router;
