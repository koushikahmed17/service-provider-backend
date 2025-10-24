import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { z } from "zod";

export class GetReviewsQueryDto {
  @ApiPropertyOptional({
    description: "Filter by professional ID",
    example: "professional-123",
  })
  @IsString()
  @IsOptional()
  professionalId?: string;

  @ApiPropertyOptional({
    description: "Filter by minimum rating",
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  minRating?: number;

  @ApiPropertyOptional({
    description: "Filter by maximum rating",
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  maxRating?: number;

  @ApiPropertyOptional({
    description: "Filter by flagged status",
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  flagged?: boolean;

  @ApiPropertyOptional({
    description: "Page number for pagination",
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of items per page",
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}

// Zod schema for validation
export const GetReviewsQuerySchema = z.object({
  professionalId: z.string().optional(),
  minRating: z.number().int().min(1).max(5).optional(),
  maxRating: z.number().int().min(1).max(5).optional(),
  flagged: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});






























