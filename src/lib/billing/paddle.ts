import { prisma } from "@/lib/db";
import type { CheckoutSession, PaymentProvider, WebhookResult } from "./provider";

const PADDLE_API =
  process.env.PADDLE_ENVIRONMENT === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

export const paddleProvider: PaymentProvider = {
  name: "paddle",

  async createCheckout(planId, companyId, returnUrl): Promise<CheckoutSession> {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan?.paddlePriceId) throw new Error("Paddle price not configured");

    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) throw new Error("Paddle API key not configured");

    const res = await fetch(`${PADDLE_API}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: plan.paddlePriceId, quantity: 1 }],
        custom_data: { company_id: companyId },
        checkout: { url: returnUrl },
      }),
    });

    const data = (await res.json()) as {
      data: { id: string; checkout: { url: string } };
    };

    return {
      url: data.data.checkout?.url ?? returnUrl,
      sessionId: data.data.id,
      provider: "paddle",
    };
  },

  async cancelSubscription(externalSubscriptionId): Promise<void> {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) throw new Error("Paddle API key not configured");

    await fetch(`${PADDLE_API}/subscriptions/${externalSubscriptionId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ effective_from: "next_billing_period" }),
    });
  },

  async handleWebhook(payload, _headers?: Headers): Promise<WebhookResult | null> {
    const event = payload as {
      event_type: string;
      data: {
        id: string;
        custom_data?: { company_id?: string };
        subscription_id?: string;
        customer_id?: string;
      };
    };

    if (event.event_type === "subscription.activated") {
      return {
        companyId: event.data.custom_data?.company_id,
        status: "active",
        externalSubscriptionId: event.data.subscription_id ?? event.data.id,
        externalCustomerId: event.data.customer_id,
      };
    }

    if (event.event_type === "subscription.canceled") {
      return {
        companyId: event.data.custom_data?.company_id,
        status: "cancelled",
        externalSubscriptionId: event.data.subscription_id ?? event.data.id,
      };
    }

    return null;
  },
};
