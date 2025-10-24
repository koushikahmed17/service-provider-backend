import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { z } from "zod";

export class CreateCommissionSettingDto {
  @ApiPropertyOptional({ example: "category-cuid-here" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 15.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  percent: number;
}

export class UpdateCommissionSettingDto {
  @ApiProperty({ example: 20.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  percent: number;
}

export class CommissionSettingResponseDto {
  @ApiProperty({ example: "commission-123" })
  id: string;

  @ApiPropertyOptional({ example: "category-123" })
  categoryId?: string;

  @ApiProperty({ example: 15.0 })
  percent: number;

  @ApiProperty({ example: "2024-01-15T09:00:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2024-01-15T09:00:00.000Z" })
  updatedAt: Date;

  // Relations
  @ApiPropertyOptional()
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export class CommissionCalculationDto {
  @ApiProperty({ example: 2000.0 })
  amount: number;

  @ApiProperty({ example: 15.0 })
  commissionPercent: number;

  @ApiProperty({ example: 300.0 })
  commissionAmount: number;

  @ApiProperty({ example: 1700.0 })
  netAmount: number;

  @ApiProperty({ example: "category-123" })
  categoryId?: string;

  @ApiProperty({ example: "Home Cleaning" })
  categoryName?: string;
}

// Zod schemas
export const createCommissionSettingSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID").optional(),
  percent: z
    .number()
    .min(0, "Percent must be positive")
    .max(100, "Percent cannot exceed 100"),
});

export const updateCommissionSettingSchema = z.object({
  percent: z
    .number()
    .min(0, "Percent must be positive")
    .max(100, "Percent cannot exceed 100"),
});

export type CreateCommissionSettingSchema = z.infer<
  typeof createCommissionSettingSchema
>;
export type UpdateCommissionSettingSchema = z.infer<
  typeof updateCommissionSettingSchema
>;
