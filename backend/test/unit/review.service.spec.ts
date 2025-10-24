import { Test, TestingModule } from "@nestjs/testing";
import { ReviewService } from "@/modules/review/services/review.service";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { CreateReviewDto } from "@/modules/review/dto";

describe("ReviewService", () => {
  let service: ReviewService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    review: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    reviewResponse: {
      create: jest.fn(),
      update: jest.fn(),
    },
    reviewModerationLog: {
      create: jest.fn(),
    },
    professionalRatingAggregate: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
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

    service = module.get<ReviewService>(ReviewService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createReview", () => {
    const createDto: CreateReviewDto = {
      bookingId: "booking-123",
      rating: 5,
      comment: "Excellent service!",
      photos: ["https://example.com/photo1.jpg"],
    };

    it("should create a review successfully", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        status: "COMPLETED",
        customer: { id: "customer-123", fullName: "John Doe" },
        professional: { id: "professional-123", fullName: "Jane Smith" },
        category: { id: "category-123", name: "Home Cleaning" },
      };

      const mockReview = {
        id: "review-123",
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        rating: 5,
        comment: "Excellent service!",
        photos: ["https://example.com/photo1.jpg"],
        flagged: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: { id: "customer-123", fullName: "John Doe", avatarUrl: null },
        professional: {
          id: "professional-123",
          fullName: "Jane Smith",
          avatarUrl: null,
        },
        response: null,
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(mockReview);
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.professionalRatingAggregate.upsert.mockResolvedValue(
        {}
      );

      const result = await service.createReview(createDto, "customer-123");

      expect(result).toHaveProperty("id", "review-123");
      expect(result.rating).toBe(5);
      expect(result.comment).toBe("Excellent service!");
      expect(mockPrismaService.review.create).toHaveBeenCalledWith({
        data: {
          bookingId: "booking-123",
          customerId: "customer-123",
          professionalId: "professional-123",
          rating: 5,
          comment: "Excellent service!",
          photos: ["https://example.com/photo1.jpg"],
        },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          professional: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          response: true,
        },
      });
    });

    it("should throw NotFoundException for non-existent booking", async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.createReview(createDto, "customer-123")
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for booking not owned by customer", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "other-customer",
        status: "COMPLETED",
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.createReview(createDto, "customer-123")
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for non-completed booking", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "customer-123",
        status: "PENDING",
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.createReview(createDto, "customer-123")
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for existing review", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "customer-123",
        status: "COMPLETED",
      };

      const existingReview = {
        id: "existing-review",
        bookingId: "booking-123",
        customerId: "customer-123",
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.review.findUnique.mockResolvedValue(existingReview);

      await expect(
        service.createReview(createDto, "customer-123")
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getReviewsByProfessional", () => {
    it("should get reviews for a professional", async () => {
      const mockReviews = [
        {
          id: "review-1",
          professionalId: "professional-123",
          rating: 5,
          comment: "Great service!",
          flagged: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          customer: { id: "customer-1", fullName: "John Doe", avatarUrl: null },
          professional: {
            id: "professional-123",
            fullName: "Jane Smith",
            avatarUrl: null,
          },
          response: null,
        },
      ];

      const mockAggregate = {
        _avg: { rating: 5.0 },
      };

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);
      mockPrismaService.review.count.mockResolvedValue(1);
      mockPrismaService.review.aggregate.mockResolvedValue(mockAggregate);

      const result = await service.getReviewsByProfessional(
        "professional-123",
        {
          page: 1,
          limit: 10,
        }
      );

      expect(result.reviews).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.avgRating).toBe(5.0);
    });
  });

  describe("createReviewResponse", () => {
    it("should create a review response successfully", async () => {
      const mockReview = {
        id: "review-123",
        professionalId: "professional-123",
        createdAt: new Date(),
        response: null,
      };

      const mockResponse = {
        id: "response-123",
        reviewId: "review-123",
        professionalId: "professional-123",
        comment: "Thank you for your feedback!",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedReview = {
        ...mockReview,
        response: mockResponse,
        customer: { id: "customer-123", fullName: "John Doe", avatarUrl: null },
        professional: {
          id: "professional-123",
          fullName: "Jane Smith",
          avatarUrl: null,
        },
        updatedAt: new Date(),
      };

      mockPrismaService.review.findUnique
        .mockResolvedValueOnce(mockReview)
        .mockResolvedValueOnce(updatedReview);
      mockPrismaService.reviewResponse.create.mockResolvedValue(mockResponse);

      const result = await service.createReviewResponse(
        "review-123",
        { comment: "Thank you for your feedback!" },
        "professional-123"
      );

      expect(result.response).toBeDefined();
      expect(result.response?.comment).toBe("Thank you for your feedback!");
    });

    it("should throw BadRequestException for response older than 24 hours", async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const mockReview = {
        id: "review-123",
        professionalId: "professional-123",
        createdAt: oldDate,
        response: null,
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.createReviewResponse(
          "review-123",
          { comment: "Thank you!" },
          "professional-123"
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("flagReview", () => {
    it("should flag a review successfully", async () => {
      const mockReview = {
        id: "review-123",
        customerId: "customer-123",
        professionalId: "professional-123",
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue({});
      mockPrismaService.reviewModerationLog.create.mockResolvedValue({});

      await service.flagReview(
        "review-123",
        { reason: "Inappropriate language" },
        "customer-123"
      );

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: "review-123" },
        data: { flagged: true },
      });
      expect(mockPrismaService.reviewModerationLog.create).toHaveBeenCalled();
    });
  });

  describe("updateProfessionalRatingAggregate", () => {
    it("should update rating aggregate for professional with reviews", async () => {
      const mockReviews = [
        {
          id: "review-1",
          rating: 5,
          createdAt: new Date(),
          booking: { createdAt: new Date(), status: "COMPLETED" },
        },
        {
          id: "review-2",
          rating: 4,
          createdAt: new Date(),
          booking: { createdAt: new Date(), status: "COMPLETED" },
        },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);
      mockPrismaService.professionalRatingAggregate.upsert.mockResolvedValue(
        {}
      );

      await service.updateProfessionalRatingAggregate("professional-123");

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        where: {
          professionalId: "professional-123",
          flagged: false,
        },
        include: {
          booking: {
            select: {
              createdAt: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(
        mockPrismaService.professionalRatingAggregate.upsert
      ).toHaveBeenCalled();
    });

    it("should handle professional with no reviews", async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.professionalRatingAggregate.upsert.mockResolvedValue(
        {}
      );

      await service.updateProfessionalRatingAggregate("professional-123");

      expect(
        mockPrismaService.professionalRatingAggregate.upsert
      ).toHaveBeenCalledWith({
        where: { professionalId: "professional-123" },
        create: {
          professionalId: "professional-123",
          avgRating: 0,
          totalReviews: 0,
          weightedScore: 0,
        },
        update: {
          avgRating: 0,
          totalReviews: 0,
          weightedScore: 0,
          lastCalculated: expect.any(Date),
        },
      });
    });
  });
});
