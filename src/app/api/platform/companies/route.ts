import { CompanyStatus, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withPlatform } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { writeAuditLog } from "@/lib/audit/logger";
import { slugify } from "@/lib/utils";

const createCompanySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  planId: z.string().min(1),
  primaryColor: z.string().optional(),
  customDomain: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  ownerName: z.string().min(1).optional(),
  ownerPassword: z.string().min(8).optional(),
});

const companyInclude = {
  subscription: { include: { plan: true } },
  modules: { include: { module: true } },
  _count: { select: { members: true } },
} as const;

export const GET = withPlatform(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as CompanyStatus | null;
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const companies = await prisma.company.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(status ? { status } : {}),
      },
      include: companyInclude,
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ companies });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withPlatform(async (req, ctx) => {
  try {
    const body = createCompanySchema.parse(await req.json());

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: body.planId },
      include: { modules: true },
    });

    if (!plan) {
      return jsonError("Plan not found", 404);
    }

    const baseSlug = slugify(body.slug ?? body.name);
    const slugExists = await prisma.company.findUnique({ where: { slug: baseSlug } });
    const finalSlug = slugExists ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    if (body.customDomain) {
      const domainTaken = await prisma.company.findUnique({
        where: { customDomain: body.customDomain },
      });
      if (domainTaken) {
        return jsonError("Custom domain already in use", 409);
      }
    }

    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          name: body.name,
          slug: finalSlug,
          displayName: body.displayName ?? body.name,
          primaryColor: body.primaryColor,
          customDomain: body.customDomain,
          status: CompanyStatus.ACTIVE,
        },
      });

      await tx.companySubscription.create({
        data: {
          companyId: created.id,
          planId: plan.id,
          status: SubscriptionStatus.TRIAL,
          provider: "MANUAL",
        },
      });

      if (plan.modules.length > 0) {
        await tx.companyModule.createMany({
          data: plan.modules.map((pm) => ({
            companyId: created.id,
            moduleId: pm.moduleId,
            enabled: true,
          })),
        });
      }

      const ownerRole = await tx.role.create({
        data: {
          companyId: created.id,
          name: "Owner",
          slug: "owner",
          isSystem: true,
        },
      });

      const allPerms = await tx.permission.findMany();
      if (allPerms.length > 0) {
        await tx.rolePermission.createMany({
          data: allPerms.map((p) => ({
            roleId: ownerRole.id,
            permissionId: p.id,
          })),
        });
      }

      if (body.ownerEmail) {
        let ownerUser = await tx.user.findUnique({
          where: { email: body.ownerEmail },
        });

        if (!ownerUser && body.ownerPassword) {
          const bcrypt = await import("bcryptjs");
          ownerUser = await tx.user.create({
            data: {
              email: body.ownerEmail,
              name: body.ownerName ?? body.ownerEmail,
              passwordHash: await bcrypt.hash(body.ownerPassword, 12),
            },
          });
        }

        if (ownerUser) {
          await tx.companyMember.create({
            data: {
              companyId: created.id,
              userId: ownerUser.id,
              roleId: ownerRole.id,
            },
          });
        }
      }

      const pipeline = await tx.pipeline.create({
        data: { companyId: created.id, name: "Sales Pipeline", isDefault: true },
      });

      const defaultStages = ["Qualification", "Proposal", "Negotiation", "Closed Won"];
      await tx.pipelineStage.createMany({
        data: defaultStages.map((name, order) => ({
          pipelineId: pipeline.id,
          name,
          order,
          probability: (order + 1) * 25,
        })),
      });

      return created;
    });

    const result = await prisma.company.findUnique({
      where: { id: company.id },
      include: companyInclude,
    });

    await writeAuditLog({
      userId: ctx.user.id,
      companyId: company.id,
      action: "company.created",
      resource: "company",
      resourceId: company.id,
      metadata: { planId: body.planId, slug: finalSlug },
    });

    return jsonOk({ company: result }, 201);
  } catch (error) {
    return handleApiError(error);
  }
});
