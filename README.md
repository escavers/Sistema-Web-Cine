# Sistema Web Cine

**Versión del documento:** 1.0.0
**Fecha:** 28 de junio de 2026
**Equipo:** Desarrollo D4

---

## 1. Introducción

Este documento explica cómo instalar, configurar y probar el **Sistema Web Cine** en un entorno local.

El sistema permite gestionar usuarios, ventas de boletos, funciones, salas, asientos, comprobantes y control de acceso mediante validación de boletos.

Este README está dirigido principalmente al equipo de **Control de Calidad (QA)**, por lo que incluye instrucciones claras para levantar el sistema, cuentas de prueba y puntos importantes que deben verificarse durante las pruebas.

---

## 2. Tecnologías utilizadas

El sistema está construido con una arquitectura cliente-servidor.

### Frontend

* React.js
* Vite
* TypeScript
* Tailwind CSS

### Backend

* Node.js
* Express
* TypeScript

### Base de datos

* MySQL

### Seguridad

* Autenticación con JWT.
* Contraseñas cifradas con BCrypt.
* Control de acceso por roles.
* Generación de códigos seguros para boletos.

---

## 3. Estructura principal del proyecto

La estructura general del sistema es la siguiente:

```text
Sistema-Web-Cine/
├── README.md
├── README_historial_desarrolladores.md
├── cine_db.sql
│
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── controllers/
│       ├── middlewares/
│       ├── routes/
│       └── utils/
│
└── frontend/
    ├── .env.example
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/
        ├── contexts/
        ├── pages/
        └── services/
```

### Descripción rápida de carpetas

| Carpeta / archivo | Descripción                                   |
| ----------------- | --------------------------------------------- |
| `cine_db.sql`     | Script principal para crear la base de datos. |
| `backend/`        | Contiene la API del sistema.                  |
| `frontend/`       | Contiene la aplicación web.                   |
| `controllers/`    | Lógica de los módulos del backend.            |
| `middlewares/`    | Validaciones de seguridad, JWT y roles.       |
| `routes/`         | Rutas de la API.                              |
| `pages/`          | Pantallas principales del frontend.           |
| `services/`       | Conexión del frontend con el backend.         |

---

# 4. Requisitos previos

Antes de levantar el sistema, debe tener instalado lo siguiente:

1. **Node.js**
2. **npm**
3. **MySQL Server**
4. **MySQL Workbench** o algún gestor similar
5. **Visual Studio Code**
6. **Git**, si va a clonar el repositorio

Para verificar si Node.js y npm están instalados, abra una terminal y ejecute:

```bash
node -v
```

Luego:

```bash
npm -v
```

Si ambos comandos muestran una versión, entonces están instalados correctamente.

---

# 5. Cómo levantar el sistema paso a paso

---

## Paso 1: Abrir el proyecto

Abra la carpeta del proyecto en Visual Studio Code.

La carpeta principal debe verse más o menos así:

```text
Sistema-Web-Cine/
├── backend/
├── frontend/
├── cine_db.sql
└── README.md
```

Es importante abrir la carpeta completa del proyecto, no solo la carpeta `backend` o `frontend`.

---

## Paso 2: Crear la base de datos

1. Abra **MySQL Workbench**.
2. Inicie sesión con su usuario local de MySQL.
3. Abra el archivo:

```text
cine_db.sql
```

4. Ejecute todo el script.

En MySQL Workbench puede hacerlo con el botón del rayo o presionando:

```text
Ctrl + Shift + Enter
```

### Resultado esperado

Después de ejecutar el script, debe existir una base de datos llamada:

```text
cine_db
```
---

# 6. Configuración del backend

El backend es el servidor que conecta el sistema con la base de datos.

---

## Paso 1: Abrir una terminal en Visual Studio Code

En Visual Studio Code, abra una terminal nueva:

```text
Terminal > New Terminal
```

Ubíquese en la carpeta del backend:

```bash
cd backend
```

---

## Paso 2: Instalar dependencias del backend

Ejecute:

```bash
npm install
```

Este comando instala todo lo necesario para que el backend funcione.

Espere hasta que termine. Si se crea una carpeta llamada `node_modules`, es normal.

---

## Paso 3: Crear el archivo `.env`

Dentro de la carpeta `backend`, debe existir un archivo llamado:

```text
.env.example
```

Copie ese archivo y péguelo en la misma carpeta con el nombre:

```text
.env
```

La carpeta `backend` debe quedar así:

```text
backend/
├── .env
├── .env.example
├── package.json
└── src/
```

---

## Paso 4: Configurar el archivo `.env`

Abra el archivo `.env` y coloque los datos de su MySQL local.

Ejemplo:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=su_contraseña_local
DB_NAME=cine_db
JWT_SECRET=super_secret_qa_key
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:5173
```

### Importante

Debe revisar especialmente estos datos:

```env
DB_USER=root
DB_PASSWORD=su_contraseña_local
DB_PORT=3306
DB_NAME=cine_db
```

Si la contraseña está mal escrita, el backend no podrá conectarse a MySQL.
Si su MySQL no tiene contraseña, deje el campo vacío:

```env
DB_PASSWORD=
```

No coloque espacios antes ni después del signo igual.

---

## Paso 5: Levantar el backend

Desde la terminal ubicada en `backend`, ejecute:

```bash
npm run dev
```

### Resultado esperado

Debe aparecer un mensaje indicando que el servidor está corriendo en el puerto 4000.

La API debería quedar disponible en:

```text
http://localhost:4000/api
```

No cierre esta terminal. El backend debe quedarse ejecutándose mientras se prueba el sistema.

---

# 7. Configuración del frontend

El frontend es la parte visual del sistema, es decir, la página web que usa el usuario.

---

## Paso 1: Abrir una nueva terminal

En Visual Studio Code, abra otra terminal nueva.

No cierre la terminal del backend.

En la nueva terminal, vaya a la carpeta del frontend:

```bash
cd frontend
```

---

## Paso 2: Instalar dependencias del frontend

Ejecute:

```bash
npm install
```

Espere hasta que termine la instalación.

---

## Paso 3: Crear el archivo `.env`

Dentro de la carpeta `frontend`, copie el archivo:

```text
.env.example
```

Péguelo en la misma carpeta con el nombre:

```text
.env
```

La carpeta debe quedar así:

```text
frontend/
├── .env
├── .env.example
├── package.json
└── src/
```

---

## Paso 4: Configurar el archivo `.env`

Abra el archivo `.env` del frontend y coloque:

```env
VITE_API_URL=http://localhost:4000/api
```

Este dato indica que el frontend debe conectarse con el backend que está corriendo en el puerto 4000.

---

## Paso 5: Levantar el frontend

Desde la terminal ubicada en `frontend`, ejecute:

```bash
npm run dev
```

### Resultado esperado

Debe aparecer una URL similar a esta:

```text
http://localhost:5173
```

Abra esa dirección en el navegador.

Si todo está correcto, debe mostrarse la pantalla inicial del sistema.

---

# 8. Resumen rápido para levantar el sistema

Si ya configuró todo una vez, para volver a levantar el sistema solo necesita hacer esto:

### Terminal 1

```bash
cd backend
npm run dev
```

### Terminal 2

```bash
cd frontend
npm run dev
```

Luego abra en el navegador:

```text
http://localhost:5173
```

---

# 9. Cuentas de prueba

El sistema incluye usuarios de prueba para validar los diferentes roles.

| Correo                    | Contraseña     | Rol           |
| ------------------------- | -------------- | ------------- |
| `admin@cinelapaz.com`     | `admin123`     | ADMINISTRADOR |
| `boleteria@cinelapaz.com` | `boleteria123` | BOLETERIA     |
| `acceso@cinelapaz.com`    | `acceso123`    | ACCESO        |
| `cliente@cinelapaz.com`   | `cliente123`   | CLIENTE       |

Las contraseñas están guardadas con BCrypt en la base de datos.

---

# 10. Criterios generales de aceptación

Para considerar el sistema aprobado, QA debe validar como mínimo:

* El backend levanta sin errores.
* El frontend levanta sin errores.
* La base de datos se crea correctamente.
* El login funciona con todas las cuentas de prueba.
* Cada rol accede solo a las pantallas permitidas.
* Las compras online funcionan correctamente.
* Las compras presenciales funcionan correctamente.
* Los asientos ocupados no pueden venderse nuevamente.
* Los comprobantes se generan correctamente.
* Los códigos de boleto no son predecibles.
* La validación de acceso funciona con QR y escritura manual.
* Los intentos de acceso quedan registrados en auditoría.
* Las acciones restringidas no pueden ejecutarse con roles no autorizados.

---

# 11. Errores comunes y soluciones

## Error: el backend no conecta con MySQL

Revise el archivo:

```text
backend/.env
```

Verifique que estos datos estén correctos:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=su_contraseña_local
DB_NAME=cine_db
```
También confirme que MySQL esté iniciado.

---

## Error: puerto 4000 ocupado

Significa que otro proceso ya está usando el puerto del backend.

Puede cambiar el puerto en:

```text
backend/.env
```

Por ejemplo:

```env
PORT=4001
```

Si cambia el puerto del backend, también debe actualizar el frontend:

```env
VITE_API_URL=http://localhost:4001/api
```

---

## Error: el frontend no conecta con el backend

Revise el archivo:

```text
frontend/.env
```

Debe contener:

```env
VITE_API_URL=http://localhost:4000/api
```

También confirme que el backend esté corriendo.

---

## Error 500

Un error 500 normalmente indica un problema en el backend.

QA debe registrar:

* Pantalla donde ocurrió.
* Acción realizada.
* Usuario utilizado.
* Hora aproximada del error.
* Mensaje mostrado en el navegador.
* Log de la terminal del backend.
* Datos enviados, si corresponde.

---

## Error de CORS

Si el navegador muestra un error relacionado con CORS, revise que en el backend esté configurado correctamente:

```env
FRONTEND_URL=http://localhost:5173
```

También confirme que el frontend esté realmente corriendo en:

```text
http://localhost:5173
```

---

# 14. Observaciones finales

Durante las pruebas, no se debe modificar directamente la base de datos salvo que sea necesario para preparar un caso específico.

Si se detectan errores, estos deben reportarse con evidencia suficiente para que el equipo de desarrollo pueda reproducirlos.

Un reporte incompleto dificulta la corrección del problema. Por eso, cada observación debe incluir el usuario usado, el paso exacto donde falló y el mensaje de error mostrado.

El sistema debe ser probado por roles, no solamente desde una cuenta administradora.
