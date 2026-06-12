import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

interface AuditLogInput {
  companyId?: string | null;
  userId?: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  isImpersonation?: boolean;
  ipAddress?: string;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
        isImpersonation: input.isImpersonation ?? false,
        ipAddress: input.ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
