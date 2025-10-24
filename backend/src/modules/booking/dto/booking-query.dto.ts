import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { z } from "zod";
import { BookingStatus } from "./create-booking.dto";

export class GetBookingsDto {
  @ApiPropertyOptional({ enum: BookingStatus, example: BookingStatus.PENDING })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

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
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
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

export class BookingStatsDto {
  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 5 })
  pending: number;

  @ApiProperty({ example: 8 })
  accepted: number;

  @ApiProperty({ example: 3 })
  inProgress: number;

  @ApiProperty({ example: 7 })
  completed: number;

  @ApiProperty({ example: 2 })
  cancelled: number;

  @ApiProperty({ example: 15000.0 })
  totalRevenue: number;

  @ApiProperty({ example: 2250.0 })
  totalCommission: number;
}

// Zod schemas
export const getBookingsSchema = z.object({
  status: z
    .enum(["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type GetBookingsSchema = z.infer<typeof getBookingsSchema>;






























