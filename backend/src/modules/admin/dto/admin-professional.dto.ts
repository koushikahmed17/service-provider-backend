import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsBoolean,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export enum ProfessionalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  SUSPENDED = "SUSPENDED",
}

export class CreateProfessionalDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "+8801712345678" })
  @IsString()
  phone: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: "1234567890" })
  @IsOptional()
  @IsString()
  nidNumber?: string;

  @ApiPropertyOptional({ example: "House 10, Road 5, Mirpur, Dhaka" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "Male" })
  @IsOptional()
  @IsEnum(["Male", "Female", "Other"])
  gender?: string;

  @ApiPropertyOptional({ example: "1990-01-01" })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  // Professional Profile Fields
  @ApiProperty({ example: "Experienced electrician with 5+ years" })
  @IsString()
  @MaxLength(1000)
  bio: string;

  @ApiProperty({ example: ["Electrical", "Home Repair", "Maintenance"] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  hourlyRateBDT: number;

  @ApiPropertyOptional({ example: "Available 9 AM - 6 PM" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  availability?: string;

  @ApiPropertyOptional({ example: "Dhaka" })
  @IsOptional()
  @IsString()
  serviceArea?: string;

  @ApiPropertyOptional({
    example: "I have 5 years of experience in electrical work",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  experience?: string;

  @ApiPropertyOptional({ example: "Bachelor in Electrical Engineering" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  education?: string;

  @ApiPropertyOptional({ example: ["Certificate A", "License B"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ example: "https://example.com/portfolio" })
  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: "https://example.com/linkedin" })
  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ example: "Admin created account" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}

export class UpdateProfessionalDto {
  @ApiPropertyOptional({ example: "John Doe Updated" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: "john.updated@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "+8801712345679" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "1234567890" })
  @IsOptional()
  @IsString()
  nidNumber?: string;

  @ApiPropertyOptional({ example: "House 20, Road 10, Mirpur, Dhaka" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "Male" })
  @IsOptional()
  @IsEnum(["Male", "Female", "Other"])
  gender?: string;

  @ApiPropertyOptional({ example: "1990-01-01" })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  // Professional Profile Fields
  @ApiPropertyOptional({ example: "Updated bio with more experience" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({
    example: ["Electrical", "Home Repair", "Maintenance", "Plumbing"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRateBDT?: number;

  @ApiPropertyOptional({ example: "Available 8 AM - 7 PM" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  availability?: string;

  @ApiPropertyOptional({ example: "Dhaka, Chittagong" })
  @IsOptional()
  @IsString()
  serviceArea?: string;

  @ApiPropertyOptional({
    example: "I have 7 years of experience in electrical work",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  experience?: string;

  @ApiPropertyOptional({ example: "Master in Electrical Engineering" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  education?: string;

  @ApiPropertyOptional({
    example: ["Certificate A", "License B", "Certificate C"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ example: "https://example.com/portfolio-updated" })
  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: "https://example.com/linkedin-updated" })
  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ example: "Updated by admin" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}

export class GetProfessionalsDto {
  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ example: "John" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: "APPROVED" })
  @IsOptional()
  @IsEnum(ProfessionalStatus)
  status?: ProfessionalStatus;

  @ApiPropertyOptional({ example: "Electrical" })
  @IsOptional()
  @IsString()
  skill?: string;

  @ApiPropertyOptional({ example: "Dhaka" })
  @IsOptional()
  @IsString()
  serviceArea?: string;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  isVerified?: string;

  @ApiPropertyOptional({ example: "createdAt" })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({ example: "desc" })
  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "desc";
}

export class ProfessionalResponseDto {
  @ApiProperty({ example: "prof-123" })
  id: string;

  @ApiProperty({ example: "John Doe" })
  fullName: string;

  @ApiProperty({ example: "john.doe@example.com" })
  email: string;

  @ApiProperty({ example: "+8801712345678" })
  phone: string;

  @ApiPropertyOptional({ example: "1234567890" })
  nidNumber?: string;

  @ApiPropertyOptional({ example: "House 10, Road 5, Mirpur, Dhaka" })
  address?: string;

  @ApiPropertyOptional({ example: "Male" })
  gender?: string;

  @ApiPropertyOptional({ example: "1990-01-01" })
  dateOfBirth?: string;

  @ApiProperty({ example: "APPROVED" })
  status: ProfessionalStatus;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: "2024-01-15T10:30:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2024-01-15T10:30:00.000Z" })
  updatedAt: Date;

  // Professional Profile
  @ApiProperty({ example: "prof-profile-123" })
  professionalProfileId: string;

  @ApiProperty({ example: "Experienced electrician with 5+ years" })
  bio: string;

  @ApiProperty({ example: ["Electrical", "Home Repair"] })
  skills: string[];

  @ApiProperty({ example: 500 })
  hourlyRateBDT: number;

  @ApiPropertyOptional({ example: "Available 9 AM - 6 PM" })
  availability?: string;

  @ApiPropertyOptional({ example: "Dhaka" })
  serviceArea?: string;

  @ApiPropertyOptional({ example: "I have 5 years of experience" })
  experience?: string;

  @ApiPropertyOptional({ example: "Bachelor in Electrical Engineering" })
  education?: string;

  @ApiPropertyOptional({ example: ["Certificate A", "License B"] })
  certifications?: string[];

  @ApiPropertyOptional({ example: "https://example.com/portfolio" })
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: "https://example.com/linkedin" })
  linkedinUrl?: string;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiPropertyOptional({ example: "Admin created account" })
  adminNotes?: string;

  // Statistics
  @ApiProperty({ example: 25 })
  totalBookings: number;

  @ApiProperty({ example: 4.8 })
  averageRating: number;

  @ApiProperty({ example: 15000 })
  totalEarnings: number;
}

export class ApproveProfessionalDto {
  @ApiPropertyOptional({ example: "Professional approved after verification" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}

export class RejectProfessionalDto {
  @ApiProperty({ example: "Incomplete documentation" })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ example: "Please provide additional documents" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}

export class SuspendProfessionalDto {
  @ApiProperty({ example: "Violation of terms of service" })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ example: "Suspended for 30 days" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}







