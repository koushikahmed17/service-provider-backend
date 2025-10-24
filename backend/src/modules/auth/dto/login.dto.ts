import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export enum LoginType {
  PASSWORD = "PASSWORD",
  OTP = "OTP",
}

export class LoginDto {
  @ApiProperty({ example: "john@example.com or +8801712345678" })
  @IsString()
  @MinLength(1, { message: "Email or phone is required" })
  emailOrPhone: string;

  @ApiPropertyOptional({ example: "password123" })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: "123456" })
  @IsOptional()
  @IsString()
  otp?: string;

  @ApiProperty({ enum: LoginType, example: LoginType.PASSWORD })
  @IsEnum(LoginType)
  loginType: LoginType;

  @ApiPropertyOptional({ example: "Mozilla/5.0..." })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ example: "192.168.1.1" })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}

export class OtpSendDto {
  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "+8801712345678" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: "login" })
  @IsString()
  type: string; // 'login', 'email_verification', 'phone_verification', 'password_reset'
}

export class OtpVerifyDto {
  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "+8801712345678" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  code: string;

  @ApiProperty({ example: "login" })
  @IsString()
  type: string;
}

// Zod schemas
export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, "Email or phone is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  otp: z.string().optional(),
  loginType: z.enum(["PASSWORD", "OTP"]),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const otpSendSchema = z.object({
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  type: z.enum([
    "login",
    "email_verification",
    "phone_verification",
    "password_reset",
  ]),
});

export const otpVerifySchema = z.object({
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  code: z
    .string()
    .min(6, "OTP must be 6 digits")
    .max(6, "OTP must be 6 digits"),
  type: z.enum([
    "login",
    "email_verification",
    "phone_verification",
    "password_reset",
  ]),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type OtpSendSchema = z.infer<typeof otpSendSchema>;
export type OtpVerifySchema = z.infer<typeof otpVerifySchema>;
