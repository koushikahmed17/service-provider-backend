import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { CreateCategoryDto, UpdateCategoryDto, GetCategoriesDto } from "../dto";

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  async createCategory(createDto: CreateCategoryDto) {
    // Check if slug already exists
    const existingCategory = await this.prisma.serviceCategory.findUnique({
      where: { slug: createDto.slug },
    });

    if (existingCategory) {
      throw new ConflictException("Category with this slug already exists");
    }

    // Validate parent category if provided
    if (createDto.parentId) {
      const parentCategory = await this.prisma.serviceCategory.findUnique({
        where: { id: createDto.parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException("Parent category not found");
      }
    }

    const category = await this.prisma.serviceCategory.create({
      data: createDto,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            professionalServices: true,
          },
        },
      },
    });

    this.logger.log(`Category created: ${category.name}`, "CategoryService");
    return category;
  }

  async updateCategory(id: string, updateDto: UpdateCategoryDto) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    // Check if new slug conflicts with existing categories
    if (updateDto.slug && updateDto.slug !== category.slug) {
      const existingCategory = await this.prisma.serviceCategory.findUnique({
        where: { slug: updateDto.slug },
      });

      if (existingCategory) {
        throw new ConflictException("Category with this slug already exists");
      }
    }

    // Validate parent category if provided
    if (updateDto.parentId) {
      if (updateDto.parentId === id) {
        throw new BadRequestException("Category cannot be its own parent");
      }

      const parentCategory = await this.prisma.serviceCategory.findUnique({
        where: { id: updateDto.parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException("Parent category not found");
      }
    }

    const updatedCategory = await this.prisma.serviceCategory.update({
      where: { id },
      data: updateDto,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            professionalServices: true,
          },
        },
      },
    });

    this.logger.log(
      `Category updated: ${updatedCategory.name}`,
      "CategoryService"
    );
    return updatedCategory;
  }

  async getCategories(query: GetCategoriesDto) {
    const { format = "flat", activeOnly = true } = query;

    const where = activeOnly ? { isActive: true } : {};

    if (format === "tree") {
      return this.getCategoriesTree(where);
    }

    return this.prisma.serviceCategory.findMany({
      where,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            professionalServices: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        professionalServices: {
          include: {
            professional: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            professionalServices: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return category;
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        children: true,
        _count: {
          select: {
            professionalServices: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    if (category.children.length > 0) {
      throw new BadRequestException(
        "Cannot delete category with subcategories"
      );
    }

    if (category._count.professionalServices > 0) {
      throw new BadRequestException(
        "Cannot delete category with associated services"
      );
    }

    await this.prisma.serviceCategory.delete({
      where: { id },
    });

    this.logger.log(`Category deleted: ${category.name}`, "CategoryService");
    return { message: "Category deleted successfully" };
  }

  private async getCategoriesTree(where: any) {
    const categories = await this.prisma.serviceCategory.findMany({
      where,
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                professionalServices: true,
              },
            },
          },
        },
        _count: {
          select: {
            professionalServices: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories = [];

    // First pass: create map of all categories
    categories.forEach((category) => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Second pass: build tree structure
    categories.forEach((category) => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryMap.get(category.id));
        }
      } else {
        rootCategories.push(categoryMap.get(category.id));
      }
    });

    return rootCategories;
  }
}
































