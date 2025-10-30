import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FileUploadService } from "./file-upload.service";

@ApiTags("File Upload")
@Controller("upload")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post("nid-photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload NID photo" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, description: "NID photo uploaded successfully" })
  @ApiResponse({ status: 400, description: "Invalid file type or size" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async uploadNidPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error("No file provided");
    }

    return this.fileUploadService.uploadNidPhoto(file);
  }

  @Post("avatar")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload avatar" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, description: "Avatar uploaded successfully" })
  @ApiResponse({ status: 400, description: "Invalid file type or size" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error("No file provided");
    }

    return this.fileUploadService.uploadAvatar(file);
  }
}
































