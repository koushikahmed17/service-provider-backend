import { Test, TestingModule } from "@nestjs/testing";
import { CategoryService } from "@/modules/service-catalog/services/category.service";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";

describe("CategoryService", () => {
  let service: CategoryService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    serviceCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    serviceTag: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCategory", () => {
    it("should create a category successfully", async () => {
      const createDto = {
        name: "Home Cleaning",
        slug: "home-cleaning",
        description: "Professional home cleaning services",
        isActive: true,
        icon: "fa-solid fa-broom",
      };

      const expectedCategory = {
        id: "cat-123",
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.serviceCategory.create.mockResolvedValue(
        expectedCategory
      );

      const result = await service.createCategory(createDto);

      expect(result).toEqual(expectedCategory);
      expect(mockPrismaService.serviceCategory.create).toHaveBeenCalledWith({
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
    });

    it("should throw ConflictException for duplicate slug", async () => {
      const createDto = {
        name: "Home Cleaning",
        slug: "home-cleaning",
      };

      mockPrismaService.serviceCategory.findUnique.mockResolvedValue({
        id: "existing-category",
        slug: createDto.slug,
      });

      await expect(service.createCategory(createDto)).rejects.toThrow(
        "Category with this slug already exists"
      );
    });
  });

  describe("getCategories", () => {
    it("should return flat categories", async () => {
      const mockCategories = [
        {
          id: "cat-1",
          name: "Home Cleaning",
          slug: "home-cleaning",
          parentId: null,
        },
        {
          id: "cat-2",
          name: "Deep Cleaning",
          slug: "deep-cleaning",
          parentId: "cat-1",
        },
      ];

      mockPrismaService.serviceCategory.findMany.mockResolvedValue(
        mockCategories
      );

      const result = await service.getCategories({
        format: "flat",
        activeOnly: true,
      });

      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.serviceCategory.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          parent: true,
          children: true,
          _count: {
            select: {
              professionalServices: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    });

    it("should return tree categories", async () => {
      const mockCategories = [
        {
          id: "cat-1",
          name: "Home Cleaning",
          slug: "home-cleaning",
          parentId: null,
          children: [],
        },
      ];

      mockPrismaService.serviceCategory.findMany.mockResolvedValue(
        mockCategories
      );

      const result = await service.getCategories({
        format: "tree",
        activeOnly: true,
      });

      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.serviceCategory.findMany).toHaveBeenCalled();
    });
  });

  describe("updateCategory", () => {
    it("should update category successfully", async () => {
      const categoryId = "cat-123";
      const updateDto = {
        name: "Updated Home Cleaning",
        description: "Updated description",
      };

      const updatedCategory = {
        id: categoryId,
        ...updateDto,
        slug: "home-cleaning",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.serviceCategory.findUnique.mockResolvedValue({
        id: categoryId,
        name: "Home Cleaning",
      });
      mockPrismaService.serviceCategory.update.mockResolvedValue(
        updatedCategory
      );

      const result = await service.updateCategory(categoryId, updateDto);

      expect(result).toEqual(updatedCategory);
      expect(mockPrismaService.serviceCategory.update).toHaveBeenCalledWith({
        where: { id: categoryId },
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
    });

    it("should throw NotFoundException for non-existent category", async () => {
      const categoryId = "non-existent";
      const updateDto = { name: "Updated" };

      mockPrismaService.serviceCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCategory(categoryId, updateDto)
      ).rejects.toThrow("Category not found");
    });
  });

  describe("deleteCategory", () => {
    it("should delete category successfully", async () => {
      const categoryId = "cat-123";

      mockPrismaService.serviceCategory.findUnique.mockResolvedValue({
        id: categoryId,
        name: "Home Cleaning",
        children: [],
        _count: {
          professionalServices: 0,
        },
      });
      mockPrismaService.serviceCategory.delete.mockResolvedValue({
        id: categoryId,
      });

      const result = await service.deleteCategory(categoryId);

      expect(result).toEqual({ message: "Category deleted successfully" });
      expect(mockPrismaService.serviceCategory.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
    });

    it("should throw BadRequestException for category with children", async () => {
      const categoryId = "cat-123";

      mockPrismaService.serviceCategory.findUnique.mockResolvedValue({
        id: categoryId,
        name: "Home Cleaning",
        children: [{ id: "child-1" }],
        professionalServices: [],
      });

      await expect(service.deleteCategory(categoryId)).rejects.toThrow(
        "Cannot delete category with subcategories"
      );
    });
  });
});
