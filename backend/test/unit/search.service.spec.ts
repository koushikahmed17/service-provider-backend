import { Test, TestingModule } from "@nestjs/testing";
import { SearchService } from "@/modules/service-catalog/services/search.service";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";

describe("SearchService", () => {
  let service: SearchService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
    serviceCategory: {
      findMany: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
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

    service = module.get<SearchService>(SearchService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("searchServices", () => {
    it("should search services with basic filters", async () => {
      const filters = {
        query: "cleaning",
        minPrice: 100,
        maxPrice: 500,
        rateType: "HOURLY",
      };

      const mockResults = [
        {
          id: "service-1",
          categoryName: "Home Cleaning",
          rateType: "HOURLY",
          hourlyRateBDT: 200,
          professional: {
            id: "prof-1",
            fullName: "John Doe",
            email: "john@example.com",
          },
        },
      ];

      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResults);

      const result = await service.searchServices(filters);

      expect(result).toEqual(mockResults);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Search completed: 1 results found",
        "SearchService"
      );
    });

    it("should search services with geo filters", async () => {
      const filters = {
        lat: 23.8103,
        lng: 90.4125,
        radiusKm: 5,
        categoryIds: ["cat-1", "cat-2"],
      };

      const mockResults = [
        {
          id: "service-1",
          categoryName: "Home Cleaning",
          distance: 2.5,
          professional: {
            id: "prof-1",
            fullName: "John Doe",
            locationLat: 23.815,
            locationLng: 90.42,
          },
        },
      ];

      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResults);

      const result = await service.searchServices(filters);

      expect(result).toEqual(mockResults);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
    });

    it("should handle search errors gracefully", async () => {
      const filters = { query: "cleaning" };
      const error = new Error("Database connection failed");

      mockPrismaService.$queryRawUnsafe.mockRejectedValue(error);

      await expect(service.searchServices(filters)).rejects.toThrow(error);
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        "Search failed: Database connection failed",
        "SearchService"
      );
    });
  });

  describe("getSearchSuggestions", () => {
    it("should return search suggestions", async () => {
      const query = "clean";
      const mockSuggestions = [
        { suggestion: "Home Cleaning", type: "category" },
        { suggestion: "Deep Cleaning", type: "skill" },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockSuggestions);

      const result = await service.getSearchSuggestions(query, 10);

      expect(result).toEqual(mockSuggestions);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });

  describe("getPopularCategories", () => {
    it("should return popular categories", async () => {
      const mockCategories = [
        {
          id: "cat-1",
          name: "Home Cleaning",
          _count: { professionalServices: 15 },
        },
        {
          id: "cat-2",
          name: "Plumbing",
          _count: { professionalServices: 10 },
        },
      ];

      mockPrismaService.serviceCategory.findMany.mockResolvedValue(
        mockCategories
      );

      const result = await service.getPopularCategories(10);

      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.serviceCategory.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              professionalServices: true,
            },
          },
        },
        orderBy: {
          professionalServices: {
            _count: "desc",
          },
        },
        take: 10,
      });
    });
  });

  describe("getNearbyServices", () => {
    it("should return nearby services", async () => {
      const lat = 23.8103;
      const lng = 90.4125;
      const radiusKm = 10;
      const limit = 20;

      const mockResults = [
        {
          id: "service-1",
          categoryName: "Home Cleaning",
          distance: 5.2,
          professional: {
            id: "prof-1",
            fullName: "John Doe",
            locationLat: 23.815,
            locationLng: 90.42,
          },
        },
      ];

      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResults);

      const result = await service.getNearbyServices(lat, lng, radiusKm, limit);

      expect(result).toEqual(mockResults);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
    });
  });
});
