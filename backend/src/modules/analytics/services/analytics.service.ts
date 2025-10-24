import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import {
  AnalyticsPeriodDto,
  ProfessionalAnalyticsDto,
  CustomerAnalyticsDto,
  AdminAnalyticsDto,
  ReportExportDto,
  AnalyticsPeriod,
  ReportScope,
  ReportFormat,
} from "../dto/analytics.dto";
import { Response } from "express";
import * as fs from "fs";
import * as path from "path";
import * as PDFDocument from "pdfkit";

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  // Professional Analytics
  async getProfessionalAnalytics(
    professionalId: string,
    query: ProfessionalAnalyticsDto
  ) {
    const { period, startDate, endDate, periods = 12, categoryId } = query;

    const dateRange = this.calculateDateRange(
      period,
      startDate,
      endDate,
      periods
    );
    const whereClause = this.buildWhereClause(
      professionalId,
      dateRange,
      categoryId,
      "professional"
    );

    const [earnings, ratings, bookings, topCategories, monthlyTrend] =
      await Promise.all([
        this.getEarningsData(professionalId, dateRange, categoryId),
        this.getRatingsData(professionalId, dateRange),
        this.getBookingsData(professionalId, dateRange, categoryId),
        this.getTopCategories(professionalId, dateRange),
        this.getMonthlyTrend(professionalId, dateRange, categoryId),
      ]);

    return {
      earnings,
      ratings,
      bookings,
      topCategories,
      monthlyTrend,
      period: {
        start: dateRange.start,
        end: dateRange.end,
        type: period || AnalyticsPeriod.MONTH,
      },
    };
  }

  // Customer Analytics
  async getCustomerAnalytics(customerId: string, query: CustomerAnalyticsDto) {
    const { period, startDate, endDate, periods = 12, categoryId } = query;

    const dateRange = this.calculateDateRange(
      period,
      startDate,
      endDate,
      periods
    );
    const whereClause = this.buildWhereClause(
      customerId,
      dateRange,
      categoryId,
      "customer"
    );

    const [spending, bookings, topCategories, monthlyTrend, averageRating] =
      await Promise.all([
        this.getSpendingData(customerId, dateRange, categoryId),
        this.getBookingsData(customerId, dateRange, categoryId),
        this.getTopCategories(customerId, dateRange),
        this.getMonthlyTrend(customerId, dateRange, categoryId),
        this.getAverageRating(customerId, dateRange),
      ]);

    return {
      spending,
      bookings,
      topCategories,
      monthlyTrend,
      averageRating,
      period: {
        start: dateRange.start,
        end: dateRange.end,
        type: period || AnalyticsPeriod.MONTH,
      },
    };
  }

  // Admin Analytics
  async getAdminAnalytics(query: AdminAnalyticsDto) {
    const { period, startDate, endDate, periods = 12, region } = query;

    const dateRange = this.calculateDateRange(
      period,
      startDate,
      endDate,
      periods
    );

    const [
      mrr,
      serviceDistribution,
      geoHeat,
      userGrowth,
      bookingTrends,
      revenue,
    ] = await Promise.all([
      this.getMRRData(dateRange),
      this.getServiceDistribution(dateRange),
      this.getGeoHeatData(dateRange, region),
      this.getUserGrowthData(dateRange),
      this.getBookingTrends(dateRange),
      this.getRevenueData(dateRange),
    ]);

    return {
      mrr,
      serviceDistribution,
      geoHeat,
      userGrowth,
      bookingTrends,
      revenue,
      period: {
        start: dateRange.start,
        end: dateRange.end,
        type: period || AnalyticsPeriod.MONTH,
      },
    };
  }

  // Export Reports
  async exportReport(
    scope: ReportScope,
    format: ReportFormat,
    query: ReportExportDto,
    res: Response
  ) {
    const { period, startDate, endDate } = query;
    const dateRange = this.calculateDateRange(period, startDate, endDate, 12);

    let data: any;
    let filename: string;

    switch (scope) {
      case ReportScope.PROFESSIONAL:
        data = await this.getProfessionalAnalytics("current-user", {
          period,
          startDate,
          endDate,
        });
        filename = `professional-analytics-${Date.now()}`;
        break;
      case ReportScope.CUSTOMER:
        data = await this.getCustomerAnalytics("current-user", {
          period,
          startDate,
          endDate,
        });
        filename = `customer-analytics-${Date.now()}`;
        break;
      case ReportScope.ADMIN:
        data = await this.getAdminAnalytics({
          period,
          startDate,
          endDate,
        });
        filename = `admin-analytics-${Date.now()}`;
        break;
      default:
        throw new BadRequestException("Invalid report scope");
    }

    if (format === ReportFormat.CSV) {
      return this.generateCSVReport(data, filename, res);
    } else if (format === ReportFormat.PDF) {
      return this.generatePDFReport(data, filename, res);
    } else {
      throw new BadRequestException("Invalid report format");
    }
  }

  // Private helper methods
  private calculateDateRange(
    period?: AnalyticsPeriod,
    startDate?: string,
    endDate?: string,
    periods: number = 12
  ) {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (period) {
      switch (period) {
        case AnalyticsPeriod.DAY:
          start = new Date(now.getTime() - periods * 24 * 60 * 60 * 1000);
          break;
        case AnalyticsPeriod.WEEK:
          start = new Date(now.getTime() - periods * 7 * 24 * 60 * 60 * 1000);
          break;
        case AnalyticsPeriod.MONTH:
          start = new Date(
            now.getFullYear(),
            now.getMonth() - periods,
            now.getDate()
          );
          break;
        case AnalyticsPeriod.QUARTER:
          start = new Date(
            now.getFullYear(),
            now.getMonth() - periods * 3,
            now.getDate()
          );
          break;
        case AnalyticsPeriod.YEAR:
          start = new Date(
            now.getFullYear() - periods,
            now.getMonth(),
            now.getDate()
          );
          break;
        default:
          start = new Date(
            now.getFullYear(),
            now.getMonth() - periods,
            now.getDate()
          );
      }
    } else {
      // Default to last 12 months
      start = new Date(
        now.getFullYear(),
        now.getMonth() - periods,
        now.getDate()
      );
    }

    return { start, end };
  }

  private buildWhereClause(
    userId: string,
    dateRange: { start: Date; end: Date },
    categoryId?: string,
    userType: "professional" | "customer" = "professional"
  ) {
    const baseWhere: any = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    if (categoryId) {
      baseWhere.categoryId = categoryId;
    }

    if (userType === "professional") {
      baseWhere.professionalId = userId;
    } else {
      baseWhere.customerId = userId;
    }

    return baseWhere;
  }

  private async getEarningsData(
    professionalId: string,
    dateRange: { start: Date; end: Date },
    categoryId?: string
  ) {
    const where = this.buildWhereClause(
      professionalId,
      dateRange,
      categoryId,
      "professional"
    );
    where.status = "COMPLETED";

    const [totalEarnings, completedBookings] = await Promise.all([
      this.prisma.booking.aggregate({
        where,
        _sum: { finalAmountBDT: true },
      }),
      this.prisma.booking.count({ where }),
    ]);

    const commissionEarnings = await this.prisma.booking.aggregate({
      where: {
        ...where,
        commissionPercent: { not: null },
      },
      _sum: { commissionPercent: true },
    });

    return {
      total:
        this.convertDecimalToNumber(totalEarnings._sum.finalAmountBDT) || 0,
      completedBookings,
      averagePerBooking:
        completedBookings > 0
          ? this.convertDecimalToNumber(totalEarnings._sum.finalAmountBDT) /
            completedBookings
          : 0,
      currency: "BDT",
    };
  }

  private async getRatingsData(
    professionalId: string,
    dateRange: { start: Date; end: Date }
  ) {
    const ratings = await this.prisma.review.findMany({
      where: {
        professionalId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        rating: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (ratings.length === 0) {
      return {
        average: 0,
        total: 0,
        trend: [],
      };
    }

    const average =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    // Calculate monthly trend
    const trend = this.calculateRatingTrend(ratings, dateRange);

    return {
      average: Math.round(average * 100) / 100,
      total: ratings.length,
      trend,
    };
  }

  private async getSpendingData(
    customerId: string,
    dateRange: { start: Date; end: Date },
    categoryId?: string
  ) {
    const where = this.buildWhereClause(
      customerId,
      dateRange,
      categoryId,
      "customer"
    );

    const [totalSpending, completedBookings] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { ...where, status: "COMPLETED" },
        _sum: { finalAmountBDT: true },
      }),
      this.prisma.booking.count({
        where: { ...where, status: "COMPLETED" },
      }),
    ]);

    return {
      total:
        this.convertDecimalToNumber(totalSpending._sum.finalAmountBDT) || 0,
      completedBookings,
      averagePerBooking:
        completedBookings > 0
          ? this.convertDecimalToNumber(totalSpending._sum.finalAmountBDT) /
            completedBookings
          : 0,
      currency: "BDT",
    };
  }

  private async getBookingsData(
    userId: string,
    dateRange: { start: Date; end: Date },
    categoryId?: string,
    userType: "professional" | "customer" = "professional"
  ) {
    const where = this.buildWhereClause(
      userId,
      dateRange,
      categoryId,
      userType
    );

    const [total, byStatus] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private async getTopCategories(
    userId: string,
    dateRange: { start: Date; end: Date },
    userType: "professional" | "customer" = "professional"
  ) {
    const where = this.buildWhereClause(userId, dateRange, undefined, userType);

    const topCategories = await this.prisma.booking.groupBy({
      by: ["categoryId"],
      where,
      _count: { id: true },
      _sum: { finalAmountBDT: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    // Get category names
    const categoryIds = topCategories.map((item) => item.categoryId);
    const categories = await this.prisma.serviceCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    return topCategories.map((item) => ({
      categoryId: item.categoryId,
      categoryName: categoryMap.get(item.categoryId) || "Unknown",
      bookingCount: item._count.id,
      revenue: this.convertDecimalToNumber(item._sum.finalAmountBDT) || 0,
    }));
  }

  private async getMonthlyTrend(
    userId: string,
    dateRange: { start: Date; end: Date },
    categoryId?: string,
    userType: "professional" | "customer" = "professional"
  ) {
    const where = this.buildWhereClause(
      userId,
      dateRange,
      categoryId,
      userType
    );

    // This is a simplified implementation
    // In a real application, you'd want more sophisticated time-series aggregation
    const monthlyData = await this.prisma.booking.findMany({
      where,
      select: {
        createdAt: true,
        finalAmountBDT: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return this.groupByMonth(monthlyData, dateRange);
  }

  private async getAverageRating(
    customerId: string,
    dateRange: { start: Date; end: Date }
  ) {
    const ratings = await this.prisma.review.findMany({
      where: {
        customerId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: { rating: true },
    });

    if (ratings.length === 0) {
      return { average: 0, total: 0 };
    }

    const average =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    return {
      average: Math.round(average * 100) / 100,
      total: ratings.length,
    };
  }

  private async getMRRData(dateRange: { start: Date; end: Date }) {
    // Calculate Monthly Recurring Revenue
    const monthlyRevenue = await this.prisma.booking.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      _sum: { finalAmountBDT: true },
    });

    const months = Math.max(
      1,
      this.getMonthDifference(dateRange.start, dateRange.end)
    );
    const mrr =
      this.convertDecimalToNumber(monthlyRevenue._sum.finalAmountBDT) / months;

    return {
      current: mrr,
      currency: "BDT",
      period: "monthly",
    };
  }

  private async getServiceDistribution(dateRange: { start: Date; end: Date }) {
    const distribution = await this.prisma.booking.groupBy({
      by: ["categoryId"],
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      _count: { id: true },
      _sum: { finalAmountBDT: true },
      orderBy: { _count: { id: "desc" } },
    });

    const categoryIds = distribution.map((item) => item.categoryId);
    const categories = await this.prisma.serviceCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    return distribution.map((item) => ({
      categoryId: item.categoryId,
      categoryName: categoryMap.get(item.categoryId) || "Unknown",
      bookingCount: item._count.id,
      revenue: item._sum.finalAmountBDT || 0,
      percentage: 0, // Will be calculated on frontend
    }));
  }

  private async getGeoHeatData(
    dateRange: { start: Date; end: Date },
    region?: string
  ) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        ...(region && {
          addressText: {
            contains: region,
            mode: "insensitive",
          },
        }),
      },
      select: {
        lat: true,
        lng: true,
        addressText: true,
        finalAmountBDT: true,
      },
    });

    // Group by location and aggregate data
    const locationMap = new Map<
      string,
      { count: number; revenue: number; lat: number; lng: number }
    >();

    bookings.forEach((booking) => {
      if (booking.lat && booking.lng) {
        const key = `${booking.lat.toFixed(4)},${booking.lng.toFixed(4)}`;
        const existing = locationMap.get(key) || {
          count: 0,
          revenue: 0,
          lat: booking.lat,
          lng: booking.lng,
        };
        locationMap.set(key, {
          count: existing.count + 1,
          revenue: existing.revenue + Number(booking.finalAmountBDT || 0),
          lat: booking.lat,
          lng: booking.lng,
        });
      }
    });

    return Array.from(locationMap.values());
  }

  private async getUserGrowthData(dateRange: { start: Date; end: Date }) {
    const userGrowth = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        createdAt: true,
        roles: {
          include: {
            role: { select: { name: true } },
          },
        },
      },
    });

    return this.groupUsersByMonth(userGrowth, dateRange);
  }

  private async getBookingTrends(dateRange: { start: Date; end: Date }) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        createdAt: true,
        status: true,
        finalAmountBDT: true,
      },
    });

    return this.groupBookingsByMonth(bookings, dateRange);
  }

  private async getRevenueData(dateRange: { start: Date; end: Date }) {
    const [totalRevenue, completedRevenue] = await Promise.all([
      this.prisma.booking.aggregate({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        _sum: { finalAmountBDT: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        _sum: { finalAmountBDT: true },
      }),
    ]);

    return {
      total: this.convertDecimalToNumber(totalRevenue._sum.finalAmountBDT) || 0,
      completed:
        this.convertDecimalToNumber(completedRevenue._sum.finalAmountBDT) || 0,
      currency: "BDT",
    };
  }

  // CSV Export
  private async generateCSVReport(data: any, filename: string, res: Response) {
    const csvData = this.convertToCSV(data);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.csv"`
    );
    res.send(csvData);
  }

  // PDF Export
  private async generatePDFReport(data: any, filename: string, res: Response) {
    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.pdf"`
    );

    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text("Analytics Report", 50, 50);
    doc.fontSize(12).text(`Generated on: ${new Date().toISOString()}`, 50, 100);

    // Add data sections
    let yPosition = 150;
    Object.keys(data).forEach((key) => {
      if (key !== "period") {
        doc.text(`${key}:`, 50, yPosition);
        doc.text(JSON.stringify(data[key], null, 2), 50, yPosition + 20);
        yPosition += 100;
      }
    });

    doc.end();
  }

  // Helper methods for data processing
  private calculateRatingTrend(
    ratings: any[],
    dateRange: { start: Date; end: Date }
  ) {
    // Simplified trend calculation
    return ratings.map((rating) => ({
      date: rating.createdAt,
      rating: rating.rating,
    }));
  }

  private groupByMonth(data: any[], dateRange: { start: Date; end: Date }) {
    // Simplified monthly grouping
    return data.map((item) => ({
      month: item.createdAt.toISOString().substring(0, 7),
      amount: this.convertDecimalToNumber(item.finalAmountBDT) || 0,
      status: item.status,
    }));
  }

  private convertDecimalToNumber(decimalValue: any): number {
    if (typeof decimalValue === "number") return decimalValue;
    if (typeof decimalValue === "string") return parseFloat(decimalValue);
    if (decimalValue && typeof decimalValue === "object") {
      // Handle Prisma Decimal object
      if (decimalValue.toNumber) return decimalValue.toNumber();
      if (decimalValue.toString) return parseFloat(decimalValue.toString());
    }
    return 0;
  }

  private groupUsersByMonth(
    users: any[],
    dateRange: { start: Date; end: Date }
  ) {
    const monthlyData = new Map<
      string,
      { total: number; professionals: number; customers: number }
    >();

    users.forEach((user) => {
      const month = user.createdAt.toISOString().substring(0, 7);
      const existing = monthlyData.get(month) || {
        total: 0,
        professionals: 0,
        customers: 0,
      };

      existing.total += 1;
      if (user.roles.some((role: any) => role.role.name === "PROFESSIONAL")) {
        existing.professionals += 1;
      }
      if (user.roles.some((role: any) => role.role.name === "CUSTOMER")) {
        existing.customers += 1;
      }

      monthlyData.set(month, existing);
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));
  }

  private groupBookingsByMonth(
    bookings: any[],
    dateRange: { start: Date; end: Date }
  ) {
    const monthlyData = new Map<string, { total: number; revenue: number }>();

    bookings.forEach((booking) => {
      const month = booking.createdAt.toISOString().substring(0, 7);
      const existing = monthlyData.get(month) || { total: 0, revenue: 0 };

      existing.total += 1;
      existing.revenue += this.convertDecimalToNumber(booking.finalAmountBDT);

      monthlyData.set(month, existing);
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));
  }

  private getMonthDifference(start: Date, end: Date): number {
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    return yearDiff * 12 + monthDiff + 1;
  }

  private convertToCSV(data: any): string {
    const headers = Object.keys(data);
    const rows = [headers.join(",")];

    // Simple CSV conversion - in production, use a proper CSV library
    headers.forEach((header) => {
      const value = data[header];
      if (typeof value === "object") {
        rows.push(`${header},"${JSON.stringify(value).replace(/"/g, '""')}"`);
      } else {
        rows.push(`${header},"${value}"`);
      }
    });

    return rows.join("\n");
  }
}
