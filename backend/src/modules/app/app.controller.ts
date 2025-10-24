import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("App")
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: "Get welcome message" })
  @ApiResponse({ status: 200, description: "Welcome message" })
  getHello() {
    return {
      message: "Hello World! Welcome to Service Provider API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };
  }
}



