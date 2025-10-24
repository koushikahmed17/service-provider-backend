import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { z } from "zod";

export enum BookingStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum PricingModel {
  HOURLY = "HOURLY",
  FIXED = "FIXED",
}

export class CreateBookingDto {
  @ApiProperty({ example: "cmg2fvg7u001vmh0krqmmiu2m" })
  @IsString()
  professionalId: string;

  @ApiProperty({ example: "cmg2fvg55001nmh0kr86d4989" })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: "2024-01-15T10:00:00.000Z" })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ example: "123 Main Street, Dhaka, Bangladesh" })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  addressText: string;

  @ApiPropertyOptional({ example: 23.8103 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: 90.4125 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ example: "Please bring tools for plumbing repair" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;

  @ApiProperty({ enum: PricingModel, example: PricingModel.HOURLY })
  @IsEnum(PricingModel)
  pricingModel: PricingModel;

  @ApiProperty({ example: 2000.0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quotedPriceBDT: number;

  @ApiPropertyOptional({ example: 15.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  commissionPercent?: number;
}

export class BookingResponseDto {
  @ApiProperty({ example: "booking-123" })
  id: string;

  @ApiProperty({ example: "customer-123" })
  customerId: string;

  @ApiProperty({ example: "professional-123" })
  professionalId: string;

  @ApiProperty({ example: "category-123" })
  categoryId: string;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.PENDING })
  status: BookingStatus;

  @ApiProperty({ example: "2024-01-15T10:00:00.000Z" })
  scheduledAt: Date;

  @ApiProperty({ example: "123 Main Street, Dhaka, Bangladesh" })
  addressText: string;

  @ApiPropertyOptional({ example: 23.8103 })
  lat?: number;

  @ApiPropertyOptional({ example: 90.4125 })
  lng?: number;

  @ApiPropertyOptional({ example: "Please bring tools for plumbing repair" })
  details?: string;

  @ApiProperty({ enum: PricingModel, example: PricingModel.HOURLY })
  pricingModel: PricingModel;

  @ApiProperty({ example: 2000.0 })
  quotedPriceBDT: number;

  @ApiProperty({ example: 15.0 })
  commissionPercent: number;

  @ApiPropertyOptional({ example: "2024-01-15T10:30:00.000Z" })
  checkInAt?: Date;

  @ApiPropertyOptional({ example: "2024-01-15T12:30:00.000Z" })
  checkOutAt?: Date;

  @ApiPropertyOptional({ example: 2.5 })
  actualHours?: number;

  @ApiPropertyOptional({ example: 2300.0 })
  finalAmountBDT?: number;

  @ApiPropertyOptional({ example: "Customer cancelled" })
  cancelReason?: string;

  @ApiProperty({ example: "2024-01-15T09:00:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2024-01-15T09:00:00.000Z" })
  updatedAt: Date;

  // Relations
  @ApiPropertyOptional()
  customer?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };

  @ApiPropertyOptional()
  professional?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    professionalProfile?: {
      skills: string[];
      hourlyRateBDT?: number;
      isVerified: boolean;
    };
  };

  @ApiPropertyOptional()
  category?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiPropertyOptional()
  events?: Array<{
    id: string;
    type: string;
    metadata?: any;
    at: Date;
  }>;
}

// Zod schemas
export const createBookingSchema = z.object({
  professionalId: z.string().min(1, "Professional ID is required"),
  categoryId: z.string().min(1, "Category ID is required"),
  scheduledAt: z.string().datetime("Invalid scheduled date"),
  addressText: z
    .string()
    .min(10, "Address must be at least 10 characters")
    .max(500, "Address too long"),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  details: z.string().max(1000, "Details too long").optional(),
  pricingModel: z.enum(["HOURLY", "FIXED"]),
  quotedPriceBDT: z.number().min(0, "Price must be positive"),
  commissionPercent: z.number().min(0).max(100).optional(),
});

export type CreateBookingSchema = z.infer<typeof createBookingSchema>;
