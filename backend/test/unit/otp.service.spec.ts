import { Test, TestingModule } from "@nestjs/testing";
import { OtpService } from "@/modules/auth/services/otp.service";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { BadRequestException, HttpException } from "@nestjs/common";

describe("OtpService", () => {
  let service: OtpService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    oTP: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateOtp", () => {
    it("should generate and store OTP successfully", async () => {
      const identifier = "test@example.com";
      const type = "login";

      mockPrismaService.oTP.findFirst.mockResolvedValue(null); // No recent OTP
      mockPrismaService.oTP.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.oTP.create.mockResolvedValue({
        id: "otp-123",
        identifier,
        type,
        code: "hashed-otp",
        expiresAt: new Date(),
        attempts: 0,
        isUsed: false,
      });

      const result = await service.generateOtp(identifier, type);

      expect(result).toMatch(/^\d{6}$/); // 6-digit OTP
      expect(mockPrismaService.oTP.create).toHaveBeenCalledWith({
        data: {
          identifier,
          code: expect.any(String), // Hashed OTP
          type,
          expiresAt: expect.any(Date),
          attempts: 0,
        },
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `OTP generated for ${identifier} (${type})`,
        "OtpService"
      );
    });

    it("should throw TooManyRequestsException when rate limited", async () => {
      const identifier = "test@example.com";
      const type = "login";

      mockPrismaService.oTP.findFirst.mockResolvedValue({
        id: "recent-otp",
        createdAt: new Date(),
      });

      await expect(service.generateOtp(identifier, type)).rejects.toThrow(
        HttpException
      );
    });

    it("should clean up old OTPs before creating new one", async () => {
      const identifier = "test@example.com";
      const type = "login";

      mockPrismaService.oTP.findFirst.mockResolvedValue(null);
      mockPrismaService.oTP.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.oTP.create.mockResolvedValue({
        id: "otp-123",
        identifier,
        type,
        code: "hashed-otp",
        expiresAt: new Date(),
        attempts: 0,
        isUsed: false,
      });

      await service.generateOtp(identifier, type);

      expect(mockPrismaService.oTP.deleteMany).toHaveBeenCalledWith({
        where: {
          identifier,
          type,
          OR: [{ isUsed: true }, { expiresAt: { lt: expect.any(Date) } }],
        },
      });
    });
  });

  describe("verifyOtp", () => {
    it("should verify valid OTP successfully", async () => {
      const identifier = "test@example.com";
      const code = "123456";
      const type = "login";

      const mockOtpRecord = {
        id: "otp-123",
        identifier,
        type,
        code: "$2b$12$hashedcode", // bcrypt hash
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        attempts: 0,
        isUsed: false,
      };

      mockPrismaService.oTP.findFirst.mockResolvedValue(mockOtpRecord);
      mockPrismaService.oTP.update.mockResolvedValue({});

      // Mock bcrypt.compare to return true
      const bcrypt = require("bcrypt");
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

      const result = await service.verifyOtp(identifier, code, type);

      expect(result).toBe(true);
      expect(mockPrismaService.oTP.update).toHaveBeenCalledWith({
        where: { id: mockOtpRecord.id },
        data: { isUsed: true },
      });
    });

    it("should throw BadRequestException for invalid OTP", async () => {
      const identifier = "test@example.com";
      const code = "123456";
      const type = "login";

      const mockOtpRecord = {
        id: "otp-123",
        identifier,
        type,
        code: "$2b$12$hashedcode",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
        isUsed: false,
      };

      mockPrismaService.oTP.findFirst.mockResolvedValue(mockOtpRecord);
      mockPrismaService.oTP.update.mockResolvedValue({});

      // Mock bcrypt.compare to return false
      const bcrypt = require("bcrypt");
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false);

      await expect(service.verifyOtp(identifier, code, type)).rejects.toThrow(
        BadRequestException
      );

      expect(mockPrismaService.oTP.update).toHaveBeenCalledWith({
        where: { id: mockOtpRecord.id },
        data: { attempts: 1 },
      });
    });

    it("should throw BadRequestException for expired OTP", async () => {
      const identifier = "test@example.com";
      const code = "123456";
      const type = "login";

      mockPrismaService.oTP.findFirst.mockResolvedValue(null);

      await expect(service.verifyOtp(identifier, code, type)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw BadRequestException when attempts exceeded", async () => {
      const identifier = "test@example.com";
      const code = "123456";
      const type = "login";

      const mockOtpRecord = {
        id: "otp-123",
        identifier,
        type,
        code: "$2b$12$hashedcode",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 3, // Max attempts reached
        isUsed: false,
      };

      mockPrismaService.oTP.findFirst.mockResolvedValue(mockOtpRecord);
      mockPrismaService.oTP.update.mockResolvedValue({});

      await expect(service.verifyOtp(identifier, code, type)).rejects.toThrow(
        BadRequestException
      );

      expect(mockPrismaService.oTP.update).toHaveBeenCalledWith({
        where: { id: mockOtpRecord.id },
        data: { isUsed: true },
      });
    });
  });

  describe("sendOtpEmail", () => {
    it("should log email sending", async () => {
      const email = "test@example.com";
      const otp = "123456";

      await service.sendOtpEmail(email, otp);

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Sending OTP email to ${email}: ${otp}`,
        "OtpService"
      );
    });
  });

  describe("sendOtpSms", () => {
    it("should log SMS sending", async () => {
      const phone = "+8801712345678";
      const otp = "123456";

      await service.sendOtpSms(phone, otp);

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Sending OTP SMS to ${phone}: ${otp}`,
        "OtpService"
      );
    });
  });
});
