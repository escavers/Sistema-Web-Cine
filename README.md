# Sistema Web Cine - Manual de Control de Calidad (QA)

**Versión del Documento:** 1.0.0  
**Fecha:** 28 de junio de 2026  
**Autor:** Equipo de Desarrollo (D4)

---

## 📖 Introducción
Bienvenido al repositorio oficial del **Sistema Web Cine**. Esta plataforma integral está diseñada para la gestión de ventas de boletos, administración de salas, programación de funciones y validación rigurosa de control de accesos.

Este documento ha sido confeccionado **estrictamente para el equipo de Control de Calidad (QA)** con la finalidad de ofrecer una guía técnica profesional, instrucciones de despliegue y los flujos críticos de prueba, garantizando que no queden áreas grises durante el proceso de certificación del software.

---

## 🏗️ Arquitectura del Sistema
El proyecto emplea una arquitectura Cliente-Servidor (SPA) bajo el siguiente stack tecnológico:

*   **Frontend**: React.js, Vite, TypeScript, Tailwind CSS.
*   **Backend**: Node.js, Express, TypeScript.
*   **Base de Datos**: MySQL (Relacional).
*   **Seguridad**:
    *   Autenticación mediante tokens JWT.
    *   Hashing de contraseñas mediante algoritmo BCrypt.
    *   Identificadores criptográficos para boletos (Generación Alfanumérica Segura).

---

## 📁 Estructura de Directorios Principal

A continuación se detalla la estructura principal del código fuente para su fácil ubicación durante el escrutinio de QA:

```text
Sistema-Web-Cine/
├── README.md                           # Este documento (Manual de QA)
├── README_historial_desarrolladores.md # Historial técnico (Versiones Anteriores)
├── cine_db.sql                         # Script maestro de la base de datos
│
├── backend/                            # Servidor API RESTful
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.ts                      # Configuración de la aplicación Express
│       ├── server.ts                   # Punto de entrada y servidor HTTP
│       ├── controllers/                # Lógica de negocio (Ventas, Accesos, etc.)
│       ├── middlewares/                # Filtros JWT y Control de Roles (RBAC)
│       ├── routes/                     # Definición de Endpoints
│       └── utils/                      # Herramientas globales (db, pdf generator)
│
└── frontend/                           # Aplicación Web Cliente
    ├── .env.example
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx                    # Punto de entrada de React
        ├── App.tsx                     # Enrutador global (React Router)
        ├── components/                 # Componentes UI reutilizables (Headers, Mapas)
        ├── contexts/                   # Estados globales (AuthContext)
        ├── pages/                      # Vistas del sistema (Historial, Venta, Login)
        └── services/                   # Cliente API (Fetch)
```

---

## 🛠️ Despliegue Local para Pruebas

Para levantar el ecosistema localmente, siga estrictamente los siguientes pasos:

### 1. Inicialización de Base de Datos
1. Acceda a su cliente MySQL (ej. MySQL Workbench o DBeaver).
2. Ejecute el archivo `cine_db.sql` localizado en la raíz del repositorio. 
3. *Resultado esperado:* Se creará la base de datos `cine_db` con todas sus tablas, disparadores (triggers), procedimientos almacenados y datos mock para pruebas.

### 2. Configuración del Servidor (Backend)
1. Abra una terminal y navegue al directorio backend:
   ```bash
   cd backend
   ```
2. Instale los módulos requeridos:
   ```bash
   npm install
   ```
3. Genere el archivo de entorno `.env` copiando el formato de `.env.example` y configure sus credenciales de base de datos.
   **ATENCIÓN QA:** Es crítico que verifiquen que `DB_PORT` (usualmente 3306), `DB_USER` (usualmente root) y `DB_PASSWORD` coincidan exactamente con su entorno local de MySQL para evitar errores de conexión al probar el sistema.
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
4. Inicie el entorno de desarrollo:
   ```bash
   npm run dev
   ```
   *(El backend estará escuchando en `http://localhost:4000/api`)*

### 3. Configuración del Cliente (Frontend)
1. En una nueva terminal, navegue al directorio frontend:
   ```bash
   cd frontend
   ```
2. Instale los módulos requeridos:
   ```bash
   npm install
   ```
3. Configure las variables de entorno `.env`:
   ```env
   VITE_API_URL=http://localhost:4000/api
   ```
4. Inicie la aplicación web:
   ```bash
   npm run dev
   ```
   *(El frontend estará expuesto en `http://localhost:5173`)*

---

## 🧪 Matriz de Pruebas y Criterios de Aceptación (QA)

El equipo de QA debe certificar el correcto funcionamiento de los siguientes módulos críticos:

### 1. Módulo de Usuarios y Seguridad (RBAC)
- **Registro de Clientes (Web)**: Un usuario no autenticado debe poder crear su cuenta desde la interfaz pública.
- **Registro de Clientes (Boletería)**: Un usuario con rol `BOLETERIA` debe poder registrar clientes presencialmente asignando una contraseña temporal estandarizada (`CI + Inicial Paterno + Inicial Materno`).
- **Administración**: Un usuario con rol `ADMINISTRADOR` tiene permisos totales para listar, crear, activar, inactivar y dar de baja lógica a cualquier empleado. Ningún otro rol puede acceder a este panel.

### 2. Módulo de Ventas y Comprobantes
- **Flujo de Compra**: Tanto el `CLIENTE` desde su casa (Compra Online) como la `BOLETERIA` presencial, deben poder visualizar la cartelera, seleccionar funciones, escoger asientos interactivos y completar el pago.
- **Generación Documental**: Al concluir la venta, el sistema debe emitir un comprobante (Ticket físico o PDF) con un código QR integrado que apunte a los identificadores seguros de los asientos.

### 3. Módulo de Validación y Control de Acceso (Feature Crítica)
**Atención QA:** El sistema anterior usaba identificadores predecibles (`[id]-[SALA]-[Asiento]`) que representaban una grave falla de seguridad. Este comportamiento **ha sido erradicado**.
- **Códigos Criptográficos Seguros**: Ahora, todo boleto generado incluye un identificador único alfanumérico en formato `XXXX-XXXX` (ej. `A8B9-C3D2`).
- **Vista Especializada de Ingreso**: El rol `ACCESO` posee una interfaz adaptada (`/acceso-validacion`) con un input optimizado para lectores láser y escritura rápida.
- **Pruebas de Entrada requeridas**:
  1.  **Escaneo de QR**: Simular lectura de código QR generado por el sistema.
  2.  **Escritura Manual**: Tipear el código (con guión o sin guión) en el campo y validar.
  3.  **Retrocompatibilidad**: Comprobar que los códigos legados pre-actualización sigan siendo procesados correctamente.
- **Auditoría (Tabla EscanearBoleto)**: Se debe verificar en base de datos que todos los intentos de acceso, sean exitosos o denegados, dejen rastro de auditoría inmutable.

---

## 🔑 Cuentas de Acceso de Prueba (Mock Data)

Se han provisionado las siguientes cuentas para facilitar el testeo por roles.

| Usuario / Correo Institucional | Contraseña     | Rol del Sistema |
|--------------------------------|----------------|-----------------|
| `admin@cinelapaz.com`          | `admin123`     | `ADMINISTRADOR` |
| `boleteria@cinelapaz.com`      | `boleteria123` | `BOLETERIA`     |
| `acceso@cinelapaz.com`         | `acceso123`    | `ACCESO`        |
| `cliente@cinelapaz.com`        | `cliente123`   | `CLIENTE`       |

*(Todas las credenciales viajan encriptadas; las contraseñas reales se hallan hasheadas con BCrypt en la base de datos).*

---
**Nota Final para QA:** Si experimenta errores 500, problemas de CORS o renderizado inesperado en los componentes, documente el fallo con el log de terminal (backend) o la consola del navegador (frontend) e inclúyalo en su ticket de observaciones.
