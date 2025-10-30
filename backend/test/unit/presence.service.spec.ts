import { Test, TestingModule } from "@nestjs/testing";
import { PresenceService } from "@/modules/notification/services/presence.service";
import { Socket } from "socket.io";

describe("PresenceService", () => {
  let service: PresenceService;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PresenceService],
    }).compile();

    service = module.get<PresenceService>(PresenceService);

    mockSocket = {
      id: "socket-123",
    };
  });

  afterEach(() => {
    // Clean up any test data
    jest.clearAllMocks();
  });

  describe("addUser", () => {
    it("should add user to presence tracking", () => {
      const userId = "user-123";
      const role = "CUSTOMER";
      const sessionId = "session-123";

      service.addUser(mockSocket as Socket, userId, role, sessionId);

      expect(service.isOnline(userId)).toBe(true);
      expect(service.getUserSockets(userId)).toEqual(["socket-123"]);
      expect(service.getRoleSockets(role)).toEqual(["socket-123"]);
    });

    it("should handle multiple sockets for same user", () => {
      const userId = "user-123";
      const role = "CUSTOMER";
      const sessionId1 = "session-123";
      const sessionId2 = "session-456";

      const mockSocket2 = { id: "socket-456" } as Socket;

      service.addUser(mockSocket as Socket, userId, role, sessionId1);
      service.addUser(mockSocket2, userId, role, sessionId2);

      expect(service.isOnline(userId)).toBe(true);
      expect(service.getUserSockets(userId)).toEqual([
        "socket-123",
        "socket-456",
      ]);
      expect(service.getRoleSockets(role)).toEqual([
        "socket-123",
        "socket-456",
      ]);
    });
  });

  describe("removeUser", () => {
    it("should remove user from presence tracking", () => {
      const userId = "user-123";
      const role = "CUSTOMER";
      const sessionId = "session-123";

      service.addUser(mockSocket as Socket, userId, role, sessionId);
      expect(service.isOnline(userId)).toBe(true);

      service.removeUser(mockSocket as Socket);
      expect(service.isOnline(userId)).toBe(false);
      expect(service.getUserSockets(userId)).toEqual([]);
    });

    it("should handle removal of non-existent user gracefully", () => {
      const mockSocket2 = { id: "socket-999" } as Socket;

      // Should not throw error
      expect(() => service.removeUser(mockSocket2)).not.toThrow();
    });
  });

  describe("isOnline", () => {
    it("should return true for online user", () => {
      const userId = "user-123";
      const role = "CUSTOMER";
      const sessionId = "session-123";

      service.addUser(mockSocket as Socket, userId, role, sessionId);
      expect(service.isOnline(userId)).toBe(true);
    });

    it("should return false for offline user", () => {
      expect(service.isOnline("non-existent-user")).toBe(false);
    });
  });

  describe("getUserSockets", () => {
    it("should return socket IDs for user", () => {
      const userId = "user-123";
      const role = "CUSTOMER";
      const sessionId = "session-123";

      service.addUser(mockSocket as Socket, userId, role, sessionId);
      expect(service.getUserSockets(userId)).toEqual(["socket-123"]);
    });

    it("should return empty array for non-existent user", () => {
      expect(service.getUserSockets("non-existent-user")).toEqual([]);
    });
  });

  describe("getRoleSockets", () => {
    it("should return socket IDs for role", () => {
      const userId1 = "user-123";
      const userId2 = "user-456";
      const role = "CUSTOMER";
      const sessionId1 = "session-123";
      const sessionId2 = "session-456";

      const mockSocket2 = { id: "socket-456" } as Socket;

      service.addUser(mockSocket as Socket, userId1, role, sessionId1);
      service.addUser(mockSocket2, userId2, role, sessionId2);

      expect(service.getRoleSockets(role)).toEqual([
        "socket-123",
        "socket-456",
      ]);
    });

    it("should return empty array for non-existent role", () => {
      expect(service.getRoleSockets("NON_EXISTENT_ROLE")).toEqual([]);
    });
  });

  describe("getOnlineUsers", () => {
    it("should return all online user IDs", () => {
      const userId1 = "user-123";
      const userId2 = "user-456";
      const role = "CUSTOMER";
      const sessionId1 = "session-123";
      const sessionId2 = "session-456";

      const mockSocket2 = { id: "socket-456" } as Socket;

      service.addUser(mockSocket as Socket, userId1, role, sessionId1);
      service.addUser(mockSocket2, userId2, role, sessionId2);

      const onlineUsers = service.getOnlineUsers();
      expect(onlineUsers).toContain(userId1);
      expect(onlineUsers).toContain(userId2);
      expect(onlineUsers).toHaveLength(2);
    });
  });

  describe("getOnlineUsersByRole", () => {
    it("should return online users for specific role", () => {
      const customerId = "customer-123";
      const professionalId = "professional-456";
      const customerRole = "CUSTOMER";
      const professionalRole = "PROFESSIONAL";
      const sessionId1 = "session-123";
      const sessionId2 = "session-456";

      const mockSocket2 = { id: "socket-456" } as Socket;

      service.addUser(
        mockSocket as Socket,
        customerId,
        customerRole,
        sessionId1
      );
      service.addUser(
        mockSocket2,
        professionalId,
        professionalRole,
        sessionId2
      );

      expect(service.getOnlineUsersByRole(customerRole)).toEqual([customerId]);
      expect(service.getOnlineUsersByRole(professionalRole)).toEqual([
        professionalId,
      ]);
    });
  });

  describe("getPresenceStats", () => {
    it("should return presence statistics", () => {
      const userId1 = "user-123";
      const userId2 = "user-456";
      const role1 = "CUSTOMER";
      const role2 = "PROFESSIONAL";
      const sessionId1 = "session-123";
      const sessionId2 = "session-456";

      const mockSocket2 = { id: "socket-456" } as Socket;

      service.addUser(mockSocket as Socket, userId1, role1, sessionId1);
      service.addUser(mockSocket2, userId2, role2, sessionId2);

      const stats = service.getPresenceStats();

      expect(stats.totalUsers).toBe(2);
      expect(stats.totalSockets).toBe(2);
      expect(stats.usersByRole).toEqual({
        CUSTOMER: 1,
        PROFESSIONAL: 1,
      });
    });
  });

  describe("updateLastSeen", () => {
    it("should update last seen timestamp", () => {
      const userId = "user-123";
      const role = "CUSTOMER";
      const sessionId = "session-123";

      service.addUser(mockSocket as Socket, userId, role, sessionId);

      const session = service.getSession("socket-123");
      expect(session).toBeDefined();
      expect(session?.lastSeen).toBeDefined();

      const originalLastSeen = session?.lastSeen;

      // Wait a bit and update
      setTimeout(() => {
        service.updateLastSeen("socket-123");
        const updatedSession = service.getSession("socket-123");
        expect(updatedSession?.lastSeen).not.toEqual(originalLastSeen);
      }, 10);
    });
  });

  describe("cleanupInactiveSessions", () => {
    it("should clean up inactive sessions", () => {
      const userId = "user-123";
      const role = "CUSTOMER";
      const sessionId = "session-123";

      service.addUser(mockSocket as Socket, userId, role, sessionId);
      expect(service.isOnline(userId)).toBe(true);

      // Mock an old session
      const session = service.getSession("socket-123");
      if (session) {
        session.lastSeen = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      }

      service.cleanupInactiveSessions();
      expect(service.isOnline(userId)).toBe(false);
    });
  });
});































