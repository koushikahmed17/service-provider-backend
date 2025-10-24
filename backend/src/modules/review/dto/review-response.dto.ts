import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export class ReviewResponseDto {
  @ApiProperty({
    description: "Review ID",
    example: "review-123",
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: "Booking ID",
    example: "booking-123",
  })
  @IsString()
  bookingId: string;

  @ApiProperty({
    description: "Customer ID",
    example: "customer-123",
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: "Professional ID",
    example: "professional-123",
  })
  @IsString()
  professionalId: string;

  @ApiProperty({
    description: "Rating from 1 to 5 stars",
    example: 5,
  })
  @IsInt()
  rating: number;

  @ApiPropertyOptional({
    description: "Review comment",
    example: "Excellent service! Very professional and punctual.",
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    description: "Array of photo URLs",
    example: ["https://example.com/photo1.jpg"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @ApiProperty({
    description: "Whether the review has been flagged",
    example: false,
  })
  @IsBoolean()
  flagged: boolean;

  @ApiProperty({
    description: "Review creation date",
    example: "2024-01-15T10:30:00Z",
  })
  @IsDateString()
  createdAt: string;

  @ApiProperty({
    description: "Review last update date",
    example: "2024-01-15T10:30:00Z",
  })
  @IsDateString()
  updatedAt: string;

  @ApiPropertyOptional({
    description: "Professional response to the review",
  })
  @IsOptional()
  response?: any; // Avoid circular reference

  @ApiPropertyOptional({
    description: "Customer information",
  })
  @IsOptional()
  customer?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };

  @ApiPropertyOptional({
    description: "Professional information",
  })
  @IsOptional()
  professional?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export class ReviewResponseResponseDto {
  @ApiProperty({
    description: "Response ID",
    example: "response-123",
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: "Response comment",
    example: "Thank you for your feedback!",
  })
  @IsString()
  comment: string;

  @ApiProperty({
    description: "Response creation date",
    example: "2024-01-15T11:00:00Z",
  })
  @IsDateString()
  createdAt: string;

  @ApiProperty({
    description: "Response last update date",
    example: "2024-01-15T11:00:00Z",
  })
  @IsDateString()
  updatedAt: string;
}

export class ProfessionalRatingAggregateDto {
  @ApiProperty({
    description: "Professional ID",
    example: "professional-123",
  })
  @IsString()
  professionalId: string;

  @ApiProperty({
    description: "Average rating",
    example: 4.25,
  })
  @IsInt()
  avgRating: number;

  @ApiProperty({
    description: "Total number of reviews",
    example: 15,
  })
  @IsInt()
  totalReviews: number;

  @ApiProperty({
    description: "Weighted score considering recency and verification",
    example: 4.35,
  })
  @IsInt()
  weightedScore: number;

  @ApiProperty({
    description: "Last calculation date",
    example: "2024-01-15T00:00:00Z",
  })
  @IsDateString()
  lastCalculated: string;
}

// Zod schemas for validation
export const ReviewResponseSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  customerId: z.string(),
  professionalId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
  flagged: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  response: z
    .object({
      id: z.string(),
      comment: z.string(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    })
    .optional(),
  customer: z
    .object({
      id: z.string(),
      fullName: z.string(),
      avatarUrl: z.string().url().optional(),
    })
    .optional(),
  professional: z
    .object({
      id: z.string(),
      fullName: z.string(),
      avatarUrl: z.string().url().optional(),
    })
    .optional(),
});

export const ProfessionalRatingAggregateSchema = z.object({
  professionalId: z.string(),
  avgRating: z.number(),
  totalReviews: z.number().int().min(0),
  weightedScore: z.number(),
  lastCalculated: z.string().datetime(),
});
