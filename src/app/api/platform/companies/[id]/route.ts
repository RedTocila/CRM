import { CompanyStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withPlatform } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { writeAuditLog } from "@/lib/audit/logger";

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  primaryColor: z.string().optional(),
  customDomain: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

const companyInclude = {
  subscription: { include: { plan: true } },
  modules: { include: { module: true } },
  _count: { select: { members: true } },
} as const;

async function getCompanyOr404(id: string) {
  const company = await prisma.company.findFirst({
    where: { id, deletedAt: null },
    include: companyInclude,
  });
  return company;
}

export const GET = withPlatform(async (_req, ctx) => {
  try {
    const company = await getCompanyOr404(ctx.params.id);
    if (!company) {
      return jsonError("Company not found", 404);
    }
    return jsonOk({ company });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withPlatform(async (req, ctx) => {
  try {
    const body = updateCompanySchema.parse(await req.json());
    const existing = await prisma.company.findFirst({
      where: { id: ctx.params.id, deletedAt: null },
    });

    if (!existing) {
      return jsonError("Company not found", 404);
    }

    if (body.customDomain) {
      const domainTaken = await prisma.company.findFirst({
        where: {
          customDomain: body.customDomain,
          id: { not: existing.id },
        },
      });
      if (domainTaken) {
        return jsonError("Custom domain already in use", 409);
      }
    }

    const company = await prisma.company.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
        ...(body.customDomain !== undefined && { customDomain: body.customDomain }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.status !== undefined && { status: body.status as CompanyStatus }),
      },
      include: companyInclude,
    });

    const action =
      body.status === "SUSPENDED"
        ? "company.suspended"
        : body.status === "ACTIVE"
          ? "company.activated"
          : "company.updated";

    await writeAuditLog({
      userId: ctx.user.id,
      companyId: company.id,
      action,
      resource: "company",
      resourceId: company.id,
      metadata: body,
    });

    return jsonOk({ company });
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withPlatform(async (_req, ctx) => {
  try {
    const existing = await prisma.company.findFirst({
      where: { id: ctx.params.id, deletedAt: null },
    });

    if (!existing) {
      return jsonError("Company not found", 404);
    }

    const company = await prisma.company.update({
      where: { id: existing.id },
      data: {
        status: CompanyStatus.DELETED,
        deletedAt: new Date(),
      },
      include: companyInclude,
    });

    await prisma.impersonationSession.updateMany({
      where: { companyId: existing.id, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    await writeAuditLog({
      userId: ctx.user.id,
      companyId: company.id,
      action: "company.deleted",
      resource: "company",
      resourceId: company.id,
    });

    return jsonOk({ company });
  } catch (error) {
    return handleApiError(error);
  }
});
