"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Plus } from "lucide-react";

type Company = Record<string, unknown> & {
  id: string;
  name: string;
  slug: string;
  status: string;
  _count?: { members: number };
  subscription?: { plan?: { name: string }; status: string };
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    fetch("/api/platform/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? d.data ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Companies" description="Manage tenant workspaces">
        <Button asChild>
          <Link href="/super-admin/companies/new">
            <Plus className="h-4 w-4 mr-2" />
            New Company
          </Link>
        </Button>
      </PageHeader>

      <div className="glass-card rounded-xl overflow-hidden p-1">
      <DataTable
        columns={[
          { key: "name", header: "Name" },
          { key: "slug", header: "Slug" },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
          {
            key: "plan",
            header: "Plan",
            render: (r) => r.subscription?.plan?.name ?? "—",
          },
          {
            key: "members",
            header: "Users",
            render: (r) => r._count?.members ?? 0,
          },
        ]}
        data={companies}
        onRowClick={(r) => (window.location.href = `/super-admin/companies/${r.id}`)}
      />
      </div>
    </div>
  );
}
