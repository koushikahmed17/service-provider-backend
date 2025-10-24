import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export class CreateReviewResponseDto {
  @ApiProperty({
    description: "Response comment from the professional",
    example:
      "Thank you for your feedback! I'm glad you were satisfied with the service.",
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}

export class UpdateReviewResponseDto {
  @ApiPropertyOptional({
    description: "Updated response comment from the professional",
    example:
      "Thank you for your detailed feedback! I appreciate your kind words.",
  })
  @IsString()
  @IsOptional()
  comment?: string;
}

// Zod schemas for validation
export const CreateReviewResponseSchema = z.object({
  comment: z.string().min(1, "Response comment is required"),
});

export const UpdateReviewResponseSchema = z.object({
  comment: z.string().min(1, "Response comment is required").optional(),
});






























