import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import {
  CreateReviewDto,
  ReviewResponseDto,
  GetReviewsQueryDto,
  CreateReviewResponseDto,
  UpdateReviewResponseDto,
  FlagReviewDto,
  ProfessionalRatingAggregateDto,
} from "../dto";

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  async createReview(
    createDto: CreateReviewDto,
    customerId: string
  ): Promise<ReviewResponseDto> {
    // Verify booking exists and belongs to customer
    const booking = await this.prisma.booking.findUnique({
      where: { id: createDto.bookingId },
      include: {
        customer: true,
        professional: true,
        category: true,
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.customerId !== customerId) {
      throw new ForbiddenException("You can only review your own bookings");
    }

    if (booking.status !== "COMPLETED") {
      throw new BadRequestException("Can only review completed bookings");
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findUnique({
      where: {
        bookingId_customerId: {
          bookingId: createDto.bookingId,
          customerId: customerId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException("Review already exists for this booking");
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        bookingId: createDto.bookingId,
        customerId: customerId,
        professionalId: booking.professionalId,
        rating: createDto.rating,
        comment: createDto.comment,
        photos: createDto.photos || [],
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

    // Update professional rating aggregate
    await this.updateProfessionalRatingAggregate(booking.professionalId);

    this.logger.log(
      `Review created: ${review.id} for professional ${booking.professionalId}`,
      "ReviewService"
    );

    return this.mapToResponseDto(review);
  }

  async getReviewsByProfessional(
    professionalId: string,
    query: GetReviewsQueryDto
  ): Promise<{
    reviews: ReviewResponseDto[];
    total: number;
    page: number;
    limit: number;
    avgRating: number;
  }> {
    const { page = 1, limit = 10, minRating, maxRating, flagged } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      professionalId,
    };

    if (minRating !== undefined) {
      whereClause.rating = { gte: minRating };
    }

    if (maxRating !== undefined) {
      whereClause.rating = { ...whereClause.rating, lte: maxRating };
    }

    if (flagged !== undefined) {
      whereClause.flagged = flagged;
    }

    const [reviews, total, avgRatingResult] = await Promise.all([
      this.prisma.review.findMany({
        where: whereClause,
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: whereClause }),
      this.prisma.review.aggregate({
        where: whereClause,
        _avg: { rating: true },
      }),
    ]);

    return {
      reviews: reviews.map((review) => this.mapToResponseDto(review)),
      total,
      page,
      limit,
      avgRating: avgRatingResult._avg.rating || 0,
    };
  }

  async getReviewById(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
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

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    return this.mapToResponseDto(review);
  }

  async createReviewResponse(
    reviewId: string,
    createDto: CreateReviewResponseDto,
    professionalId: string
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { response: true },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.professionalId !== professionalId) {
      throw new ForbiddenException(
        "You can only respond to reviews for your services"
      );
    }

    if (review.response) {
      throw new BadRequestException("Response already exists for this review");
    }

    // Check if review is within 24 hours of creation
    const hoursSinceCreation =
      (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      throw new BadRequestException(
        "Cannot respond to reviews older than 24 hours"
      );
    }

    const response = await this.prisma.reviewResponse.create({
      data: {
        reviewId: reviewId,
        professionalId: professionalId,
        comment: createDto.comment,
      },
    });

    // Get updated review with response
    const updatedReview = await this.prisma.review.findUnique({
      where: { id: reviewId },
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

    this.logger.log(
      `Review response created: ${response.id} for review ${reviewId}`,
      "ReviewService"
    );

    return this.mapToResponseDto(updatedReview!);
  }

  async updateReviewResponse(
    reviewId: string,
    updateDto: UpdateReviewResponseDto,
    professionalId: string
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { response: true },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.professionalId !== professionalId) {
      throw new ForbiddenException(
        "You can only update responses for your reviews"
      );
    }

    if (!review.response) {
      throw new BadRequestException("No response exists for this review");
    }

    // Check if response is within 24 hours of creation
    const hoursSinceCreation =
      (Date.now() - review.response.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      throw new BadRequestException(
        "Cannot update responses older than 24 hours"
      );
    }

    await this.prisma.reviewResponse.update({
      where: { reviewId: reviewId },
      data: {
        comment: updateDto.comment,
      },
    });

    // Get updated review with response
    const updatedReview = await this.prisma.review.findUnique({
      where: { id: reviewId },
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

    this.logger.log(
      `Review response updated for review ${reviewId}`,
      "ReviewService"
    );

    return this.mapToResponseDto(updatedReview!);
  }

  async flagReview(
    reviewId: string,
    flagDto: FlagReviewDto,
    userId: string
  ): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    // Check if user is customer or professional for this review
    if (review.customerId !== userId && review.professionalId !== userId) {
      throw new ForbiddenException(
        "You can only flag reviews related to your bookings"
      );
    }

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { flagged: true },
    });

    // Log the flag action
    await this.prisma.reviewModerationLog.create({
      data: {
        reviewId: reviewId,
        adminId: userId, // In this case, the user flagging is acting as admin
        action: "flagged",
        reason: flagDto.reason,
      },
    });

    this.logger.log(
      `Review flagged: ${reviewId} by user ${userId} - ${flagDto.reason}`,
      "ReviewService"
    );
  }

  async moderateReview(
    reviewId: string,
    moderateDto: any,
    adminId: string
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
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

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    // Log the moderation action
    await this.prisma.reviewModerationLog.create({
      data: {
        reviewId: reviewId,
        adminId: adminId,
        action: moderateDto.action,
        reason: moderateDto.reason,
      },
    });

    let updatedReview = review;

    if (moderateDto.action === "approve") {
      updatedReview = await this.prisma.review.update({
        where: { id: reviewId },
        data: { flagged: false },
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
    }

    this.logger.log(
      `Review moderated: ${reviewId} by admin ${adminId} - ${moderateDto.action}`,
      "ReviewService"
    );

    return this.mapToResponseDto(updatedReview);
  }

  async getProfessionalRatingAggregate(
    professionalId: string
  ): Promise<ProfessionalRatingAggregateDto> {
    const aggregate = await this.prisma.professionalRatingAggregate.findUnique({
      where: { professionalId },
    });

    if (!aggregate) {
      // Calculate and create if doesn't exist
      await this.updateProfessionalRatingAggregate(professionalId);
      const newAggregate =
        await this.prisma.professionalRatingAggregate.findUnique({
          where: { professionalId },
        });
      return this.mapToAggregateDto(newAggregate!);
    }

    return this.mapToAggregateDto(aggregate);
  }

  async updateProfessionalRatingAggregate(
    professionalId: string
  ): Promise<void> {
    const reviews = await this.prisma.review.findMany({
      where: {
        professionalId,
        flagged: false, // Only include non-flagged reviews
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

    if (reviews.length === 0) {
      // Create or update with zero values
      await this.prisma.professionalRatingAggregate.upsert({
        where: { professionalId },
        create: {
          professionalId,
          avgRating: 0,
          totalReviews: 0,
          weightedScore: 0,
        },
        update: {
          avgRating: 0,
          totalReviews: 0,
          weightedScore: 0,
          lastCalculated: new Date(),
        },
      });
      return;
    }

    // Calculate basic average
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = totalRating / reviews.length;

    // Calculate weighted score
    const weightedScore = this.calculateWeightedScore(reviews);

    await this.prisma.professionalRatingAggregate.upsert({
      where: { professionalId },
      create: {
        professionalId,
        avgRating: avgRating,
        totalReviews: reviews.length,
        weightedScore: weightedScore,
      },
      update: {
        avgRating: avgRating,
        totalReviews: reviews.length,
        weightedScore: weightedScore,
        lastCalculated: new Date(),
      },
    });

    this.logger.log(
      `Rating aggregate updated for professional ${professionalId}: avg=${avgRating.toFixed(
        2
      )}, weighted=${weightedScore.toFixed(2)}`,
      "ReviewService"
    );
  }

  private calculateWeightedScore(reviews: any[]): number {
    const now = new Date();
    let weightedSum = 0;
    let totalWeight = 0;

    for (const review of reviews) {
      // Base weight is the rating
      let weight = review.rating;

      // Recency weight: more recent reviews get higher weight
      const daysSinceReview =
        (now.getTime() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.max(0.5, 1 - daysSinceReview / 365); // Decay over 1 year

      // Verification weight: completed bookings get higher weight
      const verificationWeight =
        review.booking.status === "COMPLETED" ? 1.2 : 1.0;

      // Apply weights
      weight *= recencyWeight * verificationWeight;

      weightedSum += weight;
      totalWeight += recencyWeight * verificationWeight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private mapToResponseDto(review: any): ReviewResponseDto {
    return {
      id: review.id,
      bookingId: review.bookingId,
      customerId: review.customerId,
      professionalId: review.professionalId,
      rating: review.rating,
      comment: review.comment,
      photos: review.photos,
      flagged: review.flagged,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      response: review.response
        ? {
            id: review.response.id,
            comment: review.response.comment,
            createdAt: review.response.createdAt.toISOString(),
            updatedAt: review.response.updatedAt.toISOString(),
          }
        : undefined,
      customer: review.customer,
      professional: review.professional,
    };
  }

  private mapToAggregateDto(aggregate: any): ProfessionalRatingAggregateDto {
    return {
      professionalId: aggregate.professionalId,
      avgRating: Number(aggregate.avgRating),
      totalReviews: aggregate.totalReviews,
      weightedScore: Number(aggregate.weightedScore),
      lastCalculated: aggregate.lastCalculated.toISOString(),
    };
  }
}































