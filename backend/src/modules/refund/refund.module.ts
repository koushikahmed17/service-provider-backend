import { Module } from "@nestjs/common";
import { RefundService } from "./services/refund.service";
import { AdminRefundController } from "./controllers/admin-refund.controller";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";

@Module({
  controllers: [AdminRefundController],
  providers: [RefundService, PrismaService, LoggerService],
  exports: [RefundService],
})
export class RefundModule {}








