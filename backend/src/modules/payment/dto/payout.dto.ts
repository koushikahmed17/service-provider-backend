import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDateString,
  Min,
  Max,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { z } from "zod";

export enum PayoutStatus {
  PENDING = "PENDING",
  PAID = "PAID",
}

export class CreatePayoutDto {
  @ApiProperty({ example: "professional-uuid-here" })
  @IsUUID()
  professionalId: string;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: "2024-01-31T23:59:59.000Z" })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ example: 15000.0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amountBDT: number;

  @ApiPropertyOptional({ example: { note: "Monthly payout for January" } })
  @IsOptional()
  @IsObject()
  meta?: any;
}

export class PayoutResponseDto {
  @ApiProperty({ example: "payout-123" })
  id: string;

  @ApiProperty({ example: "professional-123" })
  professionalId: string;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  periodStart: Date;

  @ApiProperty({ example: "2024-01-31T23:59:59.000Z" })
  periodEnd: Date;

  @ApiProperty({ example: 15000.0 })
  amountBDT: number;

  @ApiProperty({ enum: PayoutStatus, example: PayoutStatus.PENDING })
  status: PayoutStatus;

  @ApiPropertyOptional({ example: { note: "Monthly payout for January" } })
  meta?: any;

  @ApiProperty({ example: "2024-01-15T09:00:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2024-01-15T09:00:00.000Z" })
  updatedAt: Date;

  // Relations
  @ApiPropertyOptional()
  professional?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
}

export class PayoutQueryDto {
  @ApiPropertyOptional({ enum: PayoutStatus, example: PayoutStatus.PENDING })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @ApiPropertyOptional({ example: "professional-123" })
  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @ApiPropertyOptional({ example: "2024-01-01" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: "2024-01-31" })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class PayoutStatsDto {
  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 15 })
  pending: number;

  @ApiProperty({ example: 10 })
  paid: number;

  @ApiProperty({ example: 150000.0 })
  totalAmount: number;

  @ApiProperty({ example: 75000.0 })
  pendingAmount: number;

  @ApiProperty({ example: 75000.0 })
  paidAmount: number;
}

// Zod schemas
export const createPayoutSchema = z.object({
  professionalId: z.string().uuid("Invalid professional ID"),
  periodStart: z.string().datetime("Invalid period start date"),
  periodEnd: z.string().datetime("Invalid period end date"),
  amountBDT: z.number().min(0, "Amount must be positive"),
  meta: z.record(z.any()).optional(),
});

export const payoutQuerySchema = z.object({
  status: z.enum(["PENDING", "PAID"]).optional(),
  professionalId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type CreatePayoutSchema = z.infer<typeof createPayoutSchema>;
export type PayoutQuerySchema = z.infer<typeof payoutQuerySchema>;































