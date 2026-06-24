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

### 3. Correcciones de Lógica y Flujo en el Sistema (Rama Correcciones D4)
Adicional a la base de datos, se aplicaron las siguientes correcciones ineludibles para que la validación de boletos funcione en la vida real:
* **Generación de códigos QR individuales (Backend):** Anteriormente, el comprobante generado al comprar enviaba un solo código QR con una URL genérica. Esto era inútil para el proceso de escaneo. Se rediseñó el `email.controller.ts` para desglosar la compra y **generar un código QR por cada asiento**, conteniendo la cadena alfanumérica exacta del asiento (ej. `SALA-1-A1`), acompañada de su texto en modo "Código Manual" para casos de fallo del láser lector (estándar de la industria).
* **Protección y enrutamiento del Frontend (`App.tsx`):** Se corrigió la validación de rutas del sistema React. El botón "Control de acceso" no abría porque React Router bloqueaba silenciosamente la vista al rol `ACCESO`. Ahora está correctamente enrutado.
* **Sonidos de validación industrial (`AccessValidationPage.tsx`):** Para operar en un ambiente ruidoso de cine, se reconfiguró el simulador de láser: los boletos válidos emiten un *beep* limpio (onda `sine` a 800hz), mientras que los inválidos emiten un *zumbido grave y áspero* (onda `sawtooth` a 150hz), evitando falsos positivos por parte de los acomodadores.

---

## 🛠️ Instrucciones de Despliegue y Ejecución Local (Obligatorio para los Devs)

Para asegurar que no haya problemas de conexión al probar estos cambios, **es obligatorio seguir estos pasos en orden**:

### 1. Configurar y Levantar Base de Datos
1. Abre tu gestor de MySQL (phpMyAdmin, DBeaver, MySQL Workbench, etc.).
2. **Ejecuta por completo el archivo `cine_db.sql`** ubicado en la raíz. Esto limpiará y creará la base de datos con las nuevas tablas (`EscanearBoleto` y `EncargadoAcceso`).

### 2. Configurar Entorno del Backend
1. Abre una terminal en la carpeta `/backend`.
2. Verifica que el archivo `/backend/.env` tenga las credenciales correctas de tu MySQL local (usuario, contraseña y puerto `3306`).
3. Instala dependencias (si no lo hiciste antes): `npm install`.
4. **¡Paso Crítico! Ejecuta el Seed:** `npm run db:seed` o `npx tsx src/seeds/seed.ts`. Esto insertará los roles obligatorios y los datos de prueba, incluyendo al usuario `acceso@cinelapaz.com` (`acceso123`).
5. Levanta el servidor: `npm run dev`. (Debe mostrar `API disponible en http://localhost:4000/api`).

### 3. Levantar Frontend
1. Abre otra terminal en la carpeta `/frontend`.
2. Instala las dependencias: `npm install`.
3. Levanta el cliente React: `npm run dev`.
4. Abre `http://localhost:5173` en tu navegador.

### 🔑 Credenciales de Prueba para Control de Accesos
Para que el equipo de desarrollo pueda probar la simulación del escáner y los códigos QR corregidos, inicien sesión con:
* **Usuario/Correo:** `acceso@cinelapaz.com`
* **Contraseña:** `acceso123`