import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { CommissionService } from "./commission.service";
import {
  CreatePayoutDto,
  PayoutResponseDto,
  PayoutQueryDto,
  PayoutStatsDto,
  PayoutStatus,
} from "../dto";

@Injectable()
export class PayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly commissionService: CommissionService
  ) {}

  async createPayout(createDto: CreatePayoutDto): Promise<PayoutResponseDto> {
    // Validate professional exists
    const professional = await this.prisma.user.findUnique({
      where: { id: createDto.professionalId },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!professional) {
      throw new NotFoundException("Professional not found");
    }

    const hasProfessionalRole = professional.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!hasProfessionalRole) {
      throw new BadRequestException("User is not a professional");
    }

    // Check for overlapping payout periods
    const overlappingPayout = await this.prisma.payout.findFirst({
      where: {
        professionalId: createDto.professionalId,
        OR: [
          {
            periodStart: {
              lte: new Date(createDto.periodEnd),
            },
            periodEnd: {
              gte: new Date(createDto.periodStart),
            },
          },
        ],
      },
    });

    if (overlappingPayout) {
      throw new BadRequestException(
        "Payout period overlaps with existing payout"
      );
    }

    const payout = await this.prisma.payout.create({
      data: {
        professionalId: createDto.professionalId,
        periodStart: new Date(createDto.periodStart),
        periodEnd: new Date(createDto.periodEnd),
        amountBDT: createDto.amountBDT,
        status: PayoutStatus.PENDING,
        meta: createDto.meta,
      },
      include: {
        professional: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    this.logger.log(
      `Payout created: ${payout.id} for professional ${createDto.professionalId}`,
      "PayoutService"
    );

    return this.mapToResponseDto(payout);
  }

  async getPayouts(
    query: PayoutQueryDto,
    userId: string
  ): Promise<{
    payouts: PayoutResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      status,
      professionalId,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = query;

    const skip = (page - 1) * limit;

    // Get user's role to determine which payouts to show
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");

    let whereClause: any = {};

    if (isAdmin) {
      // Admin can see all payouts
      whereClause = {};
    } else {
      // Professional sees only their payouts
      whereClause = { professionalId: userId };
    }

    // Add filters
    if (status) {
      whereClause.status = status;
    }

    if (professionalId && isAdmin) {
      whereClause.professionalId = professionalId;
    }

    if (fromDate || toDate) {
      whereClause.periodStart = {};
      if (fromDate) {
        whereClause.periodStart.gte = new Date(fromDate);
      }
      if (toDate) {
        whereClause.periodStart.lte = new Date(toDate);
      }
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: whereClause,
        include: {
          professional: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.payout.count({ where: whereClause }),
    ]);

    return {
      payouts: payouts.map((payout) => this.mapToResponseDto(payout)),
      total,
      page,
      limit,
    };
  }

  async getPayoutById(
    payoutId: string,
    userId: string
  ): Promise<PayoutResponseDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        professional: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException("Payout not found");
    }

    // Check if user has access to this payout
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");
    const hasAccess = payout.professionalId === userId || isAdmin;

    if (!hasAccess) {
      throw new ForbiddenException("Access denied to this payout");
    }

    return this.mapToResponseDto(payout);
  }

  async markPayoutAsPaid(
    payoutId: string,
    userId: string
  ): Promise<PayoutResponseDto> {
    // Check if user is admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");
    if (!isAdmin) {
      throw new ForbiddenException("Only admins can mark payouts as paid");
    }

    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException("Payout not found");
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(
        "Only pending payouts can be marked as paid"
      );
    }

    const updatedPayout = await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.PAID,
        meta: {
          ...((payout.meta as object) || {}),
          paidAt: new Date().toISOString(),
          paidBy: userId,
        },
      },
      include: {
        professional: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    this.logger.log(
      `Payout marked as paid: ${payoutId} by admin ${userId}`,
      "PayoutService"
    );

    return this.mapToResponseDto(updatedPayout);
  }

  async getPayoutStats(userId: string): Promise<PayoutStatsDto> {
    // Get user's role to determine which payouts to include
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");

    let whereClause: any = {};

    if (isAdmin) {
      whereClause = {};
    } else {
      whereClause = { professionalId: userId };
    }

    const [total, pending, paid, totalAmount, pendingAmount, paidAmount] =
      await Promise.all([
        this.prisma.payout.count({ where: whereClause }),
        this.prisma.payout.count({
          where: { ...whereClause, status: PayoutStatus.PENDING },
        }),
        this.prisma.payout.count({
          where: { ...whereClause, status: PayoutStatus.PAID },
        }),
        this.prisma.payout.aggregate({
          where: whereClause,
          _sum: { amountBDT: true },
        }),
        this.prisma.payout.aggregate({
          where: { ...whereClause, status: PayoutStatus.PENDING },
          _sum: { amountBDT: true },
        }),
        this.prisma.payout.aggregate({
          where: { ...whereClause, status: PayoutStatus.PAID },
          _sum: { amountBDT: true },
        }),
      ]);

    return {
      total,
      pending,
      paid,
      totalAmount: Number(totalAmount._sum.amountBDT || 0),
      pendingAmount: Number(pendingAmount._sum.amountBDT || 0),
      paidAmount: Number(paidAmount._sum.amountBDT || 0),
    };
  }

  async generatePayoutsForPeriod(
    periodStart: Date,
    periodEnd: Date,
    adminId: string
  ): Promise<{ generated: number; totalAmount: number }> {
    // Check if user is admin
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");
    if (!isAdmin) {
      throw new ForbiddenException("Only admins can generate payouts");
    }

    // Get all completed bookings in the period
    const completedBookings = await this.prisma.booking.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        professional: {
          select: {
            id: true,
            fullName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group bookings by professional
    const professionalBookings = new Map<string, any[]>();
    for (const booking of completedBookings) {
      const professionalId = booking.professionalId;
      if (!professionalBookings.has(professionalId)) {
        professionalBookings.set(professionalId, []);
      }
      professionalBookings.get(professionalId)!.push(booking);
    }

    let generated = 0;
    let totalAmount = 0;

    // Create payouts for each professional
    for (const [professionalId, bookings] of professionalBookings) {
      // Calculate total earnings for this professional
      let professionalEarnings = 0;

      for (const booking of bookings) {
        const amount = booking.finalAmountBDT
          ? Number(booking.finalAmountBDT)
          : Number(booking.quotedPriceBDT);

        // Calculate commission
        const commission = await this.commissionService.calculateCommission(
          amount,
          booking.categoryId
        );

        professionalEarnings += commission.netAmount;
      }

      if (professionalEarnings > 0) {
        // Check if payout already exists for this period
        const existingPayout = await this.prisma.payout.findFirst({
          where: {
            professionalId,
            periodStart: { lte: periodEnd },
            periodEnd: { gte: periodStart },
          },
        });

        if (!existingPayout) {
          await this.prisma.payout.create({
            data: {
              professionalId,
              periodStart,
              periodEnd,
              amountBDT: professionalEarnings,
              status: PayoutStatus.PENDING,
              meta: {
                generatedBy: adminId,
                generatedAt: new Date().toISOString(),
                bookingCount: bookings.length,
                bookings: bookings.map((b) => ({
                  id: b.id,
                  amount: b.finalAmountBDT
                    ? Number(b.finalAmountBDT)
                    : Number(b.quotedPriceBDT),
                  category: b.category.name,
                })),
              },
            },
          });

          generated++;
          totalAmount += professionalEarnings;
        }
      }
    }

    this.logger.log(
      `Generated ${generated} payouts for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
      "PayoutService"
    );

    return { generated, totalAmount };
  }

  private mapToResponseDto(payout: any): PayoutResponseDto {
    return {
      id: payout.id,
      professionalId: payout.professionalId,
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      amountBDT: Number(payout.amountBDT),
      status: payout.status as PayoutStatus,
      meta: payout.meta,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
      professional: payout.professional,
    };
  }
}
