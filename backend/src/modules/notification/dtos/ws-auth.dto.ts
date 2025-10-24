import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class WsAuthDto {
  @ApiProperty({
    description: "JWT access token for WebSocket authentication",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: "Session ID for tracking user sessions",
    example: "session-123",
  })
  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class WsConnectionData {
  userId: string;
  role: string;
  sessionId: string;
  socketId: string;
  connectedAt: Date;
}

export class WsEventPayload {
  event: string;
  data: any;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}






























