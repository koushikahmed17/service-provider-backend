import { z } from "zod";

export const configSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  API_PREFIX: z.string().default("api/v1"),
  RATE_LIMIT_TTL: z.coerce.number().default(60),
  RATE_LIMIT_LIMIT: z.coerce.number().default(100),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  CSRF_SECRET: z.string().min(32, "CSRF_SECRET must be at least 32 characters"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  MAX_FILE_SIZE: z.coerce.number().default(5242880), // 5MB
  UPLOAD_PATH: z.string().default("./uploads"),
});

export type ConfigSchema = z.infer<typeof configSchema>;

