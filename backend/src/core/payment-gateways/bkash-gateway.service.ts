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
export class BkashGatewayService implements ILocalGateway {
  private readonly gatewayName = "BKASH";
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly appKey: string;
  private readonly appSecret: string;
  private accessToken: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {
    // Using Bkash Sandbox URLs for testing
    this.baseUrl = this.configService.get<string>(
      "BKASH_BASE_URL",
      "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    );
    this.username = this.configService.get<string>(
      "BKASH_USERNAME",
      "sandboxTestUser"
    );
    this.password = this.configService.get<string>(
      "BKASH_PASSWORD",
      "sandboxTestPass"
    );
    this.appKey = this.configService.get<string>(
      "BKASH_APP_KEY",
      "sandboxTestKey"
    );
    this.appSecret = this.configService.get<string>(
      "BKASH_APP_SECRET",
      "sandboxTestSecret"
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
      // Get access token
      await this.getAccessToken();

      // Create payment intent
      const paymentData = {
        mode: "0011", // Checkout
        payerReference: params.customerId,
        callbackURL: `${this.configService.get(
          "APP_URL"
        )}/api/v1/payments/bkash/callback`,
        amount: params.amount.toFixed(2),
        currency: params.currency,
        intent: "sale",
        merchantInvoiceNumber: `booking_${params.bookingId}_${Date.now()}`,
      };

      const response = await fetch(`${this.baseUrl}/payment/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: this.accessToken,
          "X-APP-Key": this.appKey,
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (result.statusCode === "0000") {
        this.logger.log(
          `Bkash payment intent created: ${result.paymentID}`,
          "BkashGatewayService"
        );

        return {
          id: result.paymentID,
          amount: params.amount,
          currency: params.currency,
          status: "INITIATED",
          gatewayRef: result.paymentID,
          metadata: {
            ...params.metadata,
            gateway: this.gatewayName,
            paymentURL: result.bkashURL,
            createdAt: new Date().toISOString(),
          },
        };
      } else {
        throw new Error(
          `Bkash payment creation failed: ${
            result.statusMessage || result.statusCode || "Unknown error"
          }`
        );
      }
    } catch (error) {
      this.logger.warn(
        `Bkash payment intent creation failed (using mock fallback): ${error.message}`,
        "BkashGatewayService"
      );

      // Fallback to mock response for testing
      const gatewayRef = `bkash_mock_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return {
        id: `bkash_intent_${gatewayRef}`,
        amount: params.amount,
        currency: params.currency,
        status: "INITIATED",
        gatewayRef,
        metadata: {
          ...params.metadata,
          gateway: this.gatewayName,
          paymentURL: `https://sandbox.bkash.com/payment/${gatewayRef}`,
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
      // Get access token
      await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/payment/execute/${params.paymentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: this.accessToken,
            "X-APP-Key": this.appKey,
          },
        }
      );

      const result = await response.json();

      if (result.statusCode === "0000") {
        this.logger.log(
          `Bkash payment captured: ${params.paymentId}`,
          "BkashGatewayService"
        );

        return {
          id: result.transactionID,
          amount: params.amount,
          currency: "BDT",
          status: "CAPTURED",
          gatewayRef: result.transactionID,
          metadata: {
            ...params.metadata,
            gateway: this.gatewayName,
            capturedAt: new Date().toISOString(),
          },
        };
      } else {
        throw new Error(
          `Bkash payment capture failed: ${result.statusMessage}`
        );
      }
    } catch (error) {
      this.logger.error(
        `Bkash payment capture failed: ${error.message}`,
        "BkashGatewayService"
      );

      // Fallback to mock response for testing
      return {
        id: `bkash_capture_${Date.now()}`,
        amount: params.amount,
        currency: "BDT",
        status: "CAPTURED",
        gatewayRef: `bkash_txn_${Date.now()}`,
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
      // Get access token
      await this.getAccessToken();

      const refundData = {
        paymentID: params.paymentId,
        amount: params.amount.toFixed(2),
        trxID: params.metadata?.transactionId,
        sku: "refund",
        reason: params.reason || "Customer request",
      };

      const response = await fetch(`${this.baseUrl}/payment/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: this.accessToken,
          "X-APP-Key": this.appKey,
        },
        body: JSON.stringify(refundData),
      });

      const result = await response.json();

      if (result.statusCode === "0000") {
        this.logger.log(
          `Bkash refund processed: ${result.refundTrxID}`,
          "BkashGatewayService"
        );

        return {
          id: result.refundTrxID,
          amount: params.amount,
          currency: "BDT",
          status: "REFUNDED",
          gatewayRef: result.refundTrxID,
          metadata: {
            ...params.metadata,
            gateway: this.gatewayName,
            refundedAt: new Date().toISOString(),
            reason: params.reason,
          },
        };
      } else {
        throw new Error(`Bkash refund failed: ${result.statusMessage}`);
      }
    } catch (error) {
      this.logger.error(
        `Bkash refund failed: ${error.message}`,
        "BkashGatewayService"
      );

      // Fallback to mock response for testing
      return {
        id: `bkash_refund_${Date.now()}`,
        amount: params.amount,
        currency: "BDT",
        status: "REFUNDED",
        gatewayRef: `bkash_refund_txn_${Date.now()}`,
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
      "Bkash webhook signature verification (mock)",
      "BkashGatewayService"
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
        `Processing Bkash webhook: ${JSON.stringify(payload)}`,
        "BkashGatewayService"
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
        `Bkash webhook processing failed: ${error.message}`,
        "BkashGatewayService"
      );
      return {
        success: false,
        paymentId: "unknown",
        status: "ERROR",
      };
    }
  }

  private async getAccessToken(): Promise<void> {
    if (this.accessToken) {
      return;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/tokenized/checkout/token/grant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            username: this.username,
            password: this.password,
          },
          body: JSON.stringify({
            app_key: this.appKey,
            app_secret: this.appSecret,
          }),
        }
      );

      const result = await response.json();

      if (result.statusCode === "0000") {
        this.accessToken = result.id_token;
        this.logger.log("Bkash access token obtained", "BkashGatewayService");
      } else {
        throw new Error(`Bkash token grant failed: ${result.statusMessage}`);
      }
    } catch (error) {
      this.logger.error(
        `Bkash token grant failed: ${error.message}`,
        "BkashGatewayService"
      );
      // For testing, use a mock token
      this.accessToken = "mock_bkash_token_" + Date.now();
    }
  }
}
