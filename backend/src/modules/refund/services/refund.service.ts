import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  /**
   * Create a refund request for a rejected booking
   */
  async createRefundForRejectedBooking(
    bookingId: string,
    reason: string
  ): Promise<any> {
    this.logger.log(
      `Creating refund for rejected booking: ${bookingId}`,
      "RefundService"
    );

    // Get the booking with payment details
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          where: { status: "SUCCESS" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        customer: true,
        professional: true,
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.status !== "REJECTED") {
      throw new BadRequestException(
        "Refund can only be created for rejected bookings"
      );
    }

    const payment = booking.payments[0];
    if (!payment) {
      throw new NotFoundException(
        "No successful payment found for this booking"
      );
    }

    // Check if refund already exists
    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        bookingId,
        paymentId: payment.id,
      },
    });

    if (existingRefund) {
      this.logger.warn(
        `Refund already exists for booking ${bookingId}`,
        "RefundService"
      );
      return existingRefund;
    }

    // Create the refund record
    const refund = await this.prisma.refund.create({
      data: {
        bookingId,
        paymentId: payment.id,
        amountBDT: payment.amountBDT,
        reason,
        status: "PENDING",
        metadata: {
          customerName: booking.customer.fullName,
          customerEmail: booking.customer.email,
          customerPhone: booking.customer.phone,
          professionalName: booking.professional.fullName,
          originalPaymentMethod: payment.method,
        },
      },
      include: {
        booking: {
          include: {
            customer: true,
            professional: true,
            category: true,
          },
        },
        payment: true,
      },
    });

    this.logger.log(
      `Refund created successfully: ${refund.id} for amount ${refund.amountBDT} BDT`,
      "RefundService"
    );

    return refund;
  }

  /**
   * Get all refunds with filtering options
   */
  async getAllRefunds(filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const refunds = await this.prisma.refund.findMany({
      where,
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
            professional: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
            category: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return refunds;
  }

  /**
   * Get refund by ID
   */
  async getRefundById(refundId: string): Promise<any> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        booking: {
          include: {
            customer: true,
            professional: true,
            category: true,
          },
        },
        payment: true,
      },
    });

    if (!refund) {
      throw new NotFoundException("Refund not found");
    }

    return refund;
  }

  /**
   * Get pending refunds count and total amount
   */
  async getPendingRefundsStats(): Promise<any> {
    const pendingRefunds = await this.prisma.refund.findMany({
      where: { status: "PENDING" },
    });

    const totalAmount = pendingRefunds.reduce(
      (sum, refund) => sum + Number(refund.amountBDT),
      0
    );

    return {
      count: pendingRefunds.length,
      totalAmount,
    };
  }

  /**
   * Process a refund (mark as processing)
   */
  async processRefund(
    refundId: string,
    adminId: string,
    refundMethod: string,
    notes?: string
  ): Promise<any> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException("Refund not found");
    }

    if (refund.status !== "PENDING") {
      throw new BadRequestException("Only pending refunds can be processed");
    }

    const updatedRefund = await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: "PROCESSING",
        refundMethod,
        processedBy: adminId,
        notes,
      },
      include: {
        booking: {
          include: {
            customer: true,
            professional: true,
            category: true,
          },
        },
        payment: true,
      },
    });

    this.logger.log(
      `Refund ${refundId} marked as processing by admin ${adminId}`,
      "RefundService"
    );

    return updatedRefund;
  }

  /**
   * Complete a refund (mark as completed)
   */
  async completeRefund(
    refundId: string,
    adminId: string,
    gatewayRef?: string,
    notes?: string
  ): Promise<any> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException("Refund not found");
    }

    if (refund.status !== "PROCESSING" && refund.status !== "PENDING") {
      throw new BadRequestException(
        "Only pending or processing refunds can be completed"
      );
    }

    const updatedRefund = await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: "COMPLETED",
        gatewayRef,
        processedBy: adminId,
        processedAt: new Date(),
        notes: notes || refund.notes,
      },
      include: {
        booking: {
          include: {
            customer: true,
            professional: true,
            category: true,
          },
        },
        payment: true,
      },
    });

    this.logger.log(
      `Refund ${refundId} completed successfully by admin ${adminId}`,
      "RefundService"
    );

    return updatedRefund;
  }

  /**
   * Mark refund as failed
   */
  async markRefundAsFailed(
    refundId: string,
    adminId: string,
    notes: string
  ): Promise<any> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException("Refund not found");
    }

    const updatedRefund = await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: "FAILED",
        processedBy: adminId,
        processedAt: new Date(),
        notes,
      },
      include: {
        booking: {
          include: {
            customer: true,
            professional: true,
            category: true,
          },
        },
        payment: true,
      },
    });

    this.logger.error(
      `Refund ${refundId} marked as failed by admin ${adminId}: ${notes}`,
      "RefundService"
    );

    return updatedRefund;
  }

  /**
   * Get refund statistics
   */
  async getRefundStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const refunds = await this.prisma.refund.findMany({
      where,
    });

    const stats = {
      total: refunds.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalAmount: 0,
      pendingAmount: 0,
      completedAmount: 0,
    };

    refunds.forEach((refund) => {
      const amount = Number(refund.amountBDT);
      stats.totalAmount += amount;

      switch (refund.status) {
        case "PENDING":
          stats.pending++;
          stats.pendingAmount += amount;
          break;
        case "PROCESSING":
          stats.processing++;
          break;
        case "COMPLETED":
          stats.completed++;
          stats.completedAmount += amount;
          break;
        case "FAILED":
          stats.failed++;
          break;
      }
    });

    return stats;
  }

  /**
   * Create sample refund for testing (DEV ONLY)
   */
  async createSampleRefundForTesting(): Promise<any> {
    this.logger.log("Creating sample refund for testing", "RefundService");

    // Find any completed booking with a payment
    const booking = await this.prisma.booking.findFirst({
      where: {
        status: "COMPLETED",
        payments: {
          some: { status: "SUCCESS" },
        },
      },
      include: {
        payments: {
          where: { status: "SUCCESS" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        customer: true,
        professional: true,
        category: true,
      },
    });

    if (!booking || !booking.payments.length) {
      throw new Error("No completed bookings with payments found for testing");
    }

    const payment = booking.payments[0];

    // Create a sample refund
    const refund = await this.prisma.refund.create({
      data: {
        bookingId: booking.id,
        paymentId: payment.id,
        amountBDT: payment.amountBDT,
        reason: "TEST: Sample refund for demonstration purposes",
        status: "PENDING",
        metadata: {
          customerName: booking.customer.fullName,
          customerEmail: booking.customer.email,
          customerPhone: booking.customer.phone,
          professionalName: booking.professional.fullName,
          testData: true,
        },
      },
      include: {
        booking: {
          include: {
            customer: true,
            professional: true,
            category: true,
          },
        },
        payment: true,
      },
    });

    this.logger.log(
      `Sample refund created: ${refund.id} for ${refund.amountBDT} BDT`,
      "RefundService"
    );

    return refund;
  }
}
