import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
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
import {
  CreateReviewDto,
  ReviewResponseDto,
  GetReviewsQueryDto,
  CreateReviewResponseDto,
  UpdateReviewResponseDto,
  FlagReviewDto,
  ProfessionalRatingAggregateDto,
} from "../dto";

@ApiTags("Reviews")
@Controller("reviews")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({ summary: "Create a review for a completed booking" })
  @ApiResponse({
    status: 201,
    description: "Review created successfully",
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid request data" })
  @ApiResponse({ status: 403, description: "Forbidden - not your booking" })
  @ApiResponse({ status: 404, description: "Booking not found" })
  async createReview(
    @Body() createDto: CreateReviewDto,
    @Request() req: any
  ): Promise<ReviewResponseDto> {
    return this.reviewService.createReview(createDto, req.user.id);
  }

  @Get("professionals/:professionalId")
  @ApiOperation({ summary: "Get reviews for a specific professional" })
  @ApiResponse({
    status: 200,
    description: "Reviews retrieved successfully",
  })
  async getReviewsByProfessional(
    @Param("professionalId") professionalId: string,
    @Query() query: GetReviewsQueryDto
  ) {
    return this.reviewService.getReviewsByProfessional(professionalId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific review by ID" })
  @ApiResponse({
    status: 200,
    description: "Review retrieved successfully",
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 404, description: "Review not found" })
  async getReviewById(@Param("id") id: string): Promise<ReviewResponseDto> {
    return this.reviewService.getReviewById(id);
  }

  @Post(":id/respond")
  @UseGuards(RolesGuard)
  @Roles("PROFESSIONAL")
  @ApiOperation({ summary: "Respond to a review (professionals only)" })
  @ApiResponse({
    status: 201,
    description: "Response created successfully",
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request or time limit exceeded",
  })
  @ApiResponse({ status: 403, description: "Forbidden - not your review" })
  @ApiResponse({ status: 404, description: "Review not found" })
  async createReviewResponse(
    @Param("id") reviewId: string,
    @Body() createDto: CreateReviewResponseDto,
    @Request() req: any
  ): Promise<ReviewResponseDto> {
    return this.reviewService.createReviewResponse(
      reviewId,
      createDto,
      req.user.id
    );
  }

  @Post(":id/flag")
  @ApiOperation({ summary: "Flag a review for moderation" })
  @ApiResponse({
    status: 200,
    description: "Review flagged successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid request data" })
  @ApiResponse({ status: 403, description: "Forbidden - not your review" })
  @ApiResponse({ status: 404, description: "Review not found" })
  @HttpCode(HttpStatus.OK)
  async flagReview(
    @Param("id") reviewId: string,
    @Body() flagDto: FlagReviewDto,
    @Request() req: any
  ): Promise<void> {
    return this.reviewService.flagReview(reviewId, flagDto, req.user.id);
  }

  @Get("professionals/:professionalId/rating")
  @ApiOperation({ summary: "Get professional rating aggregate" })
  @ApiResponse({
    status: 200,
    description: "Rating aggregate retrieved successfully",
    type: ProfessionalRatingAggregateDto,
  })
  @ApiResponse({ status: 404, description: "Professional not found" })
  async getProfessionalRating(
    @Param("professionalId") professionalId: string
  ): Promise<ProfessionalRatingAggregateDto> {
    return this.reviewService.getProfessionalRatingAggregate(professionalId);
  }
}
