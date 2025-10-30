import { IsString, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export enum ModerationAction {
  APPROVE = "approve",
  REJECT = "reject",
  EDIT = "edit",
}

export class ModerateReviewDto {
  @ApiProperty({
    description: "Moderation action to take",
    enum: ModerationAction,
    example: ModerationAction.APPROVE,
  })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiPropertyOptional({
    description: "Reason for the moderation action",
    example: "Review approved after verification",
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: "Additional notes for the moderation",
    example: "Customer provided valid documentation supporting their claims.",
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

// Zod schema for validation
export const ModerateReviewSchema = z.object({
  action: z.nativeEnum(ModerationAction),
  reason: z.string().optional(),
  notes: z.string().optional(),
});































