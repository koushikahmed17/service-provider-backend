import { Module } from "@nestjs/common";
import { GeocodingController } from "./controllers/geocoding.controller";
import { GeocodingService } from "./services/geocoding.service";
import { LoggerService } from "@/core/logger.service";

@Module({
  imports: [],
  controllers: [GeocodingController],
  providers: [GeocodingService, LoggerService],
  exports: [GeocodingService],
})
export class LocationModule {}
