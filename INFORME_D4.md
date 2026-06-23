# Informe de Cumplimiento - Desarrollador 4 (Promociones y Validación de Acceso)

Este informe detalla la correspondencia entre los requerimientos especificados en el documento **AnalCine.pdf** y la implementación realizada en el sistema.

---

## 1. Cuadro de Comparación de Requerimientos vs. Implementación

| Historia de Usuario / Requerimiento | Especificación en PDF (AnalCine.pdf) | Estado | Implementación Técnica Realizada |
| :--- | :--- | :---: | :--- |
| **HU-11 / RF-16: Promociones 2x1** | Aplicar automáticamente la promoción 2x1 a películas con **más de 30 días** en cartelera y con un porcentaje de ocupación **inferior al 70%**. | **Completado** | <ul><li>**Servicio**: [promotionSchedulerService.ts](file:///e:/desarrollo%20de%20sistemas2/repositorio/Sistema-Web-Cine-main/Sistema-Web-Cine-main/backend/src/services/promotionSchedulerService.ts) realiza la verificación matemática de ocupación (`vendidos / capacidadTotal * 100`) y evalúa `fechaEstreno` frente a la regla de 30 días.</li><li>**Runner**: [promotionJobRunner.ts](file:///e:/desarrollo%20de%20sistemas2/repositorio/Sistema-Web-Cine-main/Sistema-Web-Cine-main/backend/src/cronjobs/promotionJobRunner.ts) permite la ejecución del proceso automatizado fuera del servidor web.</li></ul> |
| **HU-16 / RF-19: Validación por Escaneo** | Validar las entradas de clientes mediante el escaneo de un código QR o código único. Debe verificar autenticidad, vigencia (fecha/hora) y estado de uso antes de autorizar el ingreso. | **Completado** | <ul><li>**Controlador**: [accessController.ts](file:///e:/desarrollo%20de%20sistemas2/repositorio/Sistema-Web-Cine-main/Sistema-Web-Cine-main/backend/src/controllers/accessController.ts) busca el boleto por ID único o asiento, comprueba si ya fue usado, si la función es hoy y si no ha finalizado.</li><li>**Ruta API**: [accessRoutes.ts](file:///e:/desarrollo%20de%20sistemas2/repositorio/Sistema-Web-Cine-main/Sistema-Web-Cine-main/backend/src/routes/accessRoutes.ts) expone `/api/acceso/validate`.</li><li>**Vista Móvil**: [AccessValidationPage.tsx](file:///e:/desarrollo%20de%20sistemas2/repositorio/Sistema-Web-Cine-main/Sistema-Web-Cine-main/frontend/src/pages/AccessValidationPage.tsx) para validación presencial con simulador de un click, teclado manual, mock de cámara con láser e indicadores audibles.</li></ul> |
| **RF-02 y Sección 4: Roles del Sistema** | Administrar los roles de: *Administrador*, *Encargado de Boletería*, *Cliente* y **Encargado de Acceso**. | **Incompleto (Original)** | El rol de **Encargado de Acceso** (`ACCESO`) no fue implementado por el Desarrollador 1 (encargado de seguridad) en la base de datos ni en el backend, por lo que actualmente la validación de acceso se prueba con los roles `ADMINISTRADOR` o `BOLETERIA`. |
| **Diagrama ER (Pág. 33): Historial de Escaneos** | Registrar cada escaneo en una tabla `EscaneosBoleto` para auditoría histórica. | **Incompleto (Original)** | La tabla no fue creada en la base de datos [cine_db.sql](file:///e:/desarrollo%20de%20sistemas2/repositorio/Sistema-Web-Cine-main/Sistema-Web-Cine-main/cine_db.sql). Actualmente, el cambio se registra modificando la columna `estadoA` de la tabla `Boleto`. |

---

## 2. Detalle de Pruebas Unitarias e Integración (D4)

Para garantizar la robustez del código de estas dos historias, se estructuró un script de pruebas dinámico en:
* **Archivo de Pruebas**: [test_runner_d4.ts](file:///e:/desarrollo%20de%20sistemas2/repositorio/Sistema-Web-Cine-main/Sistema-Web-Cine-main/backend/test_runner_d4.ts)

### Flujo de Prueba Automatizado:
1. **Pre-test**: Inserta temporalmente una película con estreno mayor a 30 días, una función para hoy, una venta y dos boletos de prueba (uno marcado como inactivo/usado y otro activo).
2. **Prueba HU-11**: Ejecuta la lógica del scheduler para verificar que la promoción 2x1 se activa automáticamente dado que la ocupación es de 1 boleto sobre 80 de capacidad ($1.25\% < 70\%$).
3. **Prueba HU-16 (Éxito)**: Simula el escaneo del boleto activo, verificando que concede el acceso y cambia su estado a inactivo (`estadoA = 0`).
4. **Prueba HU-16 (Fallo)**: Simula el escaneo del boleto ya usado, verificando que el sistema deniega el acceso con el motivo `BOLETO_INVALIDADO`.
5. **Post-test**: Limpia de la base de datos los registros temporales creados para evitar basura residual.

---

## 3. Conclusiones y Próximos Pasos

La lógica asignada al **Desarrollador 4** está **completamente realizada y validada**, con el valor agregado de haber migrado los controladores y rutas correspondientes de JS a TypeScript nativo.

### Recomendaciones:
* **Ajustar el rol de acceso**: Si deseas que se integre formalmente el rol de **Encargado de Acceso** (`ACCESO`) para cumplir a cabalidad con el punto **RF-02**, avísame para agregar dicho rol a las tablas de base de datos, los controladores de registro de usuarios y el frontend.
