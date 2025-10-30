import { Injectable, Logger } from "@nestjs/common";
import { Socket } from "socket.io";

interface UserSession {
  socketId: string;
  userId: string;
  role: string;
  sessionId: string;
  connectedAt: Date;
  lastSeen: Date;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  // Map<userId, Set<socketId>>
  private userSockets = new Map<string, Set<string>>();

  // Map<socketId, UserSession>
  private socketSessions = new Map<string, UserSession>();

  // Map<role, Set<socketId>>
  private roleSockets = new Map<string, Set<string>>();

  addUser(
    socket: Socket,
    userId: string,
    role: string,
    sessionId: string
  ): void {
    const socketId = socket.id;
    const now = new Date();

    const session: UserSession = {
      socketId,
      userId,
      role,
      sessionId,
      connectedAt: now,
      lastSeen: now,
    };

    // Add to user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);

    // Add to role sockets
    if (!this.roleSockets.has(role)) {
      this.roleSockets.set(role, new Set());
    }
    this.roleSockets.get(role)!.add(socketId);

    // Store session
    this.socketSessions.set(socketId, session);

    this.logger.log(
      `User ${userId} (${role}) connected with socket ${socketId}`
    );
  }

  removeUser(socket: Socket): void {
    const socketId = socket.id;
    const session = this.socketSessions.get(socketId);

    if (!session) {
      return;
    }

    const { userId, role } = session;

    // Remove from user sockets
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Remove from role sockets
    const roleSocketSet = this.roleSockets.get(role);
    if (roleSocketSet) {
      roleSocketSet.delete(socketId);
      if (roleSocketSet.size === 0) {
        this.roleSockets.delete(role);
      }
    }

    // Remove session
    this.socketSessions.delete(socketId);

    this.logger.log(
      `User ${userId} (${role}) disconnected from socket ${socketId}`
    );
  }

  isOnline(userId: string): boolean {
    const userSockets = this.userSockets.get(userId);
    return userSockets ? userSockets.size > 0 : false;
  }

  getUserSockets(userId: string): string[] {
    const userSockets = this.userSockets.get(userId);
    return userSockets ? Array.from(userSockets) : [];
  }

  getRoleSockets(role: string): string[] {
    const roleSockets = this.roleSockets.get(role);
    return roleSockets ? Array.from(roleSockets) : [];
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  getOnlineUsersByRole(role: string): string[] {
    const roleSockets = this.roleSockets.get(role);
    if (!roleSockets) return [];

    const users: string[] = [];
    for (const socketId of roleSockets) {
      const session = this.socketSessions.get(socketId);
      if (session) {
        users.push(session.userId);
      }
    }
    return [...new Set(users)]; // Remove duplicates
  }

  getSession(socketId: string): UserSession | undefined {
    return this.socketSessions.get(socketId);
  }

  updateLastSeen(socketId: string): void {
    const session = this.socketSessions.get(socketId);
    if (session) {
      session.lastSeen = new Date();
    }
  }

  getPresenceStats(): {
    totalUsers: number;
    totalSockets: number;
    usersByRole: Record<string, number>;
  } {
    const usersByRole: Record<string, number> = {};

    for (const [role, sockets] of this.roleSockets.entries()) {
      usersByRole[role] = sockets.size;
    }

    return {
      totalUsers: this.userSockets.size,
      totalSockets: this.socketSessions.size,
      usersByRole,
    };
  }

  // Clean up inactive sessions (older than 1 hour)
  cleanupInactiveSessions(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const inactiveSockets: string[] = [];

    for (const [socketId, session] of this.socketSessions.entries()) {
      if (session.lastSeen < oneHourAgo) {
        inactiveSockets.push(socketId);
      }
    }

    for (const socketId of inactiveSockets) {
      const session = this.socketSessions.get(socketId);
      if (session) {
        this.removeUser({ id: socketId } as Socket);
      }
    }

    if (inactiveSockets.length > 0) {
      this.logger.log(`Cleaned up ${inactiveSockets.length} inactive sessions`);
    }
  }
}































