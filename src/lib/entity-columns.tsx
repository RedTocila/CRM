import { StatusBadge } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Column } from "@/components/shared/data-table";

type Row = Record<string, unknown> & { id: string };

export const entityColumns: Record<string, Column<Row>[]> = {
  leads: [
    { key: "firstName", header: "First Name" },
    { key: "lastName", header: "Last Name" },
    { key: "email", header: "Email" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
    { key: "score", header: "Score" },
    { key: "source", header: "Source" },
  ],
  contacts: [
    { key: "firstName", header: "First Name" },
    { key: "lastName", header: "Last Name" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "company", header: "Company" },
  ],
  tasks: [
    { key: "title", header: "Title" },
    { key: "priority", header: "Priority", render: (r) => <StatusBadge status={String(r.priority)} /> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
    { key: "dueDate", header: "Due", render: (r) => r.dueDate ? new Date(String(r.dueDate)).toLocaleDateString() : "—" },
  ],
  tickets: [
    { key: "subject", header: "Subject" },
    { key: "priority", header: "Priority", render: (r) => <StatusBadge status={String(r.priority)} /> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
  ],
  projects: [
    { key: "name", header: "Name" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "ACTIVE")} /> },
    { key: "startDate", header: "Start", render: (r) => r.startDate ? new Date(String(r.startDate)).toLocaleDateString() : "—" },
  ],
  invoices: [
    { key: "number", header: "Invoice #" },
    { key: "contactName", header: "Contact" },
    { key: "total", header: "Total", render: (r) => formatCurrency(Number(r.total ?? 0)) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "DRAFT")} /> },
  ],
  estimates: [
    { key: "number", header: "Estimate #" },
    { key: "contactName", header: "Contact" },
    { key: "total", header: "Total", render: (r) => formatCurrency(Number(r.total ?? 0)) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "DRAFT")} /> },
  ],
  quotes: [
    { key: "number", header: "Quote #" },
    { key: "contactName", header: "Contact" },
    { key: "total", header: "Total", render: (r) => formatCurrency(Number(r.total ?? 0)) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "DRAFT")} /> },
  ],
  forms: [
    { key: "name", header: "Name" },
    { key: "isActive", header: "Status", render: (r) => <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
  ],
  "knowledge-base": [
    { key: "title", header: "Title" },
    { key: "slug", header: "Slug" },
    { key: "published", header: "Published", render: (r) => <Badge variant={r.published ? "default" : "secondary"}>{r.published ? "Yes" : "Draft"}</Badge> },
  ],
  marketing: [
    { key: "name", header: "Campaign" },
    { key: "type", header: "Type" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "DRAFT")} /> },
  ],
  "email-campaigns": [
    { key: "name", header: "Sequence" },
    { key: "isActive", header: "Status", render: (r) => <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
  ],
  calendar: [
    { key: "title", header: "Event" },
    { key: "location", header: "Location" },
    { key: "startAt", header: "Start", render: (r) => new Date(String(r.startAt)).toLocaleString() },
  ],
  whatsapp: [
    { key: "to", header: "To" },
    { key: "body", header: "Message", render: (r) => String(r.body ?? "").slice(0, 60) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "SENT")} /> },
  ],
  sms: [
    { key: "to", header: "To" },
    { key: "body", header: "Message", render: (r) => String(r.body ?? "").slice(0, 60) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "SENT")} /> },
  ],
  documents: [
    { key: "name", header: "Name" },
    { key: "url", header: "URL", render: (r) => <span className="text-primary truncate max-w-[200px] inline-block">{String(r.url ?? "")}</span> },
  ],
  automations: [
    { key: "name", header: "Name" },
    { key: "isActive", header: "Status", render: (r) => <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge> },
  ],
};
