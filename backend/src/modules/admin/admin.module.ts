import { Module } from "@nestjs/common";
import { AdminController } from "./controllers/admin.controller";
import { AdminService } from "./services/admin.service";
import { AdminSettlementController } from "./controllers/admin-settlement.controller";
import { AdminSettlementService } from "./services/admin-settlement.service";
import { NotificationModule } from "../notification/notification.module";
import { PaymentModule } from "../payment/payment.module";
import { BookingModule } from "../booking/booking.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [NotificationModule, PaymentModule, BookingModule, UserModule],
  controllers: [AdminController, AdminSettlementController],
  providers: [AdminService, AdminSettlementService],
  exports: [AdminService, AdminSettlementService],
})
export class AdminModule {}
