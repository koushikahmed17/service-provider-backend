import { IsOptional, IsString, IsNumber, IsArray } from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateProfileFormDto {
  @ApiPropertyOptional({ example: "John Doe Updated" })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: "+8801712345678" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "https://example.com/avatar.jpg" })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: "23.8103" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLat?: number;

  @ApiPropertyOptional({ example: "90.4125" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLng?: number;

  @ApiPropertyOptional({ example: '["en", "bn"]' })
  @IsOptional()
  @Transform(({ value }) => (value ? JSON.parse(value) : undefined))
  @IsArray()
  @IsString({ each: true })
  preferredLanguages?: string[];

  // Professional profile fields
  @ApiPropertyOptional({ example: '["Plumbing", "Electrical"]' })
  @IsOptional()
  @Transform(({ value }) => (value ? JSON.parse(value) : undefined))
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: '["Home Repair", "Maintenance"]' })
  @IsOptional()
  @Transform(({ value }) => (value ? JSON.parse(value) : undefined))
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ example: "500.0" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hourlyRateBDT?: number;

  @ApiPropertyOptional({
    example: '[{"service": "House Cleaning", "rate": 2000}]',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? JSON.parse(value) : undefined))
  @IsArray()
  fixedRates?: Array<{ service: string; rate: number }>;

  @ApiPropertyOptional({
    example: '[{"day": "Monday", "startTime": "09:00", "endTime": "17:00"}]',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? JSON.parse(value) : undefined))
  @IsArray()
  availability?: Array<{ day: string; startTime: string; endTime: string }>;

  @ApiPropertyOptional({ example: "Experienced professional with 5+ years..." })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: "5" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  experience?: number;
}
