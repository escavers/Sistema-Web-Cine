import cors from 'cors';
import express from 'express';
import { testDatabaseConnection } from './config/db.js';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import ventaRoutes from './routes/venta.routes.js';
import peliculaRoutes from './routes/pelicula.routes.js';
import salaRoutes from './routes/sala.routes.js';
import funcionRoutes from './routes/funcion.routes.js';
import reporteRoutes from './routes/reporte.routes.js';

const app = express();

app.use(cors({
  origin: env.frontendUrl,
  credentials: true
}));

app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const db = await testDatabaseConnection();
    return res.json({
      ok: true,
      mensaje: 'API funcionando correctamente.',
      database: db.message
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'API activa, pero no se pudo conectar con la base de datos.',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/peliculas', peliculaRoutes);
app.use('/api/salas', salaRoutes);
app.use('/api/funciones', funcionRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api', ventaRoutes);

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: 'Ruta no encontrada.'
  });
});

export default app;
