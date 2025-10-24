import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EnhancedPaymentService } from "@/modules/payment/services/enhanced-payment.service";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";

@Injectable()
export class AdminSettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly enhancedPaymentService: EnhancedPaymentService
  ) {}

  async getDailySettlementSummary(date: Date): Promise<any> {
    return this.enhancedPaymentService.getDailySettlementSummary(date);
  }

  async getDailySettlementHistory(
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const settlements = await this.prisma.dailySettlement.findMany({
      where,
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
      orderBy: { date: "desc" },
    });

    return settlements;
  }

  async processDailySettlement(date: Date): Promise<any> {
    return this.enhancedPaymentService.processDailySettlement(date);
  }

  async getProfessionalEarnings(
    professionalId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    return this.enhancedPaymentService.getProfessionalEarnings(
      professionalId,
      startDate,
      endDate
    );
  }

  async getSettlementOverview(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's settlement
    const todaySettlement = await this.prisma.dailySettlement.findUnique({
      where: { date: today },
    });

    // Get this month's settlements
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthSettlements = await this.prisma.dailySettlement.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Calculate totals
    const monthTotals = monthSettlements.reduce(
      (totals, settlement) => ({
        totalBookings: totals.totalBookings + settlement.totalBookings,
        totalAmount: totals.totalAmount + Number(settlement.totalAmount),
        totalCommission:
          totals.totalCommission + Number(settlement.totalCommission),
        totalPayouts: totals.totalPayouts + Number(settlement.totalPayouts),
      }),
      {
        totalBookings: 0,
        totalAmount: 0,
        totalCommission: 0,
        totalPayouts: 0,
      }
    );

    // Get pending settlements count
    const pendingSettlements = await this.prisma.dailySettlement.count({
      where: { status: "PENDING" },
    });

    // Get top earning professionals this month
    const topProfessionals = await this.prisma.bookingSettlement.groupBy({
      by: ["professionalId"],
      where: {
        status: "PAID",
        paidAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        professionalAmount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          professionalAmount: "desc",
        },
      },
      take: 10,
    });

    // Get professional details for top earners
    const topProfessionalIds = topProfessionals.map((p) => p.professionalId);
    const professionals = await this.prisma.user.findMany({
      where: {
        id: { in: topProfessionalIds },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    const topEarners = topProfessionals.map((earning) => {
      const professional = professionals.find(
        (p) => p.id === earning.professionalId
      );
      return {
        professionalId: earning.professionalId,
        professionalName: professional?.fullName || "Unknown",
        professionalEmail: professional?.email || "",
        totalEarnings: Number(earning._sum.professionalAmount || 0),
        totalBookings: earning._count.id,
      };
    });

    return {
      today: todaySettlement || {
        date: today,
        totalBookings: 0,
        totalAmount: 0,
        totalCommission: 0,
        totalPayouts: 0,
        status: "NO_DATA",
      },
      thisMonth: {
        ...monthTotals,
        days: monthSettlements.length,
      },
      pendingSettlements,
      topEarners,
    };
  }

  async refundBooking(bookingId: string, reason: string): Promise<any> {
    return this.enhancedPaymentService.refundBooking(bookingId, reason);
  }

  async getDueSettlements(): Promise<any[]> {
    const dueSettlements = await this.prisma.bookingSettlement.findMany({
      where: { status: "DUE" },
      include: {
        professional: true,
        booking: {
          include: {
            customer: true,
            category: true,
          },
        },
        dailySettlement: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by professional
    const professionalGroups = dueSettlements.reduce((groups, settlement) => {
      const professionalId = settlement.professionalId;
      if (!groups[professionalId]) {
        groups[professionalId] = {
          professional: settlement.professional,
          totalDue: 0,
          settlements: [],
        };
      }
      groups[professionalId].totalDue += Number(settlement.professionalAmount);
      groups[professionalId].settlements.push(settlement);
      return groups;
    }, {});

    return Object.values(professionalGroups);
  }

  async getAllSettlements(): Promise<any[]> {
    const allSettlements = await this.prisma.bookingSettlement.findMany({
      include: {
        professional: true,
        booking: {
          include: {
            customer: true,
            category: true,
          },
        },
        dailySettlement: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform the data to include all necessary fields for the frontend
    return allSettlements.map((settlement) => ({
      id: settlement.id,
      bookingId: settlement.bookingId,
      professionalId: settlement.professionalId,
      amount:
        settlement.booking?.finalAmountBDT ||
        settlement.booking?.quotedPriceBDT ||
        0,
      commissionAmount: settlement.commissionAmount,
      professionalAmount: settlement.professionalAmount,
      status: settlement.status,
      paidAt: settlement.paidAt,
      createdAt: settlement.createdAt,
      updatedAt: settlement.updatedAt,
      professional: settlement.professional,
      booking: settlement.booking,
      dailySettlement: settlement.dailySettlement,
    }));
  }

  async backfillSettlementData(): Promise<any> {
    this.logger.log(
      "Starting settlement data backfill",
      "AdminSettlementService"
    );

    // First, find all completed bookings
    const allCompletedBookings = await this.prisma.booking.findMany({
      where: {
        status: "COMPLETED",
      },
      include: {
        customer: true,
        professional: true,
        category: true,
        payments: {
          where: { status: "SUCCESS" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Get all existing settlement records to filter out bookings that already have settlements
    const existingSettlements = await this.prisma.bookingSettlement.findMany({
      select: { bookingId: true },
    });
    const settledBookingIds = new Set(
      existingSettlements.map((s) => s.bookingId)
    );

    // Filter out bookings that already have settlement records
    const completedBookingsWithoutSettlements = allCompletedBookings.filter(
      (booking) => !settledBookingIds.has(booking.id)
    );

    this.logger.log(
      `Found ${completedBookingsWithoutSettlements.length} completed bookings without settlements`,
      "AdminSettlementService"
    );

    let processedCount = 0;
    let errorCount = 0;

    for (const booking of completedBookingsWithoutSettlements) {
      try {
        let payment = booking.payments[0];

        // If no payment exists, create a mock payment record for settlement purposes
        if (!payment) {
          this.logger.warn(
            `No payment found for completed booking ${booking.id}, creating mock payment for settlement`,
            "AdminSettlementService"
          );

          // Create a mock payment record
          payment = await this.prisma.payment.create({
            data: {
              bookingId: booking.id,
              amountBDT: booking.finalAmountBDT || booking.quotedPriceBDT,
              currency: "BDT",
              status: "SUCCESS",
              method: "MOCK_PAYMENT",
              gatewayRef: `mock_${booking.id}`,
              metadata: {
                createdFor: "settlement_backfill",
                originalAmount:
                  booking.finalAmountBDT || booking.quotedPriceBDT,
                quotedAmount: booking.quotedPriceBDT,
              },
            },
          });
        }

        // Calculate commission
        const commissionRate = await this.prisma.commissionSetting.findFirst({
          where: { categoryId: booking.categoryId },
        });

        const rate = commissionRate ? Number(commissionRate.percent) : 15;
        const totalAmount = Number(booking.finalAmountBDT || payment.amountBDT);
        const commissionAmount = totalAmount * (rate / 100);
        const professionalAmount = totalAmount - commissionAmount;

        // Create or find daily settlement for the booking completion date
        const completionDate = new Date(booking.updatedAt);
        completionDate.setHours(0, 0, 0, 0);

        let dailySettlement = await this.prisma.dailySettlement.findUnique({
          where: { date: completionDate },
        });

        if (!dailySettlement) {
          dailySettlement = await this.prisma.dailySettlement.create({
            data: {
              date: completionDate,
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
            totalAmount: { increment: totalAmount },
            totalCommission: { increment: commissionAmount },
            totalPayouts: { increment: professionalAmount },
          },
        });

        // Create booking settlement record
        await this.prisma.bookingSettlement.create({
          data: {
            bookingId: booking.id,
            dailySettlementId: dailySettlement.id,
            professionalId: booking.professionalId,
            commissionAmount,
            professionalAmount,
            status: "DUE",
          },
        });

        processedCount++;
        this.logger.log(
          `Created settlement for booking ${booking.id}: ${totalAmount} BDT (${commissionAmount} commission, ${professionalAmount} professional)`,
          "AdminSettlementService"
        );
      } catch (error) {
        this.logger.error(
          `Failed to create settlement for booking ${booking.id}: ${error.message}`,
          "AdminSettlementService"
        );
        errorCount++;
      }
    }

    this.logger.log(
      `Settlement backfill completed: ${processedCount} processed, ${errorCount} errors`,
      "AdminSettlementService"
    );

    return {
      processed: processedCount,
      errors: errorCount,
      total: completedBookingsWithoutSettlements.length,
    };
  }

  /**
   * Mark a booking settlement as paid
   */
  async markSettlementAsPaid(
    settlementId: string,
    paymentMethod?: string,
    notes?: string
  ): Promise<any> {
    this.logger.log(
      `Marking settlement ${settlementId} as paid`,
      "AdminSettlementService"
    );

    // Find the booking settlement
    const settlement = await this.prisma.bookingSettlement.findUnique({
      where: { id: settlementId },
      include: {
        booking: {
          include: {
            customer: true,
            professional: true,
            category: true,
          },
        },
        dailySettlement: true,
      },
    });

    if (!settlement) {
      throw new NotFoundException("Settlement not found");
    }

    if (settlement.status !== "DUE") {
      throw new BadRequestException(
        `Settlement status is ${settlement.status}, only DUE settlements can be marked as paid`
      );
    }

    // Use a transaction to update both settlement and professional account balance
    const updatedSettlement = await this.prisma.$transaction(async (tx) => {
      // Update the settlement status
      const settlement = await tx.bookingSettlement.update({
        where: { id: settlementId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
        include: {
          booking: {
            include: {
              customer: true,
              professional: true,
              category: true,
            },
          },
          dailySettlement: true,
        },
      });

      // Update the professional's account balance
      await (tx as any).professionalProfile.update({
        where: { userId: settlement.professionalId },
        data: {
          accountBalanceBDT: {
            increment: settlement.professionalAmount,
          },
        },
      });

      return settlement;
    });

    this.logger.log(
      `Settlement ${settlementId} marked as paid: ${settlement.professionalAmount} BDT`,
      "AdminSettlementService"
    );

    return updatedSettlement;
  }

  async createManualSettlement(bookingId: string): Promise<any> {
    this.logger.log(
      `Creating manual settlement for booking ${bookingId}`,
      "AdminSettlementService"
    );

    // Find the booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        professional: true,
        category: true,
        payments: {
          where: { status: { in: ["PENDING", "SUCCESS"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.status !== "COMPLETED") {
      throw new BadRequestException(
        "Only completed bookings can have settlements created"
      );
    }

    // Check if settlement already exists
    const existingSettlement = await this.prisma.bookingSettlement.findUnique({
      where: { bookingId },
    });

    if (existingSettlement) {
      throw new BadRequestException(
        "Settlement already exists for this booking"
      );
    }

    // Get payment (create one if doesn't exist)
    let payment = booking.payments[0];
    if (!payment) {
      // Create a payment record for this booking
      payment = await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          amountBDT: booking.finalAmountBDT || booking.quotedPriceBDT,
          currency: "BDT",
          status: "SUCCESS",
          method: "MANUAL",
          gatewayRef: `manual_${Date.now()}`,
        },
      });
    } else if (payment.status === "PENDING") {
      // Update pending payment to success
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
        },
      });
    }

    // Calculate commission
    const commissionRate = await this.prisma.commissionSetting.findFirst({
      where: { categoryId: booking.categoryId },
    });

    const rate = commissionRate ? Number(commissionRate.percent) : 15;
    const totalAmount = Number(payment.amountBDT);
    const commissionAmount = totalAmount * (rate / 100);
    const professionalAmount = totalAmount - commissionAmount;

    // Create daily settlement if doesn't exist
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    // Create booking settlement
    const settlement = await this.prisma.bookingSettlement.create({
      data: {
        bookingId: booking.id,
        dailySettlementId: dailySettlement.id,
        professionalId: booking.professionalId,
        commissionAmount,
        professionalAmount,
        status: "DUE",
      },
      include: {
        booking: {
          include: {
            customer: true,
            professional: true,
            category: true,
          },
        },
        dailySettlement: true,
      },
    });

    // Update daily settlement totals
    await this.prisma.dailySettlement.update({
      where: { id: dailySettlement.id },
      data: {
        totalBookings: { increment: 1 },
        totalAmount: { increment: totalAmount },
        totalCommission: { increment: commissionAmount },
        totalPayouts: { increment: professionalAmount },
      },
    });

    this.logger.log(
      `Manual settlement created for booking ${bookingId}: ${professionalAmount} BDT`,
      "AdminSettlementService"
    );

    return settlement;
  }
}
