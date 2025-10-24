import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "@/modules/auth/services/auth.service";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { OtpService } from "@/modules/auth/services/otp.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { UserType, LoginType } from "@/modules/auth/dto";

describe("AuthService", () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let otpService: OtpService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    professionalProfile: {
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockOtpService = {
    generateOtp: jest.fn(),
    verifyOtp: jest.fn(),
    sendOtpEmail: jest.fn(),
    sendOtpSms: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    otpService = module.get<OtpService>(OtpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    const registerDto = {
      email: "test@example.com",
      fullName: "Test User",
      password: "password123",
      userType: UserType.CUSTOMER,
      phone: "+8801712345678",
    };

    it("should register a new customer successfully", async () => {
      const mockUser = {
        id: "user-123",
        email: registerDto.email,
        fullName: registerDto.fullName,
        userType: registerDto.userType,
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      const mockRole = { id: "role-123", name: "CUSTOMER" };
      const mockTokens = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null); // No existing user
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.userRole.create.mockResolvedValue({});
      mockPrismaService.session.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue("access-token");
      mockConfigService.get.mockReturnValue("refresh-token");

      const result = await service.register(
        registerDto,
        "192.168.1.1",
        "Mozilla/5.0"
      );

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("user");
      expect(result.user.email).toBe(registerDto.email);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { name: "CUSTOMER" },
      });
    });

    it("should register a professional and create professional profile", async () => {
      const professionalDto = {
        ...registerDto,
        userType: UserType.PROFESSIONAL,
      };
      const mockUser = {
        id: "user-123",
        email: professionalDto.email,
        fullName: professionalDto.fullName,
        userType: professionalDto.userType,
        roles: [{ role: { name: "PROFESSIONAL" } }],
      };

      const mockRole = { id: "role-123", name: "PROFESSIONAL" };
      const mockTokens = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.userRole.create.mockResolvedValue({});
      mockPrismaService.professionalProfile.create.mockResolvedValue({});
      mockPrismaService.session.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue("access-token");
      mockConfigService.get.mockReturnValue("refresh-token");

      const result = await service.register(
        professionalDto,
        "192.168.1.1",
        "Mozilla/5.0"
      );

      expect(result.user.userType).toBe("PROFESSIONAL");
      expect(mockPrismaService.professionalProfile.create).toHaveBeenCalledWith(
        {
          data: {
            userId: mockUser.id,
            skills: [],
            categories: [],
          },
        }
      );
    });

    it("should throw ConflictException for duplicate email", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException
      );
    });

    it("should throw ConflictException for duplicate phone", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        phone: registerDto.phone,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe("login", () => {
    const loginDto = {
      email: "test@example.com",
      password: "password123",
      loginType: LoginType.PASSWORD,
    };

    it("should login with valid password", async () => {
      const mockUser = {
        id: "user-123",
        email: loginDto.email,
        password: "$2b$12$hashedpassword",
        isActive: true,
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      const mockTokens = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue("access-token");
      mockConfigService.get.mockReturnValue("refresh-token");

      // Mock bcrypt.compare
      const bcrypt = require("bcrypt");
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("user");
    });

    it("should throw UnauthorizedException for invalid password", async () => {
      const mockUser = {
        id: "user-123",
        email: loginDto.email,
        password: "$2b$12$hashedpassword",
        isActive: true,
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return false
      const bcrypt = require("bcrypt");
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should throw UnauthorizedException for inactive user", async () => {
      const mockUser = {
        id: "user-123",
        email: loginDto.email,
        password: "$2b$12$hashedpassword",
        isActive: false,
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should login with OTP", async () => {
      const otpLoginDto = {
        email: "test@example.com",
        otp: "123456",
        loginType: LoginType.OTP,
      };

      const mockUser = {
        id: "user-123",
        email: otpLoginDto.email,
        isActive: true,
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockOtpService.verifyOtp.mockResolvedValue(true);
      mockPrismaService.session.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue("access-token");
      mockConfigService.get.mockReturnValue("refresh-token");

      const result = await service.login(otpLoginDto);

      expect(result).toHaveProperty("accessToken");
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(
        otpLoginDto.email,
        otpLoginDto.otp,
        "login"
      );
    });
  });

  describe("sendOtp", () => {
    it("should send OTP via email", async () => {
      const otpDto = {
        email: "test@example.com",
        type: "login",
      };

      mockOtpService.generateOtp.mockResolvedValue("123456");
      mockOtpService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await service.sendOtp(otpDto);

      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("method", "email");
      expect(mockOtpService.generateOtp).toHaveBeenCalledWith(
        otpDto.email,
        otpDto.type
      );
      expect(mockOtpService.sendOtpEmail).toHaveBeenCalledWith(
        otpDto.email,
        "123456"
      );
    });

    it("should send OTP via SMS when phone provided", async () => {
      const otpDto = {
        email: "test@example.com",
        phone: "+8801712345678",
        type: "login",
      };

      mockOtpService.generateOtp.mockResolvedValue("123456");
      mockOtpService.sendOtpSms.mockResolvedValue(undefined);

      const result = await service.sendOtp(otpDto);

      expect(result.method).toBe("sms");
      expect(mockOtpService.sendOtpSms).toHaveBeenCalledWith(
        otpDto.phone,
        "123456"
      );
    });
  });

  describe("verifyOtp", () => {
    it("should verify OTP successfully", async () => {
      const otpDto = {
        email: "test@example.com",
        code: "123456",
        type: "login",
      };

      mockOtpService.verifyOtp.mockResolvedValue(true);

      const result = await service.verifyOtp(otpDto);

      expect(result).toHaveProperty("message", "OTP verified successfully");
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(
        otpDto.email,
        otpDto.code,
        otpDto.type
      );
    });

    it("should throw BadRequestException for invalid OTP", async () => {
      const otpDto = {
        email: "test@example.com",
        code: "123456",
        type: "login",
      };

      mockOtpService.verifyOtp.mockRejectedValue(
        new BadRequestException("Invalid OTP")
      );

      await expect(service.verifyOtp(otpDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("getMe", () => {
    it("should return current user profile", async () => {
      const userId = "user-123";
      const mockUser = {
        id: userId,
        email: "test@example.com",
        fullName: "Test User",
        phone: "+8801712345678",
        avatarUrl: "https://example.com/avatar.jpg",
        locationLat: 23.8103,
        locationLng: 90.4125,
        preferredLanguages: ["en"],
        isEmailVerified: true,
        isPhoneVerified: true,
        roles: [{ role: { name: "CUSTOMER" } }],
        professionalProfile: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe(userId);

      expect(result).toHaveProperty("id", userId);
      expect(result).toHaveProperty("email", mockUser.email);
      expect(result).toHaveProperty("fullName", mockUser.fullName);
      expect(result.roles).toEqual(["CUSTOMER"]);
    });

    it("should throw UnauthorizedException for non-existent user", async () => {
      const userId = "non-existent";

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe(userId)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
