import { Injectable } from "@nestjs/common";
import {
  ILocalGateway,
  PaymentIntent,
  PaymentCapture,
  PaymentRefund,
  WebhookPayload,
} from "./payment-gateway.interface";

@Injectable()
export class StubPaymentGateway implements ILocalGateway {
  private readonly gatewayName = "STUB_GATEWAY";

  async createIntent(params: {
    amount: number;
    currency: string;
    bookingId: string;
    customerId: string;
    metadata?: any;
  }): Promise<PaymentIntent> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const gatewayRef = `stub_intent_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return {
      id: `intent_${gatewayRef}`,
      amount: params.amount,
      currency: params.currency,
      status: "INITIATED",
      gatewayRef,
      metadata: {
        ...params.metadata,
        gateway: this.gatewayName,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async capturePayment(params: {
    paymentId: string;
    amount: number;
    metadata?: any;
  }): Promise<PaymentCapture> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const gatewayRef = `stub_capture_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    return {
      id: `capture_${gatewayRef}`,
      amount: params.amount,
      currency: "BDT",
      status: success ? "CAPTURED" : "FAILED",
      gatewayRef,
      metadata: {
        ...params.metadata,
        gateway: this.gatewayName,
        capturedAt: new Date().toISOString(),
        success,
      },
    };
  }

  async refundPayment(params: {
    paymentId: string;
    amount: number;
    reason?: string;
    metadata?: any;
  }): Promise<PaymentRefund> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const gatewayRef = `stub_refund_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Simulate 90% success rate for refunds
    const success = Math.random() > 0.1;

    return {
      id: `refund_${gatewayRef}`,
      amount: params.amount,
      currency: "BDT",
      status: success ? "REFUNDED" : "FAILED",
      gatewayRef,
      metadata: {
        ...params.metadata,
        gateway: this.gatewayName,
        refundedAt: new Date().toISOString(),
        reason: params.reason,
        success,
      },
    };
  }

  verifyWebhook(payload: any, signature: string): boolean {
    // In a real implementation, this would verify the signature
    // For stub, we'll just check if signature exists and is not empty
    return signature && signature.length > 0;
  }

  async processWebhook(payload: WebhookPayload): Promise<{
    success: boolean;
    paymentId: string;
    status: string;
  }> {
    // Simulate webhook processing delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate 98% success rate for webhook processing
    const success = Math.random() > 0.02;

    return {
      success,
      paymentId: payload.paymentId,
      status: payload.status,
    };
  }
}































