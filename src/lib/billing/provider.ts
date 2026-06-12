export interface CheckoutSession {
  url: string;
  sessionId: string;
  provider: "paypal" | "paddle";
}

export interface WebhookResult {
  companyId?: string;
  planId?: string;
  status: "active" | "cancelled" | "past_due";
  externalSubscriptionId?: string;
  externalCustomerId?: string;
}

export interface PaymentProvider {
  name: "paypal" | "paddle";
  createCheckout(planId: string, companyId: string, returnUrl: string): Promise<CheckoutSession>;
  cancelSubscription(externalSubscriptionId: string): Promise<void>;
  handleWebhook(payload: unknown, headers?: Headers): Promise<WebhookResult | null>;
}

export function getPaymentProvider(provider: "paypal" | "paddle"): PaymentProvider {
  if (provider === "paddle") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { paddleProvider } = require("./paddle") as { paddleProvider: PaymentProvider };
    return paddleProvider;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { paypalProvider } = require("./paypal") as { paypalProvider: PaymentProvider };
  return paypalProvider;
}
