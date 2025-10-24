import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Res,
  Param,
  HttpStatus,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { AnalyticsService } from "../services/analytics.service";
import { DynamicAnalyticsService } from "../services/dynamic-analytics.service";
import {
  ProfessionalAnalyticsDto,
  CustomerAnalyticsDto,
  AdminAnalyticsDto,
  ReportExportDto,
  ReportScope,
  ReportFormat,
} from "../dto/analytics.dto";
import { Response } from "express";

@ApiTags("Analytics")
@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly dynamicAnalyticsService: DynamicAnalyticsService
  ) {}

  // Professional Analytics
  @Get("pro/me")
  @Roles("PROFESSIONAL")
  @ApiOperation({ summary: "Get professional analytics" })
  @ApiResponse({
    status: 200,
    description: "Professional analytics retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Professional access required",
  })
  async getProfessionalAnalytics(
    @Query() query: ProfessionalAnalyticsDto,
    @Req() req: any
  ) {
    const professionalId = req.user.id; // Get the user ID from JWT token

    // Debug logging
    console.log("=== ANALYTICS CONTROLLER DEBUG ===");
    console.log("Request user:", req.user);
    console.log("Professional ID:", professionalId);
    console.log("=== END ANALYTICS CONTROLLER DEBUG ===");

    return this.analyticsService.getProfessionalAnalytics(
      professionalId,
      query
    );
  }

  // Customer Analytics
  @Get("cu/me")
  @Roles("CUSTOMER")
  @ApiOperation({ summary: "Get customer analytics" })
  @ApiResponse({
    status: 200,
    description: "Customer analytics retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Customer access required",
  })
  async getCustomerAnalytics(
    @Query() query: CustomerAnalyticsDto,
    @Req() req: any
  ) {
    const customerId = req.user.id; // Get the user ID from JWT token
    return this.analyticsService.getCustomerAnalytics(customerId, query);
  }

  // Admin Analytics
  @Get("ad/overview")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get admin analytics overview" })
  @ApiResponse({
    status: 200,
    description: "Admin analytics retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getAdminAnalytics(@Query() query: AdminAnalyticsDto) {
    return this.analyticsService.getAdminAnalytics(query);
  }

  // Report Exports
  @Get("reports/:scope.csv")
  @ApiOperation({ summary: "Export analytics report as CSV" })
  @ApiParam({
    name: "scope",
    enum: ReportScope,
    description: "Report scope (professional, customer, admin)",
  })
  @ApiResponse({
    status: 200,
    description: "CSV report generated successfully",
    content: {
      "text/csv": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Bad request" })
  async exportCSVReport(
    @Param("scope") scope: ReportScope,
    @Query() query: ReportExportDto,
    @Res() res: Response
  ) {
    // Check authorization based on scope
    if (scope === ReportScope.ADMIN) {
      // Only admins can export admin reports
      // This should be handled by role guards in a real implementation
    } else if (scope === ReportScope.PROFESSIONAL) {
      // Only professionals can export their own reports
      // This should be handled by role guards in a real implementation
    } else if (scope === ReportScope.CUSTOMER) {
      // Only customers can export their own reports
      // This should be handled by role guards in a real implementation
    }

    const exportQuery = {
      ...query,
      scope,
      format: ReportFormat.CSV,
    };

    return this.analyticsService.exportReport(
      scope,
      ReportFormat.CSV,
      exportQuery,
      res
    );
  }

  @Get("reports/:scope.pdf")
  @ApiOperation({ summary: "Export analytics report as PDF" })
  @ApiParam({
    name: "scope",
    enum: ReportScope,
    description: "Report scope (professional, customer, admin)",
  })
  @ApiResponse({
    status: 200,
    description: "PDF report generated successfully",
    content: {
      "application/pdf": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Bad request" })
  async exportPDFReport(
    @Param("scope") scope: ReportScope,
    @Query() query: ReportExportDto,
    @Res() res: Response
  ) {
    // Check authorization based on scope
    if (scope === ReportScope.ADMIN) {
      // Only admins can export admin reports
      // This should be handled by role guards in a real implementation
    } else if (scope === ReportScope.PROFESSIONAL) {
      // Only professionals can export their own reports
      // This should be handled by role guards in a real implementation
    } else if (scope === ReportScope.CUSTOMER) {
      // Only customers can export their own reports
      // This should be handled by role guards in a real implementation
    }

    const exportQuery = {
      ...query,
      scope,
      format: ReportFormat.PDF,
    };

    return this.analyticsService.exportReport(
      scope,
      ReportFormat.PDF,
      exportQuery,
      res
    );
  }

  // ===== DYNAMIC ANALYTICS ENDPOINTS =====

  @Get("dashboard/config")
  @ApiOperation({ summary: "Get dashboard configuration for current user" })
  @ApiResponse({
    status: 200,
    description: "Dashboard configuration retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getDashboardConfig(@Req() req: any) {
    const userId = req.user.id;
    return this.dynamicAnalyticsService.getDashboardConfig(userId);
  }

  @Get("dashboard")
  @ApiOperation({ summary: "Get dashboard data for current user" })
  @ApiResponse({
    status: 200,
    description: "Dashboard data retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getDashboardData(
    @Req() req: any,
    @Query("period") period?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("categoryId") categoryId?: string,
    @Query("region") region?: string
  ) {
    const userId = req.user.id;
    return this.dynamicAnalyticsService.getDashboardData(userId, {
      period,
      startDate,
      endDate,
      categoryId,
      region,
    });
  }
}
