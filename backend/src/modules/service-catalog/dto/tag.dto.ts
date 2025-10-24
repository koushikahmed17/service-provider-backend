import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export class CreateTagDto {
  @ApiProperty({ example: "Eco-Friendly" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: "eco-friendly" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  slug: string;
}

export class UpdateTagDto {
  @ApiPropertyOptional({ example: "Eco-Friendly Services" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: "eco-friendly-services" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  slug?: string;
}

// Zod schemas
export const CreateTagSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50),
});

export const UpdateTagSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  slug: z.string().min(2).max(50).optional(),
});
