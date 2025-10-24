import { IsOptional, IsString, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export class GetAnalyticsSummaryDto {
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
    example: "all",
    description: "Category ID to filter by (or 'all' for all categories)",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

// Zod schemas
export const getAnalyticsSummarySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  categoryId: z.string().optional(),
});

export type GetAnalyticsSummarySchema = z.infer<
  typeof getAnalyticsSummarySchema
>;
