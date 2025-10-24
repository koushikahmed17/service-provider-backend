import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeController,
} from "@nestjs/swagger";
import { PaymentService } from "../services/payment.service";

@ApiTags("Webhooks")
@ApiExcludeController() // Hide from Swagger docs
@Controller("payments/webhook")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Process payment webhook" })
  @ApiResponse({
    status: 200,
    description: "Webhook processed successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid webhook payload",
  })
  async processWebhook(
    @Body() payload: any,
    @Headers("x-signature") signature: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      this.logger.log("Received payment webhook", "WebhookController");

      const result = await this.paymentService.processWebhook(
        payload,
        signature
      );

      if (result.success) {
        this.logger.log(
          `Webhook processed successfully for payment ${result.paymentId}`,
          "WebhookController"
        );
        return {
          success: true,
          message: "Webhook processed successfully",
        };
      } else {
        this.logger.warn(
          `Webhook processing failed for payment ${result.paymentId}`,
          "WebhookController"
        );
        return {
          success: false,
          message: "Webhook processing failed",
        };
      }
    } catch (error) {
      this.logger.error(
        `Webhook processing error: ${error.message}`,
        "WebhookController"
      );
      return {
        success: false,
        message: "Internal server error",
      };
    }
  }
}






























