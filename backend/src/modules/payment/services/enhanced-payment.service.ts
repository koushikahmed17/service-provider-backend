import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { PaymentGatewayFactory } from "@/core/payment-gateways/payment-gateway.factory";
import { CommissionService } from "./commission.service";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreatePaymentRequestDto {
  bookingId: string;
  paymentMethod: "BKASH" | "NAGAD" | "ROCKET";
  amount: number;
  currency?: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface PaymentResponseDto {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  gatewayRef?: string;
  paymentURL?: string;
  commissionAmount: number;
  professionalAmount: number;
  createdAt: Date;
}

@Injectable()
export class EnhancedPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly commissionService: CommissionService
  ) {}

  async createPayment(
    createDto: CreatePaymentRequestDto,
    customerId: string
  ): Promise<PaymentResponseDto> {
    // Validate booking exists and belongs to customer
    const booking = await this.prisma.booking.findUnique({
      where: { id: createDto.bookingId },
      include: {
        customer: true,
        professional: true,
        category: true,
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.customerId !== customerId) {
      throw new ForbiddenException("Access denied to this booking");
    }

    if (booking.status !== "PENDING" && booking.status !== "ACCEPTED") {
      throw new BadRequestException(
        "Payment can only be made for pending or accepted bookings"
      );
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        bookingId: createDto.bookingId,
        status: { in: ["PENDING", "SUCCESS"] },
      },
    });

    if (existingPayment) {
      // If payment is already successful, don't allow new payment
      if (existingPayment.status === "SUCCESS") {
        throw new BadRequestException(
          "Payment already completed for this booking"
        );
      }

      // If payment is pending, return the existing payment
      if (existingPayment.status === "PENDING") {
        return {
          id: existingPayment.id,
          bookingId: existingPayment.bookingId,
          amount: Number(existingPayment.amountBDT),
          currency: existingPayment.currency,
          status: existingPayment.status,
          method: existingPayment.method,
          gatewayRef: existingPayment.gatewayRef,
          paymentURL: (existingPayment.metadata as any)?.gatewayIntent?.metadata
            ?.paymentURL,
          commissionAmount:
            (existingPayment.metadata as any)?.commissionAmount || 0,
          professionalAmount:
            (existingPayment.metadata as any)?.professionalAmount || 0,
          createdAt: existingPayment.createdAt,
        };
      }
    }

    // Calculate commission and professional amount
    const commissionRate = await this.commissionService.getCommissionRate(
      booking.categoryId
    );
    const totalAmount = Number(booking.quotedPriceBDT);
    const commissionAmount = totalAmount * (commissionRate / 100);
    const professionalAmount = totalAmount - commissionAmount;

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: createDto.bookingId,
        amountBDT: createDto.amount,
        currency: createDto.currency || "BDT",
        status: "PENDING",
        method: createDto.paymentMethod,
        metadata: {
          customerInfo: createDto.customerInfo,
          commissionRate,
          commissionAmount,
          professionalAmount,
          originalAmount: totalAmount,
        },
      },
    });

    try {
      // Create payment intent with gateway
      const gateway = this.paymentGatewayFactory.getGateway(
        createDto.paymentMethod
      );

      const paymentIntent = await gateway.createIntent({
        amount: createDto.amount,
        currency: createDto.currency || "BDT",
        bookingId: createDto.bookingId,
        customerId,
        metadata: {
          paymentId: payment.id,
          customerInfo: createDto.customerInfo,
          bookingDetails: {
            professionalName: booking.professional.fullName,
            categoryName: booking.category.name,
            scheduledAt: booking.scheduledAt,
          },
        },
      });

      // Update payment with gateway reference
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          gatewayRef: paymentIntent.gatewayRef,
          metadata: {
            ...((payment.metadata as any) || {}),
            gatewayIntent: paymentIntent,
          } as any,
        },
      });

      this.logger.log(
        `Payment created: ${payment.id} for booking ${createDto.bookingId}`,
        "EnhancedPaymentService"
      );

      return {
        id: updatedPayment.id,
        bookingId: updatedPayment.bookingId,
        amount: Number(updatedPayment.amountBDT),
        currency: updatedPayment.currency,
        status: updatedPayment.status,
        method: updatedPayment.method,
        gatewayRef: updatedPayment.gatewayRef,
        paymentURL: paymentIntent.metadata?.paymentURL,
        commissionAmount,
        professionalAmount,
        createdAt: updatedPayment.createdAt,
      };
    } catch (error) {
      // Update payment status to failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          metadata: {
            ...((payment.metadata as any) || {}),
            error: error.message,
          },
        },
      });

      this.logger.error(
        `Payment creation failed: ${error.message}`,
        "EnhancedPaymentService"
      );
      throw error;
    }
  }

  async capturePayment(
    paymentId: string,
    gatewayRef: string,
    gatewayType: "BKASH" | "NAGAD" | "ROCKET"
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            customer: true,
            professional: true,
            category: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.status !== "PENDING") {
      throw new BadRequestException("Payment is not in pending status");
    }

    try {
      // Capture payment with gateway
      const gateway = this.paymentGatewayFactory.getGateway(gatewayType);
      const captureResult = await gateway.capturePayment({
        paymentId: gatewayRef,
        amount: Number(payment.amountBDT),
        metadata: {
          paymentId: payment.id,
          bookingId: payment.bookingId,
        },
      });

      if (captureResult.status === "CAPTURED") {
        // Update payment status
        const updatedPayment = await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: "SUCCESS",
            gatewayRef: captureResult.gatewayRef,
            metadata: {
              ...((payment.metadata as any) || {}),
              captureResult,
              capturedAt: new Date().toISOString(),
            } as any,
          },
        });

        // Update booking status to accepted if it was pending
        if (payment.booking.status === "PENDING") {
          await this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: "ACCEPTED" },
          });

          // Create booking event
          await this.prisma.bookingEvent.create({
            data: {
              bookingId: payment.bookingId,
              type: "PAYMENT_COMPLETED",
              metadata: {
                paymentId: payment.id,
                amount: Number(payment.amountBDT),
                method: payment.method,
              },
            },
          });
        }

        // Extract commission amounts from payment metadata
        const paymentMetadata = payment.metadata as any;
        const commissionAmount = paymentMetadata?.commissionAmount || 0;
        const professionalAmount = paymentMetadata?.professionalAmount || 0;

        // Create daily settlement record and booking settlement
        await this.createDailySettlement(
          payment,
          commissionAmount,
          professionalAmount
        );

        this.logger.log(
          `Payment captured successfully: ${paymentId}`,
          "EnhancedPaymentService"
        );

        return {
          id: updatedPayment.id,
          bookingId: updatedPayment.bookingId,
          amount: Number(updatedPayment.amountBDT),
          currency: updatedPayment.currency,
          status: updatedPayment.status,
          method: updatedPayment.method,
          gatewayRef: updatedPayment.gatewayRef,
          commissionAmount: (payment.metadata as any)?.commissionAmount || 0,
          professionalAmount:
            (payment.metadata as any)?.professionalAmount || 0,
          createdAt: updatedPayment.createdAt,
        };
      } else {
        throw new Error("Payment capture failed");
      }
    } catch (error) {
      // Update payment status to failed
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "FAILED",
          metadata: {
            ...((payment.metadata as any) || {}),
            captureError: error.message,
          } as any,
        },
      });

      this.logger.error(
        `Payment capture failed: ${error.message}`,
        "EnhancedPaymentService"
      );
      throw error;
    }
  }

  async refundPayment(
    paymentId: string,
    reason?: string
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: true,
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.status !== "SUCCESS") {
      throw new BadRequestException("Only successful payments can be refunded");
    }

    try {
      // Refund payment with gateway
      const gateway = this.paymentGatewayFactory.getGateway(
        payment.method as "BKASH" | "NAGAD" | "ROCKET"
      );
      const refundResult = await gateway.refundPayment({
        paymentId: payment.gatewayRef || payment.id,
        amount: Number(payment.amountBDT),
        reason: reason || "Customer request",
        metadata: {
          paymentId: payment.id,
          bookingId: payment.bookingId,
        },
      });

      if (refundResult.status === "REFUNDED") {
        // Update payment status
        const updatedPayment = await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: "REFUNDED",
            metadata: {
              ...((payment.metadata as any) || {}),
              refundResult,
              refundedAt: new Date().toISOString(),
              refundReason: reason,
            } as any,
          },
        });

        // Update booking status to cancelled
        await this.prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: "CANCELLED",
            cancelReason: `Payment refunded: ${reason}`,
          },
        });

        // Create booking event
        await this.prisma.bookingEvent.create({
          data: {
            bookingId: payment.bookingId,
            type: "REFUNDED",
            metadata: {
              paymentId: payment.id,
              refundAmount: Number(payment.amountBDT),
              reason,
            },
          },
        });

        this.logger.log(
          `Payment refunded successfully: ${paymentId}`,
          "EnhancedPaymentService"
        );

        return {
          id: updatedPayment.id,
          bookingId: updatedPayment.bookingId,
          amount: Number(updatedPayment.amountBDT),
          currency: updatedPayment.currency,
          status: updatedPayment.status,
          method: updatedPayment.method,
          gatewayRef: updatedPayment.gatewayRef,
          commissionAmount: (payment.metadata as any)?.commissionAmount || 0,
          professionalAmount:
            (payment.metadata as any)?.professionalAmount || 0,
          createdAt: updatedPayment.createdAt,
        };
      } else {
        throw new Error("Payment refund failed");
      }
    } catch (error) {
      this.logger.error(
        `Payment refund failed: ${error.message}`,
        "EnhancedPaymentService"
      );
      throw error;
    }
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
            customer: true,
            professional: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    // Check if user has access to this payment
    const isCustomer = payment.booking.customerId === userId;
    const isProfessional = payment.booking.professionalId === userId;

    if (!isCustomer && !isProfessional) {
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

    return {
      id: payment.id,
      bookingId: payment.bookingId,
      amount: Number(payment.amountBDT),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      gatewayRef: payment.gatewayRef,
      commissionAmount: (payment.metadata as any)?.commissionAmount || 0,
      professionalAmount: (payment.metadata as any)?.professionalAmount || 0,
      createdAt: payment.createdAt,
    };
  }

  async getPaymentsByBooking(
    bookingId: string,
    userId: string
  ): Promise<PaymentResponseDto[]> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        professional: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Check if user has access to this booking
    const isCustomer = booking.customerId === userId;
    const isProfessional = booking.professionalId === userId;

    if (!isCustomer && !isProfessional) {
      // Check if user is admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });

      const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");
      if (!isAdmin) {
        throw new ForbiddenException("Access denied to this booking");
      }
    }

    return booking.payments.map((payment) => ({
      id: payment.id,
      bookingId: payment.bookingId,
      amount: Number(payment.amountBDT),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      gatewayRef: payment.gatewayRef,
      commissionAmount: (payment.metadata as any)?.commissionAmount || 0,
      professionalAmount: (payment.metadata as any)?.professionalAmount || 0,
      createdAt: payment.createdAt,
    }));
  }

  // New methods for daily settlement workflow

  private async createDailySettlement(
    payment: any,
    commissionAmount: number,
    professionalAmount: number
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create daily settlement for today
    let dailySettlement = await this.prisma.dailySettlement.findUnique({
      where: { date: today },
    });

    if (!dailySettlement) {
      dailySettlement = await this.prisma.dailySettlement.create({
        data: {
          date: today,
          totalBookings: 0,
          totalAmount: 0,
          totalCommission: 0,
          totalPayouts: 0,
          status: "PENDING",
        },
      });
    }

    // Update daily settlement totals
    await this.prisma.dailySettlement.update({
      where: { id: dailySettlement.id },
      data: {
        totalBookings: { increment: 1 },
        totalAmount: { increment: Number(payment.amountBDT) },
        totalCommission: { increment: commissionAmount },
        totalPayouts: { increment: professionalAmount },
      },
    });

    // Create booking settlement record
    await this.prisma.bookingSettlement.create({
      data: {
        bookingId: payment.bookingId,
        dailySettlementId: dailySettlement.id,
        professionalId: payment.booking.professionalId,
        commissionAmount,
        professionalAmount,
        status: "DUE",
      },
    });

    this.logger.log(
      `Daily settlement updated for ${today.toDateString()}: +${Number(
        payment.amountBDT
      )} BDT`,
      "EnhancedPaymentService"
    );
  }

  async processDailySettlement(date: Date): Promise<any> {
    const settlementDate = new Date(date);
    settlementDate.setHours(0, 0, 0, 0);

    const dailySettlement = await this.prisma.dailySettlement.findUnique({
      where: { date: settlementDate },
      include: {
        bookings: {
          include: {
            professional: true,
            booking: {
              include: {
                customer: true,
                professional: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!dailySettlement) {
      throw new NotFoundException("No settlement found for this date");
    }

    if (dailySettlement.status === "PROCESSED") {
      throw new BadRequestException(
        "Settlement already processed for this date"
      );
    }

    // Update settlement status to processed
    await this.prisma.dailySettlement.update({
      where: { id: dailySettlement.id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    // Update all booking settlements to paid
    await this.prisma.bookingSettlement.updateMany({
      where: {
        dailySettlementId: dailySettlement.id,
        status: "DUE",
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    this.logger.log(
      `Daily settlement processed for ${settlementDate.toDateString()}: ${
        dailySettlement.totalBookings
      } bookings, ${dailySettlement.totalAmount} BDT`,
      "EnhancedPaymentService"
    );

    return dailySettlement;
  }

  async getDailySettlementSummary(date?: Date): Promise<any> {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const settlement = await this.prisma.dailySettlement.findUnique({
      where: { date: targetDate },
      include: {
        bookings: {
          include: {
            professional: true,
            booking: {
              include: {
                customer: true,
                professional: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!settlement) {
      return {
        date: targetDate,
        totalBookings: 0,
        totalAmount: 0,
        totalCommission: 0,
        totalPayouts: 0,
        status: "NO_DATA",
        bookings: [],
      };
    }

    return settlement;
  }

  async getProfessionalEarnings(
    professionalId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = {
      professionalId,
      status: "PAID",
    };

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = startDate;
      if (endDate) where.paidAt.lte = endDate;
    }

    const settlements = await this.prisma.bookingSettlement.findMany({
      where,
      include: {
        booking: {
          include: {
            customer: true,
            category: true,
          },
        },
        dailySettlement: true,
      },
      orderBy: { paidAt: "desc" },
    });

    const totalEarnings = settlements.reduce(
      (sum, settlement) => sum + Number(settlement.professionalAmount),
      0
    );

    return {
      professionalId,
      totalEarnings,
      settlements,
      count: settlements.length,
    };
  }

  async refundBooking(bookingId: string, reason: string): Promise<any> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          where: { status: "SUCCESS" },
        },
        settlement: true,
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (!booking.payments.length) {
      throw new BadRequestException(
        "No successful payment found for this booking"
      );
    }

    const payment = booking.payments[0];

    // Refund the payment
    const refundResult = await this.refundPayment(payment.id, reason);

    // If there's a settlement, mark it as refunded
    if (booking.settlement) {
      await this.prisma.bookingSettlement.update({
        where: { bookingId },
        data: {
          status: "REFUNDED",
        },
      });
    }

    return refundResult;
  }
}
