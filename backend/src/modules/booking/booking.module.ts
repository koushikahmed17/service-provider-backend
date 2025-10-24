import { Module } from "@nestjs/common";
import { BookingController } from "./controllers/booking.controller";
import { BookingService } from "./services/booking.service";
import { BookingStateMachineService } from "./services/booking-state-machine.service";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { AuthModule } from "@/modules/auth/auth.module";
import { ServiceCatalogModule } from "@/modules/service-catalog/service-catalog.module";
import { NotificationModule } from "@/modules/notification/notification.module";
import { PaymentModule } from "@/modules/payment/payment.module";
import { RefundModule } from "@/modules/refund/refund.module";

@Module({
  imports: [
    AuthModule,
    ServiceCatalogModule,
    NotificationModule,
    PaymentModule,
    RefundModule,
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    BookingStateMachineService,
    PrismaService,
    LoggerService,
  ],
  exports: [BookingService, BookingStateMachineService],
})
export class BookingModule {}
