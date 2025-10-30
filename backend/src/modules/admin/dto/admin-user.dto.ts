import { IsOptional, IsString, IsEnum, IsArray } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export enum UserRole {
  ADMIN = "ADMIN",
  CUSTOMER = "CUSTOMER",
  PROFESSIONAL = "PROFESSIONAL",
}

export class GetUsersDto {
  @ApiPropertyOptional({ enum: UserRole, example: UserRole.CUSTOMER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsString()
  limit?: string;
}

export class UpdateUserRoleDto {
  @ApiPropertyOptional({ enum: UserRole, example: UserRole.PROFESSIONAL })
  @IsEnum(UserRole)
  role: UserRole;
}

// Zod schemas
export const getUsersSchema = z.object({
  role: z.enum(["ADMIN", "CUSTOMER", "PROFESSIONAL"]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "CUSTOMER", "PROFESSIONAL"]),
});

export type GetUsersSchema = z.infer<typeof getUsersSchema>;
export type UpdateUserRoleSchema = z.infer<typeof updateUserRoleSchema>;
































