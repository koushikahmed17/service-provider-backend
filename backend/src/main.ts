import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { LoggerService } from "./core/logger.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "http://localhost:3000"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    })
  );
  app.use(cookieParser());

  // Custom middleware for static file CORS
  app.use("/api/uploads", (req, res, next) => {
    res.setHeader(
      "Access-Control-Allow-Origin",
      configService.get("app.corsOrigin") || "http://localhost:5173"
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Cache-Control, Pragma"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // CORS for API routes
  app.enableCors({
    origin: configService.get("app.corsOrigin"),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Cache-Control",
      "Pragma",
    ],
  });

  // Static file serving
  app.useStaticAssets(join(__dirname, "..", "uploads"), {
    prefix: "/api/uploads/",
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter(app.get(LoggerService)));
  app.useGlobalInterceptors(
    new LoggingInterceptor(app.get(LoggerService)),
    new TransformInterceptor()
  );

  // API prefix
  const apiPrefix = configService.get("app.apiPrefix");
  app.setGlobalPrefix(apiPrefix);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Service Provider API")
    .setDescription("API documentation for Service Provider application")
    .setVersion("1.0")
    .addBearerAuth()
    .addCookieAuth("access_token")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = configService.get("app.port");
  await app.listen(port);

  console.log("");
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log(
    `🚀 Application is running on: http://localhost:${port}/${apiPrefix}`
  );
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
  console.log(
    `🔧 Auth endpoint: http://localhost:${port}/${apiPrefix}/auth/login`
  );
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("");
}

bootstrap();
