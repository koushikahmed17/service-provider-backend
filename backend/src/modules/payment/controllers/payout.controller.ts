import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { PayoutService } from "../services/payout.service";
import {
  CreatePayoutDto,
  PayoutResponseDto,
  PayoutQueryDto,
  PayoutStatsDto,
} from "../dto";

@ApiTags("Payouts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("payouts")
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Create a payout (Admin only)" })
  @ApiResponse({
    status: 201,
    description: "Payout created successfully",
    type: PayoutResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 403, description: "Access denied" })
  async createPayout(
    @Body() createDto: CreatePayoutDto
  ): Promise<PayoutResponseDto> {
    return this.payoutService.createPayout(createDto);
  }

  @Get()
  @ApiOperation({ summary: "Get payouts" })
  @ApiResponse({
    status: 200,
    description: "Payouts retrieved successfully",
  })
  async getPayouts(
    @Query() query: PayoutQueryDto,
    @Request() req: any
  ): Promise<{
    payouts: PayoutResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.payoutService.getPayouts(query, req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get payout by ID" })
  @ApiResponse({
    status: 200,
    description: "Payout retrieved successfully",
    type: PayoutResponseDto,
  })
  @ApiResponse({ status: 404, description: "Payout not found" })
  @ApiResponse({ status: 403, description: "Access denied" })
  async getPayoutById(
    @Param("id") id: string,
    @Request() req: any
  ): Promise<PayoutResponseDto> {
    return this.payoutService.getPayoutById(id, req.user.id);
  }

  @Post(":id/mark-paid")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark payout as paid (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Payout marked as paid successfully",
    type: PayoutResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid payout status" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Payout not found" })
  async markPayoutAsPaid(
    @Param("id") id: string,
    @Request() req: any
  ): Promise<PayoutResponseDto> {
    return this.payoutService.markPayoutAsPaid(id, req.user.id);
  }

  @Get("stats/overview")
  @ApiOperation({ summary: "Get payout statistics" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
    type: PayoutStatsDto,
  })
  async getPayoutStats(@Request() req: any): Promise<PayoutStatsDto> {
    return this.payoutService.getPayoutStats(req.user.id);
  }
}































