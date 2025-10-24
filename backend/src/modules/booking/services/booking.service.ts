import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { BookingStateMachineService } from "./booking-state-machine.service";
import {
  CreateBookingDto,
  BookingResponseDto,
  BookingStatus,
  BookingEventType,
  GetBookingsDto,
  BookingStatsDto,
  AcceptBookingDto,
  RejectBookingDto,
  CheckInDto,
  CheckOutDto,
  CompleteBookingDto,
  CancelBookingDto,
} from "../dto";
import { SearchService } from "@/modules/service-catalog/services/search.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { EnhancedPaymentService } from "@/modules/payment/services/enhanced-payment.service";
import { RefundService } from "@/modules/refund/services/refund.service";

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly stateMachine: BookingStateMachineService,
    private readonly searchService: SearchService,
    private readonly notificationService: NotificationService,
    private readonly enhancedPaymentService: EnhancedPaymentService,
    private readonly refundService: RefundService
  ) {}

  async createBooking(
    createDto: CreateBookingDto,
    customerId: string
  ): Promise<BookingResponseDto> {
    // First, check if the professionalId is a professional profile ID
    let professionalProfile = await this.prisma.professionalProfile.findUnique({
      where: { id: createDto.professionalId },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
          },
        },
      },
    });

    // If not found as professional profile, try as user ID
    if (!professionalProfile) {
      const professional = await this.prisma.user.findUnique({
        where: { id: createDto.professionalId },
        include: {
          roles: { include: { role: true } },
          professionalProfile: {
            include: {
              user: {
                include: {
                  roles: { include: { role: true } },
                },
              },
            },
          },
        },
      });

      if (!professional) {
        throw new NotFoundException("Professional not found");
      }

      // Use the user's professional profile
      professionalProfile = professional.professionalProfile;
    }

    if (!professionalProfile) {
      throw new NotFoundException("Professional profile not found");
    }

    const professional = professionalProfile.user;

    if (!professional.isActive) {
      throw new BadRequestException("Professional is not active");
    }

    const hasProfessionalRole = professional.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!hasProfessionalRole) {
      throw new BadRequestException("User is not a professional");
    }

    // Validate category exists
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: createDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException("Service category not found");
    }

    // Validate scheduled time is in the future
    const scheduledAt = new Date(createDto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException("Scheduled time must be in the future");
    }

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        customerId,
        professionalId: professional.id, // Use the actual user ID
        categoryId: createDto.categoryId,
        status: BookingStatus.PENDING,
        scheduledAt,
        addressText: createDto.addressText,
        lat: createDto.lat,
        lng: createDto.lng,
        details: createDto.details,
        pricingModel: createDto.pricingModel,
        quotedPriceBDT: createDto.quotedPriceBDT,
        commissionPercent: createDto.commissionPercent || 15.0,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        professional: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            professionalProfile: {
              select: {
                skills: true,
                hourlyRateBDT: true,
                isVerified: true,
              },
            },
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

    // Create initial event
    await this.prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        type: BookingEventType.CREATED,
        metadata: {
          customerId,
          professionalId: createDto.professionalId,
          categoryId: createDto.categoryId,
          scheduledAt: createDto.scheduledAt,
        },
      },
    });

    this.logger.log(
      `Booking created: ${booking.id} by customer ${customerId}`,
      "BookingService"
    );

    return this.mapToResponseDto(booking);
  }

  async getBookingById(
    bookingId: string,
    userId: string
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        professional: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            professionalProfile: {
              select: {
                skills: true,
                hourlyRateBDT: true,
                isVerified: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        events: {
          orderBy: { at: "asc" },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Check if user has access to this booking
    if (booking.customerId !== userId && booking.professionalId !== userId) {
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

    return this.mapToResponseDto(booking);
  }

  async getBookings(
    query: GetBookingsDto,
    userId: string
  ): Promise<{
    bookings: BookingResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;

    // Get user's role to determine which bookings to show
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");
    const isProfessional = user?.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );

    // Debug logging
    console.log("=== BOOKING SERVICE DEBUG ===");
    console.log("User ID:", userId);
    console.log("User:", user?.fullName, user?.email);
    console.log(
      "User Roles:",
      user?.roles.map((ur) => ur.role.name)
    );
    console.log("Is Admin:", isAdmin);
    console.log("Is Professional:", isProfessional);

    let whereClause: any = {};

    if (isAdmin) {
      // Admin can see all bookings
      whereClause = {};
      console.log("Admin access - showing all bookings");
    } else if (isProfessional) {
      // Professional sees their bookings
      whereClause = { professionalId: userId };
      console.log("Professional access - filtering by professionalId:", userId);
    } else {
      // Customer sees their bookings
      whereClause = { customerId: userId };
      console.log("Customer access - filtering by customerId:", userId);
    }

    console.log("Where clause:", whereClause);
    console.log("=== END BOOKING SERVICE DEBUG ===");

    // Add filters
    if (status) {
      whereClause.status = status;
    }

    if (fromDate || toDate) {
      whereClause.scheduledAt = {};
      if (fromDate) {
        whereClause.scheduledAt.gte = new Date(fromDate);
      }
      if (toDate) {
        whereClause.scheduledAt.lte = new Date(toDate);
      }
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
          professional: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              avatarUrl: true,
              professionalProfile: {
                select: {
                  skills: true,
                  hourlyRateBDT: true,
                  isVerified: true,
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          events: {
            orderBy: { at: "asc" },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where: whereClause }),
    ]);

    return {
      bookings: bookings.map((booking) => this.mapToResponseDto(booking)),
      total,
      page,
      limit,
    };
  }

  async acceptBooking(
    bookingId: string,
    professionalId: string,
    acceptDto: AcceptBookingDto
  ): Promise<BookingResponseDto> {
    return this.transitionBooking(
      bookingId,
      professionalId,
      BookingStatus.ACCEPTED,
      BookingEventType.ACCEPTED,
      acceptDto.message ? { message: acceptDto.message } : undefined
    );
  }

  async rejectBooking(
    bookingId: string,
    professionalId: string,
    rejectDto: RejectBookingDto
  ): Promise<BookingResponseDto> {
    // Check if booking has a successful payment before rejecting
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          where: { status: "SUCCESS" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Transition the booking to REJECTED status
    const result = await this.transitionBooking(
      bookingId,
      professionalId,
      BookingStatus.REJECTED,
      BookingEventType.REJECTED,
      { reason: rejectDto.reason }
    );

    // If there's a successful payment, create a refund automatically
    if (booking.payments.length > 0) {
      try {
        await this.refundService.createRefundForRejectedBooking(
          bookingId,
          `Booking rejected by professional. Reason: ${rejectDto.reason}`
        );

        this.logger.log(
          `Automatic refund created for rejected booking ${bookingId}`,
          "BookingService"
        );
      } catch (error) {
        this.logger.error(
          `Failed to create automatic refund for booking ${bookingId}: ${error.message}`,
          "BookingService"
        );
        // Don't throw error here - booking is already rejected
      }
    }

    return result;
  }

  async checkInBooking(
    bookingId: string,
    professionalId: string,
    checkInDto: CheckInDto
  ): Promise<BookingResponseDto> {
    return this.transitionBooking(
      bookingId,
      professionalId,
      BookingStatus.IN_PROGRESS,
      BookingEventType.CHECKED_IN,
      {
        notes: checkInDto.notes,
        lat: checkInDto.lat,
        lng: checkInDto.lng,
      }
    );
  }

  async checkOutBooking(
    bookingId: string,
    professionalId: string,
    checkOutDto: CheckOutDto
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.professionalId !== professionalId) {
      throw new ForbiddenException(
        "Only the assigned professional can check out"
      );
    }

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException("Booking must be in progress to check out");
    }

    // Update booking with check-out time and actual hours
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        checkOutAt: new Date(),
        actualHours: checkOutDto.actualHours,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        professional: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            professionalProfile: {
              select: {
                skills: true,
                hourlyRateBDT: true,
                isVerified: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        events: {
          orderBy: { at: "asc" },
        },
      },
    });

    // Create check-out event
    await this.prisma.bookingEvent.create({
      data: {
        bookingId,
        type: BookingEventType.CHECKED_OUT,
        metadata: {
          notes: checkOutDto.notes,
          lat: checkOutDto.lat,
          lng: checkOutDto.lng,
          actualHours: checkOutDto.actualHours,
        },
      },
    });

    this.logger.log(
      `Booking checked out: ${bookingId} by professional ${professionalId}`,
      "BookingService"
    );

    return this.mapToResponseDto(updatedBooking);
  }

  async completeBooking(
    bookingId: string,
    professionalId: string,
    completeDto: CompleteBookingDto
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.professionalId !== professionalId) {
      throw new ForbiddenException(
        "Only the assigned professional can complete"
      );
    }

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException("Booking must be in progress to complete");
    }

    // Calculate final amount
    let finalAmount = booking.quotedPriceBDT;
    if (booking.pricingModel === "HOURLY" && completeDto.actualHours) {
      finalAmount = new Decimal(
        Number(booking.quotedPriceBDT) * Number(completeDto.actualHours)
      );
    } else if (completeDto.finalAmountBDT) {
      finalAmount = new Decimal(completeDto.finalAmountBDT);
    }

    // Update booking
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        actualHours: completeDto.actualHours || booking.actualHours,
        finalAmountBDT: finalAmount,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        professional: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            professionalProfile: {
              select: {
                skills: true,
                hourlyRateBDT: true,
                isVerified: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        events: {
          orderBy: { at: "asc" },
        },
      },
    });

    // Create completion event
    await this.prisma.bookingEvent.create({
      data: {
        bookingId,
        type: BookingEventType.COMPLETED,
        metadata: {
          notes: completeDto.notes,
          actualHours: completeDto.actualHours,
          finalAmountBDT: finalAmount,
        },
      },
    });

    // Trigger payment settlement for completed booking
    try {
      // First, try to capture any pending payment for this booking
      const pendingPayment = await this.prisma.payment.findFirst({
        where: {
          bookingId,
          status: "PENDING",
        },
      });

      if (pendingPayment) {
        // Capture the payment
        await this.prisma.payment.update({
          where: { id: pendingPayment.id },
          data: {
            status: "SUCCESS",
          },
        });

        this.logger.log(
          `Payment captured for booking ${bookingId}: ${pendingPayment.amountBDT} BDT`,
          "BookingService"
        );
      }

      // Check if there's a successful payment for this booking
      const successfulPayment = await this.prisma.payment.findFirst({
        where: {
          bookingId,
          status: "SUCCESS",
        },
      });

      if (successfulPayment) {
        // Update the payment amount if final amount differs from quoted amount
        if (Number(finalAmount) !== Number(booking.quotedPriceBDT)) {
          await this.prisma.payment.update({
            where: { id: successfulPayment.id },
            data: {
              amountBDT: finalAmount,
              metadata: {
                ...(successfulPayment.metadata as any),
                finalAmount: Number(finalAmount),
                originalQuotedAmount: Number(booking.quotedPriceBDT),
              },
            },
          });
        }

        // Trigger settlement calculation
        const commissionRate = await this.prisma.commissionSetting.findFirst({
          where: {
            categoryId: booking.categoryId,
          },
        });

        const rate = commissionRate ? Number(commissionRate.percent) : 15;
        const totalAmount = Number(finalAmount);
        const commissionAmount = totalAmount * (rate / 100);
        const professionalAmount = totalAmount - commissionAmount;

        // Create or update daily settlement
        await this.createOrUpdateDailySettlement(
          booking,
          successfulPayment,
          commissionAmount,
          professionalAmount
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process payment settlement for booking ${bookingId}: ${error.message}`,
        "BookingService"
      );
    }

    this.logger.log(
      `Booking completed: ${bookingId} by professional ${professionalId}`,
      "BookingService"
    );

    return this.mapToResponseDto(updatedBooking);
  }

  private async createOrUpdateDailySettlement(
    booking: any,
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

    // Create or update booking settlement record
    const existingSettlement = await this.prisma.bookingSettlement.findUnique({
      where: { bookingId: booking.id },
    });

    if (existingSettlement) {
      // Update existing settlement
      await this.prisma.bookingSettlement.update({
        where: { bookingId: booking.id },
        data: {
          commissionAmount,
          professionalAmount,
          status: "DUE",
        },
      });
    } else {
      // Create new settlement
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
    }

    this.logger.log(
      `Daily settlement updated for completed booking ${booking.id}: +${Number(
        payment.amountBDT
      )} BDT`,
      "BookingService"
    );
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    cancelDto: CancelBookingDto
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Check if user can cancel this booking
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles.some((ur) => ur.role.name === "ADMIN");
    const canCancel =
      booking.customerId === userId ||
      booking.professionalId === userId ||
      isAdmin;

    if (!canCancel) {
      throw new ForbiddenException("You cannot cancel this booking");
    }

    if (!this.stateMachine.canBeCancelled(booking.status as BookingStatus)) {
      throw new BadRequestException(
        "Booking cannot be cancelled in current status"
      );
    }

    // Update booking
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelReason: cancelDto.reason,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        professional: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            professionalProfile: {
              select: {
                skills: true,
                hourlyRateBDT: true,
                isVerified: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        events: {
          orderBy: { at: "asc" },
        },
      },
    });

    // Create cancellation event
    await this.prisma.bookingEvent.create({
      data: {
        bookingId,
        type: BookingEventType.CANCELLED,
        metadata: {
          reason: cancelDto.reason,
          cancelledBy: userId,
        },
      },
    });

    this.logger.log(
      `Booking cancelled: ${bookingId} by user ${userId}`,
      "BookingService"
    );

    return this.mapToResponseDto(updatedBooking);
  }

  async getBookingStats(userId: string): Promise<BookingStatsDto> {
    // Get user's role to determine which bookings to include
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
      whereClause = {};
    } else if (isProfessional) {
      whereClause = { professionalId: userId };
    } else {
      whereClause = { customerId: userId };
    }

    const [
      total,
      pending,
      accepted,
      inProgress,
      completed,
      cancelled,
      revenueData,
    ] = await Promise.all([
      this.prisma.booking.count({ where: whereClause }),
      this.prisma.booking.count({
        where: { ...whereClause, status: BookingStatus.PENDING },
      }),
      this.prisma.booking.count({
        where: { ...whereClause, status: BookingStatus.ACCEPTED },
      }),
      this.prisma.booking.count({
        where: { ...whereClause, status: BookingStatus.IN_PROGRESS },
      }),
      this.prisma.booking.count({
        where: { ...whereClause, status: BookingStatus.COMPLETED },
      }),
      this.prisma.booking.count({
        where: { ...whereClause, status: BookingStatus.CANCELLED },
      }),
      this.prisma.booking.aggregate({
        where: { ...whereClause, status: BookingStatus.COMPLETED },
        _sum: {
          finalAmountBDT: true,
        },
      }),
    ]);

    const totalRevenue = Number(revenueData._sum.finalAmountBDT || 0);
    const totalCommission = totalRevenue * 0.15; // Assuming 15% commission

    return {
      total,
      pending,
      accepted,
      inProgress,
      completed,
      cancelled,
      totalRevenue,
      totalCommission,
    };
  }

  private async transitionBooking(
    bookingId: string,
    professionalId: string,
    newStatus: BookingStatus,
    eventType: BookingEventType,
    metadata?: any
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { events: true },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.professionalId !== professionalId) {
      throw new ForbiddenException(
        "Only the assigned professional can perform this action"
      );
    }

    // Validate transition
    const existingEvents = booking.events.map(
      (e) => e.type as BookingEventType
    );
    const canTransition = this.stateMachine.canTransitionTo(
      booking.status as BookingStatus,
      newStatus,
      existingEvents
    );

    if (!canTransition.canTransition) {
      throw new BadRequestException(canTransition.reason);
    }

    // Update booking status
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: newStatus },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        professional: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            professionalProfile: {
              select: {
                skills: true,
                hourlyRateBDT: true,
                isVerified: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        events: {
          orderBy: { at: "asc" },
        },
      },
    });

    // Create event
    await this.prisma.bookingEvent.create({
      data: {
        bookingId,
        type: eventType,
        metadata,
      },
    });

    this.logger.log(
      `Booking ${bookingId} transitioned to ${newStatus} by professional ${professionalId}`,
      "BookingService"
    );

    // Send notifications based on status change
    try {
      if (newStatus === BookingStatus.ACCEPTED) {
        this.logger.log(
          `Sending acceptance notification to customer ${updatedBooking.customerId}`,
          "BookingService"
        );
        await this.notificationService.notifyBookingAccepted({
          bookingId: updatedBooking.id,
          customerId: updatedBooking.customerId,
          professionalId: updatedBooking.professionalId,
          categoryId: updatedBooking.categoryId,
          status: updatedBooking.status,
          scheduledAt: updatedBooking.scheduledAt,
          addressText: updatedBooking.addressText,
          lat: updatedBooking.lat,
          lng: updatedBooking.lng,
          details: updatedBooking.details,
          quotedPriceBDT:
            updatedBooking.quotedPriceBDT instanceof Decimal
              ? updatedBooking.quotedPriceBDT.toNumber()
              : Number(updatedBooking.quotedPriceBDT),
        });
      } else if (
        newStatus === BookingStatus.CANCELLED &&
        eventType === BookingEventType.REJECTED
      ) {
        this.logger.log(
          `Sending rejection notification to customer ${updatedBooking.customerId} with reason: ${metadata?.reason}`,
          "BookingService"
        );
        await this.notificationService.notifyBookingRejected({
          bookingId: updatedBooking.id,
          customerId: updatedBooking.customerId,
          professionalId: updatedBooking.professionalId,
          categoryId: updatedBooking.categoryId,
          status: updatedBooking.status,
          scheduledAt: updatedBooking.scheduledAt,
          addressText: updatedBooking.addressText,
          lat: updatedBooking.lat,
          lng: updatedBooking.lng,
          details: updatedBooking.details,
          quotedPriceBDT:
            updatedBooking.quotedPriceBDT instanceof Decimal
              ? updatedBooking.quotedPriceBDT.toNumber()
              : Number(updatedBooking.quotedPriceBDT),
          reason: metadata?.reason || "No reason provided",
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notification for booking ${bookingId}: ${error.message}`,
        "BookingService"
      );
      // Don't throw error - notification failure shouldn't break booking flow
    }

    return this.mapToResponseDto(updatedBooking);
  }

  private mapToResponseDto(booking: any): BookingResponseDto {
    return {
      id: booking.id,
      customerId: booking.customerId,
      professionalId: booking.professionalId,
      categoryId: booking.categoryId,
      status: booking.status as BookingStatus,
      scheduledAt: booking.scheduledAt,
      addressText: booking.addressText,
      lat: booking.lat,
      lng: booking.lng,
      details: booking.details,
      pricingModel: booking.pricingModel,
      quotedPriceBDT: Number(booking.quotedPriceBDT),
      commissionPercent: Number(booking.commissionPercent),
      checkInAt: booking.checkInAt,
      checkOutAt: booking.checkOutAt,
      actualHours: booking.actualHours
        ? Number(booking.actualHours)
        : undefined,
      finalAmountBDT: booking.finalAmountBDT
        ? Number(booking.finalAmountBDT)
        : undefined,
      cancelReason: booking.cancelReason,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      customer: booking.customer,
      professional: booking.professional,
      category: booking.category,
      events: booking.events?.map((event: any) => ({
        id: event.id,
        type: event.type,
        metadata: event.metadata,
        at: event.at,
      })),
    };
  }
}
