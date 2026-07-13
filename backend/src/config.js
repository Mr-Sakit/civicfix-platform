import dotenv from "dotenv";

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000"
};

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required. Set it in the runtime environment or local .env file.");
}
