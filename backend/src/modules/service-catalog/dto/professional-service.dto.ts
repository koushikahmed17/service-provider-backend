import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export enum ProfessionalServiceRateType {
  HOURLY = "HOURLY",
  FIXED = "FIXED",
}

export class CreateProfessionalServiceDto {
  @ApiProperty({ example: "category-id-here" })
  @IsString()
  categoryId: string;

  @ApiProperty({
    enum: ProfessionalServiceRateType,
    example: ProfessionalServiceRateType.HOURLY,
  })
  @IsEnum(ProfessionalServiceRateType)
  rateType: ProfessionalServiceRateType;

  @ApiPropertyOptional({ example: 500.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRateBDT?: number;

  @ApiPropertyOptional({ example: 2000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPriceBDT?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  minHours?: number;

  @ApiPropertyOptional({ example: "Available on weekends" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProfessionalServiceDto {
  @ApiPropertyOptional({
    enum: ProfessionalServiceRateType,
    example: ProfessionalServiceRateType.FIXED,
  })
  @IsOptional()
  @IsEnum(ProfessionalServiceRateType)
  rateType?: ProfessionalServiceRateType;

  @ApiPropertyOptional({ example: 600.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRateBDT?: number;

  @ApiPropertyOptional({ example: 2500.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPriceBDT?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  minHours?: number;

  @ApiPropertyOptional({ example: "Updated availability notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Zod schemas
export const createProfessionalServiceSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  rateType: z.enum(["HOURLY", "FIXED"]),
  hourlyRateBDT: z.number().min(0, "Rate must be positive").optional(),
  fixedPriceBDT: z.number().min(0, "Price must be positive").optional(),
  minHours: z.number().min(1).max(24).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateProfessionalServiceSchema = z.object({
  rateType: z.enum(["HOURLY", "FIXED"]).optional(),
  hourlyRateBDT: z.number().min(0).optional(),
  fixedPriceBDT: z.number().min(0).optional(),
  minHours: z.number().min(1).max(24).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateProfessionalServiceSchema = z.infer<
  typeof createProfessionalServiceSchema
>;
export type UpdateProfessionalServiceSchema = z.infer<
  typeof updateProfessionalServiceSchema
>;
