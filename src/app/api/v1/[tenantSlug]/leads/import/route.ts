import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { logLeadActivity } from "@/lib/leads/activity";
import type { LeadSource, LeadStatus, LeadPriority } from "@prisma/client";

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.create");
    if (denied) return denied;
    try {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || typeof file === "string") {
        return jsonError("CSV file required", 400);
      }

      const text = await (file as File).text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        return jsonError("File must have header and at least one row", 400);
      }

      const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
      const idx = (name: string) => header.indexOf(name);

      let imported = 0;
      for (const row of rows.slice(1)) {
        const firstName = row[idx("first_name")] || row[idx("firstname")] || row[0];
        if (!firstName) continue;

        const lead = await prisma.lead.create({
          data: {
            companyId,
            createdById: user.id,
            firstName,
            lastName: row[idx("last_name")] || row[idx("lastname")] || null,
            email: row[idx("email")] || null,
            phone: row[idx("phone")] || null,
            whatsappNumber: row[idx("whatsapp")] || row[idx("whatsapp_number")] || null,
            company: row[idx("company")] || row[idx("company_name")] || null,
            website: row[idx("website")] || null,
            industry: row[idx("industry")] || null,
            country: row[idx("country")] || null,
            city: row[idx("city")] || null,
            status: (row[idx("status")]?.toUpperCase().replace(/\s+/g, "_") as LeadStatus) || "NEW",
            source: row[idx("source")]?.toUpperCase().replace(/\s+/g, "_") as LeadSource | undefined,
            priority: (row[idx("priority")]?.toUpperCase() as LeadPriority) || "MEDIUM",
          },
        });

        await logLeadActivity({
          leadId: lead.id,
          userId: user.id,
          type: "lead.imported",
          description: "Lead imported from CSV",
        });
        imported++;
      }

      return jsonOk({ imported });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads", checkLimit: "leads" }
);
