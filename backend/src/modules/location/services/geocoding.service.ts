import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { LoggerService } from "@/core/logger.service";

@Injectable()
export class GeocodingService {
  constructor(private readonly logger: LoggerService) {}

  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<{
    address: string;
    city?: string;
    state?: string;
    country?: string;
    suburb?: string;
    district?: string;
  }> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`,
        {
          headers: {
            "User-Agent": "Smartz-Service-Provider/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new HttpException(
          "Geocoding service unavailable",
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      const data = await response.json();

      return {
        address:
          data.display_name ||
          `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        country: data.address?.country,
        suburb: data.address?.suburb,
        district: data.address?.state_district,
      };
    } catch (error) {
      this.logger.error(
        `Geocoding error: ${error.message}`,
        "GeocodingService"
      );

      // Return fallback address
      return {
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      };
    }
  }

  async forwardGeocode(address: string): Promise<{
    latitude: number;
    longitude: number;
    displayName: string;
  } | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`,
        {
          headers: {
            "User-Agent": "Smartz-Service-Provider/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new HttpException(
          "Geocoding service unavailable",
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      const data = await response.json();

      if (data.length === 0) {
        return null;
      }

      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    } catch (error) {
      this.logger.error(
        `Forward geocoding error: ${error.message}`,
        "GeocodingService"
      );
      return null;
    }
  }
}









