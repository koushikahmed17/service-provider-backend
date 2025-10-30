export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: "INITIATED" | "AUTHORIZED" | "CAPTURED" | "REFUNDED" | "FAILED";
  gatewayRef: string;
  metadata?: any;
}

export interface PaymentCapture {
  id: string;
  amount: number;
  currency: string;
  status: "CAPTURED" | "FAILED";
  gatewayRef: string;
  metadata?: any;
}

export interface PaymentRefund {
  id: string;
  amount: number;
  currency: string;
  status: "REFUNDED" | "FAILED";
  gatewayRef: string;
  metadata?: any;
}

export interface WebhookPayload {
  eventType: string;
  paymentId: string;
  gatewayRef: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: any;
  signature?: string;
}

export interface ILocalGateway {
  /**
   * Create a payment intent
   */
  createIntent(params: {
    amount: number;
    currency: string;
    bookingId: string;
    customerId: string;
    metadata?: any;
  }): Promise<PaymentIntent>;

  /**
   * Capture a payment
   */
  capturePayment(params: {
    paymentId: string;
    amount: number;
    metadata?: any;
  }): Promise<PaymentCapture>;

  /**
   * Refund a payment
   */
  refundPayment(params: {
    paymentId: string;
    amount: number;
    reason?: string;
    metadata?: any;
  }): Promise<PaymentRefund>;

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: any, signature: string): boolean;

  /**
   * Process webhook event
   */
  processWebhook(payload: WebhookPayload): Promise<{
    success: boolean;
    paymentId: string;
    status: string;
  }>;
}































