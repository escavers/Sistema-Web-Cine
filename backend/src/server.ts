import app from './app.js';
import { env } from './config/env.js';
import { iniciarReportesMensuales } from './cron/reportesMensuales.js';
import { iniciarPromocionesAutomaticas } from './cron/promotionCron.js';

app.listen(env.port, () => {
  console.log(`API disponible en http://localhost:${env.port}/api`);
  console.log(`Email configurado: ${process.env.EMAIL_USER ? 'Si' : 'No'}`);
  iniciarReportesMensuales();
  iniciarPromocionesAutomaticas();
});
