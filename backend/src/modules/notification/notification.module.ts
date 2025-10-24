import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { NotificationsGateway } from "./gateway/notifications.gateway";
import { NotificationService } from "./services/notification.service";
import { PresenceService } from "./services/presence.service";
import { FormatterService } from "./services/formatter.service";
import { NotificationsLogRepo } from "./repos/notifications.log.repo";
import { NotificationsSseController } from "./controllers/notifications.sse.controller";
import { NotificationsController } from "./controllers/notifications.controller";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN") || "7d",
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsSseController, NotificationsController],
  providers: [
    PrismaService,
    LoggerService,
    NotificationsGateway,
    NotificationService,
    PresenceService,
    FormatterService,
    NotificationsLogRepo,
  ],
  exports: [NotificationService, PresenceService, FormatterService],
})
export class NotificationModule {}
