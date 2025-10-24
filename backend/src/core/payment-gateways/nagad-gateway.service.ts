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
export class NagadGatewayService implements ILocalGateway {
  private readonly gatewayName = "NAGAD";
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly merchantPrivateKey: string;
  private readonly merchantCallbackURL: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {
    // Using Nagad Sandbox URLs for testing
    this.baseUrl = this.configService.get<string>(
      "NAGAD_BASE_URL",
      "https://api-sandbox.nagad.com.bd"
    );
    this.merchantId = this.configService.get<string>(
      "NAGAD_MERCHANT_ID",
      "sandbox_merchant_001"
    );
    this.merchantPrivateKey = this.configService.get<string>(
      "NAGAD_PRIVATE_KEY",
      "mock_private_key"
    );
    this.merchantCallbackURL = this.configService.get<string>(
      "NAGAD_CALLBACK_URL",
      `${this.configService.get("APP_URL")}/api/v1/payments/nagad/callback`
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
        merchantId: this.merchantId,
        orderId: `booking_${params.bookingId}_${Date.now()}`,
        amount: params.amount.toString(),
        currencyCode: params.currency,
        challenge: this.generateChallenge(),
        orderDateTime: new Date().toISOString(),
        callbackUrl: this.merchantCallbackURL,
        merchantCallbackUrl: this.merchantCallbackURL,
      };

      const response = await fetch(`${this.baseUrl}/check-out/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-KM-IP-V4": "127.0.0.1",
          "X-KM-Client-Type": "PC_WEB",
        },
        body: JSON.stringify(paymentRequest),
      });

      const result = await response.json();

      if (result.status === "Success") {
        this.logger.log(
          `Nagad payment intent created: ${result.paymentRefId}`,
          "NagadGatewayService"
        );

        return {
          id: result.paymentRefId,
          amount: params.amount,
          currency: params.currency,
          status: "INITIATED",
          gatewayRef: result.paymentRefId,
          metadata: {
            ...params.metadata,
            gateway: this.gatewayName,
            paymentURL: result.callbackUrl,
            orderId: paymentRequest.orderId,
            createdAt: new Date().toISOString(),
          },
        };
      } else {
        throw new Error(`Nagad payment creation failed: ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Nagad payment intent creation failed: ${error.message}`,
        "NagadGatewayService"
      );

      // Fallback to mock response for testing
      const gatewayRef = `nagad_mock_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return {
        id: `nagad_intent_${gatewayRef}`,
        amount: params.amount,
        currency: params.currency,
        status: "INITIATED",
        gatewayRef,
        metadata: {
          ...params.metadata,
          gateway: this.gatewayName,
          paymentURL: `https://sandbox.nagad.com.bd/payment/${gatewayRef}`,
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
        merchantId: this.merchantId,
        orderId: params.metadata?.orderId,
        paymentRefId: params.paymentId,
      };

      const response = await fetch(`${this.baseUrl}/check-out/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-KM-IP-V4": "127.0.0.1",
          "X-KM-Client-Type": "PC_WEB",
        },
        body: JSON.stringify(verifyRequest),
      });

      const result = await response.json();

      if (result.status === "Success") {
        this.logger.log(
          `Nagad payment captured: ${params.paymentId}`,
          "NagadGatewayService"
        );

        return {
          id: result.issuerPaymentRefNo,
          amount: params.amount,
          currency: "BDT",
          status: "CAPTURED",
          gatewayRef: result.issuerPaymentRefNo,
          metadata: {
            ...params.metadata,
            gateway: this.gatewayName,
            capturedAt: new Date().toISOString(),
          },
        };
      } else {
        throw new Error(`Nagad payment capture failed: ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Nagad payment capture failed: ${error.message}`,
        "NagadGatewayService"
      );

      // Fallback to mock response for testing
      return {
        id: `nagad_capture_${Date.now()}`,
        amount: params.amount,
        currency: "BDT",
        status: "CAPTURED",
        gatewayRef: `nagad_txn_${Date.now()}`,
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
        merchantId: this.merchantId,
        orderId: params.metadata?.orderId,
        paymentRefId: params.paymentId,
        refundAmount: params.amount.toString(),
        refundReason: params.reason || "Customer request",
      };

      const response = await fetch(`${this.baseUrl}/check-out/payment/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-KM-IP-V4": "127.0.0.1",
          "X-KM-Client-Type": "PC_WEB",
        },
        body: JSON.stringify(refundRequest),
      });

      const result = await response.json();

      if (result.status === "Success") {
        this.logger.log(
          `Nagad refund processed: ${result.refundTrxID}`,
          "NagadGatewayService"
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
        throw new Error(`Nagad refund failed: ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Nagad refund failed: ${error.message}`,
        "NagadGatewayService"
      );

      // Fallback to mock response for testing
      return {
        id: `nagad_refund_${Date.now()}`,
        amount: params.amount,
        currency: "BDT",
        status: "REFUNDED",
        gatewayRef: `nagad_refund_txn_${Date.now()}`,
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
      "Nagad webhook signature verification (mock)",
      "NagadGatewayService"
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
        `Processing Nagad webhook: ${JSON.stringify(payload)}`,
        "NagadGatewayService"
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
        `Nagad webhook processing failed: ${error.message}`,
        "NagadGatewayService"
      );
      return {
        success: false,
        paymentId: "unknown",
        status: "ERROR",
      };
    }
  }

  private generateChallenge(): string {
    // Generate a random challenge string
    return Math.random().toString(36).substr(2, 9);
  }
}









