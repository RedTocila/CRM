import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const TENANT_SCOPED_MODELS = [
  "Lead", "Contact", "Deal", "Task", "CalendarEvent", "Project", "Ticket",
  "Invoice", "Estimate", "Quote", "Campaign", "EmailSequence", "Form",
  "Document", "KBArticle", "WhatsAppMessage", "SMSMessage", "Automation",
  "CustomFieldDefinition", "CustomFieldValue", "Dashboard", "ReportDefinition",
  "Pipeline", "CompanyMember", "Role", "Department",
] as const;

export function createTenantPrisma(companyId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.includes(model as typeof TENANT_SCOPED_MODELS[number])) {
            return query(args);
          }

          if (["findMany", "findFirst", "count", "aggregate"].includes(operation)) {
            const where = (args as { where?: Record<string, unknown> }).where ?? {};
            (args as { where: Record<string, unknown> }).where = { ...where, companyId };
          }

          if (["create", "createMany"].includes(operation)) {
            const data = (args as { data: Record<string, unknown> }).data;
            if (Array.isArray(data)) {
              (args as { data: Record<string, unknown>[] }).data = data.map((d) => ({ ...d, companyId }));
            } else {
              (args as { data: Record<string, unknown> }).data = { ...data, companyId };
            }
          }

          if (["update", "updateMany", "delete", "deleteMany"].includes(operation)) {
            const where = (args as { where?: Record<string, unknown> }).where ?? {};
            (args as { where: Record<string, unknown> }).where = { ...where, companyId };
          }

          return query(args);
        },
      },
    },
  });
}

export type TenantPrisma = ReturnType<typeof createTenantPrisma>;
