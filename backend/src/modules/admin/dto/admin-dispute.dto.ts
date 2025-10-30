import { IsOptional, IsString, IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export enum DisputeStatus {
  PENDING = "PENDING",
  IN_REVIEW = "IN_REVIEW",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum DisputeType {
  PAYMENT = "PAYMENT",
  SERVICE_QUALITY = "SERVICE_QUALITY",
  CANCELLATION = "CANCELLATION",
  BEHAVIOR = "BEHAVIOR",
  OTHER = "OTHER",
}

export class GetDisputesDto {
  @ApiPropertyOptional({ enum: DisputeStatus, example: DisputeStatus.PENDING })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiPropertyOptional({ enum: DisputeType, example: DisputeType.PAYMENT })
  @IsOptional()
  @IsEnum(DisputeType)
  type?: DisputeType;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  limit?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ example: "Dispute resolved in favor of customer" })
  @IsNotEmpty()
  @IsString()
  resolution: string;
}

// Zod schemas
export const getDisputesSchema = z.object({
  status: z.enum(["PENDING", "IN_REVIEW", "RESOLVED", "CLOSED"]).optional(),
  type: z
    .enum(["PAYMENT", "SERVICE_QUALITY", "CANCELLATION", "BEHAVIOR", "OTHER"])
    .optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const resolveDisputeSchema = z.object({
  resolution: z.string().min(1),
});

export type GetDisputesSchema = z.infer<typeof getDisputesSchema>;
export type ResolveDisputeSchema = z.infer<typeof resolveDisputeSchema>;





























