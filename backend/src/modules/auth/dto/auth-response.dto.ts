import { ApiProperty } from "@nestjs/swagger";

export class AuthResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken: string;

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  refreshToken: string;

  @ApiProperty({ example: 3600 })
  expiresIn: number;

  @ApiProperty({ example: "Bearer" })
  tokenType: string;

  @ApiProperty({
    example: {
      id: "clx1234567890",
      email: "john@example.com",
      fullName: "John Doe",
      phone: "+1234567890",
      userType: "CUSTOMER",
      roles: ["CUSTOMER"],
      isEmailVerified: true,
      isPhoneVerified: false,
      avatarUrl: "https://example.com/avatar.jpg",
    },
  })
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    userType: string;
    roles: string[];
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    avatarUrl?: string;
  };
}

export class OtpResponseDto {
  @ApiProperty({ example: "OTP sent successfully" })
  message: string;

  @ApiProperty({ example: "email" })
  method: string;

  @ApiProperty({ example: 300 })
  expiresIn: number;
}
