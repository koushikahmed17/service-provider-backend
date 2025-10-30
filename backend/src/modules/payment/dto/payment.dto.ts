import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  Min,
  Max,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { z } from "zod";

export enum PaymentStatus {
  INITIATED = "INITIATED",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  REFUNDED = "REFUNDED",
  FAILED = "FAILED",
}

export enum PaymentMethod {
  CARD = "CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  MOBILE_MONEY = "MOBILE_MONEY",
  CASH = "CASH",
}

export class CreatePaymentIntentDto {
  @ApiProperty({ example: "booking-uuid-here" })
  @IsUUID()
  bookingId: string;

  @ApiPropertyOptional({ example: "CARD" })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({
    example: { customerNote: "Payment for home cleaning" },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CapturePaymentDto {
  @ApiPropertyOptional({ example: 2000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ example: { notes: "Service completed successfully" } })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class RefundPaymentDto {
  @ApiProperty({ example: 2000.0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: "Customer requested refund" })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: { adminNote: "Refund processed by admin" } })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class PaymentResponseDto {
  @ApiProperty({ example: "payment-123" })
  id: string;

  @ApiProperty({ example: "booking-123" })
  bookingId: string;

  @ApiProperty({ example: 2000.0 })
  amountBDT: number;

  @ApiProperty({ example: "BDT" })
  currency: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.INITIATED })
  status: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CARD })
  method: PaymentMethod;

  @ApiPropertyOptional({ example: "gateway_ref_123" })
  gatewayRef?: string;

  @ApiPropertyOptional({
    example: { customerNote: "Payment for home cleaning" },
  })
  metadata?: any;

  @ApiProperty({ example: "2024-01-15T09:00:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2024-01-15T09:00:00.000Z" })
  updatedAt: Date;

  // Relations
  @ApiPropertyOptional()
  booking?: {
    id: string;
    status: string;
    scheduledAt: Date;
    quotedPriceBDT: number;
    finalAmountBDT?: number;
    customer: {
      id: string;
      fullName: string;
      email: string;
    };
    professional: {
      id: string;
      fullName: string;
      email: string;
    };
  };
}

export class PaymentQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus, example: PaymentStatus.CAPTURED })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: "booking-123" })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

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

  @ApiPropertyOptional({ example: "createdAt" })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ example: "desc" })
  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc";
}

// Zod schemas
export const createPaymentIntentSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  method: z.enum(["CARD", "BANK_TRANSFER", "MOBILE_MONEY", "CASH"]).optional(),
  metadata: z.record(z.any()).optional(),
});

export const capturePaymentSchema = z.object({
  amount: z.number().min(0, "Amount must be positive").optional(),
  metadata: z.record(z.any()).optional(),
});

export const refundPaymentSchema = z.object({
  amount: z.number().min(0, "Amount must be positive"),
  reason: z
    .string()
    .min(5, "Reason must be at least 5 characters")
    .max(500, "Reason too long"),
  metadata: z.record(z.any()).optional(),
});

export type CreatePaymentIntentSchema = z.infer<
  typeof createPaymentIntentSchema
>;
export type CapturePaymentSchema = z.infer<typeof capturePaymentSchema>;
export type RefundPaymentSchema = z.infer<typeof refundPaymentSchema>;































