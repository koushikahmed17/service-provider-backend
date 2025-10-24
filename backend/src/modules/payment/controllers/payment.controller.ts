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
import { PaymentService } from "../services/payment.service";
import {
  CreatePaymentIntentDto,
  PaymentResponseDto,
  PaymentQueryDto,
  CapturePaymentDto,
  RefundPaymentDto,
} from "../dto";

@ApiTags("Payments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("intent")
  @ApiOperation({ summary: "Create a payment intent" })
  @ApiResponse({
    status: 201,
    description: "Payment intent created successfully",
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Booking not found" })
  @ApiResponse({ status: 403, description: "Access denied" })
  async createPaymentIntent(
    @Body() createDto: CreatePaymentIntentDto,
    @Request() req: any
  ): Promise<PaymentResponseDto> {
    return this.paymentService.createPaymentIntent(createDto, req.user.id);
  }

  @Post(":id/capture")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Capture a payment" })
  @ApiResponse({
    status: 200,
    description: "Payment captured successfully",
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid payment status" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  async capturePayment(
    @Param("id") id: string,
    @Body() captureDto: CapturePaymentDto,
    @Request() req: any
  ): Promise<PaymentResponseDto> {
    return this.paymentService.capturePayment(id, captureDto, req.user.id);
  }

  @Post(":id/refund")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refund a payment" })
  @ApiResponse({
    status: 200,
    description: "Payment refunded successfully",
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid refund amount" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  async refundPayment(
    @Param("id") id: string,
    @Body() refundDto: RefundPaymentDto,
    @Request() req: any
  ): Promise<PaymentResponseDto> {
    return this.paymentService.refundPayment(id, refundDto, req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get payment by ID" })
  @ApiResponse({
    status: 200,
    description: "Payment retrieved successfully",
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 404, description: "Payment not found" })
  @ApiResponse({ status: 403, description: "Access denied" })
  async getPaymentById(
    @Param("id") id: string,
    @Request() req: any
  ): Promise<PaymentResponseDto> {
    return this.paymentService.getPaymentById(id, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: "Get user's payments" })
  @ApiResponse({
    status: 200,
    description: "Payments retrieved successfully",
  })
  async getPayments(
    @Query() query: PaymentQueryDto,
    @Request() req: any
  ): Promise<{
    payments: PaymentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.paymentService.getPayments(query, req.user.id);
  }
}






























