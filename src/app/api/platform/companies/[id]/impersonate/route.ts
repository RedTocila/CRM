import { prisma } from "@/lib/db";
import { withPlatform } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { writeAuditLog } from "@/lib/audit/logger";

function getClientIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined
  );
}

export const POST = withPlatform(async (req, ctx) => {
  try {
    const company = await prisma.company.findFirst({
      where: { id: ctx.params.id, deletedAt: null },
    });

    if (!company) {
      return jsonError("Company not found", 404);
    }

    if (company.status === "SUSPENDED") {
      return jsonError("Cannot impersonate a suspended company", 403);
    }

    await prisma.impersonationSession.updateMany({
      where: { adminId: ctx.user.id, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    const session = await prisma.impersonationSession.create({
      data: {
        adminId: ctx.user.id,
        companyId: company.id,
        isActive: true,
      },
    });

    await writeAuditLog({
      userId: ctx.user.id,
      companyId: company.id,
      action: "impersonation.started",
      resource: "impersonation_session",
      resourceId: session.id,
      isImpersonation: true,
      ipAddress: getClientIp(req),
      metadata: { companySlug: company.slug },
    });

    return jsonOk({
      session: {
        id: session.id,
        companyId: company.id,
        companySlug: company.slug,
        startedAt: session.startedAt,
      },
      sessionUpdate: {
        impersonatingCompanyId: company.id,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
