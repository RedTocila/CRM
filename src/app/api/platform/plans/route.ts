import { BillingInterval } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withPlatform } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { writeAuditLog } from "@/lib/audit/logger";
import { slugify } from "@/lib/utils";

const createPlanSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  priceMonthly: z.coerce.number().nonnegative(),
  priceYearly: z.coerce.number().nonnegative(),
  interval: z.enum(["MONTHLY", "YEARLY"]).optional(),
  paypalPlanId: z.string().optional(),
  paddlePriceId: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  moduleIds: z.array(z.string().min(1)).default([]),
  limits: z.record(z.string(), z.number().int().nonnegative()).optional(),
});

const planInclude = {
  limits: true,
  modules: { include: { module: true } },
  _count: { select: { subscriptions: true } },
} as const;

export const GET = withPlatform(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const plans = await prisma.subscriptionPlan.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: planInclude,
      orderBy: { sortOrder: "asc" },
    });

    return jsonOk({ plans });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withPlatform(async (req, ctx) => {
  try {
    const body = createPlanSchema.parse(await req.json());
    const slug = slugify(body.slug ?? body.name);

    const existing = await prisma.subscriptionPlan.findUnique({ where: { slug } });
    if (existing) {
      return jsonError("Plan slug already exists", 409);
    }

    if (body.moduleIds.length > 0) {
      const validModules = await prisma.moduleDefinition.findMany({
        where: { id: { in: body.moduleIds } },
        select: { id: true },
      });
      if (validModules.length !== body.moduleIds.length) {
        return jsonError("One or more module IDs are invalid", 400);
      }
    }

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.subscriptionPlan.create({
        data: {
          name: body.name,
          slug,
          description: body.description,
          priceMonthly: body.priceMonthly,
          priceYearly: body.priceYearly,
          interval: (body.interval as BillingInterval) ?? BillingInterval.MONTHLY,
          paypalPlanId: body.paypalPlanId,
          paddlePriceId: body.paddlePriceId,
          isActive: body.isActive ?? true,
          sortOrder: body.sortOrder ?? 0,
        },
      });

      if (body.moduleIds.length > 0) {
        await tx.planModule.createMany({
          data: body.moduleIds.map((moduleId) => ({
            planId: created.id,
            moduleId,
          })),
        });
      }

      if (body.limits) {
        await tx.planLimit.createMany({
          data: Object.entries(body.limits).map(([key, value]) => ({
            planId: created.id,
            key,
            value,
          })),
        });
      }

      return created;
    });

    const result = await prisma.subscriptionPlan.findUnique({
      where: { id: plan.id },
      include: planInclude,
    });

    await writeAuditLog({
      userId: ctx.user.id,
      action: "plan.created",
      resource: "subscription_plan",
      resourceId: plan.id,
      metadata: { slug, name: body.name },
    });

    return jsonOk({ plan: result }, 201);
  } catch (error) {
    return handleApiError(error);
  }
});
