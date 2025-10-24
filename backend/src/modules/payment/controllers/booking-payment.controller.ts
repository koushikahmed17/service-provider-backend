import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Query,
} from "@nestjs/common";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { EnhancedPaymentService } from "../services/enhanced-payment.service";
import { PaymentGatewayFactory } from "@/core/payment-gateways/payment-gateway.factory";
import { CreatePaymentRequestDto } from "../services/enhanced-payment.service";

class CustomerInfoDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class CreateBookingPaymentDto {
  @IsString()
  bookingId: string;

  @IsIn(["BKASH", "NAGAD", "ROCKET"])
  paymentMethod: "BKASH" | "NAGAD" | "ROCKET";

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo?: CustomerInfoDto;
}

export class CapturePaymentDto {
  @IsString()
  gatewayRef: string;

  @IsIn(["BKASH", "NAGAD", "ROCKET"])
  gatewayType: "BKASH" | "NAGAD" | "ROCKET";
}

export class RefundPaymentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller("bookings/payments")
@UseGuards(JwtAuthGuard)
export class BookingPaymentController {
  constructor(
    private readonly enhancedPaymentService: EnhancedPaymentService,
    private readonly paymentGatewayFactory: PaymentGatewayFactory
  ) {}

  @Post()
  async createPayment(
    @Body() createDto: CreateBookingPaymentDto,
    @Request() req: any
  ) {
    const customerId = req.user.id;

    const payment = await this.enhancedPaymentService.createPayment(
      createDto,
      customerId
    );

    return {
      success: true,
      message: "Payment intent created successfully",
      data: payment,
    };
  }

  @Post(":paymentId/capture")
  async capturePayment(
    @Param("paymentId") paymentId: string,
    @Body() captureDto: CapturePaymentDto,
    @Request() req: any
  ) {
    const payment = await this.enhancedPaymentService.capturePayment(
      paymentId,
      captureDto.gatewayRef,
      captureDto.gatewayType
    );

    return {
      success: true,
      message: "Payment captured successfully",
      data: payment,
    };
  }

  @Patch(":paymentId/refund")
  async refundPayment(
    @Param("paymentId") paymentId: string,
    @Body() refundDto: RefundPaymentDto,
    @Request() req: any
  ) {
    const payment = await this.enhancedPaymentService.refundPayment(
      paymentId,
      refundDto.reason
    );

    return {
      success: true,
      message: "Payment refunded successfully",
      data: payment,
    };
  }

  @Get(":paymentId")
  async getPayment(@Param("paymentId") paymentId: string, @Request() req: any) {
    const userId = req.user.id;
    const payment = await this.enhancedPaymentService.getPaymentById(
      paymentId,
      userId
    );

    return {
      success: true,
      data: payment,
    };
  }

  @Get("booking/:bookingId")
  async getBookingPayments(
    @Param("bookingId") bookingId: string,
    @Request() req: any
  ) {
    const userId = req.user.id;
    const payments = await this.enhancedPaymentService.getPaymentsByBooking(
      bookingId,
      userId
    );

    return {
      success: true,
      data: payments,
    };
  }

  @Get("gateways/available")
  async getAvailableGateways() {
    const gateways = this.paymentGatewayFactory.getAvailableGateways();

    const gatewayInfo = gateways.map((gateway) => ({
      id: gateway,
      name: gateway.charAt(0) + gateway.slice(1).toLowerCase(),
      description: `Pay securely with ${gateway}`,
      logo: `https://example.com/logos/${gateway.toLowerCase()}.png`,
      enabled: true,
    }));

    return {
      success: true,
      data: gatewayInfo,
    };
  }
}
