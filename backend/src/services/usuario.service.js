const pool = require('../config/db');

const obtenerEmailPorId = async (idUsuario) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT correo FROM Usuario WHERE idUsuario = ?',
      [idUsuario]
    );
    connection.release();

    if (rows.length === 0) {
      return null;
    }

    return rows[0].correo;
  } catch (error) {
    console.error('Error al obtener email del usuario:', error);
    throw error;
  }
};

module.exports = {
  obtenerEmailPorId,
};
