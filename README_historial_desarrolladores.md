
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

## 🛠️ Instrucciones de Despliegue y Ejecución Local

### 1. Base de Datos
1. Abre MySQL Workbench (o tu gestor).
2. Ejecuta el archivo `cine_db.sql` completo.
   Esto crea la DB, tablas, triggers, datos de prueba y stored procedures.

### 2. Backend
1. Crea el archivo `backend/.env` con tus credenciales MySQL:
   ```
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=tu_password
   DB_NAME=cine_db
   PORT=4000
   EMAIL_SERVICE=gmail
   EMAIL_USER=tu_correo
   EMAIL_PASSWORD=tu_contraseña
   FRONTEND_URL=http://localhost:5173
   ```
2. En la terminal: `cd backend && npm install && npm run dev`

### 3. Frontend
1. En otra terminal: `cd frontend && npm install && npm run dev`
2. Abre http://localhost:5173

### 🔑 Credenciales de Prueba
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin@cinelapaz.com | admin123 | ADMINISTRADOR |
| boleteria@cinelapaz.com | boleteria123 | BOLETERIA |
| cliente@cinelapaz.com | cliente123 | CLIENTE |
| acceso@cinelapaz.com | acceso123 | ACCESO |
=======
# Sistema-Web-Cine# Portal Cine - Módulo de Seguridad, Autenticación y Usuarios

## Incluye

- Login con JWT.
- Contraseñas cifradas con BCrypt.
- Registro web de cliente.
- Registro presencial de cliente para boletería.
- Gestión de usuarios para administrador.
- Control de acceso por roles.
- Auditoría guardada solo en la base de datos.
- Conexión real a MySQL mediante `mysql2/promise`.
- Frontend en React + Vite + TypeScript + Tailwind.
- Backend en Node.js + Express + TypeScript.


## Configurar backend

En una terminal:

```bash
cd backend
npm install
copy .env.example .env
```

En Git Bash o Linux:

```bash
cp .env.example .env
```

Edita `.env` según tu MySQL:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=cine_db

JWT_SECRET=cambia_esta_clave_super_segura_2026
JWT_EXPIRES_IN=8h

FRONTEND_URL=http://localhost:5173
```

Probar conexión:

```bash
npm run db:test
```

Levantar backend:

```bash
npm run dev
```

API:

```txt
http://localhost:3000/api
```

Prueba en navegador:

```txt
http://localhost:3000/api/health
```

## Configurar frontend

En otra terminal:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

En Git Bash o Linux:

```bash
cp .env.example .env
npm run dev
```

## Flujo para probar como cliente

1. Entra a `http://localhost:5173`.
2. Presiona `Crear cuenta`.
3. Registra un cliente con correo y contraseña.
4. El sistema guarda la contraseña cifrada en `Usuario.contrasena`.
5. Después inicia sesión con ese correo y contraseña.
6. El sistema muestra el panel de cliente.

## Flujo para boletería

Para entrar como boletería necesitas tener un usuario existente

Desde ese perfil se puede registrar clientes presencialmente.

La contraseña temporal se genera así:

```txt
CI + inicial apellido paterno + inicial apellido materno
```

Ejemplo:

CI: 12345678
Apellido paterno: Perez
Apellido materno: Mamani
Contraseña temporal: 12345678PM

## Flujo para administrador

Desde ese perfil se puede:

- Listar usuarios.
- Crear usuarios.
- Activar/inactivar.
- Dar baja lógica.

La baja lógica solo cambia:
No elimina físicamente el registro.
## No duplicacion de datos
use cine_db;
ALTER TABLE Usuario
ADD UNIQUE KEY uq_usuario_ci (ci);
ALTER TABLE Usuario
ADD UNIQUE KEY uq_usuario_correo (correo);
## Auditoría

No existe vista de auditoría en el frontend. Se guarda solo en MySQL, en la tabla `Auditoria`.

Eventos principales:

```txt
LOGIN_EXITOSO
LOGIN_FALLIDO_DATOS_INVALIDOS
LOGIN_FALLIDO_CORREO_NO_REGISTRADO_POSIBLE_TYPO
LOGIN_FALLIDO_PASSWORD_INCORRECTA
LOGIN_FALLIDO_USUARIO_INACTIVO
TOKEN_NO_ENVIADO
TOKEN_INVALIDO
ROL_NO_AUTORIZADO
REGISTRO_WEB_CLIENTE
REGISTRO_WEB_FALLIDO_DATOS_INVALIDOS
REGISTRO_WEB_FALLIDO_DUPLICADO
REGISTRO_BOLETERIA_CLIENTE
REGISTRO_BOLETERIA_FALLIDO_DATOS_INVALIDOS
REGISTRO_BOLETERIA_FALLIDO_DUPLICADO
USUARIO_CREADO
USUARIO_MODIFICADO
USUARIO_DADO_BAJA
```

Por seguridad, cuando el login falla por contraseña incorrecta, no se guarda la contraseña escrita por el usuario.
