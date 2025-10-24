import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { RefundService } from "../services/refund.service";

@ApiTags("Admin - Refunds")
@ApiBearerAuth()
@Controller("admin/refunds")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminRefundController {
  constructor(private readonly refundService: RefundService) {}

  @Get()
  @ApiOperation({ summary: "Get all refunds with optional filtering" })
  async getAllRefunds(
    @Query("status") status?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    return this.refundService.getAllRefunds(filters);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get refund statistics" })
  async getRefundStatistics(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.refundService.getRefundStatistics(start, end);
  }

  @Get("pending")
  @ApiOperation({ summary: "Get pending refunds count and total amount" })
  async getPendingRefundsStats() {
    return this.refundService.getPendingRefundsStats();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get refund by ID" })
  async getRefundById(@Param("id") id: string) {
    return this.refundService.getRefundById(id);
  }

  @Post(":id/process")
  @ApiOperation({ summary: "Mark refund as processing" })
  async processRefund(
    @Param("id") id: string,
    @Request() req: any,
    @Body()
    body: {
      refundMethod: string;
      notes?: string;
    }
  ) {
    const adminId = req.user.sub;
    return this.refundService.processRefund(
      id,
      adminId,
      body.refundMethod,
      body.notes
    );
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Mark refund as completed" })
  async completeRefund(
    @Param("id") id: string,
    @Request() req: any,
    @Body()
    body: {
      gatewayRef?: string;
      notes?: string;
    }
  ) {
    const adminId = req.user.sub;
    return this.refundService.completeRefund(
      id,
      adminId,
      body.gatewayRef,
      body.notes
    );
  }

  @Post(":id/fail")
  @ApiOperation({ summary: "Mark refund as failed" })
  async markRefundAsFailed(
    @Param("id") id: string,
    @Request() req: any,
    @Body()
    body: {
      notes: string;
    }
  ) {
    const adminId = req.user.sub;
    return this.refundService.markRefundAsFailed(id, adminId, body.notes);
  }

  @Post("test/create-sample")
  @ApiOperation({ summary: "Create sample refund for testing (DEV ONLY)" })
  async createSampleRefund(@Request() req: any) {
    // This is a test endpoint - in production, remove this
    return this.refundService.createSampleRefundForTesting();
  }
}
