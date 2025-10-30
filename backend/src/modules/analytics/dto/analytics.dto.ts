import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";
import { Transform } from "class-transformer";

export enum AnalyticsPeriod {
  DAY = "DAY",
  WEEK = "WEEK",
  MONTH = "MONTH",
  QUARTER = "QUARTER",
  YEAR = "YEAR",
}

export enum ReportScope {
  PROFESSIONAL = "professional",
  CUSTOMER = "customer",
  ADMIN = "admin",
}

export enum ReportFormat {
  CSV = "csv",
  PDF = "pdf",
}

export class AnalyticsPeriodDto {
  @ApiPropertyOptional({
    enum: AnalyticsPeriod,
    example: AnalyticsPeriod.MONTH,
    description: "Time period for analytics",
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod;

  @ApiPropertyOptional({
    example: "2024-01-01",
    description: "Start date (ISO string)",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: "2024-12-31",
    description: "End date (ISO string)",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 12,
    description: "Number of periods to include",
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  @Transform(({ value }) => parseInt(value))
  periods?: number;
}

export class ProfessionalAnalyticsDto extends AnalyticsPeriodDto {
  @ApiPropertyOptional({
    example: "category-id",
    description: "Filter by service category",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class CustomerAnalyticsDto extends AnalyticsPeriodDto {
  @ApiPropertyOptional({
    example: "category-id",
    description: "Filter by service category",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class AdminAnalyticsDto extends AnalyticsPeriodDto {
  @ApiPropertyOptional({
    example: "Bangladesh",
    description: "Filter by country/region",
  })
  @IsOptional()
  @IsString()
  region?: string;
}

export class ReportExportDto {
  @ApiProperty({
    enum: ReportScope,
    example: ReportScope.PROFESSIONAL,
    description: "Scope of the report",
  })
  @IsEnum(ReportScope)
  scope: ReportScope;

  @ApiProperty({
    enum: ReportFormat,
    example: ReportFormat.CSV,
    description: "Export format",
  })
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @ApiPropertyOptional({
    enum: AnalyticsPeriod,
    example: AnalyticsPeriod.MONTH,
    description: "Time period for the report",
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod;

  @ApiPropertyOptional({
    example: "2024-01-01",
    description: "Start date (ISO string)",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: "2024-12-31",
    description: "End date (ISO string)",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Zod schemas
export const analyticsPeriodSchema = z.object({
  period: z.enum(["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  periods: z.number().min(1).max(24).optional(),
});

export const professionalAnalyticsSchema = analyticsPeriodSchema.extend({
  categoryId: z.string().optional(),
});

export const customerAnalyticsSchema = analyticsPeriodSchema.extend({
  categoryId: z.string().optional(),
});

export const adminAnalyticsSchema = analyticsPeriodSchema.extend({
  region: z.string().optional(),
});

export const reportExportSchema = z.object({
  scope: z.enum(["professional", "customer", "admin"]),
  format: z.enum(["csv", "pdf"]),
  period: z.enum(["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type AnalyticsPeriodSchema = z.infer<typeof analyticsPeriodSchema>;
export type ProfessionalAnalyticsSchema = z.infer<
  typeof professionalAnalyticsSchema
>;
export type CustomerAnalyticsSchema = z.infer<typeof customerAnalyticsSchema>;
export type AdminAnalyticsSchema = z.infer<typeof adminAnalyticsSchema>;
export type ReportExportSchema = z.infer<typeof reportExportSchema>;





























