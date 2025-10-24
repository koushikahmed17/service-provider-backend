import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { AuthModule } from "@/modules/auth/auth.module";
import { ReviewService } from "./services/review.service";
import { ReviewAggregateCronService } from "./services/review-aggregate-cron.service";
import { ReviewController } from "./controllers/review.controller";
import { AdminReviewController } from "./controllers/admin-review.controller";

@Module({
  imports: [AuthModule, ScheduleModule.forRoot()],
  controllers: [ReviewController, AdminReviewController],
  providers: [
    PrismaService,
    LoggerService,
    ReviewService,
    ReviewAggregateCronService,
  ],
  exports: [ReviewService],
})
export class ReviewModule {}
