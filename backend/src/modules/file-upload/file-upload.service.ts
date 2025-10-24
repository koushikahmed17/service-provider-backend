import { Injectable, BadRequestException } from "@nestjs/common";
import { LoggerService } from "@/core/logger.service";

export interface FileUploadResult {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class FileUploadService {
  constructor(private readonly logger: LoggerService) {}

  async uploadFile(
    file: Express.Multer.File,
    folder: string = "uploads"
  ): Promise<FileUploadResult> {
    // Validate file type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Invalid file type. Only images and PDFs are allowed."
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        "File size too large. Maximum size is 5MB."
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.originalname.split(".").pop();
    const filename = `${folder}/${timestamp}-${randomString}.${extension}`;

    // In a real implementation, you would upload to cloud storage (AWS S3, Google Cloud, etc.)
    // For now, we'll simulate the upload and return a mock URL
    const mockUrl = `https://storage.example.com/${filename}`;

    this.logger.log(`File uploaded: ${filename}`, "FileUploadService");

    return {
      url: mockUrl,
      filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadNidPhoto(file: Express.Multer.File): Promise<FileUploadResult> {
    // Additional validation for NID photos
    const allowedMimeTypes = ["image/jpeg", "image/png"];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("NID photo must be a JPEG or PNG image.");
    }

    return this.uploadFile(file, "nid-photos");
  }

  async uploadAvatar(file: Express.Multer.File): Promise<FileUploadResult> {
    // Additional validation for avatars
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Avatar must be a JPEG, PNG, or WebP image."
      );
    }

    return this.uploadFile(file, "avatars");
  }
}































