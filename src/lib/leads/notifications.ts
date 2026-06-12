import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createNotification(params: {
  userId: string;
  companyId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      companyId: params.companyId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
      metadata: params.metadata,
    },
  });
}

export async function notifyLeadAssigned(params: {
  assigneeId: string;
  companyId: string;
  leadId: string;
  leadName: string;
  tenantSlug: string;
}) {
  if (!params.assigneeId) return;
  await createNotification({
    userId: params.assigneeId,
    companyId: params.companyId,
    type: "LEAD_ASSIGNED",
    title: "New lead assigned",
    body: `You were assigned lead: ${params.leadName}`,
    link: `/app/${params.tenantSlug}/leads/${params.leadId}`,
    metadata: { leadId: params.leadId },
  });
}
