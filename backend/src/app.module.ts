import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { TerminusModule } from "@nestjs/terminus";
import { LoggerModule } from "nestjs-pino";

import { PrismaService } from "./core/prisma.service";
import { LoggerService } from "./core/logger.service";
import { PrismaModule } from "./core/prisma.module";
import { LoggerModule as CoreLoggerModule } from "./core/logger.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

import { AppModule as AppModuleController } from "./modules/app/app.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { FileUploadModule } from "./modules/file-upload/file-upload.module";
import { ServiceCatalogModule } from "./modules/service-catalog/service-catalog.module";
import { BookingModule } from "./modules/booking/booking.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { ReviewModule } from "./modules/review/review.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { LocationModule } from "./modules/location/location.module";
import { RefundModule } from "./modules/refund/refund.module";

import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import jwtConfig from "./config/jwt.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: [".env.local", ".env"],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    TerminusModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: "info",
      },
    }),
    PrismaModule,
    CoreLoggerModule,
    AppModuleController,
    HealthModule,
    AuthModule,
    UserModule,
    AdminModule,
    AnalyticsModule,
    FileUploadModule,
    ServiceCatalogModule,
    BookingModule,
    PaymentModule,
    ReviewModule,
    NotificationModule,
    LocationModule,
    RefundModule,
  ],
  providers: [
    PrismaService,
    LoggerService,
    HttpExceptionFilter,
    LoggingInterceptor,
    TransformInterceptor,
  ],
  exports: [PrismaService, LoggerService],
})
export class AppModule {}
