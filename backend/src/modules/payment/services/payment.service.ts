import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { ILocalGateway } from "@/core/payment-gateway.interface";
import { Inject } from "@nestjs/common";
import { CommissionService } from "./commission.service";
import {
  CreatePaymentIntentDto,
  PaymentResponseDto,
  PaymentQueryDto,
  PaymentStatus,
  PaymentMethod,
  CapturePaymentDto,
  RefundPaymentDto,
} from "../dto";

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    @Inject("ILocalGateway") private readonly paymentGateway: ILocalGateway,
    private readonly commissionService: CommissionService
  ) {}

  async createPaymentIntent(
    createDto: CreatePaymentIntentDto,
    customerId: string
  ): Promise<PaymentResponseDto> {
    // Validate booking exists and belongs to customer
    const booking = await this.prisma.booking.findUnique({
      where: { id: createDto.bookingId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        professional: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.customerId !== customerId) {
      throw new ForbiddenException(
        "You can only create payments for your own bookings"
      );
    }

    // Check if booking is in a valid state for payment
    if (
      !["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(
        booking.status
      )
    ) {
      throw new BadRequestException(
        "Cannot create payment for booking in current status"
      );
    }

    // Check if payment already exists for this booking
    const existingPayment = await this.prisma.payment.findFirst({
      where: { bookingId: createDto.bookingId },
    });

    if (existingPayment) {
      throw new BadRequestException("Payment already exists for this booking");
    }

    // Calculate amount (use final amount if available, otherwise quoted price)
    const amount = booking.finalAmountBDT
      ? Number(booking.finalAmountBDT)
      : Number(booking.quotedPriceBDT);

    // Create payment intent with gateway
    const intent = await this.paymentGateway.createIntent({
      amount,
      currency: "BDT",
      bookingId: createDto.bookingId,
      customerId,
      metadata: {
        ...createDto.metadata,
        bookingStatus: booking.status,
        professionalId: booking.professionalId,
        categoryId: booking.categoryId,
      },
    });

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: createDto.bookingId,
        amountBDT: amount,
        currency: "BDT",
        status: intent.status as PaymentStatus,
        method: (createDto.method || PaymentMethod.CARD) as PaymentMethod,
        gatewayRef: intent.gatewayRef,
        metadata: {
          ...intent.metadata,
          ...createDto.metadata,
        },
      },
    });

    this.logger.log(
      `Payment intent created: ${payment.id} for booking ${createDto.bookingId}`,
      "PaymentService"
    );

    return this.mapToResponseDto(payment, booking);
  }

  async capturePayment(
    paymentId: string,
    captureDto: CapturePaymentDto,
    userId: string
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            professional: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    // Check if user has permission to capture this payment
    const canCapture =
      payment.booking.customerId === userId ||
      payment.booking.professionalId === userId;

    if (!canCapture) {
      // Check if user is admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });

      const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");
      if (!isAdmin) {
        throw new ForbiddenException("You cannot capture this payment");
      }
    }

    if (
      payment.status !== PaymentStatus.INITIATED &&
      payment.status !== PaymentStatus.AUTHORIZED
    ) {
      throw new BadRequestException(
        "Payment cannot be captured in current status"
      );
    }

    // Determine capture amount
    const captureAmount = captureDto.amount || Number(payment.amountBDT);

    // Capture payment with gateway
    const capture = await this.paymentGateway.capturePayment({
      paymentId: payment.gatewayRef!,
      amount: captureAmount,
      metadata: {
        ...captureDto.metadata,
        capturedBy: userId,
        bookingId: payment.bookingId,
      },
    });

    // Update payment status
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: capture.status as PaymentStatus,
        metadata: {
          ...((payment.metadata as object) || {}),
          ...(capture.metadata || {}),
          captureAmount,
          capturedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Payment captured: ${paymentId} for amount ${captureAmount}`,
      "PaymentService"
    );

    return this.mapToResponseDto(updatedPayment, payment.booking);
  }

  async refundPayment(
    paymentId: string,
    refundDto: RefundPaymentDto,
    userId: string
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            professional: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    // Check if user has permission to refund this payment
    const canRefund = payment.booking.customerId === userId;

    if (!canRefund) {
      // Check if user is admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });

      const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");
      if (!isAdmin) {
        throw new ForbiddenException("You cannot refund this payment");
      }
    }

    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException("Only captured payments can be refunded");
    }

    if (refundDto.amount > Number(payment.amountBDT)) {
      throw new BadRequestException(
        "Refund amount cannot exceed payment amount"
      );
    }

    // Refund payment with gateway
    const refund = await this.paymentGateway.refundPayment({
      paymentId: payment.gatewayRef!,
      amount: refundDto.amount,
      reason: refundDto.reason,
      metadata: {
        ...refundDto.metadata,
        refundedBy: userId,
        bookingId: payment.bookingId,
      },
    });

    // Update payment status
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: refund.status as PaymentStatus,
        metadata: {
          ...((payment.metadata as object) || {}),
          ...(refund.metadata || {}),
          refundAmount: refundDto.amount,
          refundReason: refundDto.reason,
          refundedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Payment refunded: ${paymentId} for amount ${refundDto.amount}`,
      "PaymentService"
    );

    return this.mapToResponseDto(updatedPayment, payment.booking);
  }

  async getPaymentById(
    paymentId: string,
    userId: string
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            professional: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    // Check if user has access to this payment
    const hasAccess =
      payment.booking.customerId === userId ||
      payment.booking.professionalId === userId;

    if (!hasAccess) {
      // Check if user is admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });

      const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");
      if (!isAdmin) {
        throw new ForbiddenException("Access denied to this payment");
      }
    }

    return this.mapToResponseDto(payment, payment.booking);
  }

  async getPayments(
    query: PaymentQueryDto,
    userId: string
  ): Promise<{
    payments: PaymentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      status,
      bookingId,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;

    // Get user's role to determine which payments to show
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");
    const isProfessional = user?.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );

    let whereClause: any = {};

    if (isAdmin) {
      // Admin can see all payments
      whereClause = {};
    } else if (isProfessional) {
      // Professional sees payments for their bookings
      whereClause = {
        booking: {
          professionalId: userId,
        },
      };
    } else {
      // Customer sees payments for their bookings
      whereClause = {
        booking: {
          customerId: userId,
        },
      };
    }

    // Add filters
    if (status) {
      whereClause.status = status;
    }

    if (bookingId) {
      whereClause.bookingId = bookingId;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: whereClause,
        include: {
          booking: {
            include: {
              customer: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              professional: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: whereClause }),
    ]);

    return {
      payments: payments.map((payment) =>
        this.mapToResponseDto(payment, payment.booking)
      ),
      total,
      page,
      limit,
    };
  }

  async processWebhook(
    payload: any,
    signature: string
  ): Promise<{
    success: boolean;
    paymentId?: string;
    status?: string;
  }> {
    // Verify webhook signature
    if (!this.paymentGateway.verifyWebhook(payload, signature)) {
      this.logger.error("Invalid webhook signature", "PaymentService");
      return { success: false };
    }

    try {
      // Process webhook with gateway
      const result = await this.paymentGateway.processWebhook(payload);

      if (result.success) {
        // Update payment status in database
        const payment = await this.prisma.payment.findFirst({
          where: { gatewayRef: payload.paymentId },
        });

        if (payment) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: payload.status as PaymentStatus,
              metadata: {
                ...((payment.metadata as object) || {}),
                webhookProcessedAt: new Date().toISOString(),
                webhookPayload: payload,
              },
            },
          });

          this.logger.log(
            `Webhook processed successfully for payment ${payment.id}`,
            "PaymentService"
          );
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error.message}`,
        "PaymentService"
      );
      return { success: false };
    }
  }

  private mapToResponseDto(payment: any, booking?: any): PaymentResponseDto {
    return {
      id: payment.id,
      bookingId: payment.bookingId,
      amountBDT: Number(payment.amountBDT),
      currency: payment.currency,
      status: payment.status as PaymentStatus,
      method: payment.method as PaymentMethod,
      gatewayRef: payment.gatewayRef,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      booking: booking
        ? {
            id: booking.id,
            status: booking.status,
            scheduledAt: booking.scheduledAt,
            quotedPriceBDT: Number(booking.quotedPriceBDT),
            finalAmountBDT: booking.finalAmountBDT
              ? Number(booking.finalAmountBDT)
              : undefined,
            customer: booking.customer,
            professional: booking.professional,
          }
        : undefined,
    };
  }
}
