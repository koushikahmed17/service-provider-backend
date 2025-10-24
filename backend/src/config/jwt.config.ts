import { registerAs } from "@nestjs/config";

export default registerAs("jwt", () => ({
  secret: process.env.JWT_SECRET || "default-secret-key",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "default-refresh-secret-key",
  expiresIn: process.env.JWT_EXPIRES_IN || "7d",
}));
