import {
  IsOptional,
  IsString,
  IsNumber,
  IsDecimal,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";
import { Transform } from "class-transformer";

export class GetCommissionSettingsDto {
  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  limit?: string;
}

export class UpdateCommissionSettingDto {
  @ApiProperty({ example: 15.5, description: "Commission percentage (0-100)" })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  percent: number;
}

export class CreateCommissionSettingDto {
  @ApiPropertyOptional({
    example: "category-id",
    description: "Category ID (null for global)",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 15.5, description: "Commission percentage (0-100)" })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  percent: number;
}

// Zod schemas
export const getCommissionSettingsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const updateCommissionSettingSchema = z.object({
  percent: z.number().min(0).max(100),
});

export const createCommissionSettingSchema = z.object({
  categoryId: z.string().optional(),
  percent: z.number().min(0).max(100),
});

export type GetCommissionSettingsSchema = z.infer<
  typeof getCommissionSettingsSchema
>;
export type UpdateCommissionSettingSchema = z.infer<
  typeof updateCommissionSettingSchema
>;
export type CreateCommissionSettingSchema = z.infer<
  typeof createCommissionSettingSchema
>;




























