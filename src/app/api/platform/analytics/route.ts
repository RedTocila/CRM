import { prisma } from "@/lib/db";
import { withPlatform } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";

export const GET = withPlatform(async () => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      deletedCompanies,
      totalUsers,
      activeUsers,
      superAdmins,
      subscriptionsByStatus,
      subscriptionsByPlan,
      totalMembers,
      activeImpersonations,
    ] = await Promise.all([
      prisma.company.count({ where: { deletedAt: null } }),
      prisma.company.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.company.count({ where: { status: "SUSPENDED", deletedAt: null } }),
      prisma.company.count({ where: { deletedAt: { not: null } } }),
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { isSuperAdmin: true } }),
      prisma.companySubscription.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.companySubscription.groupBy({
        by: ["planId"],
        _count: { _all: true },
      }),
      prisma.companyMember.count(),
      prisma.impersonationSession.count({ where: { isActive: true } }),
    ]);

    const plans = await prisma.subscriptionPlan.findMany({
      select: { id: true, name: true, slug: true },
    });
    const planMap = new Map(plans.map((p) => [p.id, p]));

    return jsonOk({
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        suspended: suspendedCompanies,
        deleted: deletedCompanies,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        superAdmins,
        totalMemberships: totalMembers,
      },
      subscriptions: {
        byStatus: subscriptionsByStatus.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        byPlan: subscriptionsByPlan.map((row) => ({
          planId: row.planId,
          plan: planMap.get(row.planId) ?? null,
          count: row._count._all,
        })),
      },
      impersonations: {
        active: activeImpersonations,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
