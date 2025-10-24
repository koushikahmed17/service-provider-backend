import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { NotificationService } from "../../notification/services/notification.service";
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
import { BookingService } from "../../booking/services/booking.service";
import {
  CreateProfessionalDto,
  UpdateProfessionalDto,
  GetProfessionalsDto,
  ProfessionalResponseDto,
  ApproveProfessionalDto,
  RejectProfessionalDto,
  SuspendProfessionalDto,
  ProfessionalStatus,
} from "../dto/admin-professional.dto";
import * as bcrypt from "bcrypt";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly notificationService: NotificationService,
    private readonly bookingService: BookingService
  ) {}

  async getUsers(query: GetUsersDto) {
    const { role, page = "1", limit = "10" } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = role
      ? {
          roles: {
            some: {
              role: {
                name: role,
              },
            },
          },
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          professionalProfile: true,
          _count: {
            select: {
              sessions: true,
              customerBookings: true,
              professionalBookings: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        nidImageFront: user.nidImageFront,
        nidImageBack: user.nidImageBack,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isNidVerified: user.isNidVerified,
        roles: user.roles.map((ur) => ur.role.name),
        professionalProfile: user.professionalProfile,
        sessionCount: user._count.sessions,
        bookingCount:
          (user._count.customerBookings || 0) +
          (user._count.professionalBookings || 0),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async updateUserRole(userId: string, updateDto: UpdateUserRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Get the new role
    const newRole = await this.prisma.role.findUnique({
      where: { name: updateDto.role },
    });

    if (!newRole) {
      throw new NotFoundException("Role not found");
    }

    // Remove all existing roles
    await this.prisma.userRole.deleteMany({
      where: { userId },
    });

    // Add new role
    await this.prisma.userRole.create({
      data: {
        userId,
        roleId: newRole.id,
      },
    });

    // Create or update professional profile if needed
    if (updateDto.role === "PROFESSIONAL") {
      await this.prisma.professionalProfile.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          skills: [],
          categories: [],
        },
      });
    }

    this.logger.log(
      `User role updated: ${userId} -> ${updateDto.role}`,
      "AdminService"
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: updateDto.role,
      updatedAt: new Date(),
    };
  }

  async getUserStats() {
    const [totalUsers, activeUsers, verifiedUsers, userByRole, recentUsers] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { isEmailVerified: true } }),
        this.prisma.user.groupBy({
          by: ["isActive"],
          _count: {
            id: true,
          },
        }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]);

    const roleStats = await this.prisma.userRole.groupBy({
      by: ["roleId"],
      _count: {
        userId: true,
      },
    });

    // Get role names separately
    const roleIds = roleStats.map((stat) => stat.roleId);
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true },
    });

    const roleMap = new Map(roles.map((role) => [role.id, role.name]));

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      recentUsers,
      roleDistribution: roleStats.map((stat) => ({
        role: roleMap.get(stat.roleId) || "Unknown",
        count: stat._count.userId,
      })),
    };
  }

  // User Management
  async banUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Send notification to the user
    try {
      await this.notificationService.emitToUser(userId, "account.banned", {
        title: "Account Suspended",
        message: `Your account has been suspended by an administrator. Please contact support for more information about this action.`,
        data: {
          status: "banned",
          bannedAt: new Date(),
          reason: "Administrative action",
        },
      });
    } catch (error) {
      console.error("Failed to send ban notification:", error);
    }

    this.logger.log(`User banned: ${userId}`, "AdminService");

    return {
      id: userId,
      fullName: user.fullName,
      email: user.email,
      isActive: false,
      updatedAt: new Date(),
    };
  }

  async unbanUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    // Send notification to the user
    try {
      await this.notificationService.emitToUser(userId, "account.unbanned", {
        title: "Account Restored! ✅",
        message: `Great news! Your account has been restored and you can now access all platform features again.`,
        data: {
          status: "active",
          unbannedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Failed to send unban notification:", error);
    }

    this.logger.log(`User unbanned: ${userId}`, "AdminService");

    return {
      id: userId,
      fullName: user.fullName,
      email: user.email,
      isActive: true,
      updatedAt: new Date(),
    };
  }

  async verifyNid(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isNidVerified: true },
    });

    // Send notification to the user
    try {
      await this.notificationService.emitToUser(userId, "nid.verified", {
        title: "NID Verified! ✅",
        message: `Your National ID has been successfully verified by our admin team.`,
        data: {
          status: "verified",
          verifiedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Failed to send NID verification notification:", error);
    }

    this.logger.log(`NID verified for user: ${userId}`, "AdminService");

    return {
      id: userId,
      fullName: user.fullName,
      email: user.email,
      isNidVerified: true,
      updatedAt: new Date(),
    };
  }

  async rejectNid(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isNidVerified: false },
    });

    // Send notification to the user
    try {
      await this.notificationService.emitToUser(userId, "nid.rejected", {
        title: "NID Verification Rejected",
        message: `Your National ID verification has been rejected. Please upload a clearer photo and try again.`,
        data: {
          status: "rejected",
          rejectedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Failed to send NID rejection notification:", error);
    }

    this.logger.log(`NID rejected for user: ${userId}`, "AdminService");

    return {
      id: userId,
      fullName: user.fullName,
      email: user.email,
      isNidVerified: false,
      updatedAt: new Date(),
    };
  }

  // Dispute Management
  async getDisputes(query: GetDisputesDto) {
    const { status, type, page = "1", limit = "10" } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          booking: {
            include: {
              customer: { select: { id: true, fullName: true, email: true } },
              professional: {
                select: { id: true, fullName: true, email: true },
              },
              category: { select: { id: true, name: true } },
            },
          },
          raisedByUser: { select: { id: true, fullName: true, email: true } },
          resolvedByUser: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      disputes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async resolveDispute(disputeId: string, resolveDto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException("Dispute not found");
    }

    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: "RESOLVED",
        resolution: resolveDto.resolution,
        resolvedAt: new Date(),
        // Note: resolvedBy should be set from the authenticated admin user
      },
    });

    this.logger.log(`Dispute resolved: ${disputeId}`, "AdminService");

    return updatedDispute;
  }

  // Commission Settings
  async getCommissionSettings(query: GetCommissionSettingsDto) {
    const { page = "1", limit = "10" } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [settings, total] = await Promise.all([
      this.prisma.commissionSetting.findMany({
        skip,
        take: limitNum,
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.commissionSetting.count(),
    ]);

    return {
      settings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async updateCommissionSettings(updateDto: UpdateCommissionSettingDto) {
    // Update global commission setting (categoryId = null)
    const globalSetting = await this.prisma.commissionSetting.findFirst({
      where: { categoryId: null },
    });

    if (globalSetting) {
      await this.prisma.commissionSetting.update({
        where: { id: globalSetting.id },
        data: { percent: updateDto.percent },
      });
    } else {
      await this.prisma.commissionSetting.create({
        data: {
          categoryId: null,
          percent: updateDto.percent,
        },
      });
    }

    this.logger.log(
      `Global commission updated to ${updateDto.percent}%`,
      "AdminService"
    );

    return {
      categoryId: null,
      percent: updateDto.percent,
      updatedAt: new Date(),
    };
  }

  async createCommissionSetting(createDto: CreateCommissionSettingDto) {
    const setting = await this.prisma.commissionSetting.create({
      data: {
        categoryId: createDto.categoryId || null,
        percent: createDto.percent,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.log(
      `Commission setting created: ${createDto.percent}% for category ${
        createDto.categoryId || "global"
      }`,
      "AdminService"
    );

    return setting;
  }

  // Content Moderation
  async getFlaggedReviews(query: GetFlaggedReviewsDto) {
    const { page = "1", limit = "10" } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { flagged: true },
        skip,
        take: limitNum,
        include: {
          customer: { select: { id: true, fullName: true, email: true } },
          professional: { select: { id: true, fullName: true, email: true } },
          booking: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
          moderationLog: {
            include: {
              admin: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where: { flagged: true } }),
    ]);

    return {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async moderateReview(reviewId: string, moderateDto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    // Update review based on action
    let updateData: any = {};
    if (moderateDto.action === "APPROVED") {
      updateData.flagged = false;
    } else if (moderateDto.action === "HIDDEN") {
      updateData.flagged = false; // Remove flag but keep review
    }

    await this.prisma.review.update({
      where: { id: reviewId },
      data: updateData,
    });

    // Create moderation log
    await this.prisma.reviewModerationLog.create({
      data: {
        reviewId,
        adminId: "admin-id", // This should come from the authenticated user
        action: moderateDto.action,
        reason: moderateDto.reason,
      },
    });

    this.logger.log(
      `Review moderated: ${reviewId} - ${moderateDto.action}`,
      "AdminService"
    );

    return {
      id: reviewId,
      action: moderateDto.action,
      reason: moderateDto.reason,
      updatedAt: new Date(),
    };
  }

  async getUploads(query: GetUploadsDto) {
    // This is a placeholder implementation
    // In a real application, you would have an uploads table
    const { page = "1", limit = "10", status } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // For now, return empty results
    return {
      uploads: [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 0,
        pages: 0,
      },
    };
  }

  async moderateUpload(uploadId: string, moderateDto: ModerateUploadDto) {
    // This is a placeholder implementation
    // In a real application, you would update the upload status
    this.logger.log(
      `Upload moderated: ${uploadId} - ${moderateDto.action}`,
      "AdminService"
    );

    return {
      id: uploadId,
      action: moderateDto.action,
      reason: moderateDto.reason,
      updatedAt: new Date(),
    };
  }

  // Analytics
  async getAnalyticsSummary(query: GetAnalyticsSummaryDto) {
    const { startDate, endDate, categoryId } = query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Base where clause for all queries
    const baseWhere =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    const categoryFilter =
      categoryId && categoryId !== "all" ? { categoryId } : {};

    const [
      // Revenue metrics
      totalRevenue,
      completedBookingsForRevenue,

      // Booking metrics by status
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,

      // User metrics
      activeUsers,
      totalProfessionals,
      totalCustomers,

      // Top services by booking count
      topServicesByBookings,
      topServicesByRevenue,

      // Top professionals by rating
      topProfessionalsByRating,
      topProfessionalsByEarnings,

      // Recent metrics
      recentBookings,
      recentRevenue,
    ] = await Promise.all([
      // Total revenue from completed bookings
      this.prisma.booking.aggregate({
        where: {
          status: "COMPLETED",
          ...baseWhere,
          ...categoryFilter,
        },
        _sum: { finalAmountBDT: true },
      }),

      // Get bookings for platform/professional revenue calculation
      this.prisma.booking.findMany({
        where: {
          status: "COMPLETED",
          ...baseWhere,
          ...categoryFilter,
        },
        select: {
          finalAmountBDT: true,
          commissionPercent: true,
        },
      }),

      // Total bookings
      this.prisma.booking.count({
        where: { ...baseWhere, ...categoryFilter },
      }),

      // Pending bookings
      this.prisma.booking.count({
        where: { status: "PENDING", ...baseWhere, ...categoryFilter },
      }),

      // Completed bookings
      this.prisma.booking.count({
        where: { status: "COMPLETED", ...baseWhere, ...categoryFilter },
      }),

      // Cancelled bookings
      this.prisma.booking.count({
        where: { status: "CANCELLED", ...baseWhere, ...categoryFilter },
      }),

      // Rejected bookings
      this.prisma.booking.count({
        where: { status: "REJECTED", ...baseWhere, ...categoryFilter },
      }),

      // Active users (users with bookings in the period)
      this.prisma.user.count({
        where: {
          OR: [
            {
              customerBookings: {
                some: { ...baseWhere, ...categoryFilter },
              },
            },
            {
              professionalBookings: {
                some: { ...baseWhere, ...categoryFilter },
              },
            },
          ],
        },
      }),

      // Total professionals
      this.prisma.professionalProfile.count({
        where: { isVerified: true },
      }),

      // Total customers
      this.prisma.user.count({
        where: {
          roles: {
            some: {
              role: { name: "CUSTOMER" },
            },
          },
        },
      }),

      // Top services by booking count
      this.prisma.booking.groupBy({
        by: ["categoryId"],
        where: { ...baseWhere, ...categoryFilter },
        _count: { id: true },
        _sum: { finalAmountBDT: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),

      // Top services by revenue
      this.prisma.booking.groupBy({
        by: ["categoryId"],
        where: {
          status: "COMPLETED",
          ...baseWhere,
          ...categoryFilter,
        },
        _sum: { finalAmountBDT: true },
        _count: { id: true },
        orderBy: { _sum: { finalAmountBDT: "desc" } },
        take: 5,
      }),

      // Top professionals by rating
      this.prisma.review.groupBy({
        by: ["professionalId"],
        where: { ...baseWhere },
        _avg: { rating: true },
        _count: { id: true },
        orderBy: { _avg: { rating: "desc" } },
        take: 5,
      }),

      // Top professionals by earnings (using finalAmountBDT as proxy)
      this.prisma.booking.groupBy({
        by: ["professionalId"],
        where: {
          status: "COMPLETED",
          ...baseWhere,
        },
        _sum: { finalAmountBDT: true },
        _count: { id: true },
        orderBy: { _sum: { finalAmountBDT: "desc" } },
        take: 5,
      }),

      // Recent bookings count (last 7 days)
      this.prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          ...categoryFilter,
        },
      }),

      // Recent revenue (last 7 days)
      this.prisma.booking.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          ...categoryFilter,
        },
        _sum: { finalAmountBDT: true },
      }),
    ]);

    // Get category names for top services
    const allCategoryIds = [
      ...topServicesByBookings.map((service) => service.categoryId),
      ...topServicesByRevenue.map((service) => service.categoryId),
    ];
    const categories = await this.prisma.serviceCategory.findMany({
      where: { id: { in: allCategoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    // Get professional details for top professionals
    const professionalIds = [
      ...topProfessionalsByRating.map((prof) => prof.professionalId),
      ...topProfessionalsByEarnings.map((prof) => prof.professionalId),
    ];
    const professionals = await this.prisma.professionalProfile.findMany({
      where: { userId: { in: professionalIds } },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
    const professionalMap = new Map(
      professionals.map((prof) => [prof.userId, prof])
    );

    // Calculate platform and professional revenue
    let platformRevenue = 0;
    let professionalRevenue = 0;

    completedBookingsForRevenue.forEach((booking) => {
      const finalAmount = Number(booking.finalAmountBDT || 0);
      const commissionPercent = Number(booking.commissionPercent || 15);
      const platformCommission = (finalAmount * commissionPercent) / 100;
      const professionalAmount = finalAmount - platformCommission;

      platformRevenue += platformCommission;
      professionalRevenue += professionalAmount;
    });

    return {
      revenue: {
        total: Number(totalRevenue._sum.finalAmountBDT || 0),
        platform: platformRevenue,
        professional: professionalRevenue,
        currency: "BDT",
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        rejected: rejectedBookings,
        recent: recentBookings,
      },
      users: {
        active: activeUsers,
        totalProfessionals,
        totalCustomers,
      },
      topServices: {
        byBookings: topServicesByBookings.map((service) => ({
          categoryId: service.categoryId,
          categoryName: categoryMap.get(service.categoryId) || "Unknown",
          bookingCount: service._count.id,
          revenue: Number(service._sum.finalAmountBDT || 0),
        })),
        byRevenue: topServicesByRevenue.map((service) => ({
          categoryId: service.categoryId,
          categoryName: categoryMap.get(service.categoryId) || "Unknown",
          bookingCount: service._count.id,
          revenue: Number(service._sum.finalAmountBDT || 0),
        })),
      },
      topProfessionals: {
        byRating: topProfessionalsByRating.map((prof) => {
          const professional = professionalMap.get(prof.professionalId);
          return {
            professionalId: prof.professionalId,
            name: professional?.user.fullName || "Unknown",
            email: professional?.user.email || "",
            averageRating: Number(prof._avg.rating || 0),
            reviewCount: prof._count.id,
          };
        }),
        byEarnings: topProfessionalsByEarnings.map((prof) => {
          const professional = professionalMap.get(prof.professionalId);
          const totalEarnings = Number(prof._sum.finalAmountBDT || 0);
          // Estimate professional earnings (assuming 15% commission)
          const estimatedProfessionalEarnings = totalEarnings * 0.85;

          return {
            professionalId: prof.professionalId,
            name: professional?.user.fullName || "Unknown",
            email: professional?.user.email || "",
            earnings: estimatedProfessionalEarnings,
            totalRevenue: totalEarnings,
            bookingCount: prof._count.id,
          };
        }),
      },
      recent: {
        bookings: recentBookings,
        revenue: Number(recentRevenue._sum.finalAmountBDT || 0),
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
        categoryId: categoryId || "all",
      },
    };
  }

  // Professional Analytics
  async getProfessionalAnalytics(professionalId: string, query: any) {
    const { startDate, endDate } = query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Base where clause for all queries
    const baseWhere =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    const professionalFilter = { professionalId };

    const [
      // Professional info
      professional,

      // Revenue metrics
      totalRevenue,
      completedBookingsForRevenue,

      // Booking metrics by status
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,

      // Rating metrics
      averageRating,
      totalReviews,
      ratingBreakdown,

      // Recent metrics
      recentBookings,
      recentRevenue,

      // Service breakdown
      serviceBreakdown,
    ] = await Promise.all([
      // Get professional details
      this.prisma.professionalProfile.findUnique({
        where: { userId: professionalId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              avatarUrl: true,
              nidNumber: true,
              createdAt: true,
            },
          },
          professionalServices: {
            include: {
              category: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),

      // Total revenue from completed bookings
      this.prisma.booking.aggregate({
        where: {
          status: "COMPLETED",
          ...baseWhere,
          ...professionalFilter,
        },
        _sum: { finalAmountBDT: true },
      }),

      // Get bookings for platform/professional revenue calculation
      this.prisma.booking.findMany({
        where: {
          status: "COMPLETED",
          ...baseWhere,
          ...professionalFilter,
        },
        select: {
          finalAmountBDT: true,
          commissionPercent: true,
        },
      }),

      // Total bookings
      this.prisma.booking.count({
        where: { ...baseWhere, ...professionalFilter },
      }),

      // Pending bookings
      this.prisma.booking.count({
        where: { status: "PENDING", ...baseWhere, ...professionalFilter },
      }),

      // Completed bookings
      this.prisma.booking.count({
        where: { status: "COMPLETED", ...baseWhere, ...professionalFilter },
      }),

      // Cancelled bookings
      this.prisma.booking.count({
        where: { status: "CANCELLED", ...baseWhere, ...professionalFilter },
      }),

      // Rejected bookings
      this.prisma.booking.count({
        where: { status: "REJECTED", ...baseWhere, ...professionalFilter },
      }),

      // Average rating
      this.prisma.review.aggregate({
        where: {
          professionalId,
        },
        _avg: { rating: true },
        _count: { id: true },
      }),

      // Total reviews count
      this.prisma.review.count({
        where: {
          professionalId,
        },
      }),

      // Rating breakdown
      this.prisma.review.groupBy({
        by: ["rating"],
        where: {
          professionalId,
        },
        _count: { id: true },
        orderBy: { rating: "desc" },
      }),

      // Recent bookings count (last 7 days)
      this.prisma.booking.count({
        where: {
          professionalId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Recent revenue (last 7 days)
      this.prisma.booking.aggregate({
        where: {
          professionalId,
          status: "COMPLETED",
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: { finalAmountBDT: true },
      }),

      // Service breakdown
      this.prisma.booking.groupBy({
        by: ["categoryId"],
        where: { ...baseWhere, ...professionalFilter },
        _count: { id: true },
        _sum: { finalAmountBDT: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    if (!professional) {
      throw new NotFoundException("Professional not found");
    }

    // Calculate platform and professional revenue
    let platformRevenue = 0;
    let professionalRevenue = 0;

    completedBookingsForRevenue.forEach((booking) => {
      const finalAmount = Number(booking.finalAmountBDT || 0);
      const commissionPercent = Number(booking.commissionPercent || 15);
      const platformCommission = (finalAmount * commissionPercent) / 100;
      const professionalAmount = finalAmount - platformCommission;

      platformRevenue += platformCommission;
      professionalRevenue += professionalAmount;
    });

    // Get category names for service breakdown
    const categoryIds = serviceBreakdown.map((service) => service.categoryId);
    const categories = await this.prisma.serviceCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    return {
      professional: {
        id: professional.userId,
        name: professional.user.fullName,
        email: professional.user.email,
        phone: professional.user.phone,
        avatarUrl: professional.user.avatarUrl,
        nidNumber: professional.user.nidNumber,
        isVerified: professional.isVerified,
        experience: professional.experience,
        bio: professional.bio,
        services: professional.professionalServices.map((service) => ({
          id: service.id,
          name: service.category.name,
          category: service.category.name,
          hourlyRate: service.hourlyRateBDT ? Number(service.hourlyRateBDT) : 0,
          rateType: service.rateType,
          notes: service.notes,
        })),
        joinDate: professional.user.createdAt,
      },
      revenue: {
        total: Number(totalRevenue._sum.finalAmountBDT || 0),
        platform: platformRevenue,
        professional: professionalRevenue,
        currency: "BDT",
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        rejected: rejectedBookings,
        recent: recentBookings,
      },
      rating: {
        average: Number(averageRating._avg.rating || 0),
        totalReviews: totalReviews,
        breakdown: ratingBreakdown.map((rating) => ({
          rating: rating.rating,
          count: rating._count.id,
        })),
      },
      serviceBreakdown: serviceBreakdown.map((service) => ({
        categoryId: service.categoryId,
        categoryName: categoryMap.get(service.categoryId) || "Unknown",
        bookingCount: service._count.id,
        revenue: Number(service._sum.finalAmountBDT || 0),
      })),
      recent: {
        bookings: recentBookings,
        revenue: Number(recentRevenue._sum.finalAmountBDT || 0),
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }

  // Customer Analytics
  async getCustomerAnalytics(customerId: string, query: any) {
    const { startDate, endDate } = query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Base where clause for all queries
    const baseWhere =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    const customerFilter = { customerId };

    const [
      // Customer info
      customer,

      // Booking metrics
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      rejectedBookings,

      // Revenue metrics
      totalSpent,
      completedBookingsForRevenue,

      // Service breakdown
      serviceBreakdown,
      categoryBreakdown,

      // Professional breakdown
      professionalBreakdown,

      // Recent metrics
      recentBookings,
      recentSpending,
    ] = await Promise.all([
      // Get customer details
      this.prisma.user.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          createdAt: true,
          isActive: true,
        },
      }),

      // Total bookings
      this.prisma.booking.count({
        where: { ...baseWhere, ...customerFilter },
      }),

      // Completed bookings
      this.prisma.booking.count({
        where: { status: "COMPLETED", ...baseWhere, ...customerFilter },
      }),

      // Cancelled bookings
      this.prisma.booking.count({
        where: { status: "CANCELLED", ...baseWhere, ...customerFilter },
      }),

      // Pending bookings
      this.prisma.booking.count({
        where: { status: "PENDING", ...baseWhere, ...customerFilter },
      }),

      // Rejected bookings
      this.prisma.booking.count({
        where: { status: "REJECTED", ...baseWhere, ...customerFilter },
      }),

      // Total spent
      this.prisma.booking.aggregate({
        where: {
          status: "COMPLETED",
          ...baseWhere,
          ...customerFilter,
        },
        _sum: { finalAmountBDT: true },
      }),

      // Get bookings for spending calculation
      this.prisma.booking.findMany({
        where: {
          status: "COMPLETED",
          ...baseWhere,
          ...customerFilter,
        },
        select: {
          finalAmountBDT: true,
          createdAt: true,
        },
      }),

      // Service breakdown - use findMany instead of groupBy to avoid circular reference
      // Note: Bookings are linked to categories, not individual services
      this.prisma.booking.findMany({
        where: { ...baseWhere, ...customerFilter },
        select: {
          categoryId: true,
          finalAmountBDT: true,
        },
      }),

      // Category breakdown - use findMany instead of groupBy to avoid circular reference
      this.prisma.booking.findMany({
        where: { ...baseWhere, ...customerFilter },
        select: {
          categoryId: true,
          finalAmountBDT: true,
        },
      }),

      // Professional breakdown - use findMany instead of groupBy to avoid circular reference
      this.prisma.booking.findMany({
        where: { ...baseWhere, ...customerFilter },
        select: {
          professionalId: true,
          finalAmountBDT: true,
        },
      }),

      // Recent bookings count (last 7 days)
      this.prisma.booking.count({
        where: {
          customerId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Recent spending (last 7 days)
      this.prisma.booking.aggregate({
        where: {
          customerId,
          status: "COMPLETED",
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: { finalAmountBDT: true },
      }),
    ]);

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    // Process service breakdown data (using categories since bookings link to categories)
    const serviceBreakdownMap = new Map();
    serviceBreakdown.forEach((booking) => {
      const categoryId = booking.categoryId;
      if (serviceBreakdownMap.has(categoryId)) {
        const existing = serviceBreakdownMap.get(categoryId);
        existing.bookingCount++;
        existing.totalSpent += Number(booking.finalAmountBDT || 0);
      } else {
        serviceBreakdownMap.set(categoryId, {
          categoryId,
          bookingCount: 1,
          totalSpent: Number(booking.finalAmountBDT || 0),
        });
      }
    });
    const processedServiceBreakdown = Array.from(
      serviceBreakdownMap.values()
    ).sort((a, b) => b.bookingCount - a.bookingCount);

    // Get category names for service breakdown (since bookings link to categories)
    const serviceCategoryIds = processedServiceBreakdown.map(
      (service) => service.categoryId
    );
    const serviceCategories = await this.prisma.serviceCategory.findMany({
      where: { id: { in: serviceCategoryIds } },
      select: { id: true, name: true },
    });
    const serviceMap = new Map(
      serviceCategories.map((category) => [category.id, category])
    );

    // Process category breakdown data
    const categoryBreakdownMap = new Map();
    categoryBreakdown.forEach((booking) => {
      const categoryId = booking.categoryId;
      if (categoryBreakdownMap.has(categoryId)) {
        const existing = categoryBreakdownMap.get(categoryId);
        existing.bookingCount++;
        existing.totalSpent += Number(booking.finalAmountBDT || 0);
      } else {
        categoryBreakdownMap.set(categoryId, {
          categoryId,
          bookingCount: 1,
          totalSpent: Number(booking.finalAmountBDT || 0),
        });
      }
    });
    const processedCategoryBreakdown = Array.from(
      categoryBreakdownMap.values()
    ).sort((a, b) => b.bookingCount - a.bookingCount);

    // Get category names for category breakdown
    const categoryIds = processedCategoryBreakdown.map(
      (category) => category.categoryId
    );
    const categories = await this.prisma.serviceCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    // Process professional breakdown data
    const professionalBreakdownMap = new Map();
    professionalBreakdown.forEach((booking) => {
      const professionalId = booking.professionalId;
      if (professionalBreakdownMap.has(professionalId)) {
        const existing = professionalBreakdownMap.get(professionalId);
        existing.bookingCount++;
        existing.totalSpent += Number(booking.finalAmountBDT || 0);
      } else {
        professionalBreakdownMap.set(professionalId, {
          professionalId,
          bookingCount: 1,
          totalSpent: Number(booking.finalAmountBDT || 0),
        });
      }
    });
    const processedProfessionalBreakdown = Array.from(
      professionalBreakdownMap.values()
    ).sort((a, b) => b.bookingCount - a.bookingCount);

    // Get professional names for professional breakdown
    const professionalIds = processedProfessionalBreakdown.map(
      (prof) => prof.professionalId
    );
    const professionals = await this.prisma.professionalProfile.findMany({
      where: { userId: { in: professionalIds } },
      include: {
        user: {
          select: { fullName: true },
        },
      },
    });
    const professionalMap = new Map(
      professionals.map((prof) => [prof.userId, prof.user.fullName])
    );

    return {
      customer: {
        id: customer.id,
        name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        avatarUrl: customer.avatarUrl,
        isActive: customer.isActive,
        joinDate: customer.createdAt,
      },
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        pending: pendingBookings,
        rejected: rejectedBookings,
        recent: recentBookings,
      },
      spending: {
        total: Number(totalSpent._sum.finalAmountBDT || 0),
        recent: Number(recentSpending._sum.finalAmountBDT || 0),
        currency: "BDT",
      },
      serviceBreakdown: processedServiceBreakdown.map((service) => {
        const categoryInfo = serviceMap.get(service.categoryId);
        return {
          serviceId: service.categoryId, // Using categoryId as serviceId since bookings link to categories
          serviceName: categoryInfo?.name || "Unknown Service",
          categoryName: categoryInfo?.name || "Unknown Category",
          bookingCount: service.bookingCount,
          totalSpent: service.totalSpent,
        };
      }),
      categoryBreakdown: processedCategoryBreakdown.map((category) => ({
        categoryId: category.categoryId,
        categoryName:
          categoryMap.get(category.categoryId) || "Unknown Category",
        bookingCount: category.bookingCount,
        totalSpent: category.totalSpent,
      })),
      professionalBreakdown: processedProfessionalBreakdown.map((prof) => ({
        professionalId: prof.professionalId,
        professionalName:
          professionalMap.get(prof.professionalId) || "Unknown Professional",
        bookingCount: prof.bookingCount,
        totalSpent: prof.totalSpent,
      })),
      recent: {
        bookings: recentBookings,
        spending: Number(recentSpending._sum.finalAmountBDT || 0),
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }

  // Admin Booking Management Methods
  async acceptBooking(bookingId: string, acceptDto: AcceptBookingDto) {
    // Get the booking to find the professional ID
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { professionalId: true },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Use the booking service to accept the booking on behalf of the professional
    return this.bookingService.acceptBooking(
      bookingId,
      booking.professionalId,
      acceptDto
    );
  }

  async rejectBooking(bookingId: string, rejectDto: RejectBookingDto) {
    // Get the booking to find the professional ID
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { professionalId: true },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Use the booking service to reject the booking on behalf of the professional
    return this.bookingService.rejectBooking(
      bookingId,
      booking.professionalId,
      rejectDto
    );
  }

  async checkInBooking(bookingId: string, checkInDto: CheckInDto) {
    // Get the booking to find the professional ID
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { professionalId: true },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Use the booking service to check in on behalf of the professional
    return this.bookingService.checkInBooking(
      bookingId,
      booking.professionalId,
      checkInDto
    );
  }

  async checkOutBooking(bookingId: string, checkOutDto: CheckOutDto) {
    // Get the booking to find the professional ID
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { professionalId: true },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Use the booking service to check out on behalf of the professional
    return this.bookingService.checkOutBooking(
      bookingId,
      booking.professionalId,
      checkOutDto
    );
  }

  async completeBooking(bookingId: string, completeDto: CompleteBookingDto) {
    // Get the booking to find the professional ID
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { professionalId: true },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Use the booking service to complete the booking on behalf of the professional
    return this.bookingService.completeBooking(
      bookingId,
      booking.professionalId,
      completeDto
    );
  }

  async cancelBooking(bookingId: string, cancelDto: CancelBookingDto) {
    // Get the booking to find the customer ID (admin can cancel on behalf of customer)
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Use the booking service to cancel the booking on behalf of the customer
    return this.bookingService.cancelBooking(
      bookingId,
      booking.customerId,
      cancelDto
    );
  }

  // Professional Management Methods
  async createProfessional(
    createDto: CreateProfessionalDto
  ): Promise<ProfessionalResponseDto> {
    // Check if email or phone already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: createDto.email }, { phone: createDto.phone }],
      },
    });

    if (existingUser) {
      throw new BadRequestException("Email or phone number already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    // Get PROFESSIONAL role
    const professionalRole = await this.prisma.role.findUnique({
      where: { name: "PROFESSIONAL" },
    });

    if (!professionalRole) {
      throw new NotFoundException("Professional role not found");
    }

    // Create user and professional profile in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          fullName: createDto.fullName,
          email: createDto.email,
          phone: createDto.phone,
          password: hashedPassword,
          nidNumber: createDto.nidNumber,
          address: createDto.address,
          gender: createDto.gender,
          dateOfBirth: createDto.dateOfBirth
            ? new Date(createDto.dateOfBirth)
            : null,
          isActive: true,
          isEmailVerified: true, // Admin created accounts are pre-verified
          isPhoneVerified: true,
        },
      });

      // Assign PROFESSIONAL role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: professionalRole.id,
        },
      });

      // Create professional profile
      const professionalProfile = await tx.professionalProfile.create({
        data: {
          userId: user.id,
          bio: createDto.bio,
          skills: createDto.skills,
          hourlyRateBDT: createDto.hourlyRateBDT,
          availability: createDto.availability,
          serviceArea: createDto.serviceArea,
          experience: createDto.experience,
          education: createDto.education,
          certifications: createDto.certifications || [],
          portfolioUrl: createDto.portfolioUrl,
          linkedinUrl: createDto.linkedinUrl,
          isVerified: createDto.isVerified || false,
          adminNotes: createDto.adminNotes,
          status: createDto.isVerified
            ? ProfessionalStatus.APPROVED
            : ProfessionalStatus.PENDING,
        },
      });

      return { user, professionalProfile };
    });

    this.logger.log(
      `Professional account created by admin: ${result.user.email}`,
      "AdminService"
    );

    // Get statistics
    const stats = await this.getProfessionalStats(result.user.id);

    return this.mapToProfessionalResponseDto(
      result.user,
      result.professionalProfile,
      stats
    );
  }

  async getProfessionals(query: GetProfessionalsDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      skill,
      serviceArea,
      isVerified,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;

    // Debug: First, let's check if there are any users with PROFESSIONAL role
    // const allUsersWithRoles = await this.prisma.user.findMany({
    //   include: {
    //     roles: {
    //       include: {
    //         role: true,
    //       },
    //     },
    //   },
    // });

    // console.log("Debug - All users with roles:", allUsersWithRoles.length);
    // console.log(
    //   "Debug - Users with PROFESSIONAL role:",
    //   allUsersWithRoles.filter((user) =>
    //     user.roles.some((ur) => ur.role.name === "PROFESSIONAL")
    //   ).length
    // );

    // Build where clause
    const where: any = {
      roles: {
        some: {
          role: {
            name: "PROFESSIONAL",
          },
        },
      },
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isVerified !== undefined) {
      where.professionalProfile = {
        isVerified: isVerified === "true",
      };
    }

    if (status) {
      where.professionalProfile = {
        ...where.professionalProfile,
        status: status,
      };
    }

    if (skill) {
      where.professionalProfile = {
        ...where.professionalProfile,
        skills: {
          has: skill,
        },
      };
    }

    if (serviceArea) {
      where.professionalProfile = {
        ...where.professionalProfile,
        serviceArea: {
          contains: serviceArea,
          mode: "insensitive",
        },
      };
    }

    // console.log("Debug - Final where clause:", JSON.stringify(where, null, 2));

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          professionalProfile: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    // console.log("Debug - Query results - users found:", users.length);
    // console.log("Debug - Query results - total count:", total);
    // console.log(
    //   "Debug - Query results - users:",
    //   users.map((u) => ({
    //     id: u.id,
    //     email: u.email,
    //     roles: u.roles.map((r) => r.role.name),
    //   }))
    // );

    // Get statistics for each professional
    const professionalsWithStats = await Promise.all(
      users.map(async (user) => {
        const stats = await this.getProfessionalStats(user.id);
        return this.mapToProfessionalResponseDto(
          user,
          user.professionalProfile,
          stats
        );
      })
    );

    return {
      professionals: professionalsWithStats,
      total,
      page,
      limit,
    };
  }

  async getProfessional(
    professionalId: string
  ): Promise<ProfessionalResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: professionalId },
      include: {
        professionalProfile: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Professional not found");
    }

    // Check if user is a professional
    const isProfessional = user.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!isProfessional) {
      throw new NotFoundException("User is not a professional");
    }

    const stats = await this.getProfessionalStats(user.id);
    return this.mapToProfessionalResponseDto(
      user,
      user.professionalProfile,
      stats
    );
  }

  async updateProfessional(
    professionalId: string,
    updateDto: UpdateProfessionalDto
  ): Promise<ProfessionalResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: professionalId },
      include: {
        professionalProfile: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Professional not found");
    }

    // Check if user is a professional
    const isProfessional = user.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!isProfessional) {
      throw new NotFoundException("User is not a professional");
    }

    // Check for email/phone conflicts if updating
    if (updateDto.email || updateDto.phone) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: professionalId } },
            {
              OR: [
                ...(updateDto.email ? [{ email: updateDto.email }] : []),
                ...(updateDto.phone ? [{ phone: updateDto.phone }] : []),
              ],
            },
          ],
        },
      });

      if (existingUser) {
        throw new BadRequestException("Email or phone number already exists");
      }
    }

    // Update user and professional profile in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update user
      const updatedUser = await tx.user.update({
        where: { id: professionalId },
        data: {
          ...(updateDto.fullName && { fullName: updateDto.fullName }),
          ...(updateDto.email && { email: updateDto.email }),
          ...(updateDto.phone && { phone: updateDto.phone }),
          ...(updateDto.nidNumber && { nidNumber: updateDto.nidNumber }),
          ...(updateDto.address && { address: updateDto.address }),
          ...(updateDto.gender && { gender: updateDto.gender }),
          ...(updateDto.dateOfBirth && {
            dateOfBirth: new Date(updateDto.dateOfBirth),
          }),
        },
      });

      // Update professional profile
      const updatedProfile = await tx.professionalProfile.update({
        where: { userId: professionalId },
        data: {
          ...(updateDto.bio && { bio: updateDto.bio }),
          ...(updateDto.skills && { skills: updateDto.skills }),
          ...(updateDto.hourlyRateBDT && {
            hourlyRateBDT: updateDto.hourlyRateBDT,
          }),
          ...(updateDto.availability && {
            availability: updateDto.availability,
          }),
          ...(updateDto.serviceArea && { serviceArea: updateDto.serviceArea }),
          ...(updateDto.experience && { experience: updateDto.experience }),
          ...(updateDto.education && { education: updateDto.education }),
          ...(updateDto.certifications && {
            certifications: updateDto.certifications,
          }),
          ...(updateDto.portfolioUrl && {
            portfolioUrl: updateDto.portfolioUrl,
          }),
          ...(updateDto.linkedinUrl && { linkedinUrl: updateDto.linkedinUrl }),
          ...(updateDto.isVerified !== undefined && {
            isVerified: updateDto.isVerified,
          }),
          ...(updateDto.adminNotes && { adminNotes: updateDto.adminNotes }),
        },
      });

      return { user: updatedUser, professionalProfile: updatedProfile };
    });

    this.logger.log(
      `Professional profile updated by admin: ${result.user.email}`,
      "AdminService"
    );

    const stats = await this.getProfessionalStats(professionalId);
    return this.mapToProfessionalResponseDto(
      result.user,
      result.professionalProfile,
      stats
    );
  }

  async approveProfessional(
    professionalId: string,
    approveDto: ApproveProfessionalDto
  ): Promise<ProfessionalResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: professionalId },
      include: {
        professionalProfile: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Professional not found");
    }

    const isProfessional = user.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!isProfessional) {
      throw new NotFoundException("User is not a professional");
    }

    const updatedProfile = await this.prisma.professionalProfile.update({
      where: { userId: professionalId },
      data: {
        status: ProfessionalStatus.APPROVED,
        isVerified: true,
        adminNotes:
          approveDto.adminNotes || user.professionalProfile?.adminNotes,
      },
    });

    this.logger.log(
      `Professional approved by admin: ${user.email}`,
      "AdminService"
    );

    const stats = await this.getProfessionalStats(professionalId);
    return this.mapToProfessionalResponseDto(user, updatedProfile, stats);
  }

  async rejectProfessional(
    professionalId: string,
    rejectDto: RejectProfessionalDto
  ): Promise<ProfessionalResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: professionalId },
      include: {
        professionalProfile: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Professional not found");
    }

    const isProfessional = user.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!isProfessional) {
      throw new NotFoundException("User is not a professional");
    }

    const updatedProfile = await this.prisma.professionalProfile.update({
      where: { userId: professionalId },
      data: {
        status: ProfessionalStatus.REJECTED,
        isVerified: false,
        adminNotes:
          rejectDto.adminNotes || user.professionalProfile?.adminNotes,
      },
    });

    this.logger.log(
      `Professional rejected by admin: ${user.email}, Reason: ${rejectDto.reason}`,
      "AdminService"
    );

    const stats = await this.getProfessionalStats(professionalId);
    return this.mapToProfessionalResponseDto(user, updatedProfile, stats);
  }

  async suspendProfessional(
    professionalId: string,
    suspendDto: SuspendProfessionalDto
  ): Promise<ProfessionalResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: professionalId },
      include: {
        professionalProfile: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Professional not found");
    }

    const isProfessional = user.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!isProfessional) {
      throw new NotFoundException("User is not a professional");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Suspend user
      const updatedUser = await tx.user.update({
        where: { id: professionalId },
        data: { isActive: false },
      });

      // Update professional profile
      const updatedProfile = await tx.professionalProfile.update({
        where: { userId: professionalId },
        data: {
          status: ProfessionalStatus.SUSPENDED,
          adminNotes:
            suspendDto.adminNotes || user.professionalProfile?.adminNotes,
        },
      });

      return { user: updatedUser, professionalProfile: updatedProfile };
    });

    this.logger.log(
      `Professional suspended by admin: ${user.email}, Reason: ${suspendDto.reason}`,
      "AdminService"
    );

    const stats = await this.getProfessionalStats(professionalId);
    return this.mapToProfessionalResponseDto(
      result.user,
      result.professionalProfile,
      stats
    );
  }

  async activateProfessional(
    professionalId: string
  ): Promise<ProfessionalResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: professionalId },
      include: {
        professionalProfile: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Professional not found");
    }

    const isProfessional = user.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!isProfessional) {
      throw new NotFoundException("User is not a professional");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Activate user
      const updatedUser = await tx.user.update({
        where: { id: professionalId },
        data: { isActive: true },
      });

      // Update professional profile
      const updatedProfile = await tx.professionalProfile.update({
        where: { userId: professionalId },
        data: {
          status: ProfessionalStatus.APPROVED,
        },
      });

      return { user: updatedUser, professionalProfile: updatedProfile };
    });

    this.logger.log(
      `Professional activated by admin: ${user.email}`,
      "AdminService"
    );

    const stats = await this.getProfessionalStats(professionalId);
    return this.mapToProfessionalResponseDto(
      result.user,
      result.professionalProfile,
      stats
    );
  }

  async deleteProfessional(
    professionalId: string
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: professionalId },
      include: {
        professionalProfile: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Professional not found");
    }

    const isProfessional = user.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!isProfessional) {
      throw new NotFoundException("User is not a professional");
    }

    // Check if professional has active bookings
    const activeBookings = await this.prisma.booking.count({
      where: {
        professionalId,
        status: {
          in: ["PENDING", "ACCEPTED", "IN_PROGRESS"],
        },
      },
    });

    if (activeBookings > 0) {
      throw new BadRequestException(
        "Cannot delete professional with active bookings. Please complete or cancel all bookings first."
      );
    }

    // Delete in transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete professional profile
      if (user.professionalProfile) {
        await tx.professionalProfile.delete({
          where: { userId: professionalId },
        });
      }

      // Delete user roles
      await tx.userRole.deleteMany({
        where: { userId: professionalId },
      });

      // Delete user
      await tx.user.delete({
        where: { id: professionalId },
      });
    });

    this.logger.log(
      `Professional deleted by admin: ${user.email}`,
      "AdminService"
    );

    return { message: "Professional account deleted successfully" };
  }

  private async getProfessionalStats(professionalId: string) {
    const [totalBookings, averageRating, totalEarnings] = await Promise.all([
      this.prisma.booking.count({
        where: { professionalId },
      }),
      this.prisma.review.aggregate({
        where: {
          booking: {
            professionalId,
          },
        },
        _avg: {
          rating: true,
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          professionalId,
          status: "COMPLETED",
        },
        _sum: {
          finalAmountBDT: true,
        },
      }),
    ]);

    return {
      totalBookings,
      averageRating: Number(averageRating._avg.rating || 0),
      totalEarnings: Number(totalEarnings._sum.finalAmountBDT || 0),
    };
  }

  private mapToProfessionalResponseDto(
    user: any,
    professionalProfile: any,
    stats: any
  ): ProfessionalResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      nidNumber: user.nidNumber,
      address: user.address,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      status: professionalProfile?.status || ProfessionalStatus.PENDING,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      professionalProfileId: professionalProfile?.id,
      bio: professionalProfile?.bio || "",
      skills: professionalProfile?.skills || [],
      hourlyRateBDT: professionalProfile?.hourlyRateBDT || 0,
      availability: professionalProfile?.availability,
      serviceArea: professionalProfile?.serviceArea,
      experience: professionalProfile?.experience,
      education: professionalProfile?.education,
      certifications: professionalProfile?.certifications || [],
      portfolioUrl: professionalProfile?.portfolioUrl,
      linkedinUrl: professionalProfile?.linkedinUrl,
      isVerified: professionalProfile?.isVerified || false,
      adminNotes: professionalProfile?.adminNotes,
      totalBookings: stats.totalBookings,
      averageRating: stats.averageRating,
      totalEarnings: stats.totalEarnings,
    };
  }
}
