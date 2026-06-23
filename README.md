# Sistema-Web-Cine

## Justificación Técnica de Modificaciones a la Base de Datos (Rama Correcciones D4)

Este documento expone y defiende las correcciones arquitectónicas realizadas en el script de la base de datos (`cine_db.sql`) implementadas por el **Desarrollador 4**. Estos cambios **no son alteraciones caprichosas**, sino correcciones obligatorias y estrictas para asegurar que la base de datos cumpla al 100% con los documentos de diseño y requerimientos del proyecto.

### 1. Creación de la tabla `EncargadoAcceso` e inserción del Rol `ACCESO`
* **Cambio realizado:** Se agregó la tabla `EncargadoAcceso` (como herencia de la tabla `Usuario`) y se registró formalmente el rol `ACCESO` en el catálogo de roles del sistema.
* **Justificación Documental (AnalCine.pdf):** En el apartado **RF-02** y en la **Sección 4 (Roles del Sistema)**, se especifica textualmente la existencia de 4 roles, incluyendo al *"Encargado de Acceso"*. Anteriormente, la base de datos omitía por completo a este actor.
* **Justificación Arquitectónica (UML):** El diagrama de casos de uso y el diagrama de clases modelan explícitamente al actor `EncargadoAcceso` heredando de la clase padre `Usuario`. Su implementación es no negociable para mantener el aislamiento de permisos; la validación de ingreso no puede estar abierta a cualquier rol, ni al rol "BOLETERIA" por diseño.

### 2. Creación de la tabla de auditoría `EscanearBoleto`
* **Cambio realizado:** Se creó la tabla transaccional `EscanearBoleto` con llaves foráneas a `Boleto` y a `EncargadoAcceso`, incluyendo los campos obligatorios de auditoría (`fechaHora`, `resultado`, `estadoA`, `fechaA`, `usuarioA`).
* **Justificación Documental y UML:** En el **Diagrama de Clases** proveído en la documentación oficial, se define explícitamente la clase intermedia/transaccional `EscanearBoleto` con cardinalidad `1..*` (un encargado puede hacer múltiples escaneos) y `0..1` hacia Boleto. 
* **Defensa Técnica:** La implementación anterior (simplemente cambiar un flag `estadoA = 0` en el boleto) **violaba los principios de trazabilidad** del sistema. No dejaba constancia de **quién**, **cuándo**, ni **qué resultado** arrojó el intento de ingreso (ej. un boleto rechazado por fecha expirada no dejaba huella alguna en la DB). Con la tabla `EscanearBoleto`, el sistema ahora puede auditar tanto los ingresos exitosos como los intentos fraudulentos, cumpliendo cabalmente el diseño del sistema.

**Atención al Equipo de Desarrollo:** Estas modificaciones resuelven los "huecos" dejados en las entregas previas y alinean la implementación final con la documentación aprobada. No generan conflictos con los endpoints de otros desarrolladores, ya que extienden el esquema, no destruyen relaciones preexistentes.