# Informe Técnico de Actualizaciones y Ajustes de Seguridad (Desarrollador 4)

**Fecha:** 1 de julio de 2026  
**Autor:** Desarrollador 4 (D4)  
**Módulo:** Seguridad, Autenticación, Promociones y Validación de Boletos  

---

## 1. Resumen Ejecutivo
El presente informe documenta las modificaciones arquitectónicas, de base de datos y de interfaz de usuario implementadas por el **Desarrollador 4** para resolver de forma definitiva las observaciones de Control de Calidad (QA). Los ajustes se centran en:
1. Asegurar la lógica automática del 2x1 (Historias HU-11, cubriendo su activación y su desactivación por capacidad límite).
2. Cerrar vulnerabilidades críticas de control de acceso a información de boletos de terceros (BOLA / IDOR).
3. Resolver inconsistencias visuales y problemas de responsividad del frontend en la visualización de boletos QR y pases manuales (HU-16).
4. Correcciones de segunda ronda tras nueva revisión de QA: validación de fechas, lógica de ventana de acceso, vista de promociones agrupada por película y compatibilidad con cámara real en dispositivos móviles.

---

## 2. Lógica Automática 2x1 (HU-11) y Correcciones Realizadas

### 2.1. Lógica Automática de Desactivación (Escenario 3)
*   **Problema reportado:** El job automático no cubría el escenario donde la ocupación de la función alcanza o supera el 70%, manteniendo la promoción activa incorrectamente.
*   **Corrección en Backend:**
    *   Se creó y exportó la función modular `evaluarPromocionFuncion` en [promotionSchedulerService.ts](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/backend/src/services/promotionSchedulerService.ts).
    *   Esta función recalcula y actualiza la columna `promocionActiva` basándose en:
        1. La antigüedad de la película (debe ser mayor a 30 días desde la fecha de estreno).
        2. La ocupación de asientos activos (debe ser estrictamente menor al 70%).
    *   Si se supera el 70% de ocupación o no se cumple la fecha de cartelera, la promoción se cambia inmediatamente a `0` (desactivada).
    *   Se integró este recálculo en tiempo real en [venta.controller.ts](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/backend/src/controllers/venta.controller.ts) (`crearVenta`), por lo que tan pronto una compra cruza el umbral del 70%, la promoción queda desactivada de inmediato para el siguiente comprador.

### 2.2. Panel Informativo de Promociones — Vista Agrupada por Película (HU-11)
*   **Problema reportado (ronda 2):** La página de promociones mostraba todas las funciones en una tabla plana con demasiados registros. El filtro por nombre de película fallaba con títulos que contienen tildes (ej. buscar "pacifico" no encontraba "Pacífico"). El administrador no podía identificar rápidamente qué películas tienen 2x1 activo.
*   **Correcciones en Frontend** — [PromocionesPage.tsx](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/frontend/src/pages/PromocionesPage.tsx):
    *   Se implementó la función `normalizeStr` que elimina tildes y convierte a minúsculas antes de comparar, haciendo la búsqueda completamente insensible a acentos.
    *   Se rediseñó la vista: las funciones ahora se agrupan por película en tarjetas acordeón expandibles. Cada película muestra un badge de resumen (ej. `🔥 3 con 2x1`) y al expandirla se visualiza la tabla de sus funciones individuales con fecha, sala, ocupación y estado 2x1.
    *   El endpoint `/api/promociones/funciones` fue actualizado para incluir `idPelicula` en la respuesta, permitiendo una agrupación confiable por ID y no solo por título.

---

## 3. Seguridad - Mitigación de Vulnerabilidad IDOR / BOLA
*   **Problema reportado:** El endpoint `GET /api/ventas/:id/boletos` carecía de verificación de propiedad, permitiendo a cualquier cliente autenticado ver los boletos y códigos de acceso (`codigoAcceso`) de otros usuarios cambiando el ID en la URL.
*   **Corrección en Backend:**
    *   Refactorizamos `obtenerBoletosPorVenta` en [venta.controller.ts](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/backend/src/controllers/venta.controller.ts).
    *   Ahora se recupera la venta de la base de datos y se verifica si el `idCliente` de la misma coincide con el `idUsuario` del cliente que realiza la petición (del token JWT).
    *   Solo se permite el acceso a la información si es el propietario de la compra, o bien si el usuario posee roles de gestión (`ADMINISTRADOR`, `BOLETERIA` o `ACCESO`). Caso contrario, se responde con un código **403 Forbidden**.

---

## 4. Mejoras Visuales, Responsividad y Corrección de Formatos

### 4.1. Remoción de Tags de Desarrollo (HU-16)
*   **Problema reportado:** El identificador del requerimiento `(HU-16)` se renderizaba explícitamente en el subtítulo del control de acceso.
*   **Corrección:** Se editó [AccessValidationPage.tsx](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/frontend/src/pages/AccessValidationPage.tsx) para retirar la etiqueta del texto final que ve el usuario.

### 4.2. Responsividad del Modal de QR y Botón de Volver
*   **Problema reportado:** En resoluciones de baja altura o dispositivos móviles, la vista emergente del boleto se recortaba, impidiendo visualizar el botón "Volver" para salir de ella.
*   **Corrección:** 
    *   Se agregó la propiedad `max-h-[90vh] overflow-y-auto` a los modales en [CompraOnlinePage.tsx](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/frontend/src/pages/CompraOnlinePage.tsx) y [VentaPresencialPage.tsx](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/frontend/src/pages/VentaPresencialPage.tsx).
    *   Se programó el cierre automático del modal al hacer clic fuera del boleto (sobre el fondo oscuro), mejorando significativamente la usabilidad y responsividad.

### 4.3. Claridad del Botón de Ticket Térmico
*   **Problema reportado:** El botón representado por un simple emoji `🎟️` resultaba confuso y difícil de interpretar.
*   **Corrección:** Se modificó en [HistorialPage.tsx](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/frontend/src/pages/HistorialPage.tsx) para desplegar un botón visible y etiquetado como `🎟️ Térmico`.

---

## 5. Validación de Acceso QR (HU-16) — Correcciones de Segunda Ronda

### 5.1. Inconsistencias en la Comprobación de Hora de Acceso
*   **Problema reportado:** El proceso de verificación de boletos presentaba inconsistencias en la validación de hora. El sistema rechazaba boletos válidos (motivo `FUNCION_EXPIRADA`) cuando el usuario llegaba a la sala antes de la hora de inicio de la función. La comparación de strings de tiempo independientes era propensa a errores en ciertos escenarios.
*   **Corrección en Backend** — [accessController.ts](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/backend/src/controllers/accessController.ts):
    *   Se reemplazó la validación de fecha y hora basada en strings separados por una comparación unificada con objetos `Date` de JavaScript.
    *   Se implementa correctamente el cruce de medianoche (funciones que terminan después de las 00:00).
    *   Se establece una **ventana de acceso de 30 minutos antes del inicio** de la función, eliminando el falso rechazo al llegar temprano.
    *   Se agrega el nuevo motivo `FUNCION_NO_INICIADA` para informar al encargado con el tiempo exacto de espera restante.

### 5.2. Mensaje de Acceso Exitoso no Visible
*   **Problema reportado:** Aun cuando el boleto era válido, el sistema no mostraba visualmente que el acceso había sido concedido.
*   **Corrección en Frontend** — [AccessValidationPage.tsx](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/frontend/src/pages/AccessValidationPage.tsx):
    *   Los motivos de rechazo ahora se muestran con etiquetas legibles en español en lugar del código técnico interno.
    *   El motivo `FUNCION_NO_INICIADA` muestra un aviso en color ámbar (advertencia) en lugar de rojo (denegación total), diferenciando semánticamente ambos casos.

### 5.3. Compatibilidad con Cámara Real (Droidcam / Móvil)
*   **Problema reportado:** El escáner de cámara no interpretaba correctamente el nuevo formato de `codigoAcceso` (`XXXX-XXXX`) cuando era leído desde la cámara del dispositivo.
*   **Correcciones:**
    *   Se corrigió el parser del texto decodificado por la cámara en [AccessValidationPage.tsx](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/frontend/src/pages/AccessValidationPage.tsx): ahora detecta el formato de 8 caracteres alfanuméricos y lo normaliza al formato `XXXX-XXXX` antes de enviarlo al backend.
    *   Se habilitó `host: true` en [vite.config.js](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/frontend/vite.config.js) para exponer el servidor de desarrollo en la red local (`0.0.0.0`), permitiendo acceder al sistema desde el celular mediante la IP local (ej. `192.168.100.80:5173`).

### 5.4. Prevención de Fechas Inválidas en Funciones
*   **Problema reportado:** Era posible registrar funciones con fechas inválidas (ej. `0000-00-00`) por ausencia de validación en el backend.
*   **Corrección en Backend** — [funcionCrud.controller.ts](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/backend/src/controllers/funcionCrud.controller.ts):
    *   Se agregó la función `isValidDateString` que valida formato `YYYY-MM-DD` y que la fecha sea real del calendario (año entre 2000 y 2100, día y mes válidos).
    *   Esta validación se aplica mediante `.refine()` de Zod tanto al crear funciones como al copiar semanas.

---

## 6. Pruebas de QA (Checklist)

*   **[OK - HU-11]**: El scheduler evalúa y activa la promoción para funciones de estreno antiguo y baja ocupación.
*   **[OK - HU-11 Escenario 3]**: Al simular ocupación al 100%, el scheduler desactiva automáticamente el 2x1 (`promocionActiva = 0`).
*   **[OK - HU-11 Filtro]**: La búsqueda por nombre de película en la vista de promociones funciona correctamente con y sin tildes.
*   **[OK - HU-16]**: La validación QR por cámara desde dispositivo móvil (Droidcam) detecta correctamente el formato `XXXX-XXXX`.
*   **[OK - HU-16]**: El acceso se permite en la ventana de ±30 min antes del inicio de la función.
*   **[OK - HU-16]**: El motivo `FUNCION_NO_INICIADA` informa el tiempo de espera y se muestra en ámbar, diferenciado del rechazo rojo.
*   **[OK - IDOR/BOLA]**: El cliente propietario accede a sus boletos. Clientes ajenos reciben HTTP 403.
*   **[OK - Fechas]**: El backend rechaza fechas inválidas como `0000-00-00` con mensaje de validación claro.

Todo el set de pruebas se ejecuta de forma exitosa sin regresiones en la base de datos o en la API.
