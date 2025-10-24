import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { StubPaymentGateway } from "@/core/payment-gateway.stub";
import { BkashGatewayService } from "@/core/payment-gateways/bkash-gateway.service";
import { NagadGatewayService } from "@/core/payment-gateways/nagad-gateway.service";
import { RocketGatewayService } from "@/core/payment-gateways/rocket-gateway.service";
import { PaymentGatewayFactory } from "@/core/payment-gateways/payment-gateway.factory";
import { CommissionService } from "./services/commission.service";
import { PaymentService } from "./services/payment.service";
import { PayoutService } from "./services/payout.service";
import { EnhancedPaymentService } from "./services/enhanced-payment.service";
import { PaymentController } from "./controllers/payment.controller";
import { PayoutController } from "./controllers/payout.controller";
import { CommissionController } from "./controllers/commission.controller";
import { WebhookController } from "./controllers/webhook.controller";
import { BookingPaymentController } from "./controllers/booking-payment.controller";

@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    LoggerService,
    {
      provide: "ILocalGateway",
      useClass: StubPaymentGateway,
    },
    BkashGatewayService,
    NagadGatewayService,
    RocketGatewayService,
    PaymentGatewayFactory,
    CommissionService,
    PaymentService,
    PayoutService,
    EnhancedPaymentService,
  ],
  controllers: [
    PaymentController,
    PayoutController,
    CommissionController,
    WebhookController,
    BookingPaymentController,
  ],
  exports: [
    CommissionService,
    PaymentService,
    PayoutService,
    EnhancedPaymentService,
    PaymentGatewayFactory,
  ],
})
export class PaymentModule {}
