import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { paypalProvider } from "@/lib/billing/paypal";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const result = await paypalProvider.handleWebhook(payload, req.headers);

    if (result?.companyId && result.status === "active") {
      const plan = await prisma.subscriptionPlan.findFirst({ where: { slug: "professional" } });
      if (plan) {
        await prisma.companySubscription.upsert({
          where: { companyId: result.companyId },
          create: {
            companyId: result.companyId,
            planId: plan.id,
            status: "ACTIVE",
            provider: "PAYPAL",
            externalSubscriptionId: result.externalSubscriptionId,
            externalCustomerId: result.externalCustomerId,
          },
          update: {
            status: "ACTIVE",
            provider: "PAYPAL",
            externalSubscriptionId: result.externalSubscriptionId,
            externalCustomerId: result.externalCustomerId,
          },
        });
      }
    }

    if (result?.companyId && result.status === "cancelled") {
      await prisma.companySubscription.updateMany({
        where: { companyId: result.companyId },
        data: { status: "CANCELLED" },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
