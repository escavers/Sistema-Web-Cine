const usuarioService = require('../services/usuario.service');

const obtenerEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = await usuarioService.obtenerEmailPorId(id);

    if (!email) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ email });
  } catch (error) {
    console.error('Error al obtener email:', error);
    next(error);
  }
};

module.exports = {
  obtenerEmail,
};
