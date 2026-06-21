const pool = require('../config/db');

const obtenerFuncionesActivas = async () => {
  const [rows] = await pool.execute(
    `SELECT f.idFuncion, f.idSala, s.tipo AS salaTipo, f.idPelicula, f.fecha, f.horaInicio, f.horaFin, f.precioBase,
            p.titulo AS peliculaTitulo, p.duracionMinutos AS peliculaDuracion, p.clasificacionEdad AS peliculaClasificacion
     FROM Funcion f
     JOIN Pelicula p ON f.idPelicula = p.idPelicula
     JOIN Sala s ON f.idSala = s.idSala
     WHERE f.estadoA = 1
     ORDER BY f.fecha, f.horaInicio`
  );
  return rows;
};

const obtenerAsientosPorFuncion = async (idFuncion) => {
  const [rows] = await pool.execute(
    `SELECT
       a.idAsiento,
       a.idSala,
       a.fila,
       a.columna,
       CASE
         WHEN EXISTS(
           SELECT 1 FROM Boleto b
           WHERE b.idFuncion = f.idFuncion
             AND b.idAsiento = a.idAsiento
             AND b.estadoA = 1
         ) THEN 0
         ELSE a.estado
       END AS estado
     FROM Asiento a
     JOIN Funcion f ON a.idSala = f.idSala
     WHERE f.idFuncion = ?
     ORDER BY a.fila, a.columna`,
    [idFuncion]
  );
  return rows;
};

module.exports = {
  obtenerFuncionesActivas,
  obtenerAsientosPorFuncion,
};
