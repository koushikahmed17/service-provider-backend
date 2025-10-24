import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  apiPrefix: process.env.API_PREFIX || "api/v1",
  corsOrigin: process.env.CORS_ORIGIN || [
    "http://localhost:5173",
    "http://localhost:5174",
  ],
}));
