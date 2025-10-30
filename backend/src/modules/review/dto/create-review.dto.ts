import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  Max,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export class CreateReviewDto {
  @ApiProperty({
    description: "ID of the booking being reviewed",
    example: "booking-123",
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({
    description: "Rating from 1 to 5 stars",
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: "Optional comment about the service",
    example: "Excellent service! Very professional and punctual.",
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    description: "Array of photo URLs",
    example: [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];
}

// Zod schema for validation
export const CreateReviewSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: z.string().optional(),
  photos: z.array(z.string().url("Invalid photo URL")).optional(),
});































