import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { CreateTagDto, UpdateTagDto } from "../dto";

@Injectable()
export class TagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  async createTag(createDto: CreateTagDto) {
    // Check if slug already exists
    const existingTag = await this.prisma.serviceTag.findUnique({
      where: { slug: createDto.slug },
    });

    if (existingTag) {
      throw new ConflictException("Tag with this slug already exists");
    }

    const tag = await this.prisma.serviceTag.create({
      data: createDto,
    });

    this.logger.log(`Tag created: ${tag.name}`, "TagService");
    return tag;
  }

  async updateTag(id: string, updateDto: UpdateTagDto) {
    const tag = await this.prisma.serviceTag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException("Tag not found");
    }

    // Check if new slug conflicts with existing tags
    if (updateDto.slug && updateDto.slug !== tag.slug) {
      const existingTag = await this.prisma.serviceTag.findUnique({
        where: { slug: updateDto.slug },
      });

      if (existingTag) {
        throw new ConflictException("Tag with this slug already exists");
      }
    }

    const updatedTag = await this.prisma.serviceTag.update({
      where: { id },
      data: updateDto,
    });

    this.logger.log(`Tag updated: ${updatedTag.name}`, "TagService");
    return updatedTag;
  }

  async getTags() {
    return this.prisma.serviceTag.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  async getTagById(id: string) {
    const tag = await this.prisma.serviceTag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException("Tag not found");
    }

    return tag;
  }

  async deleteTag(id: string) {
    const tag = await this.prisma.serviceTag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException("Tag not found");
    }

    await this.prisma.serviceTag.delete({
      where: { id },
    });

    this.logger.log(`Tag deleted: ${tag.name}`, "TagService");
    return { message: "Tag deleted successfully" };
  }
}































