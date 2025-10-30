import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";

@Injectable()
export class DynamicAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  /**
   * Get dashboard configuration for a user's role
   */
  async getDashboardConfig(userId: string) {
    // Get user's roles
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
      throw new BadRequestException("User not found");
    }

    // Get the first role (in a real app, you might need to handle multiple roles)
    const roleId = user.roles[0]?.role?.id;
    const roleName = user.roles[0]?.role?.name;

    if (!roleId) {
      throw new BadRequestException("User has no assigned role");
    }

    // Fetch dashboard configuration for the role
    const dashboard = await this.prisma.analyticsDashboard.findFirst({
      where: {
        roleId: roleId,
        isActive: true,
      },
      include: {
        widgets: {
          where: { isActive: true },
          include: {
            metric: true,
          },
          orderBy: [{ position: "asc" }],
        },
      },
    });

    if (!dashboard) {
      throw new BadRequestException(
        `No dashboard configured for role: ${roleName}`
      );
    }

    return {
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        slug: dashboard.slug,
        description: dashboard.description,
        layout: dashboard.layout,
        config: dashboard.config,
      },
      widgets: dashboard.widgets,
    };
  }

  /**
   * Get dashboard data for a user
   */
  async getDashboardData(
    userId: string,
    filters?: {
      period?: string;
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      region?: string;
    }
  ) {
    // Get dashboard configuration
    const { dashboard, widgets } = await this.getDashboardConfig(userId);

    // Calculate date range from filters
    const dateRange = this.calculateDateRange(
      filters?.period,
      filters?.startDate,
      filters?.endDate
    );

    // Get user role to determine data scope
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

    const roleName = user?.roles[0]?.role?.name;

    // Fetch data for each widget
    const widgetData = await Promise.all(
      widgets.map(async (widget: any) => {
        try {
          let data: any = null;

          if (widget.metric) {
            // Widget has a metric - calculate metric value
            data = await this.calculateMetric(
              widget.metric,
              userId,
              roleName,
              dateRange,
              filters,
              widget.config
            );
          } else if (widget.config?.dataType) {
            // Widget has custom data type
            data = await this.fetchCustomData(
              widget.config.dataType,
              userId,
              roleName,
              dateRange,
              filters,
              widget.config
            );
          }

          return {
            id: widget.id,
            name: widget.name,
            type: widget.type,
            position: widget.position,
            visualization: widget.visualization,
            config: widget.config,
            data,
          };
        } catch (error) {
          this.logger.error(
            `Error fetching data for widget ${widget.id}:`,
            error
          );
          return {
            id: widget.id,
            name: widget.name,
            type: widget.type,
            position: widget.position,
            visualization: widget.visualization,
            config: widget.config,
            data: null,
            error: "Failed to load data",
          };
        }
      })
    );

    return {
      dashboard,
      widgets: widgetData,
      filters: {
        ...filters,
        dateRange,
      },
    };
  }

  /**
   * Calculate metric value based on metric configuration
   */
  private async calculateMetric(
    metric: any,
    userId: string,
    roleName: string,
    dateRange: { start: Date; end: Date },
    filters: any,
    widgetConfig: any
  ) {
    const { dataSource, aggregation, field, filters: metricFilters } = metric;

    // Build where clause
    const whereClause = this.buildWhereClause(
      dataSource,
      userId,
      roleName,
      dateRange,
      metricFilters,
      filters,
      widgetConfig
    );

    // Execute aggregation
    let value: any;

    switch (aggregation) {
      case "count":
        value = await (this.prisma as any)[dataSource].count({
          where: whereClause,
        });
        break;

      case "sum":
        const sumResult = await (this.prisma as any)[dataSource].aggregate({
          where: whereClause,
          _sum: { [field]: true },
        });
        value = this.convertDecimalToNumber(sumResult._sum[field]) || 0;
        break;

      case "avg":
        const avgResult = await (this.prisma as any)[dataSource].aggregate({
          where: whereClause,
          _avg: { [field]: true },
        });
        value = this.convertDecimalToNumber(avgResult._avg[field]) || 0;
        break;

      case "max":
        const maxResult = await (this.prisma as any)[dataSource].aggregate({
          where: whereClause,
          _max: { [field]: true },
        });
        value = this.convertDecimalToNumber(maxResult._max[field]) || 0;
        break;

      case "min":
        const minResult = await (this.prisma as any)[dataSource].aggregate({
          where: whereClause,
          _min: { [field]: true },
        });
        value = this.convertDecimalToNumber(minResult._min[field]) || 0;
        break;

      default:
        value = 0;
    }

    // Apply custom calculation if defined
    if (metric.calculation) {
      value = await this.applyCalculation(value, metric.calculation, dateRange);
    }

    // Calculate trend if requested
    let trend: any = null;
    let growth: any = null;

    if (widgetConfig?.showTrend || widgetConfig?.showGrowth) {
      const previousPeriod = this.getPreviousPeriod(dateRange);
      const previousValue = await this.calculateMetricValue(
        metric,
        userId,
        roleName,
        previousPeriod,
        filters,
        widgetConfig
      );

      if (widgetConfig?.showGrowth && previousValue !== 0) {
        growth = ((value - previousValue) / previousValue) * 100;
      }

      if (widgetConfig?.showTrend) {
        trend =
          value > previousValue
            ? "up"
            : value < previousValue
            ? "down"
            : "stable";
      }
    }

    return {
      value,
      format: metric.format,
      icon: metric.icon,
      color: metric.color,
      trend,
      growth: growth !== null ? Math.round(growth * 10) / 10 : null,
    };
  }

  /**
   * Calculate just the metric value (helper for trend calculation)
   */
  private async calculateMetricValue(
    metric: any,
    userId: string,
    roleName: string,
    dateRange: { start: Date; end: Date },
    filters: any,
    widgetConfig: any
  ): Promise<number> {
    const { dataSource, aggregation, field, filters: metricFilters } = metric;

    const whereClause = this.buildWhereClause(
      dataSource,
      userId,
      roleName,
      dateRange,
      metricFilters,
      filters,
      widgetConfig
    );

    let value: any = 0;

    switch (aggregation) {
      case "count":
        value = await (this.prisma as any)[dataSource].count({
          where: whereClause,
        });
        break;

      case "sum":
        const sumResult = await (this.prisma as any)[dataSource].aggregate({
          where: whereClause,
          _sum: { [field]: true },
        });
        value = this.convertDecimalToNumber(sumResult._sum[field]) || 0;
        break;

      case "avg":
        const avgResult = await (this.prisma as any)[dataSource].aggregate({
          where: whereClause,
          _avg: { [field]: true },
        });
        value = this.convertDecimalToNumber(avgResult._avg[field]) || 0;
        break;
    }

    if (metric.calculation) {
      value = await this.applyCalculation(value, metric.calculation, dateRange);
    }

    return value;
  }

  /**
   * Fetch custom data for complex widgets
   */
  private async fetchCustomData(
    dataType: string,
    userId: string,
    roleName: string,
    dateRange: { start: Date; end: Date },
    filters: any,
    config: any
  ) {
    const userScope = config?.userScope === "self";

    switch (dataType) {
      case "service_distribution":
      case "service_categories":
        return await this.getServiceDistribution(
          userId,
          roleName,
          dateRange,
          userScope
        );

      case "revenue_trend":
      case "monthly_earnings":
      case "monthly_spending":
        return await this.getRevenueTrend(
          userId,
          roleName,
          dateRange,
          userScope
        );

      case "geo_heatmap":
        return await this.getGeoHeatmap(userId, roleName, dateRange, filters);

      case "top_categories":
      case "top_services":
      case "favorite_services":
        return await this.getTopCategories(
          userId,
          roleName,
          dateRange,
          config?.limit || 5,
          userScope
        );

      case "user_growth":
        return await this.getUserGrowth(dateRange);

      case "booking_status":
        return await this.getBookingStatus(
          userId,
          roleName,
          dateRange,
          userScope
        );

      case "rating_trend":
        return await this.getRatingTrend(
          userId,
          roleName,
          dateRange,
          userScope
        );

      default:
        return null;
    }
  }

  /**
   * Build where clause based on data source and user scope
   */
  private buildWhereClause(
    dataSource: string,
    userId: string,
    roleName: string,
    dateRange: { start: Date; end: Date },
    metricFilters: any,
    requestFilters: any,
    widgetConfig: any
  ): any {
    const where: any = {};

    // Add date range filter if dataSource has createdAt
    if (["bookings", "users", "reviews", "payments"].includes(dataSource)) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    // Add user scope filter
    const userScope = widgetConfig?.userScope === "self";
    if (userScope) {
      if (dataSource === "bookings") {
        if (roleName === "PROFESSIONAL") {
          where.professionalId = userId;
        } else if (roleName === "CUSTOMER") {
          where.customerId = userId;
        }
      } else if (dataSource === "reviews") {
        if (roleName === "PROFESSIONAL") {
          where.professionalId = userId;
        } else if (roleName === "CUSTOMER") {
          where.customerId = userId;
        }
      }
    }

    // Apply metric filters
    if (metricFilters) {
      Object.assign(where, metricFilters);
    }

    // Apply request filters
    if (requestFilters?.categoryId) {
      where.categoryId = requestFilters.categoryId;
    }

    return where;
  }

  /**
   * Apply custom calculation to metric value
   */
  private async applyCalculation(
    value: number,
    calculation: any,
    dateRange: { start: Date; end: Date }
  ): Promise<number> {
    switch (calculation.type) {
      case "divide_by_months":
        const months = Math.max(
          1,
          this.getMonthDifference(dateRange.start, dateRange.end)
        );
        return value / months;

      case "divide_by_days":
        const days = Math.max(
          1,
          Math.ceil(
            (dateRange.end.getTime() - dateRange.start.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        return value / days;

      case "percentage":
        return value * 100;

      default:
        return value;
    }
  }

  /**
   * Get service distribution data
   */
  private async getServiceDistribution(
    userId: string,
    roleName: string,
    dateRange: { start: Date; end: Date },
    userScope: boolean
  ) {
    const where: any = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    if (userScope) {
      if (roleName === "PROFESSIONAL") {
        where.professionalId = userId;
      } else if (roleName === "CUSTOMER") {
        where.customerId = userId;
      }
    }

    const distribution = await this.prisma.booking.groupBy({
      by: ["categoryId"],
      where,
      _count: { id: true },
      _sum: { finalAmountBDT: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const categoryIds = distribution.map((item) => item.categoryId);
    const categories = await this.prisma.serviceCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));
    const total = distribution.reduce((sum, item) => sum + item._count.id, 0);

    return distribution.map((item) => ({
      category: categoryMap.get(item.categoryId) || "Unknown",
      categoryId: item.categoryId,
      count: item._count.id,
      revenue: this.convertDecimalToNumber(item._sum.finalAmountBDT) || 0,
      percentage: total > 0 ? Math.round((item._count.id / total) * 100) : 0,
    }));
  }

  /**
   * Get revenue trend over time
   */
  private async getRevenueTrend(
    userId: string,
    roleName: string,
    dateRange: { start: Date; end: Date },
    userScope: boolean
  ) {
    const where: any = {
      status: "COMPLETED",
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    if (userScope) {
      if (roleName === "PROFESSIONAL") {
        where.professionalId = userId;
      } else if (roleName === "CUSTOMER") {
        where.customerId = userId;
      }
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        createdAt: true,
        finalAmountBDT: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return this.groupByMonth(bookings, dateRange);
  }

  /**
   * Get geographic heatmap data
   */
  private async getGeoHeatmap(
    userId: string,
    roleName: string,
    dateRange: { start: Date; end: Date },
    filters: any
  ) {
    const where: any = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      lat: { not: null },
      lng: { not: null },
    };

    if (filters?.region) {
      where.addressText = {
        contains: filters.region,
        mode: "insensitive",
      };
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        lat: true,
        lng: true,
        addressText: true,
        finalAmountBDT: true,
      },
    });

    const locationMap = new Map<
      string,
      { count: number; revenue: number; lat: number; lng: number }
    >();

    bookings.forEach((booking) => {
      if (booking.lat && booking.lng) {
        const key = `${booking.lat.toFixed(3)},${booking.lng.toFixed(3)}`;
        const existing = locationMap.get(key) || {
          count: 0,
          revenue: 0,
          lat: booking.lat,
          lng: booking.lng,
        };
        locationMap.set(key, {
          count: existing.count + 1,
          revenue:
            existing.revenue +
            (this.convertDecimalToNumber(booking.finalAmountBDT) || 0),
          lat: booking.lat,
          lng: booking.lng,
        });
      }
    });

    return Array.from(locationMap.values());
  }

  /**
   * Get top categories
   */
  private async getTopCategories(
    userId: string,
    roleName: string,
    dateRange: { start: Date; end: Date },
    limit: number,
    userScope: boolean
  ) {
    const where: any = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    if (userScope) {
      if (roleName === "PROFESSIONAL") {
        where.professionalId = userId;
      } else if (roleName === "CUSTOMER") {
        where.customerId = userId;
      }
    }

    const topCategories = await this.prisma.booking.groupBy({
      by: ["categoryId"],
      where,
      _count: { id: true },
      _sum: { finalAmountBDT: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const categoryIds = topCategories.map((item) => item.categoryId);
    const categories = await this.prisma.serviceCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    return topCategories.map((item, index) => ({
      rank: index + 1,
      categoryId: item.categoryId,
      category: categoryMap.get(item.categoryId) || "Unknown",
      count: item._count.id,
      revenue: this.convertDecimalToNumber(item._sum.finalAmountBDT) || 0,
    }));
  }

  /**
   * Get user growth data
   */
  private async getUserGrowth(dateRange: { start: Date; end: Date }) {
    const users = await this.prisma.user.findMany({
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

    return this.groupUsersByMonth(users, dateRange);
  }

  /**
   * Get booking status distribution
   */
  private async getBookingStatus(
    userId: string,
    roleName: string,
    dateRange: { start: Date; end: Date },
    userScope: boolean
  ) {
    const where: any = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    if (userScope) {
      if (roleName === "PROFESSIONAL") {
        where.professionalId = userId;
      } else if (roleName === "CUSTOMER") {
        where.customerId = userId;
      }
    }

    const statusGroups = await this.prisma.booking.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
    });

    return statusGroups.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));
  }

  /**
   * Get rating trend over time
   */
  private async getRatingTrend(
    userId: string,
    roleName: string,
    dateRange: { start: Date; end: Date },
    userScope: boolean
  ) {
    const where: any = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    if (userScope && roleName === "PROFESSIONAL") {
      where.professionalId = userId;
    }

    const ratings = await this.prisma.review.findMany({
      where,
      select: {
        createdAt: true,
        rating: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return this.groupRatingsByMonth(ratings, dateRange);
  }

  // ===== Helper Methods =====

  private calculateDateRange(
    period?: string,
    startDate?: string,
    endDate?: string
  ) {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (period) {
      const days = parseInt(period.replace("d", ""));
      start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    } else {
      // Default to last 30 days
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  private getPreviousPeriod(dateRange: { start: Date; end: Date }) {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - duration),
      end: new Date(dateRange.start.getTime()),
    };
  }

  private groupByMonth(data: any[], dateRange: { start: Date; end: Date }) {
    const monthlyData = new Map<string, { revenue: number; count: number }>();

    data.forEach((item) => {
      const month = item.createdAt.toISOString().substring(0, 7);
      const existing = monthlyData.get(month) || { revenue: 0, count: 0 };
      monthlyData.set(month, {
        revenue:
          existing.revenue +
          (this.convertDecimalToNumber(item.finalAmountBDT) || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
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

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private groupRatingsByMonth(
    ratings: any[],
    dateRange: { start: Date; end: Date }
  ) {
    const monthlyData = new Map<
      string,
      { total: number; sum: number; avg: number }
    >();

    ratings.forEach((rating) => {
      const month = rating.createdAt.toISOString().substring(0, 7);
      const existing = monthlyData.get(month) || { total: 0, sum: 0, avg: 0 };

      existing.total += 1;
      existing.sum += rating.rating;
      existing.avg = existing.sum / existing.total;

      monthlyData.set(month, existing);
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        average: Math.round(data.avg * 10) / 10,
        count: data.total,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private getMonthDifference(start: Date, end: Date): number {
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    return yearDiff * 12 + monthDiff + 1;
  }

  private convertDecimalToNumber(decimalValue: any): number {
    if (typeof decimalValue === "number") return decimalValue;
    if (typeof decimalValue === "string") return parseFloat(decimalValue);
    if (decimalValue && typeof decimalValue === "object") {
      if (decimalValue.toNumber) return decimalValue.toNumber();
      if (decimalValue.toString) return parseFloat(decimalValue.toString());
    }
    return 0;
  }
}















