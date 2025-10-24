import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { AdminService } from "../services/admin.service";
import { GetUsersDto, UpdateUserRoleDto } from "../dto/admin-user.dto";
import { GetDisputesDto, ResolveDisputeDto } from "../dto/admin-dispute.dto";
import {
  GetCommissionSettingsDto,
  UpdateCommissionSettingDto,
  CreateCommissionSettingDto,
} from "../dto/admin-commission.dto";
import { GetAnalyticsSummaryDto } from "../dto/admin-analytics.dto";
import {
  GetFlaggedReviewsDto,
  ModerateReviewDto,
  GetUploadsDto,
  ModerateUploadDto,
} from "../dto/admin-moderation.dto";
import {
  AcceptBookingDto,
  RejectBookingDto,
  CheckInDto,
  CheckOutDto,
  CompleteBookingDto,
  CancelBookingDto,
} from "../../booking/dto/booking-actions.dto";
import {
  CreateProfessionalDto,
  UpdateProfessionalDto,
  GetProfessionalsDto,
  ProfessionalResponseDto,
  ApproveProfessionalDto,
  RejectProfessionalDto,
  SuspendProfessionalDto,
} from "../dto/admin-professional.dto";

@ApiTags("Admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get all users (Admin only)" })
  @ApiResponse({ status: 200, description: "Users retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getUsers(@Query() query: GetUsersDto) {
    return this.adminService.getUsers(query);
  }

  @Patch("users/:id/role")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update user role (Admin only)" })
  @ApiResponse({ status: 200, description: "User role updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async updateUserRole(
    @Param("id") userId: string,
    @Body() updateDto: UpdateUserRoleDto
  ) {
    return this.adminService.updateUserRole(userId, updateDto);
  }

  @Get("stats")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get user statistics (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  // User Management
  @Patch("users/:id/ban")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Ban user (Admin only)" })
  @ApiResponse({ status: 200, description: "User banned successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async banUser(@Param("id") userId: string) {
    return this.adminService.banUser(userId);
  }

  @Patch("users/:id/unban")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Unban user (Admin only)" })
  @ApiResponse({ status: 200, description: "User unbanned successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async unbanUser(@Param("id") userId: string) {
    return this.adminService.unbanUser(userId);
  }

  @Patch("users/:id/verify-nid")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Verify user NID (Admin only)" })
  @ApiResponse({ status: 200, description: "NID verified successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async verifyNid(@Param("id") userId: string) {
    return this.adminService.verifyNid(userId);
  }

  @Patch("users/:id/reject-nid")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Reject user NID (Admin only)" })
  @ApiResponse({ status: 200, description: "NID rejected successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async rejectNid(@Param("id") userId: string) {
    return this.adminService.rejectNid(userId);
  }

  // Dispute Management
  @Get("disputes")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get all disputes (Admin only)" })
  @ApiResponse({ status: 200, description: "Disputes retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getDisputes(@Query() query: GetDisputesDto) {
    return this.adminService.getDisputes(query);
  }

  @Post("disputes/:id/resolve")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Resolve dispute (Admin only)" })
  @ApiResponse({ status: 200, description: "Dispute resolved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Dispute not found" })
  async resolveDispute(
    @Param("id") disputeId: string,
    @Body() resolveDto: ResolveDisputeDto
  ) {
    return this.adminService.resolveDispute(disputeId, resolveDto);
  }

  // Commission Settings
  @Get("config/commission")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get commission settings (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Commission settings retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getCommissionSettings(@Query() query: GetCommissionSettingsDto) {
    return this.adminService.getCommissionSettings(query);
  }

  @Patch("config/commission")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update commission settings (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Commission settings updated successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async updateCommissionSettings(
    @Body() updateDto: UpdateCommissionSettingDto
  ) {
    return this.adminService.updateCommissionSettings(updateDto);
  }

  @Post("config/commission")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Create commission setting (Admin only)" })
  @ApiResponse({
    status: 201,
    description: "Commission setting created successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async createCommissionSetting(@Body() createDto: CreateCommissionSettingDto) {
    return this.adminService.createCommissionSetting(createDto);
  }

  // Content Moderation
  @Get("moderation/reviews/flagged")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get flagged reviews (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Flagged reviews retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getFlaggedReviews(@Query() query: GetFlaggedReviewsDto) {
    return this.adminService.getFlaggedReviews(query);
  }

  @Patch("moderation/reviews/:id/moderate")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Moderate review (Admin only)" })
  @ApiResponse({ status: 200, description: "Review moderated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Review not found" })
  async moderateReview(
    @Param("id") reviewId: string,
    @Body() moderateDto: ModerateReviewDto
  ) {
    return this.adminService.moderateReview(reviewId, moderateDto);
  }

  @Get("moderation/uploads")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get uploads for moderation (Admin only)" })
  @ApiResponse({ status: 200, description: "Uploads retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getUploads(@Query() query: GetUploadsDto) {
    return this.adminService.getUploads(query);
  }

  @Patch("moderation/uploads/:id/moderate")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Moderate upload (Admin only)" })
  @ApiResponse({ status: 200, description: "Upload moderated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Upload not found" })
  async moderateUpload(
    @Param("id") uploadId: string,
    @Body() moderateDto: ModerateUploadDto
  ) {
    return this.adminService.moderateUpload(uploadId, moderateDto);
  }

  // Analytics
  @Get("analytics/summary")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get analytics summary (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Analytics summary retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getAnalyticsSummary(@Query() query: GetAnalyticsSummaryDto) {
    return this.adminService.getAnalyticsSummary(query);
  }

  @Get("professionals/:id/analytics")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get professional analytics (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Professional analytics retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Professional not found" })
  async getProfessionalAnalytics(
    @Param("id") professionalId: string,
    @Query() query: GetAnalyticsSummaryDto
  ) {
    return this.adminService.getProfessionalAnalytics(professionalId, query);
  }

  @Get("customers/:id/analytics")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get customer analytics (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Customer analytics retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Customer not found" })
  async getCustomerAnalytics(
    @Param("id") customerId: string,
    @Query() query: GetAnalyticsSummaryDto
  ) {
    return this.adminService.getCustomerAnalytics(customerId, query);
  }

  // Admin Booking Management
  @Post("bookings/:id/accept")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Accept a booking (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Booking accepted successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async acceptBooking(
    @Param("id") bookingId: string,
    @Body() acceptDto: AcceptBookingDto
  ) {
    return this.adminService.acceptBooking(bookingId, acceptDto);
  }

  @Post("bookings/:id/reject")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Reject a booking (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Booking rejected successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async rejectBooking(
    @Param("id") bookingId: string,
    @Body() rejectDto: RejectBookingDto
  ) {
    return this.adminService.rejectBooking(bookingId, rejectDto);
  }

  @Post("bookings/:id/check-in")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Check in to a booking (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Checked in successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async checkInBooking(
    @Param("id") bookingId: string,
    @Body() checkInDto: CheckInDto
  ) {
    return this.adminService.checkInBooking(bookingId, checkInDto);
  }

  @Post("bookings/:id/check-out")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Check out from a booking (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Checked out successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async checkOutBooking(
    @Param("id") bookingId: string,
    @Body() checkOutDto: CheckOutDto
  ) {
    return this.adminService.checkOutBooking(bookingId, checkOutDto);
  }

  @Post("bookings/:id/complete")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Complete a booking (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Booking completed successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async completeBooking(
    @Param("id") bookingId: string,
    @Body() completeDto: CompleteBookingDto
  ) {
    return this.adminService.completeBooking(bookingId, completeDto);
  }

  @Post("bookings/:id/cancel")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Cancel a booking (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Booking cancelled successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async cancelBooking(
    @Param("id") bookingId: string,
    @Body() cancelDto: CancelBookingDto
  ) {
    return this.adminService.cancelBooking(bookingId, cancelDto);
  }

  // Professional Management
  @Post("professionals")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Create a professional account (Admin only)" })
  @ApiResponse({
    status: 201,
    description: "Professional account created successfully",
    type: ProfessionalResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 409, description: "Email or phone already exists" })
  async createProfessional(@Body() createDto: CreateProfessionalDto) {
    return this.adminService.createProfessional(createDto);
  }

  @Get("professionals")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get all professionals with filters (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Professionals retrieved successfully",
  })
  async getProfessionals(@Query() query: GetProfessionalsDto) {
    return this.adminService.getProfessionals(query);
  }

  @Get("professionals/:id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get professional by ID (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Professional retrieved successfully",
    type: ProfessionalResponseDto,
  })
  @ApiResponse({ status: 404, description: "Professional not found" })
  async getProfessional(@Param("id") professionalId: string) {
    return this.adminService.getProfessional(professionalId);
  }

  @Patch("professionals/:id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update professional profile (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Professional updated successfully",
    type: ProfessionalResponseDto,
  })
  @ApiResponse({ status: 404, description: "Professional not found" })
  async updateProfessional(
    @Param("id") professionalId: string,
    @Body() updateDto: UpdateProfessionalDto
  ) {
    return this.adminService.updateProfessional(professionalId, updateDto);
  }

  @Post("professionals/:id/approve")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Approve professional (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Professional approved successfully",
    type: ProfessionalResponseDto,
  })
  @ApiResponse({ status: 404, description: "Professional not found" })
  async approveProfessional(
    @Param("id") professionalId: string,
    @Body() approveDto: ApproveProfessionalDto
  ) {
    return this.adminService.approveProfessional(professionalId, approveDto);
  }

  @Post("professionals/:id/reject")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Reject professional (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Professional rejected successfully",
    type: ProfessionalResponseDto,
  })
  @ApiResponse({ status: 404, description: "Professional not found" })
  async rejectProfessional(
    @Param("id") professionalId: string,
    @Body() rejectDto: RejectProfessionalDto
  ) {
    return this.adminService.rejectProfessional(professionalId, rejectDto);
  }

  @Post("professionals/:id/suspend")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Suspend professional (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Professional suspended successfully",
    type: ProfessionalResponseDto,
  })
  @ApiResponse({ status: 404, description: "Professional not found" })
  async suspendProfessional(
    @Param("id") professionalId: string,
    @Body() suspendDto: SuspendProfessionalDto
  ) {
    return this.adminService.suspendProfessional(professionalId, suspendDto);
  }

  @Post("professionals/:id/activate")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Activate professional (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Professional activated successfully",
    type: ProfessionalResponseDto,
  })
  @ApiResponse({ status: 404, description: "Professional not found" })
  async activateProfessional(@Param("id") professionalId: string) {
    return this.adminService.activateProfessional(professionalId);
  }

  @Delete("professionals/:id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Delete professional account (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Professional deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Professional not found" })
  async deleteProfessional(@Param("id") professionalId: string) {
    return this.adminService.deleteProfessional(professionalId);
  }
}
