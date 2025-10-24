import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { getServicesWithinRadiusQuery } from "@/common/utils/geo";

export interface SearchFilters {
  query?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  rateType?: string;
  categoryIds?: string[];
  professionalId?: string;
  rating?: number;
  availability?: {
    day?: string;
    startTime?: string;
    endTime?: string;
  };
}

export interface SearchResult {
  id: string;
  categoryName: string;
  categorySlug: string;
  rateType: string;
  hourlyRateBDT?: number;
  fixedPriceBDT?: number;
  minHours?: number;
  notes?: string;
  professional: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    locationLat?: number;
    locationLng?: number;
  };
  distance?: number;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  async searchServices(filters: SearchFilters): Promise<SearchResult[]> {
    const {
      query,
      lat,
      lng,
      radiusKm = 10,
      minPrice,
      maxPrice,
      rateType,
      categoryIds,
      professionalId,
      rating,
      availability,
    } = filters;

    let whereConditions: any[] = [
      `ps."isActive" = true`,
      `pp."isVerified" = true`,
    ];

    // Add text search
    if (query) {
      whereConditions.push(`
        (
          sc.name ILIKE '%${query}%' OR
          sc.description ILIKE '%${query}%' OR
          u."fullName" ILIKE '%${query}%' OR
          pp.skills::text ILIKE '%${query}%'
        )
      `);
    }

    // Add price filters
    if (minPrice !== undefined) {
      whereConditions.push(`
        (
          (ps."rateType" = 'HOURLY' AND ps."hourlyRateBDT" >= ${minPrice}) OR
          (ps."rateType" = 'FIXED' AND ps."fixedPriceBDT" >= ${minPrice})
        )
      `);
    }

    if (maxPrice !== undefined) {
      whereConditions.push(`
        (
          (ps."rateType" = 'HOURLY' AND ps."hourlyRateBDT" <= ${maxPrice}) OR
          (ps."rateType" = 'FIXED' AND ps."fixedPriceBDT" <= ${maxPrice})
        )
      `);
    }

    // Add rate type filter
    if (rateType) {
      whereConditions.push(`ps."rateType" = '${rateType}'`);
    }

    // Add category filter
    if (categoryIds && categoryIds.length > 0) {
      const categoryIdsStr = categoryIds.map((id) => `'${id}'`).join(",");
      whereConditions.push(`ps."categoryId" IN (${categoryIdsStr})`);
    }

    // Add professional filter
    if (professionalId) {
      whereConditions.push(`ps."professionalId" = '${professionalId}'`);
    }

    // Add rating filter (if we have reviews)
    if (rating) {
      whereConditions.push(`pp."rating" >= ${rating}`);
    }

    // Add availability filter
    if (availability?.day) {
      whereConditions.push(`
        pp.availability::text ILIKE '%"day":"${availability.day}"%'
      `);
    }

    let sqlQuery: string;

    if (lat && lng) {
      // Use geo search with distance calculation
      sqlQuery = getServicesWithinRadiusQuery(
        lat,
        lng,
        radiusKm,
        minPrice,
        maxPrice,
        rateType,
        categoryIds
      );

      // Add additional filters to the geo query
      if (whereConditions.length > 0) {
        const additionalConditions = whereConditions
          .filter((condition) => !condition.includes("ps."))
          .join(" AND ");
        if (additionalConditions) {
          sqlQuery = sqlQuery.replace(
            "WHERE",
            `WHERE ${additionalConditions} AND`
          );
        }
      }
    } else {
      // Use regular search without geo
      sqlQuery = `
        SELECT
          ps.*,
          sc.name as "categoryName",
          sc.slug as "categorySlug",
          pp."locationLat",
          pp."locationLng",
          u."fullName",
          u."email",
          u."avatarUrl"
        FROM "professional_services" ps
        JOIN "professional_profiles" pp ON pp.id = ps."professionalId"
        JOIN "users" u ON u.id = pp."userId"
        JOIN "service_categories" sc ON sc.id = ps."categoryId"
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY ps."createdAt" DESC
      `;
    }

    try {
      const results = (await this.prisma.$queryRawUnsafe(
        sqlQuery
      )) as SearchResult[];

      this.logger.log(
        `Search completed: ${results.length} results found`,
        "SearchService"
      );

      return results;
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, "SearchService");
      throw error;
    }
  }

  async getSearchSuggestions(query: string, limit: number = 10) {
    const suggestions = await this.prisma.$queryRaw<
      Array<{ suggestion: string; type: string }>
    >`
      SELECT DISTINCT
        sc.name as suggestion,
        'category' as type
      FROM "service_categories" sc
      WHERE sc."isActive" = true
        AND sc.name ILIKE ${`%${query}%`}
      UNION
      SELECT DISTINCT
        unnest(pp.skills) as suggestion,
        'skill' as type
      FROM "professional_profiles" pp
      WHERE pp."isVerified" = true
        AND unnest(pp.skills) ILIKE ${`%${query}%`}
      LIMIT ${limit}
    `;

    return suggestions;
  }

  async getPopularCategories(limit: number = 10) {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            professionalServices: true,
          },
        },
      },
      orderBy: {
        professionalServices: {
          _count: "desc",
        },
      },
      take: limit,
    });
  }

  async getNearbyServices(
    lat: number,
    lng: number,
    radiusKm: number = 10,
    limit: number = 20
  ) {
    const sqlQuery = getServicesWithinRadiusQuery(lat, lng, radiusKm);
    const limitedQuery = `${sqlQuery} LIMIT ${limit}`;

    return this.prisma.$queryRawUnsafe(
      limitedQuery
    ) as unknown as SearchResult[];
  }
}
