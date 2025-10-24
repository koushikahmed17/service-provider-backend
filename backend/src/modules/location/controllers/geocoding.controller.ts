import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { GeocodingService } from "../services/geocoding.service";

@Controller("location")
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get("reverse-geocode")
  async reverseGeocode(@Query("lat") lat: string, @Query("lon") lon: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException("Invalid latitude or longitude");
    }

    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException("Latitude must be between -90 and 90");
    }

    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException("Longitude must be between -180 and 180");
    }

    return this.geocodingService.reverseGeocode(latitude, longitude);
  }

  @Get("forward-geocode")
  async forwardGeocode(@Query("address") address: string) {
    if (!address) {
      throw new BadRequestException("Address is required");
    }

    return this.geocodingService.forwardGeocode(address);
  }
}








