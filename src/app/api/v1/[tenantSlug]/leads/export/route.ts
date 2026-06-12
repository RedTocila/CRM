import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { leadListWhere } from "@/lib/leads/access";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/leads/constants";

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.export");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const format = searchParams.get("format") ?? "csv";

      const leads = await prisma.lead.findMany({
        where: leadListWhere(user, companyId),
        include: {
          assignee: { select: { name: true, email: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const headers = [
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "WhatsApp",
        "Company",
        "Website",
        "Industry",
        "Country",
        "City",
        "Status",
        "Source",
        "Priority",
        "Assigned To",
        "Lead Value",
        "Expected Revenue",
        "Conversion %",
        "Tags",
        "Created",
      ];

      const rows = leads.map((l) => [
        l.firstName,
        l.lastName ?? "",
        l.email ?? "",
        l.phone ?? "",
        l.whatsappNumber ?? "",
        l.company ?? "",
        l.website ?? "",
        l.industry ?? "",
        l.country ?? "",
        l.city ?? "",
        STATUS_LABELS[l.status] ?? l.status,
        l.source ? (SOURCE_LABELS[l.source] ?? l.source) : "",
        l.priority,
        l.assignee?.name ?? l.assignee?.email ?? "",
        l.leadValue?.toString() ?? "",
        l.expectedRevenue?.toString() ?? "",
        l.conversionProbability?.toString() ?? "",
        l.tags.map((t) => t.tag.name).join("; "),
        l.createdAt.toISOString(),
      ]);

      if (format === "csv") {
        const csv = [headers, ...rows]
          .map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          )
          .join("\n");

        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="leads-export.csv"`,
          },
        });
      }

      // Simple tab-separated for Excel compatibility
      const tsv = [headers, ...rows].map((row) => row.join("\t")).join("\n");
      return new NextResponse(tsv, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="leads-export.xls"`,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
