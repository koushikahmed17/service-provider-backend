import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsBoolean,
  MinLength,
  Matches,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "John Doe Updated" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiPropertyOptional({ example: "+8801712345678" })
  @IsOptional()
  @IsString()
  @Matches(/^\+8801[3-9]\d{8}$/, { message: "Invalid Bangladesh phone number" })
  phone?: string;

  @ApiPropertyOptional({ example: "https://example.com/avatar.jpg" })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: "https://example.com/nid-front.jpg" })
  @IsOptional()
  @IsString()
  nidImageFront?: string;

  @ApiPropertyOptional({ example: "https://example.com/nid-back.jpg" })
  @IsOptional()
  @IsString()
  nidImageBack?: string;

  @ApiPropertyOptional({ example: 23.8103 })
  @IsOptional()
  @IsNumber()
  locationLat?: number;

  @ApiPropertyOptional({ example: 90.4125 })
  @IsOptional()
  @IsNumber()
  locationLng?: number;

  @ApiPropertyOptional({ example: ["en", "bn"], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLanguages?: string[];

  // Professional profile fields
  @ApiPropertyOptional({ example: ["Plumbing", "Electrical"], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    example: ["Home Repair", "Maintenance"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ example: 500.0 })
  @IsOptional()
  @IsNumber()
  hourlyRateBDT?: number;

  @ApiPropertyOptional({
    example: [{ service: "House Cleaning", rate: 2000 }],
    description: "Array of fixed rate services",
  })
  @IsOptional()
  fixedRates?: Array<{ service: string; rate: number }>;

  @ApiPropertyOptional({
    example: [{ day: "Monday", startTime: "09:00", endTime: "17:00" }],
    description: "Availability windows",
  })
  @IsOptional()
  availability?: Array<{ day: string; startTime: string; endTime: string }>;

  @ApiPropertyOptional({ example: "Experienced professional with 5+ years..." })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  experience?: number;
}

export class UpdateProfessionalProfileDto {
  @ApiPropertyOptional({ example: ["Plumbing", "Electrical"], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    example: ["Home Repair", "Maintenance"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ example: 500.0 })
  @IsOptional()
  @IsNumber()
  hourlyRateBDT?: number;

  @ApiPropertyOptional({
    example: [{ service: "House Cleaning", rate: 2000 }],
    description: "Array of fixed rate services",
  })
  @IsOptional()
  fixedRates?: Array<{ service: string; rate: number }>;

  @ApiPropertyOptional({
    example: [{ day: "Monday", startTime: "09:00", endTime: "17:00" }],
    description: "Availability windows",
  })
  @IsOptional()
  availability?: Array<{ day: string; startTime: string; endTime: string }>;

  @ApiPropertyOptional({ example: "Experienced professional with 5+ years..." })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  experience?: number;
}

// Zod schemas
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .optional(),
  phone: z
    .string()
    .regex(/^\+8801[3-9]\d{8}$/, "Invalid Bangladesh phone number")
    .optional(),
  avatarUrl: z.string().url("Invalid URL format").optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  preferredLanguages: z.array(z.string()).optional(),
});

export const updateProfessionalProfileSchema = z.object({
  skills: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  hourlyRateBDT: z.number().positive("Hourly rate must be positive").optional(),
  fixedRates: z
    .array(
      z.object({
        service: z.string(),
        rate: z.number().positive("Rate must be positive"),
      })
    )
    .optional(),
  availability: z
    .array(
      z.object({
        day: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      })
    )
    .optional(),
  bio: z.string().optional(),
  experience: z
    .number()
    .int()
    .min(0, "Experience cannot be negative")
    .optional(),
});

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
export type UpdateProfessionalProfileSchema = z.infer<
  typeof updateProfessionalProfileSchema
>;
