/**
 * @fileoverview Script de ejecución para la tarea programada (cron job) de promociones.
 * Este script debe ser ejecutado periódicamente por el sistema de scheduling (ej. cron del servidor).
 */

import { runPromoSchedulerJob } from '../services/promotionSchedulerService.js';
import { pool } from '../config/db.js';

/**
 * Inicializa y ejecuta la tarea programada de promociones 2x1.
 * Debe ejecutarse en un entorno aislado del servidor principal para no interferir con las peticiones web.
 */
async function runPromotionJob() {
  try {
    console.log("Iniciando Job: Verificación de Promoción 2x1 (HU-11).");

    // Es fundamental que aquí se establezca el usuario que realiza la acción en BD para la auditoría.
    const currentAdminUser = 1; // Asumimos que el admin con ID=1 es quien ejecuta este job cron.

    await runPromoSchedulerJob();

  } catch (error) {
    console.error("ERROR CRÍTICO EN JOB DE PROMOCIONES:", error);
    // Implementar lógica de notificación de fallo aquí: enviar email al equipo de soporte, etc.
  } finally {
    // Es bueno cerrar o liberar recursos si el pool lo requiere.
    await pool.end(); 
    console.log("Job de promociones completado y conexiones cerradas.");
  }
}

runPromotionJob();
