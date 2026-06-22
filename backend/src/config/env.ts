import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  dbHost: process.env.DB_HOST ?? 'localhost',
  dbPort: Number(process.env.DB_PORT ?? 3306),
  dbUser: process.env.DB_USER ?? 'root',
  dbPassword: process.env.DB_PASSWORD ?? '',
  dbName: process.env.DB_NAME ?? 'cine_db',
  jwtSecret: process.env.JWT_SECRET ?? 'cambia_esta_clave_super_segura_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173'
};
