# Sistema de Cine - Configuración de Email

## Requisitos para envío de comprobantes por email

Para que el sistema pueda enviar los comprobantes por email, debes configurar nodemailer en el backend.

### Paso 1: Instalar nodemailer

En la carpeta `backend/`, ejecuta:

```bash
npm install nodemailer
```

### Paso 2: Configurar credenciales de email

1. Copia el archivo `.env.example` como `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edita el archivo `.env` con tus credenciales:
   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=tu_correo@gmail.com
   EMAIL_PASSWORD=tu_contraseña_o_app_password
   FRONTEND_URL=http://localhost:5173
   ```

### Paso 3: Obtener credenciales de Gmail (si usas Gmail)

1. Habilita la verificación en dos pasos en tu cuenta de Google
2. Genera una contraseña de aplicación:
   - Ve a https://myaccount.google.com/apppasswords
   - Selecciona "Correo" y "Windows"
   - Copia la contraseña generada
3. Usa esta contraseña en `EMAIL_PASSWORD` en el `.env`

### Paso 4: Verificar que el backend está corriendo

Reinicia el backend:
```bash
npm run dev
```

### Funcionamiento

Cuando un usuario completa una compra y proporciona su email, el sistema:

1. Genera el comprobante con un QR escaneable
2. Envía automáticamente un email con:
   - Detalles de la compra
   - QR del comprobante
   - Enlace para acceder al comprobante online

Si el email no está configurado, el sistema seguirá funcionando pero no enviará emails. Los usuarios verán un QR en el comprobante que pueden escanear.

## Notas

- En producción, usa un servicio de email dedicado como SendGrid, Mailgun o AWS SES
- Las credenciales de email NO deben estar en el repositorio (usa `.env`)
- El `.env` está en `.gitignore` para evitar exponer credenciales
