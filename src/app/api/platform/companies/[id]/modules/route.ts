import { z } from "zod";
import { prisma } from "@/lib/db";
import { withPlatform } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { writeAuditLog } from "@/lib/audit/logger";

const updateModulesSchema = z.object({
  modules: z
    .array(
      z.object({
        moduleId: z.string().min(1),
        enabled: z.boolean(),
      })
    )
    .min(1),
});

export const GET = withPlatform(async (_req, ctx) => {
  try {
    const company = await prisma.company.findFirst({
      where: { id: ctx.params.id, deletedAt: null },
    });

    if (!company) {
      return jsonError("Company not found", 404);
    }

    const modules = await prisma.companyModule.findMany({
      where: { companyId: company.id },
      include: { module: true },
      orderBy: { module: { sortOrder: "asc" } },
    });

    const definitions = await prisma.moduleDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return jsonOk({ modules, definitions });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withPlatform(async (req, ctx) => {
  try {
    const body = updateModulesSchema.parse(await req.json());

    const company = await prisma.company.findFirst({
      where: { id: ctx.params.id, deletedAt: null },
    });

    if (!company) {
      return jsonError("Company not found", 404);
    }

    const moduleIds = body.modules.map((m) => m.moduleId);
    const validModules = await prisma.moduleDefinition.findMany({
      where: { id: { in: moduleIds } },
      select: { id: true },
    });

    if (validModules.length !== moduleIds.length) {
      return jsonError("One or more module IDs are invalid", 400);
    }

    await prisma.$transaction(
      body.modules.map((mod) =>
        prisma.companyModule.upsert({
          where: {
            companyId_moduleId: {
              companyId: company.id,
              moduleId: mod.moduleId,
            },
          },
          create: {
            companyId: company.id,
            moduleId: mod.moduleId,
            enabled: mod.enabled,
          },
          update: {
            enabled: mod.enabled,
            ...(mod.enabled ? { enabledAt: new Date() } : {}),
          },
        })
      )
    );

    const modules = await prisma.companyModule.findMany({
      where: { companyId: company.id },
      include: { module: true },
      orderBy: { module: { sortOrder: "asc" } },
    });

    await writeAuditLog({
      userId: ctx.user.id,
      companyId: company.id,
      action: "company.modules.updated",
      resource: "company_module",
      resourceId: company.id,
      metadata: { modules: body.modules },
    });

    return jsonOk({ modules });
  } catch (error) {
    return handleApiError(error);
  }
});
