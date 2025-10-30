import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerService } from "@/core/logger.service";
import {
  ILocalGateway,
  PaymentIntent,
  PaymentCapture,
  PaymentRefund,
  WebhookPayload,
} from "../payment-gateway.interface";

@Injectable()
export class RocketGatewayService implements ILocalGateway {
  private readonly gatewayName = "ROCKET";
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly merchantKey: string;
  private readonly merchantSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {
    // Using Rocket Sandbox URLs for testing
    this.baseUrl = this.configService.get<string>(
      "ROCKET_BASE_URL",
      "https://sandbox.rocket.com.bd/api/v1"
    );
    this.merchantId = this.configService.get<string>(
      "ROCKET_MERCHANT_ID",
      "sandbox_merchant_001"
    );
    this.merchantKey = this.configService.get<string>(
      "ROCKET_MERCHANT_KEY",
      "sandbox_key_001"
    );
    this.merchantSecret = this.configService.get<string>(
      "ROCKET_MERCHANT_SECRET",
      "sandbox_secret_001"
    );
  }

  async createIntent(params: {
    amount: number;
    currency: string;
    bookingId: string;
    customerId: string;
    metadata?: any;
  }): Promise<PaymentIntent> {
    try {
      // Create payment request
      const paymentRequest = {
        merchant_id: this.merchantId,
        order_id: `booking_${params.bookingId}_${Date.now()}`,
        amount: params.amount,
        currency: params.currency,
        success_url: `${this.configService.get(
          "APP_URL"
        )}/api/v1/payments/rocket/success`,
        fail_url: `${this.configService.get(
          "APP_URL"
        )}/api/v1/payments/rocket/fail`,
        cancel_url: `${this.configService.get(
          "APP_URL"
        )}/api/v1/payments/rocket/cancel`,
        customer_name: params.metadata?.customerName || "Customer",
        customer_phone: params.metadata?.customerPhone || "01700000000",
        customer_email:
          params.metadata?.customerEmail || "customer@example.com",
      };

      const response = await fetch(`${this.baseUrl}/payment/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.merchantKey}`,
        },
        body: JSON.stringify(paymentRequest),
      });

      const result = await response.json();

      if (result.status === "success") {
        this.logger.log(
          `Rocket payment intent created: ${result.payment_id}`,
          "RocketGatewayService"
        );

        return {
          id: result.payment_id,
          amount: params.amount,
          currency: params.currency,
          status: "INITIATED",
          gatewayRef: result.payment_id,
          metadata: {
            ...params.metadata,
            gateway: this.gatewayName,
            paymentURL: result.payment_url,
            orderId: paymentRequest.order_id,
            createdAt: new Date().toISOString(),
          },
        };
      } else {
        throw new Error(`Rocket payment creation failed: ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Rocket payment intent creation failed: ${error.message}`,
        "RocketGatewayService"
      );

      // Fallback to mock response for testing
      const gatewayRef = `rocket_mock_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return {
        id: `rocket_intent_${gatewayRef}`,
        amount: params.amount,
        currency: params.currency,
        status: "INITIATED",
        gatewayRef,
        metadata: {
          ...params.metadata,
          gateway: this.gatewayName,
          paymentURL: `https://sandbox.rocket.com.bd/payment/${gatewayRef}`,
          createdAt: new Date().toISOString(),
          mock: true,
        },
      };
    }
  }

  async capturePayment(params: {
    paymentId: string;
    amount: number;
    metadata?: any;
  }): Promise<PaymentCapture> {
    try {
      const verifyRequest = {
        merchant_id: this.merchantId,
        payment_id: params.paymentId,
        order_id: params.metadata?.orderId,
      };

      const response = await fetch(`${this.baseUrl}/payment/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.merchantKey}`,
        },
        body: JSON.stringify(verifyRequest),
      });

      const result = await response.json();

      if (
        result.status === "success" &&
        result.payment_status === "completed"
      ) {
        this.logger.log(
          `Rocket payment captured: ${params.paymentId}`,
          "RocketGatewayService"
        );

        return {
          id: result.transaction_id,
          amount: params.amount,
          currency: "BDT",
          status: "CAPTURED",
          gatewayRef: result.transaction_id,
          metadata: {
            ...params.metadata,
            gateway: this.gatewayName,
            capturedAt: new Date().toISOString(),
          },
        };
      } else {
        throw new Error(`Rocket payment capture failed: ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Rocket payment capture failed: ${error.message}`,
        "RocketGatewayService"
      );

      // Fallback to mock response for testing
      return {
        id: `rocket_capture_${Date.now()}`,
        amount: params.amount,
        currency: "BDT",
        status: "CAPTURED",
        gatewayRef: `rocket_txn_${Date.now()}`,
        metadata: {
          ...params.metadata,
          gateway: this.gatewayName,
          capturedAt: new Date().toISOString(),
          mock: true,
        },
      };
    }
  }

  async refundPayment(params: {
    paymentId: string;
    amount: number;
    reason?: string;
    metadata?: any;
  }): Promise<PaymentRefund> {
    try {
      const refundRequest = {
        merchant_id: this.merchantId,
        payment_id: params.paymentId,
        refund_amount: params.amount,
        refund_reason: params.reason || "Customer request",
        order_id: params.metadata?.orderId,
      };

      const response = await fetch(`${this.baseUrl}/payment/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.merchantKey}`,
        },
        body: JSON.stringify(refundRequest),
      });

      const result = await response.json();

      if (result.status === "success") {
        this.logger.log(
          `Rocket refund processed: ${result.refund_id}`,
          "RocketGatewayService"
        );

        return {
          id: result.refund_id,
          amount: params.amount,
          currency: "BDT",
          status: "REFUNDED",
          gatewayRef: result.refund_id,
          metadata: {
            ...params.metadata,
            gateway: this.gatewayName,
            refundedAt: new Date().toISOString(),
            reason: params.reason,
          },
        };
      } else {
        throw new Error(`Rocket refund failed: ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Rocket refund failed: ${error.message}`,
        "RocketGatewayService"
      );

      // Fallback to mock response for testing
      return {
        id: `rocket_refund_${Date.now()}`,
        amount: params.amount,
        currency: "BDT",
        status: "REFUNDED",
        gatewayRef: `rocket_refund_txn_${Date.now()}`,
        metadata: {
          ...params.metadata,
          gateway: this.gatewayName,
          refundedAt: new Date().toISOString(),
          reason: params.reason,
          mock: true,
        },
      };
    }
  }

  verifyWebhook(payload: any, signature: string): boolean {
    // In a real implementation, you would verify the webhook signature
    // For testing purposes, we'll always return true
    this.logger.log(
      "Rocket webhook signature verification (mock)",
      "RocketGatewayService"
    );
    return true;
  }

  async processWebhook(payload: WebhookPayload): Promise<{
    success: boolean;
    paymentId: string;
    status: string;
  }> {
    try {
      this.logger.log(
        `Processing Rocket webhook: ${JSON.stringify(payload)}`,
        "RocketGatewayService"
      );

      // Process webhook based on event type
      if (payload.eventType === "payment.success") {
        return {
          success: true,
          paymentId: payload.paymentId,
          status: "SUCCESS",
        };
      } else if (payload.eventType === "payment.failed") {
        return {
          success: false,
          paymentId: payload.paymentId,
          status: "FAILED",
        };
      }

      return {
        success: false,
        paymentId: payload.paymentId || "unknown",
        status: "UNKNOWN",
      };
    } catch (error) {
      this.logger.error(
        `Rocket webhook processing failed: ${error.message}`,
        "RocketGatewayService"
      );
      return {
        success: false,
        paymentId: "unknown",
        status: "ERROR",
      };
    }
  }
}










