import cron from 'node-cron';
import { runPromoSchedulerJob } from '../services/promotionSchedulerService.js';

export function iniciarPromocionesAutomaticas() {
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Ejecutando verificación de promociones 2x1...');
    try {
      await runPromoSchedulerJob();
      console.log('[Cron] Verificación de promociones completada.');
    } catch (error) {
      console.error('[Cron] Error en verificación de promociones:', error);
    }
  });
  console.log('[Cron] Promociones 2x1 programadas: diario a las 03:00');
}
