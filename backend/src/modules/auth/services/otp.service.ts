import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import * as bcrypt from "bcrypt";
import { randomInt } from "crypto";

@Injectable()
export class OtpService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_MINUTES = 1;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  async generateOtp(identifier: string, type: string): Promise<string> {
    // Check rate limiting
    await this.checkRateLimit(identifier, type);

    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 12);

    // Clean up old OTPs for this identifier
    await this.cleanupOldOtps(identifier, type);

    // Store OTP
    await this.prisma.oTP.create({
      data: {
        identifier,
        code: hashedOtp,
        type,
        expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000),
        attempts: 0,
      },
    });

    this.logger.log(`OTP generated for ${identifier} (${type})`, "OtpService");
    return otp;
  }

  async verifyOtp(
    identifier: string,
    code: string,
    type: string
  ): Promise<boolean> {
    const otpRecord = await this.prisma.oTP.findFirst({
      where: {
        identifier,
        type,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      throw new BadRequestException("Invalid or expired OTP");
    }

    // Check attempts
    if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
      await this.prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
      throw new BadRequestException("OTP attempts exceeded");
    }

    // Verify OTP
    const isValid = await bcrypt.compare(code, otpRecord.code);

    if (!isValid) {
      // Increment attempts
      await this.prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      throw new BadRequestException("Invalid OTP");
    }

    // Mark as used
    await this.prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    this.logger.log(`OTP verified for ${identifier} (${type})`, "OtpService");
    return true;
  }

  private async checkRateLimit(
    identifier: string,
    type: string
  ): Promise<void> {
    const recentOtp = await this.prisma.oTP.findFirst({
      where: {
        identifier,
        type,
        createdAt: {
          gte: new Date(Date.now() - this.RATE_LIMIT_MINUTES * 60 * 1000),
        },
      },
    });

    if (recentOtp) {
      throw new HttpException(
        "Please wait before requesting another OTP",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private async cleanupOldOtps(
    identifier: string,
    type: string
  ): Promise<void> {
    await this.prisma.oTP.deleteMany({
      where: {
        identifier,
        type,
        OR: [{ isUsed: true }, { expiresAt: { lt: new Date() } }],
      },
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    // TODO: Implement email service
    this.logger.log(`Sending OTP email to ${email}: ${otp}`, "OtpService");
    // In production, this would send an actual email
  }

  async sendOtpSms(phone: string, otp: string): Promise<void> {
    // TODO: Implement SMS service
    this.logger.log(`Sending OTP SMS to ${phone}: ${otp}`, "OtpService");
    // In production, this would send an actual SMS
  }
}
