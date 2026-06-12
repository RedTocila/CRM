import { prisma } from "@/lib/db";
import { withPlatform } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
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
    const activeSessions = await prisma.impersonationSession.findMany({
      where: { adminId: ctx.user.id, isActive: true },
      include: { company: { select: { id: true, slug: true } } },
    });

    if (activeSessions.length === 0) {
      return jsonOk({
        ended: 0,
        sessionUpdate: { impersonatingCompanyId: null },
      });
    }

    const now = new Date();
    await prisma.impersonationSession.updateMany({
      where: { adminId: ctx.user.id, isActive: true },
      data: { isActive: false, endedAt: now },
    });

    for (const session of activeSessions) {
      await writeAuditLog({
        userId: ctx.user.id,
        companyId: session.companyId,
        action: "impersonation.ended",
        resource: "impersonation_session",
        resourceId: session.id,
        isImpersonation: true,
        ipAddress: getClientIp(req),
        metadata: { companySlug: session.company.slug },
      });
    }

    return jsonOk({
      ended: activeSessions.length,
      sessionUpdate: { impersonatingCompanyId: null },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
