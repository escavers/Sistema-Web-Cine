# Informe Técnico de Actualizaciones y Ajustes de Seguridad (Desarrollador 4)

**Fecha:** 30 de junio de 2026  
**Autor:** Desarrollador 4 (D4)  
**Módulo:** Seguridad, Autenticación, Promociones y Validación de Boletos  

---

## 1. Resumen Ejecutivo
El presente informe documenta las modificaciones arquitectónicas, de base de datos y de interfaz de usuario implementadas por el **Desarrollador 4** para resolver de forma definitiva las observaciones de Control de Calidad (QA). Los ajustes se centran en:
1. Asegurar la lógica automática del 2x1 (Historias HU-11, cubriendo su activación y su desactivación por capacidad límite).
2. Cerrar vulnerabilidades críticas de control de acceso a información de boletos de terceros (BOLA / IDOR).
3. Resolver inconsistencias visuales y problemas de responsividad del frontend en la visualización de boletos QR y pases manuales (HU-16).

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

### 2.2. Panel Informativo de Promociones (Lectura Única)
*   **Problema reportado:** *"No existe ningún apartado de promociones, el caso de 2x1 es automático, tanto que no sé cómo funciona"*.
*   **Corrección en Frontend:**
    *   Se creó una nueva página administrativa [PromocionesPage.tsx](file:///e:/desarrollo%20de%20sistemas2/repositorio/siswebv2/frontend/src/pages/PromocionesPage.tsx) bajo `/promociones` para los administradores.
    *   Esta interfaz es **de lectura y carácter estrictamente informativo**. En ella se explican de forma interactiva las dos reglas del 2x1 automático, y se lista en tiempo real el catálogo de funciones con un indicador de ocupación visual y un badge dinámico (`🔥 2x1 Activo`, `🆕 Estreno (<30d)`, `👥 Alta Ocupación (>=70%)`).

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

## 5. Pruebas de QA Automatizadas (Checklist)
Hemos robustecido el archivo de pruebas `test_runner_d4.ts` agregando verificaciones explícitas para las nuevas reglas implementadas:

*   **[SUCCESS - HU-11]**: El scheduler evalúa y activa la promoción para funciones de estreno antiguo y baja ocupación.
*   **[SUCCESS - HU-16]**: La simulación de lectura de un QR válido concede acceso, actualiza el estado del boleto en la base de datos a usado (`estadoA = 0`) y audita el escaneo.
*   **[SUCCESS - HU-11 Escenario 3]**: Al simular una sala con ocupación al 100% (superando el límite del 70%), el scheduler desactiva automáticamente la promoción 2x1 (`promocionActiva = 0`).
*   **[SUCCESS - IDOR/BOLA]**: 
    *   El cliente dueño legítimo de la venta puede acceder a sus boletos de forma segura.
    *   Cualquier petición de un cliente ajeno sobre esa misma venta es interceptada y rechazada con un código HTTP **403**.

Todo el set de pruebas se ejecuta de forma exitosa sin regresiones en la base de datos o en la API.
