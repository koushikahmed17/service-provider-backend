import {
  Controller,
  Patch,
  Get,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFiles,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserService } from "./services/user.service";
import {
  UpdateProfileDto,
  UpdateProfessionalProfileDto,
} from "./dto/update-profile.dto";
import { UpdateProfileFormDto } from "./dto/update-profile-form.dto";

@ApiTags("Users")
@Controller("users")
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch("me")
  @ApiOperation({ summary: "Update user profile" })
  @ApiResponse({ status: 200, description: "Profile updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(AnyFilesInterceptor())
  async updateProfile(
    @Req() req: any,
    @Body() updateDto: UpdateProfileFormDto,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    return this.userService.updateProfile(req.user.id, updateDto, files);
  }

  @Patch("me/professional")
  @ApiOperation({ summary: "Update professional profile" })
  @ApiResponse({
    status: 200,
    description: "Professional profile updated successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "User is not a professional" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async updateProfessionalProfile(
    @Req() req: any,
    @Body() updateDto: UpdateProfessionalProfileDto
  ) {
    return this.userService.updateProfessionalProfile(req.user.id, updateDto);
  }

  @Get("me")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, description: "Profile retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getProfile(@Req() req: any) {
    return this.userService.getProfile(req.user.id);
  }

  @Get("me/professional/dashboard")
  @ApiOperation({ summary: "Get professional dashboard data" })
  @ApiResponse({
    status: 200,
    description: "Dashboard data retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "User is not a professional" })
  async getProfessionalDashboard(@Req() req: any) {
    return this.userService.getProfessionalDashboard(req.user.id);
  }
}
