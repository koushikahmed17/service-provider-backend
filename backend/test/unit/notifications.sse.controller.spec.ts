import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsSseController } from "@/modules/notification/controllers/notifications.sse.controller";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { PresenceService } from "@/modules/notification/services/presence.service";

describe("NotificationsSseController", () => {
  let controller: NotificationsSseController;
  let jwtService: JwtService;
  let configService: ConfigService;
  let notificationService: NotificationService;
  let presenceService: PresenceService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockNotificationService = {
    setServer: jest.fn(),
  };

  const mockPresenceService = {
    getOnlineUsers: jest.fn(),
  };

  const mockResponse = {
    setHeader: jest.fn(),
    write: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    on: jest.fn(),
  };

  const mockRequest = {
    headers: {},
    query: {},
    on: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsSseController],
      providers: [
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: PresenceService,
          useValue: mockPresenceService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsSseController>(
      NotificationsSseController
    );
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    notificationService = module.get<NotificationService>(NotificationService);
    presenceService = module.get<PresenceService>(PresenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("sse", () => {
    it("should establish SSE connection with valid JWT token", async () => {
      const mockPayload = {
        sub: "user-123",
        role: "CUSTOMER",
      };

      mockRequest.headers = { authorization: "Bearer valid-token" };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockConfigService.get.mockReturnValue("test-secret");

      await controller.sse(mockResponse as any, mockRequest as any);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/event-stream"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-cache"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Connection",
        "keep-alive"
      );
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining("event: connected")
      );
    });

    it("should reject connection without JWT token", async () => {
      mockRequest.headers = {};
      mockRequest.query = {};

      await controller.sse(mockResponse as any, mockRequest as any);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Authentication failed",
      });
    });

    it("should reject connection with invalid JWT token", async () => {
      mockRequest.headers = { authorization: "Bearer invalid-token" };
      mockJwtService.verifyAsync.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue("test-secret");

      await controller.sse(mockResponse as any, mockRequest as any);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Authentication failed",
      });
    });

    it("should extract token from Authorization header", async () => {
      const mockPayload = { sub: "user-123", role: "CUSTOMER" };
      mockRequest.headers = { authorization: "Bearer valid-token" };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockConfigService.get.mockReturnValue("test-secret");

      await controller.sse(mockResponse as any, mockRequest as any);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith("valid-token", {
        secret: "test-secret",
      });
    });

    it("should extract token from query parameter", async () => {
      const mockPayload = { sub: "user-123", role: "CUSTOMER" };
      mockRequest.query = { token: "valid-token" };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockConfigService.get.mockReturnValue("test-secret");

      await controller.sse(mockResponse as any, mockRequest as any);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith("valid-token", {
        secret: "test-secret",
      });
    });
  });

  describe("testSse", () => {
    it("should establish test SSE connection without authentication", async () => {
      await controller.testSse(mockResponse as any);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/event-stream"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-cache"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Connection",
        "keep-alive"
      );
    });
  });

  describe("sendNotificationToClient", () => {
    it("should send notification to specific client", () => {
      const mockClient = {
        id: "client-123",
        userId: "user-123",
        response: mockResponse,
        lastPing: new Date(),
      };

      // Add client to internal map (simulating connection)
      (controller as any).sseClients.set("client-123", mockClient);

      controller.sendNotificationToClient("user-123", "test.event", {
        message: "Test",
      });

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining("event: test.event")
      );
    });

    it("should not send notification to non-existent client", () => {
      const writeSpy = jest.spyOn(mockResponse, "write");

      controller.sendNotificationToClient("non-existent-user", "test.event", {
        message: "Test",
      });

      expect(writeSpy).not.toHaveBeenCalled();
    });
  });

  describe("broadcastToAllClients", () => {
    it("should broadcast to all connected clients", () => {
      const mockClient1 = {
        id: "client-1",
        userId: "user-1",
        response: mockResponse,
        lastPing: new Date(),
      };
      const mockClient2 = {
        id: "client-2",
        userId: "user-2",
        response: mockResponse,
        lastPing: new Date(),
      };

      // Add clients to internal map
      (controller as any).sseClients.set("client-1", mockClient1);
      (controller as any).sseClients.set("client-2", mockClient2);

      controller.broadcastToAllClients("test.event", { message: "Broadcast" });

      expect(mockResponse.write).toHaveBeenCalledTimes(2);
    });
  });

  describe("broadcastToRole", () => {
    it("should broadcast to clients with specific role", () => {
      const mockClient = {
        id: "client-123",
        userId: "user-123",
        role: "CUSTOMER",
        response: mockResponse,
        lastPing: new Date(),
      };

      (controller as any).sseClients.set("client-123", mockClient);

      controller.broadcastToRole("CUSTOMER", "test.event", {
        message: "Role broadcast",
      });

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining("event: test.event")
      );
    });

    it("should not broadcast to clients with different role", () => {
      const mockClient = {
        id: "client-123",
        userId: "user-123",
        role: "PROFESSIONAL",
        response: mockResponse,
        lastPing: new Date(),
      };

      (controller as any).sseClients.set("client-123", mockClient);

      const writeSpy = jest.spyOn(mockResponse, "write");

      controller.broadcastToRole("CUSTOMER", "test.event", {
        message: "Role broadcast",
      });

      expect(writeSpy).not.toHaveBeenCalled();
    });
  });

  describe("getSSEStats", () => {
    it("should return SSE client statistics", () => {
      const mockClient1 = {
        id: "client-1",
        userId: "user-1",
        role: "CUSTOMER",
        response: mockResponse,
        lastPing: new Date(),
      };
      const mockClient2 = {
        id: "client-2",
        userId: "user-2",
        role: "PROFESSIONAL",
        response: mockResponse,
        lastPing: new Date(),
      };

      (controller as any).sseClients.set("client-1", mockClient1);
      (controller as any).sseClients.set("client-2", mockClient2);

      const stats = controller.getSSEStats();

      expect(stats.totalClients).toBe(2);
      expect(stats.clientsByRole.CUSTOMER).toBe(1);
      expect(stats.clientsByRole.PROFESSIONAL).toBe(1);
      expect(stats.clientsByUser["user-1"]).toBe(1);
      expect(stats.clientsByUser["user-2"]).toBe(1);
    });

    it("should return empty stats when no clients connected", () => {
      const stats = controller.getSSEStats();

      expect(stats.totalClients).toBe(0);
      expect(stats.clientsByRole).toEqual({});
      expect(stats.clientsByUser).toEqual({});
    });
  });

  describe("sendSSEMessage", () => {
    it("should format SSE message correctly", () => {
      const mockResponse = {
        write: jest.fn(),
      };

      (controller as any).sendSSEMessage(mockResponse, "test.event", {
        message: "Test",
      });

      expect(mockResponse.write).toHaveBeenCalledWith(
        'event: test.event\ndata: {"message":"Test"}\n\n'
      );
    });

    it("should handle write errors gracefully", () => {
      const mockResponse = {
        write: jest.fn().mockImplementation(() => {
          throw new Error("Write failed");
        }),
      };

      // Should not throw error
      expect(() => {
        (controller as any).sendSSEMessage(mockResponse, "test.event", {
          message: "Test",
        });
      }).not.toThrow();
    });
  });
});
