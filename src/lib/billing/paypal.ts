import { prisma } from "@/lib/db";
import type { CheckoutSession, PaymentProvider, WebhookResult } from "./provider";

const PAYPAL_API =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export const paypalProvider: PaymentProvider = {
  name: "paypal",

  async createCheckout(planId, companyId, returnUrl): Promise<CheckoutSession> {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan?.paypalPlanId) throw new Error("PayPal plan not configured");

    const token = await getAccessToken();
    const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: plan.paypalPlanId,
        custom_id: companyId,
        application_context: {
          return_url: returnUrl,
          cancel_url: `${returnUrl}?cancelled=true`,
        },
      }),
    });

    const data = (await res.json()) as { id: string; links: { rel: string; href: string }[] };
    const approveLink = data.links?.find((l) => l.rel === "approve");

    return {
      url: approveLink?.href ?? returnUrl,
      sessionId: data.id,
      provider: "paypal",
    };
  },

  async cancelSubscription(externalSubscriptionId): Promise<void> {
    const token = await getAccessToken();
    await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${externalSubscriptionId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Customer requested cancellation" }),
    });
  },

  async handleWebhook(payload, headers?: Headers): Promise<WebhookResult | null> {
    const event = payload as {
      event_type: string;
      resource: { id: string; custom_id?: string; subscriber?: { payer_id: string } };
    };

    if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      return {
        companyId: event.resource.custom_id,
        status: "active",
        externalSubscriptionId: event.resource.id,
        externalCustomerId: event.resource.subscriber?.payer_id,
      };
    }

    if (event.event_type === "BILLING.SUBSCRIPTION.CANCELLED") {
      return {
        companyId: event.resource.custom_id,
        status: "cancelled",
        externalSubscriptionId: event.resource.id,
      };
    }

    void headers;
    return null;
  },
};
