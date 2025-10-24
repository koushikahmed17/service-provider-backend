import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { ReviewService } from "../services/review.service";
import { PrismaService } from "@/core/prisma.service";
import {
  ReviewResponseDto,
  GetReviewsQueryDto,
  ModerateReviewDto,
} from "../dto";

@ApiTags("Admin - Reviews")
@Controller("admin/reviews")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@ApiBearerAuth()
export class AdminReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all reviews with filters (admin only)" })
  @ApiResponse({
    status: 200,
    description: "Reviews retrieved successfully",
  })
  async getAllReviews(@Query() query: GetReviewsQueryDto) {
    // For admin, we can get reviews across all professionals
    // We need to modify the service to handle empty professionalId for admin
    const { page = 1, limit = 10, minRating, maxRating, flagged } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

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
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
          booking: {
            select: {
              id: true,
              categoryId: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
          response: true,
        },
      }),
      this.prisma.review.count({ where: whereClause }),
      this.prisma.review.aggregate({
        where: whereClause,
        _avg: { rating: true },
      }),
    ]);

    const avgRating = avgRatingResult._avg.rating || 0;

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        bookingId: review.bookingId,
        customer: review.customer,
        professional: review.professional,
        rating: review.rating,
        comment: review.comment,
        photos: review.photos,
        flagged: review.flagged,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        booking: review.booking,
        response: review.response,
      })),
      total,
      page,
      limit,
      avgRating: Number(avgRating.toFixed(2)),
    };
  }

  @Get("flagged")
  @ApiOperation({ summary: "Get flagged reviews for moderation (admin only)" })
  @ApiResponse({
    status: 200,
    description: "Flagged reviews retrieved successfully",
  })
  async getFlaggedReviews(@Query() query: GetReviewsQueryDto) {
    return this.reviewService.getReviewsByProfessional("", {
      ...query,
      flagged: true,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific review by ID (admin only)" })
  @ApiResponse({
    status: 200,
    description: "Review retrieved successfully",
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 404, description: "Review not found" })
  async getReviewById(@Param("id") id: string): Promise<ReviewResponseDto> {
    return this.reviewService.getReviewById(id);
  }

  @Patch(":id/moderate")
  @ApiOperation({ summary: "Moderate a flagged review (admin only)" })
  @ApiResponse({
    status: 200,
    description: "Review moderated successfully",
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid moderation action" })
  @ApiResponse({ status: 404, description: "Review not found" })
  async moderateReview(
    @Param("id") reviewId: string,
    @Body() moderateDto: ModerateReviewDto,
    @Request() req: any
  ): Promise<ReviewResponseDto> {
    return this.reviewService.moderateReview(
      reviewId,
      moderateDto,
      req.user.id
    );
  }
}
