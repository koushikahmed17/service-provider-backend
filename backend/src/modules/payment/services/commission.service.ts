import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import {
  CreateCommissionSettingDto,
  UpdateCommissionSettingDto,
  CommissionSettingResponseDto,
  CommissionCalculationDto,
} from "../dto";

@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  async createCommissionSetting(
    createDto: CreateCommissionSettingDto
  ): Promise<CommissionSettingResponseDto> {
    // Check if category exists (if provided)
    if (createDto.categoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: createDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException("Service category not found");
      }
    }

    // Check if commission setting already exists for this category
    const existingSetting = await this.prisma.commissionSetting.findFirst({
      where: {
        categoryId: createDto.categoryId || null,
      },
    });

    if (existingSetting) {
      throw new Error(
        `Commission setting already exists for ${
          createDto.categoryId ? "this category" : "default"
        }`
      );
    }

    const commissionSetting = await this.prisma.commissionSetting.create({
      data: {
        categoryId: createDto.categoryId,
        percent: createDto.percent,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    this.logger.log(
      `Commission setting created: ${commissionSetting.id} for category ${
        createDto.categoryId || "default"
      }`,
      "CommissionService"
    );

    return this.mapToResponseDto(commissionSetting);
  }

  async getCommissionSettings(): Promise<CommissionSettingResponseDto[]> {
    const settings = await this.prisma.commissionSetting.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { categoryId: "asc" }, // nulls last
        { createdAt: "desc" },
      ],
    });

    return settings.map((setting) => this.mapToResponseDto(setting));
  }

  async getCommissionSettingById(
    id: string
  ): Promise<CommissionSettingResponseDto> {
    const setting = await this.prisma.commissionSetting.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!setting) {
      throw new NotFoundException("Commission setting not found");
    }

    return this.mapToResponseDto(setting);
  }

  async updateCommissionSetting(
    id: string,
    updateDto: UpdateCommissionSettingDto
  ): Promise<CommissionSettingResponseDto> {
    const existingSetting = await this.prisma.commissionSetting.findUnique({
      where: { id },
    });

    if (!existingSetting) {
      throw new NotFoundException("Commission setting not found");
    }

    const updatedSetting = await this.prisma.commissionSetting.update({
      where: { id },
      data: {
        percent: updateDto.percent,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    this.logger.log(
      `Commission setting updated: ${id} to ${updateDto.percent}%`,
      "CommissionService"
    );

    return this.mapToResponseDto(updatedSetting);
  }

  async deleteCommissionSetting(id: string): Promise<void> {
    const existingSetting = await this.prisma.commissionSetting.findUnique({
      where: { id },
    });

    if (!existingSetting) {
      throw new NotFoundException("Commission setting not found");
    }

    await this.prisma.commissionSetting.delete({
      where: { id },
    });

    this.logger.log(`Commission setting deleted: ${id}`, "CommissionService");
  }

  async getCommissionPercent(categoryId?: string): Promise<number> {
    // First try to find category-specific commission
    if (categoryId) {
      const categorySetting = await this.prisma.commissionSetting.findFirst({
        where: { categoryId },
      });

      if (categorySetting) {
        return Number(categorySetting.percent);
      }
    }

    // Fall back to default commission
    const defaultSetting = await this.prisma.commissionSetting.findFirst({
      where: { categoryId: null },
    });

    if (defaultSetting) {
      return Number(defaultSetting.percent);
    }

    // Return system default if no settings exist
    return 15.0; // 15% default
  }

  async calculateCommission(
    amount: number,
    categoryId?: string
  ): Promise<CommissionCalculationDto> {
    const commissionPercent = await this.getCommissionPercent(categoryId);
    const commissionAmount = (amount * commissionPercent) / 100;
    const netAmount = amount - commissionAmount;

    // Get category name if categoryId is provided
    let categoryName: string | undefined;
    if (categoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: categoryId },
        select: { name: true },
      });
      categoryName = category?.name;
    }

    return {
      amount,
      commissionPercent,
      commissionAmount,
      netAmount,
      categoryId,
      categoryName,
    };
  }

  async calculateCommissionForBooking(
    bookingId: string
  ): Promise<CommissionCalculationDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        finalAmountBDT: true,
        quotedPriceBDT: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Use final amount if available, otherwise use quoted price
    const amount = booking.finalAmountBDT
      ? Number(booking.finalAmountBDT)
      : Number(booking.quotedPriceBDT);

    return this.calculateCommission(amount, booking.categoryId);
  }

  private mapToResponseDto(setting: any): CommissionSettingResponseDto {
    return {
      id: setting.id,
      categoryId: setting.categoryId,
      percent: this.convertDecimalToNumber(setting.percent),
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
      category: setting.category,
    };
  }

  async getCommissionRate(categoryId: string): Promise<number> {
    // First try to get category-specific commission
    const categoryCommission = await this.prisma.commissionSetting.findFirst({
      where: {
        categoryId: categoryId,
      },
    });

    if (categoryCommission) {
      return this.convertDecimalToNumber(categoryCommission.percent);
    }

    // Fallback to default commission
    const defaultCommission = await this.prisma.commissionSetting.findFirst({
      where: {
        categoryId: null,
      },
    });

    if (defaultCommission) {
      return this.convertDecimalToNumber(defaultCommission.percent);
    }

    // Default to 15% if no commission settings found
    return 15.0;
  }

  private convertDecimalToNumber(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }

    // Handle Prisma Decimal objects
    if (
      value &&
      typeof value === "object" &&
      value.constructor.name === "Decimal"
    ) {
      return Number(value.toString());
    }

    // Handle regular numbers
    return Number(value);
  }
}
