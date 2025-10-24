import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/core/prisma.service";
import { NotificationService } from "../../notification/services/notification.service";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";
import { AuthResponseDto } from "../dto/auth-response.dto";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService
  ) {}

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: registerDto.email }, { phone: registerDto.phone }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        "User with this email or phone already exists"
      );
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (registerDto.password) {
      hashedPassword = await bcrypt.hash(registerDto.password, 10);
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        fullName: registerDto.fullName,
        phone: registerDto.phone,
        password: hashedPassword,
        nidNumber: registerDto.nidNumber,
        avatarUrl: registerDto.avatarUrl,
        locationLat: registerDto.locationLat,
        locationLng: registerDto.locationLng,
        preferredLanguages: registerDto.preferredLanguages || ["en"],
        isActive: true,
        isEmailVerified: false,
        isPhoneVerified: false,
      },
    });

    // Assign role based on userType
    const role = await this.prisma.role.findUnique({
      where: { name: registerDto.userType },
    });

    if (role) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    // Create professional profile and send notification if professional account is created
    if (registerDto.userType === "PROFESSIONAL") {
      // Create professional profile
      await this.prisma.professionalProfile.create({
        data: {
          userId: user.id,
          skills: [],
          categories: [],
        },
      });

      // Send notification to admins
      try {
        await this.notificationService.emitToRole(
          "ADMIN",
          "professional.created",
          {
            title: "New Professional Account Created",
            message: `A new professional account has been created for ${user.fullName} (${user.email})`,
            data: {
              userId: user.id,
              fullName: user.fullName,
              email: user.email,
              phone: user.phone,
              nidNumber: registerDto.nidNumber,
              createdAt: user.createdAt,
            },
          }
        );
      } catch (error) {
        // Log error but don't fail registration
        console.error(
          "Failed to send professional creation notification:",
          error
        );
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, registerDto.userType);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600,
      tokenType: "Bearer",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        userType: registerDto.userType,
        roles: [registerDto.userType],
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { emailOrPhone, password, loginType } = loginDto;

    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    // Validate based on login type
    if (loginType === "PASSWORD") {
      if (!password) {
        throw new BadRequestException(
          "Password is required for password login"
        );
      }

      if (!user.password) {
        throw new UnauthorizedException("Password not set for this account");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid credentials");
      }
    } else if (loginType === "OTP") {
      // OTP validation would go here
      // For now, we'll skip OTP validation
      throw new BadRequestException("OTP login not implemented yet");
    }

    // Get user roles
    const userRoles = user.roles.map((ur) => ur.role.name);
    const primaryRole = userRoles[0] || "CUSTOMER";

    // Generate tokens
    const tokens = await this.generateTokens(user.id, primaryRole);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600,
      tokenType: "Bearer",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        userType: primaryRole,
        roles: userRoles,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get("jwt.refreshSecret"),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      const userRoles = user.roles.map((ur) => ur.role.name);
      const primaryRole = userRoles[0] || "CUSTOMER";

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, primaryRole);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 3600,
        tokenType: "Bearer",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          userType: primaryRole,
          roles: userRoles,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          avatarUrl: user.avatarUrl,
        },
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(userId: string): Promise<void> {
    // In a real implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Remove the session from the database
    // 3. Clear any cached user data

    // For now, we'll just log the logout
    console.log(`User ${userId} logged out`);
  }

  async sendOtp(otpDto: any): Promise<{ message: string }> {
    // This would integrate with the OtpService
    // For now, return a mock response
    return { message: "OTP sent successfully" };
  }

  async verifyOtp(otpDto: any): Promise<{ message: string }> {
    // This would integrate with the OtpService
    // For now, return a mock response
    return { message: "OTP verified successfully" };
  }

  async getMe(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        professionalProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const userRoles = user.roles.map((ur) => ur.role.name);
    const primaryRole = userRoles[0] || "CUSTOMER";

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      userType: primaryRole,
      roles: userRoles,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      avatarUrl: user.avatarUrl,
      locationLat: user.locationLat,
      locationLng: user.locationLng,
      preferredLanguages: user.preferredLanguages,
      professionalProfile: user.professionalProfile,
      nidImageFront: user.nidImageFront,
      nidImageBack: user.nidImageBack,
      isNidVerified: user.isNidVerified,
    };
  }

  private async generateTokens(userId: string, userType: string) {
    const payload = {
      sub: userId,
      userType: userType,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get("jwt.secret"),
        expiresIn: "1h",
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get("jwt.refreshSecret"),
        expiresIn: "7d",
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
