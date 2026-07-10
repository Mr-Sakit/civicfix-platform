import dotenv from "dotenv";

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://civicfix_user:civicfix_password@localhost:5432/civicfix",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  jwtSecret:
    process.env.JWT_SECRET ?? "civicfix-dev-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@civicfix.local",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123",
};
