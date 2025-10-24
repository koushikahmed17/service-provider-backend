import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  MinLength,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export enum UserType {
  CUSTOMER = "CUSTOMER",
  PROFESSIONAL = "PROFESSIONAL",
}

export class RegisterDto {
  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "+8801712345678" })
  @IsOptional()
  @IsString()
  @Matches(/^\+8801[3-9]\d{8}$/, { message: "Invalid Bangladesh phone number" })
  phone?: string;

  @ApiProperty({ example: "John Doe" })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiPropertyOptional({ example: "password123" })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ enum: UserType, example: UserType.CUSTOMER })
  @IsEnum(UserType)
  userType: UserType;

  @ApiPropertyOptional({ example: "1234567890123" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,17}$/, { message: "NID must be 10-17 digits" })
  nidNumber?: string;

  @ApiPropertyOptional({ example: "https://example.com/nid.jpg" })
  @IsOptional()
  @IsString()
  nidPhotoUrl?: string;

  @ApiPropertyOptional({ example: "https://example.com/avatar.jpg" })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

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
}

// Zod schema for validation
export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  phone: z
    .string()
    .regex(/^\+8801[3-9]\d{8}$/, "Invalid Bangladesh phone number")
    .optional(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  userType: z.enum(["CUSTOMER", "PROFESSIONAL"]),
  nidNumber: z
    .string()
    .regex(/^\d{10,17}$/, "NID must be 10-17 digits")
    .optional(),
  nidPhotoUrl: z.string().url("Invalid URL format").optional(),
  avatarUrl: z.string().url("Invalid URL format").optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  preferredLanguages: z.array(z.string()).default(["en"]),
});

export type RegisterSchema = z.infer<typeof registerSchema>;































