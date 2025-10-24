import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export class FlagReviewDto {
  @ApiProperty({
    description: "Reason for flagging the review",
    example: "Inappropriate language",
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: "Additional details about the flag",
    example:
      "The review contains offensive language and false claims about the service.",
  })
  @IsString()
  @IsOptional()
  details?: string;
}

// Zod schema for validation
export const FlagReviewSchema = z.object({
  reason: z.string().min(1, "Flag reason is required"),
  details: z.string().optional(),
});






























