import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { z } from "zod";

export enum BookingEventType {
  CREATED = "CREATED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  CHECKED_IN = "CHECKED_IN",
  CHECKED_OUT = "CHECKED_OUT",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export class AcceptBookingDto {
  @ApiPropertyOptional({ example: "I'll be there on time" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class RejectBookingDto {
  @ApiProperty({ example: "I'm not available at that time" })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class CheckInDto {
  @ApiPropertyOptional({ example: "Starting work now" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

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
}

export class CheckOutDto {
  @ApiPropertyOptional({ example: "Work completed successfully" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualHours?: number;

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
}

export class CompleteBookingDto {
  @ApiPropertyOptional({ example: "All work completed as requested" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualHours?: number;

  @ApiPropertyOptional({ example: 2300.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  finalAmountBDT?: number;
}

export class CancelBookingDto {
  @ApiProperty({ example: "Customer requested cancellation" })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class BookingEventResponseDto {
  @ApiProperty({ example: "event-123" })
  id: string;

  @ApiProperty({ example: "booking-123" })
  bookingId: string;

  @ApiProperty({ enum: BookingEventType, example: BookingEventType.ACCEPTED })
  type: BookingEventType;

  @ApiPropertyOptional({ example: { message: "I'll be there on time" } })
  metadata?: any;

  @ApiProperty({ example: "2024-01-15T10:30:00.000Z" })
  at: Date;
}

// Zod schemas
export const acceptBookingSchema = z.object({
  message: z.string().max(500, "Message too long").optional(),
});

export const rejectBookingSchema = z.object({
  reason: z
    .string()
    .min(5, "Reason must be at least 5 characters")
    .max(500, "Reason too long"),
});

export const checkInSchema = z.object({
  notes: z.string().max(500, "Notes too long").optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const checkOutSchema = z.object({
  notes: z.string().max(500, "Notes too long").optional(),
  actualHours: z.number().min(0, "Hours must be positive").optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const completeBookingSchema = z.object({
  notes: z.string().max(500, "Notes too long").optional(),
  actualHours: z.number().min(0, "Hours must be positive").optional(),
  finalAmountBDT: z.number().min(0, "Amount must be positive").optional(),
});

export const cancelBookingSchema = z.object({
  reason: z
    .string()
    .min(5, "Reason must be at least 5 characters")
    .max(500, "Reason too long"),
});

export type AcceptBookingSchema = z.infer<typeof acceptBookingSchema>;
export type RejectBookingSchema = z.infer<typeof rejectBookingSchema>;
export type CheckInSchema = z.infer<typeof checkInSchema>;
export type CheckOutSchema = z.infer<typeof checkOutSchema>;
export type CompleteBookingSchema = z.infer<typeof completeBookingSchema>;
export type CancelBookingSchema = z.infer<typeof cancelBookingSchema>;
