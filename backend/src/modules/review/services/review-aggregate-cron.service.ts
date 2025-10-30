import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "@/core/prisma.service";
import { ReviewService } from "./review.service";

@Injectable()
export class ReviewAggregateCronService {
  private readonly logger = new Logger(ReviewAggregateCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewService: ReviewService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateAllProfessionalRatingAggregates() {
    this.logger.log(
      "Starting nightly review aggregate update",
      "ReviewAggregateCronService"
    );

    try {
      // Get all professionals who have reviews
      const professionals = await this.prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                name: "PROFESSIONAL",
              },
            },
          },
          professionalReviews: {
            some: {},
          },
        },
        select: {
          id: true,
          fullName: true,
        },
      });

      this.logger.log(
        `Found ${professionals.length} professionals with reviews to update`,
        "ReviewAggregateCronService"
      );

      let successCount = 0;
      let errorCount = 0;

      for (const professional of professionals) {
        try {
          await this.reviewService.updateProfessionalRatingAggregate(
            professional.id
          );
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to update aggregates for professional ${professional.id}: ${error.message}`,
            "ReviewAggregateCronService"
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Nightly aggregate update completed: ${successCount} successful, ${errorCount} errors`,
        "ReviewAggregateCronService"
      );
    } catch (error) {
      this.logger.error(
        `Nightly aggregate update failed: ${error.message}`,
        "ReviewAggregateCronService"
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateRecentProfessionalRatingAggregates() {
    this.logger.log(
      "Starting hourly review aggregate update for recent changes",
      "ReviewAggregateCronService"
    );

    try {
      // Get professionals with reviews updated in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const professionals = await this.prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                name: "PROFESSIONAL",
              },
            },
          },
          OR: [
            {
              professionalReviews: {
                some: {
                  updatedAt: {
                    gte: oneHourAgo,
                  },
                },
              },
            },
            {
              ratingAggregate: {
                lastCalculated: {
                  lt: oneHourAgo,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          fullName: true,
        },
      });

      this.logger.log(
        `Found ${professionals.length} professionals with recent review changes`,
        "ReviewAggregateCronService"
      );

      for (const professional of professionals) {
        try {
          await this.reviewService.updateProfessionalRatingAggregate(
            professional.id
          );
        } catch (error) {
          this.logger.error(
            `Failed to update aggregates for professional ${professional.id}: ${error.message}`,
            "ReviewAggregateCronService"
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Hourly aggregate update failed: ${error.message}`,
        "ReviewAggregateCronService"
      );
    }
  }
}































