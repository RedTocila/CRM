import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { writeAuditLog } from "@/lib/audit/logger";

const updateSchema = z.object({
  displayName: z.string().optional(),
  primaryColor: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  name: z.string().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "settings.company.manage_settings");
    if (denied) return denied;
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          displayName: true,
          primaryColor: true,
          logoUrl: true,
          customDomain: true,
        },
      });
      return jsonOk({ data: company });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { permission: "settings.company.manage_settings" }
);

export const PATCH = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "settings.company.manage_settings");
    if (denied) return denied;
    try {
      const body = updateSchema.parse(await req.json());
      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          displayName: body.displayName,
          primaryColor: body.primaryColor,
          logoUrl: body.logoUrl || null,
          name: body.name,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          displayName: true,
          primaryColor: true,
          logoUrl: true,
        },
      });
      await writeAuditLog({
        companyId,
        userId: user.id,
        action: "company.settings.updated",
        resource: "company",
        resourceId: companyId,
      });
      return jsonOk({ data: company });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { permission: "settings.company.manage_settings" }
);
