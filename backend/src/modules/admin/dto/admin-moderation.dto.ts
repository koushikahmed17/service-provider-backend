import { IsOptional, IsString, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export class GetFlaggedReviewsDto {
  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  limit?: string;
}

export class ModerateReviewDto {
  @ApiProperty({
    example: "APPROVED",
    enum: ["APPROVED", "REJECTED", "HIDDEN"],
  })
  @IsString()
  action: "APPROVED" | "REJECTED" | "HIDDEN";

  @ApiPropertyOptional({ example: "Review contains inappropriate content" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class GetUploadsDto {
  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({
    example: "PENDING",
    enum: ["PENDING", "APPROVED", "REJECTED"],
  })
  @IsOptional()
  @IsString()
  status?: "PENDING" | "APPROVED" | "REJECTED";
}

export class ModerateUploadDto {
  @ApiProperty({ example: "APPROVED", enum: ["APPROVED", "REJECTED"] })
  @IsString()
  action: "APPROVED" | "REJECTED";

  @ApiPropertyOptional({ example: "Content violates community guidelines" })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Zod schemas
export const getFlaggedReviewsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const moderateReviewSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED", "HIDDEN"]),
  reason: z.string().optional(),
});

export const getUploadsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const moderateUploadSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().optional(),
});

export type GetFlaggedReviewsSchema = z.infer<typeof getFlaggedReviewsSchema>;
export type ModerateReviewSchema = z.infer<typeof moderateReviewSchema>;
export type GetUploadsSchema = z.infer<typeof getUploadsSchema>;
export type ModerateUploadSchema = z.infer<typeof moderateUploadSchema>;




























