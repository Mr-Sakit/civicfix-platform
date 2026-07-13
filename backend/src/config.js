import dotenv from "dotenv";

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  storage: {
    provider: process.env.STORAGE_PROVIDER ?? "local",
    azureConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    azureBlobContainer: process.env.AZURE_STORAGE_BLOB_CONTAINER ?? "issue-photos",
    azurePublicBaseUrl: process.env.AZURE_STORAGE_PUBLIC_BASE_URL
  },
  queue: {
    provider: process.env.QUEUE_PROVIDER ?? "none",
    azureConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    azureQueueName: process.env.AZURE_STORAGE_QUEUE_NAME ?? "image-analysis-jobs",
    pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000)
  },
  workerMetricsPort: Number(process.env.WORKER_METRICS_PORT ?? 9100),
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? "civicfix-dev-secret-change-me"
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
  }
};

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required. Set it in the runtime environment or local .env file.");
}

if (!config.gemini.apiKey) {
  console.warn("GEMINI_API_KEY is not set — AI features will use the keyword-matching fallback.");
}
