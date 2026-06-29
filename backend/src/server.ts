import app from './app.js';
import { env } from './config/env.js';
import { iniciarReportesMensuales } from './cron/reportesMensuales.js';

app.listen(env.port, () => {
  console.log(`API disponible en http://localhost:${env.port}/api`);
<<<<<<< HEAD
  console.log(`Email configurado: ${process.env.EMAIL_USER ? 'Si' : 'No'}`);
  iniciarReportesMensuales();
=======
>>>>>>> f5cc693 (chore: configurar gitignore y quitar archivos locales del repositorio)
});
