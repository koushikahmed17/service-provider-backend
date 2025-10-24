import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseDatePipe,
} from "@nestjs/common";
import { AdminSettlementService } from "../services/admin-settlement.service";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";

export class ProcessSettlementDto {
  date: Date;
}

@Controller("admin/settlements")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminSettlementController {
  constructor(
    private readonly adminSettlementService: AdminSettlementService
  ) {}

  @Get("daily")
  async getDailySettlement(@Query("date") date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    return this.adminSettlementService.getDailySettlementSummary(targetDate);
  }

  @Get("daily/history")
  async getDailySettlementHistory(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.adminSettlementService.getDailySettlementHistory(start, end);
  }

  @Post("daily/process")
  async processDailySettlement(@Body() dto: ProcessSettlementDto) {
    return this.adminSettlementService.processDailySettlement(dto.date);
  }

  @Get("professional/:professionalId/earnings")
  async getProfessionalEarnings(
    @Param("professionalId") professionalId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.adminSettlementService.getProfessionalEarnings(
      professionalId,
      start,
      end
    );
  }

  @Get("overview")
  async getSettlementOverview() {
    return this.adminSettlementService.getSettlementOverview();
  }

  @Get("due")
  async getDueSettlements() {
    return this.adminSettlementService.getDueSettlements();
  }

  @Get("all")
  async getAllSettlements() {
    return this.adminSettlementService.getAllSettlements();
  }

  @Post("booking/:bookingId/refund")
  async refundBooking(
    @Param("bookingId") bookingId: string,
    @Body() body: { reason: string }
  ) {
    return this.adminSettlementService.refundBooking(bookingId, body.reason);
  }

  @Post("backfill")
  async backfillSettlementData() {
    return this.adminSettlementService.backfillSettlementData();
  }

  @Post("booking-settlement/:settlementId/mark-paid")
  async markSettlementAsPaid(
    @Param("settlementId") settlementId: string,
    @Body() body: { paymentMethod?: string; notes?: string }
  ) {
    return this.adminSettlementService.markSettlementAsPaid(
      settlementId,
      body.paymentMethod,
      body.notes
    );
  }

  @Post("create-settlement/:bookingId")
  async createManualSettlement(@Param("bookingId") bookingId: string) {
    return this.adminSettlementService.createManualSettlement(bookingId);
  }
}
