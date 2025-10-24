import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import {
  UpdateProfileDto,
  UpdateProfessionalProfileDto,
} from "../dto/update-profile.dto";
import { UpdateProfileFormDto } from "../dto/update-profile-form.dto";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  async updateProfile(
    userId: string,
    updateDto: UpdateProfileFormDto,
    files?: Express.Multer.File[]
  ) {
    // Process uploaded files
    let nidImageFrontUrl = null;
    let nidImageBackUrl = null;

    if (files && files.length > 0) {
      // Find NID front and back images
      const nidFrontFile = files.find(
        (file) => file.fieldname === "nidImageFront"
      );
      const nidBackFile = files.find(
        (file) => file.fieldname === "nidImageBack"
      );

      if (nidFrontFile) {
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), "uploads", "nid");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${userId}_front_${Date.now()}.${nidFrontFile.originalname
          .split(".")
          .pop()}`;
        const filePath = path.join(uploadDir, fileName);

        // Save file to disk
        fs.writeFileSync(filePath, nidFrontFile.buffer);

        nidImageFrontUrl = `/api/uploads/nid/${fileName}`;
        this.logger.log(`NID front image uploaded: ${filePath}`, "UserService");
      }

      if (nidBackFile) {
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), "uploads", "nid");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${userId}_back_${Date.now()}.${nidBackFile.originalname
          .split(".")
          .pop()}`;
        const filePath = path.join(uploadDir, fileName);

        // Save file to disk
        fs.writeFileSync(filePath, nidBackFile.buffer);

        nidImageBackUrl = `/api/uploads/nid/${fileName}`;
        this.logger.log(`NID back image uploaded: ${filePath}`, "UserService");
      }
    }

    // Update user with basic fields
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: updateDto.fullName,
        phone: updateDto.phone,
        avatarUrl: updateDto.avatarUrl,
        locationLat: updateDto.locationLat,
        locationLng: updateDto.locationLng,
        preferredLanguages: updateDto.preferredLanguages,
      },
    });

    // Update NID image fields using raw SQL (since Prisma client needs regeneration)
    if (nidImageFrontUrl || nidImageBackUrl) {
      this.logger.log(
        `Updating NID images for user ${userId}: front=${nidImageFrontUrl}, back=${nidImageBackUrl}`,
        "UserService"
      );
      await this.prisma.$executeRaw`
        UPDATE users 
        SET "nidImageFront" = ${nidImageFrontUrl || null}, 
            "nidImageBack" = ${nidImageBackUrl || null}
        WHERE id = ${userId}
      `;
    } else {
      this.logger.log(
        `No new NID images uploaded for user ${userId} - preserving existing images`,
        "UserService"
      );
    }

    // Get the updated user with relations
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        professionalProfile: true,
      },
    });

    // Update professional profile if professional fields are provided
    if (
      updateDto.skills ||
      updateDto.categories ||
      updateDto.hourlyRateBDT ||
      updateDto.fixedRates ||
      updateDto.availability ||
      updateDto.bio ||
      updateDto.experience
    ) {
      const professionalProfile = await this.prisma.professionalProfile.upsert({
        where: { userId },
        update: {
          skills: updateDto.skills,
          categories: updateDto.categories,
          hourlyRateBDT: updateDto.hourlyRateBDT,
          fixedRates: updateDto.fixedRates,
          availability: updateDto.availability,
          bio: updateDto.bio,
          experience: updateDto.experience
            ? String(updateDto.experience)
            : undefined,
        },
        create: {
          userId,
          skills: updateDto.skills || [],
          categories: updateDto.categories || [],
          hourlyRateBDT: updateDto.hourlyRateBDT,
          fixedRates: updateDto.fixedRates,
          availability: updateDto.availability,
          bio: updateDto.bio,
          experience: updateDto.experience
            ? String(updateDto.experience)
            : undefined,
        },
      });

      // Create professional services for each category if they don't exist
      if (updateDto.categories && updateDto.categories.length > 0) {
        const existingServices = await this.prisma.professionalService.findMany(
          {
            where: { professionalId: professionalProfile.id },
            select: { categoryId: true },
          }
        );

        const existingCategoryIds = existingServices.map(
          (service) => service.categoryId
        );
        const newCategoryIds = updateDto.categories.filter(
          (categoryId) => !existingCategoryIds.includes(categoryId)
        );

        // Create professional services for new categories
        if (newCategoryIds.length > 0) {
          const servicesToCreate = newCategoryIds.map((categoryId) => ({
            professionalId: professionalProfile.id,
            categoryId,
            rateType: "HOURLY",
            hourlyRateBDT: updateDto.hourlyRateBDT || 0,
            isActive: true,
          }));

          await this.prisma.professionalService.createMany({
            data: servicesToCreate,
          });

          this.logger.log(
            `Created ${servicesToCreate.length} professional services for user: ${userId}`,
            "UserService"
          );
        }
      }
    }

    this.logger.log(`Profile updated for user: ${userId}`, "UserService");

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatarUrl,
      locationLat: updatedUser.locationLat,
      locationLng: updatedUser.locationLng,
      preferredLanguages: updatedUser.preferredLanguages,
      isEmailVerified: updatedUser.isEmailVerified,
      isPhoneVerified: updatedUser.isPhoneVerified,
      roles: updatedUser.roles.map((ur) => ur.role.name),
      professionalProfile: updatedUser.professionalProfile,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async updateProfessionalProfile(
    userId: string,
    updateDto: UpdateProfessionalProfileDto
  ) {
    // Check if user has professional profile
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

    const isProfessional = user.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!isProfessional) {
      throw new ForbiddenException("User is not a professional");
    }

    const professionalProfile = await this.prisma.professionalProfile.upsert({
      where: { userId },
      update: {
        skills: updateDto.skills,
        categories: updateDto.categories,
        hourlyRateBDT: updateDto.hourlyRateBDT,
        fixedRates: updateDto.fixedRates,
        availability: updateDto.availability,
        bio: updateDto.bio,
        experience: updateDto.experience
          ? String(updateDto.experience)
          : undefined,
      },
      create: {
        userId,
        skills: updateDto.skills || [],
        categories: updateDto.categories || [],
        hourlyRateBDT: updateDto.hourlyRateBDT,
        fixedRates: updateDto.fixedRates,
        availability: updateDto.availability,
        bio: updateDto.bio,
        experience: updateDto.experience
          ? String(updateDto.experience)
          : undefined,
      },
    });

    // Create professional services for each category if they don't exist
    if (updateDto.categories && updateDto.categories.length > 0) {
      const existingServices = await this.prisma.professionalService.findMany({
        where: { professionalId: professionalProfile.id },
        select: { categoryId: true },
      });

      const existingCategoryIds = existingServices.map(
        (service) => service.categoryId
      );
      const newCategoryIds = updateDto.categories.filter(
        (categoryId) => !existingCategoryIds.includes(categoryId)
      );

      // Create professional services for new categories
      if (newCategoryIds.length > 0) {
        const servicesToCreate = newCategoryIds.map((categoryId) => ({
          professionalId: professionalProfile.id,
          categoryId,
          rateType: "HOURLY",
          hourlyRateBDT: updateDto.hourlyRateBDT || 0,
          isActive: true,
        }));

        await this.prisma.professionalService.createMany({
          data: servicesToCreate,
        });

        this.logger.log(
          `Created ${servicesToCreate.length} professional services for user: ${userId}`,
          "UserService"
        );
      }
    }

    this.logger.log(
      `Professional profile updated for user: ${userId}`,
      "UserService"
    );

    return professionalProfile;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        professionalProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      locationLat: user.locationLat,
      locationLng: user.locationLng,
      preferredLanguages: user.preferredLanguages,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      // roles: user.roles.map((ur) => ur.role.name), // Commented out until Prisma client is regenerated
      // professionalProfile: user.professionalProfile, // Commented out until Prisma client is regenerated
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getProfessionalDashboard(userId: string) {
    // Check if user has professional profile
    const professionalProfile =
      await this.prisma.professionalProfile.findUnique({
        where: { userId },
        include: {
          user: true,
        },
      });

    if (!professionalProfile) {
      throw new ForbiddenException("User is not a professional");
    }

    // Get recent settlements
    const recentSettlements = await this.prisma.bookingSettlement.findMany({
      where: { professionalId: userId },
      include: {
        booking: {
          include: {
            customer: true,
            category: true,
          },
        },
        dailySettlement: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Get total earnings this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyEarnings = await this.prisma.bookingSettlement.aggregate({
      where: {
        professionalId: userId,
        status: "PAID",
        paidAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        professionalAmount: true,
      },
    });

    // Get total lifetime earnings
    const lifetimeEarnings = await this.prisma.bookingSettlement.aggregate({
      where: {
        professionalId: userId,
        status: "PAID",
      },
      _sum: {
        professionalAmount: true,
      },
    });

    // Get pending settlements
    const pendingSettlements = await this.prisma.bookingSettlement.findMany({
      where: {
        professionalId: userId,
        status: "DUE",
      },
      include: {
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

    const totalPendingAmount = pendingSettlements.reduce(
      (sum, settlement) => sum + Number(settlement.professionalAmount),
      0
    );

    this.logger.log(
      `Professional dashboard data retrieved for user: ${userId}`,
      "UserService"
    );

    return {
      accountBalance: Number(
        (professionalProfile as any).accountBalanceBDT || 0
      ),
      monthlyEarnings: Number(monthlyEarnings._sum.professionalAmount || 0),
      lifetimeEarnings: Number(lifetimeEarnings._sum.professionalAmount || 0),
      totalPendingAmount,
      recentSettlements: recentSettlements.map((settlement) => ({
        id: settlement.id,
        amount: Number(settlement.professionalAmount),
        status: settlement.status,
        paidAt: settlement.paidAt,
        booking: {
          id: settlement.booking.id,
          customerName: settlement.booking.customer.fullName,
          serviceName: settlement.booking.category.name,
          scheduledAt: settlement.booking.scheduledAt,
        },
      })),
      pendingSettlements: pendingSettlements.map((settlement) => ({
        id: settlement.id,
        amount: Number(settlement.professionalAmount),
        booking: {
          id: settlement.booking.id,
          customerName: settlement.booking.customer.fullName,
          serviceName: settlement.booking.category.name,
          scheduledAt: settlement.booking.scheduledAt,
        },
      })),
    };
  }
}
