import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canManageTeam } from "@/lib/team/access";

const connectSchema = z.object({
  accessToken: z.string().min(1),
  adAccountId: z.string().min(1),
  adAccountName: z.string().optional(),
  pageId: z.string().optional(),
  pageName: z.string().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "marketing.campaign.read");
    if (denied) return denied;
    try {
      const integration = await prisma.marketingIntegration.findUnique({
        where: { companyId_provider: { companyId, provider: "facebook_ads" } },
      });
      return jsonOk({
        data: integration
          ? {
              connected: integration.connected,
              adAccountId: integration.adAccountId,
              adAccountName: integration.adAccountName,
              pageId: integration.pageId,
              pageName: integration.pageName,
              lastSyncAt: integration.lastSyncAt,
              settings: integration.settings,
            }
          : { connected: false },
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "marketing" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    if (!canManageTeam(user)) {
      return jsonError("Only admins can connect integrations", 403);
    }
    const denied = requirePerm(user, "marketing.campaign.create");
    if (denied) return denied;
    try {
      const body = connectSchema.parse(await req.json());
      const integration = await prisma.marketingIntegration.upsert({
        where: { companyId_provider: { companyId, provider: "facebook_ads" } },
        create: {
          companyId,
          provider: "facebook_ads",
          connected: true,
          accessToken: body.accessToken,
          adAccountId: body.adAccountId,
          adAccountName: body.adAccountName,
          pageId: body.pageId,
          pageName: body.pageName,
          lastSyncAt: new Date(),
          settings: {
            syncLeads: true,
            autoCreateLeads: true,
            campaignManagement: true,
          } as Prisma.InputJsonValue,
        },
        update: {
          connected: true,
          accessToken: body.accessToken,
          adAccountId: body.adAccountId,
          adAccountName: body.adAccountName,
          pageId: body.pageId,
          pageName: body.pageName,
          lastSyncAt: new Date(),
        },
      });
      return jsonOk({ data: { connected: true, adAccountName: integration.adAccountName } });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "marketing" }
);

export const DELETE = withApi(
  async (_req, { companyId, user }) => {
    if (!canManageTeam(user)) {
      return jsonError("Only admins can disconnect integrations", 403);
    }
    try {
      await prisma.marketingIntegration.updateMany({
        where: { companyId, provider: "facebook_ads" },
        data: { connected: false, accessToken: null, refreshToken: null },
      });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "marketing" }
);
