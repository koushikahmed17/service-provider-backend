import {
  Controller,
  Get,
  Post,
  Patch,
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
import { BookingService } from "../services/booking.service";
import {
  CreateBookingDto,
  BookingResponseDto,
  GetBookingsDto,
  BookingStatsDto,
  AcceptBookingDto,
  RejectBookingDto,
  CheckInDto,
  CheckOutDto,
  CompleteBookingDto,
  CancelBookingDto,
} from "../dto";

@ApiTags("Bookings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("bookings")
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: "Create a new booking" })
  @ApiResponse({
    status: 201,
    description: "Booking created successfully",
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({
    status: 404,
    description: "Professional or category not found",
  })
  async createBooking(
    @Body() createDto: CreateBookingDto,
    @Request() req: any
  ): Promise<BookingResponseDto> {
    return this.bookingService.createBooking(createDto, req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get booking by ID" })
  @ApiResponse({
    status: 200,
    description: "Booking retrieved successfully",
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 404, description: "Booking not found" })
  @ApiResponse({ status: 403, description: "Access denied" })
  async getBookingById(
    @Param("id") id: string,
    @Request() req: any
  ): Promise<BookingResponseDto> {
    return this.bookingService.getBookingById(id, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: "Get user's bookings" })
  @ApiResponse({
    status: 200,
    description: "Bookings retrieved successfully",
  })
  async getBookings(
    @Query() query: GetBookingsDto,
    @Request() req: any
  ): Promise<{
    bookings: BookingResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.bookingService.getBookings(query, req.user.id);
  }

  @Get("stats/overview")
  @ApiOperation({ summary: "Get booking statistics" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
    type: BookingStatsDto,
  })
  async getBookingStats(@Request() req: any): Promise<BookingStatsDto> {
    return this.bookingService.getBookingStats(req.user.id);
  }

  @Post(":id/accept")
  @UseGuards(RolesGuard)
  @Roles("PROFESSIONAL")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept a booking (Professional only)" })
  @ApiResponse({
    status: 200,
    description: "Booking accepted successfully",
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid transition" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async acceptBooking(
    @Param("id") id: string,
    @Body() acceptDto: AcceptBookingDto,
    @Request() req: any
  ): Promise<BookingResponseDto> {
    return this.bookingService.acceptBooking(id, req.user.id, acceptDto);
  }

  @Post(":id/reject")
  @UseGuards(RolesGuard)
  @Roles("PROFESSIONAL")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reject a booking (Professional only)" })
  @ApiResponse({
    status: 200,
    description: "Booking rejected successfully",
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid transition" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async rejectBooking(
    @Param("id") id: string,
    @Body() rejectDto: RejectBookingDto,
    @Request() req: any
  ): Promise<BookingResponseDto> {
    return this.bookingService.rejectBooking(id, req.user.id, rejectDto);
  }

  @Post(":id/check-in")
  @UseGuards(RolesGuard)
  @Roles("PROFESSIONAL")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check in to a booking (Professional only)" })
  @ApiResponse({
    status: 200,
    description: "Checked in successfully",
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid transition" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async checkInBooking(
    @Param("id") id: string,
    @Body() checkInDto: CheckInDto,
    @Request() req: any
  ): Promise<BookingResponseDto> {
    return this.bookingService.checkInBooking(id, req.user.id, checkInDto);
  }

  @Post(":id/check-out")
  @UseGuards(RolesGuard)
  @Roles("PROFESSIONAL")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check out from a booking (Professional only)" })
  @ApiResponse({
    status: 200,
    description: "Checked out successfully",
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid transition" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async checkOutBooking(
    @Param("id") id: string,
    @Body() checkOutDto: CheckOutDto,
    @Request() req: any
  ): Promise<BookingResponseDto> {
    return this.bookingService.checkOutBooking(id, req.user.id, checkOutDto);
  }

  @Post(":id/complete")
  @UseGuards(RolesGuard)
  @Roles("PROFESSIONAL")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete a booking (Professional only)" })
  @ApiResponse({
    status: 200,
    description: "Booking completed successfully",
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid transition" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async completeBooking(
    @Param("id") id: string,
    @Body() completeDto: CompleteBookingDto,
    @Request() req: any
  ): Promise<BookingResponseDto> {
    return this.bookingService.completeBooking(id, req.user.id, completeDto);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel a booking" })
  @ApiResponse({
    status: 200,
    description: "Booking cancelled successfully",
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid transition" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async cancelBooking(
    @Param("id") id: string,
    @Body() cancelDto: CancelBookingDto,
    @Request() req: any
  ): Promise<BookingResponseDto> {
    return this.bookingService.cancelBooking(id, req.user.id, cancelDto);
  }
}






























