import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
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
import { CommissionService } from "../services/commission.service";
import {
  CreateCommissionSettingDto,
  UpdateCommissionSettingDto,
  CommissionSettingResponseDto,
  CommissionCalculationDto,
} from "../dto";

@ApiTags("Commission Settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/commission-settings")
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Post()
  @ApiOperation({ summary: "Create a commission setting (Admin only)" })
  @ApiResponse({
    status: 201,
    description: "Commission setting created successfully",
    type: CommissionSettingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Category not found" })
  async createCommissionSetting(
    @Body() createDto: CreateCommissionSettingDto
  ): Promise<CommissionSettingResponseDto> {
    return this.commissionService.createCommissionSetting(createDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all commission settings (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Commission settings retrieved successfully",
    type: [CommissionSettingResponseDto],
  })
  async getCommissionSettings(): Promise<CommissionSettingResponseDto[]> {
    return this.commissionService.getCommissionSettings();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get commission setting by ID (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Commission setting retrieved successfully",
    type: CommissionSettingResponseDto,
  })
  @ApiResponse({ status: 404, description: "Commission setting not found" })
  async getCommissionSettingById(
    @Param("id") id: string
  ): Promise<CommissionSettingResponseDto> {
    return this.commissionService.getCommissionSettingById(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update commission setting (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Commission setting updated successfully",
    type: CommissionSettingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Commission setting not found" })
  async updateCommissionSetting(
    @Param("id") id: string,
    @Body() updateDto: UpdateCommissionSettingDto
  ): Promise<CommissionSettingResponseDto> {
    return this.commissionService.updateCommissionSetting(id, updateDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete commission setting (Admin only)" })
  @ApiResponse({
    status: 204,
    description: "Commission setting deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Commission setting not found" })
  async deleteCommissionSetting(@Param("id") id: string): Promise<void> {
    return this.commissionService.deleteCommissionSetting(id);
  }

  @Post("calculate")
  @ApiOperation({ summary: "Calculate commission for amount and category" })
  @ApiResponse({
    status: 200,
    description: "Commission calculated successfully",
    type: CommissionCalculationDto,
  })
  async calculateCommission(
    @Body() body: { amount: number; categoryId?: string }
  ): Promise<CommissionCalculationDto> {
    return this.commissionService.calculateCommission(
      body.amount,
      body.categoryId
    );
  }

  @Post("calculate-booking/:bookingId")
  @ApiOperation({ summary: "Calculate commission for a specific booking" })
  @ApiResponse({
    status: 200,
    description: "Commission calculated successfully",
    type: CommissionCalculationDto,
  })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async calculateCommissionForBooking(
    @Param("bookingId") bookingId: string
  ): Promise<CommissionCalculationDto> {
    return this.commissionService.calculateCommissionForBooking(bookingId);
  }
}






























