import { Module } from "@nestjs/common";
import { AnalyticsController } from "./controllers/analytics.controller";
import { AnalyticsService } from "./services/analytics.service";
import { DynamicAnalyticsService } from "./services/dynamic-analytics.service";

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, DynamicAnalyticsService],
  exports: [AnalyticsService, DynamicAnalyticsService],
})
export class AnalyticsModule {}
