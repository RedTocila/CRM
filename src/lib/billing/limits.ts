import { prisma } from "@/lib/db";

const LIMIT_COUNTERS: Record<string, (companyId: string) => Promise<number>> = {
  users: async (companyId) =>
    prisma.companyMember.count({ where: { companyId } }),
  contacts: async (companyId) =>
    prisma.contact.count({ where: { companyId, deletedAt: null } }),
  leads: async (companyId) =>
    prisma.lead.count({ where: { companyId, deletedAt: null } }),
  storage_mb: async () => 0,
};

export async function checkPlanLimit(
  companyId: string,
  limitKey: string
): Promise<{ allowed: boolean; current: number; max: number | null }> {
  const subscription = await prisma.companySubscription.findUnique({
    where: { companyId },
    include: { plan: { include: { limits: true } } },
  });

  if (!subscription) {
    return { allowed: true, current: 0, max: null };
  }

  const limit = subscription.plan.limits.find((l) => l.key === limitKey);
  if (!limit) {
    return { allowed: true, current: 0, max: null };
  }

  const counter = LIMIT_COUNTERS[limitKey];
  const current = counter ? await counter(companyId) : 0;

  return {
    allowed: current < limit.value,
    current,
    max: limit.value,
  };
}

export async function getPlanLimits(companyId: string) {
  const subscription = await prisma.companySubscription.findUnique({
    where: { companyId },
    include: { plan: { include: { limits: true, modules: true } } },
  });
  return subscription;
}
