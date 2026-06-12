import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function logLeadActivity(params: {
  leadId: string;
  userId: string;
  type: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.leadActivity.create({
    data: {
      leadId: params.leadId,
      userId: params.userId,
      type: params.type,
      description: params.description,
      metadata: params.metadata,
    },
  });
}
