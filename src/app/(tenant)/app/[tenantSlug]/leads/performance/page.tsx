"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Phone, Mail, Trophy, Target } from "lucide-react";
import { toast } from "sonner";

interface EmployeePerf {
  userId: string;
  name: string;
  role: string;
  totalLeadsAssigned: number;
  leadsContacted: number;
  leadsQualified: number;
  leadsWon: number;
  leadsLost: number;
  callsMade: number;
  emailsSent: number;
  commentsAdded: number;
  followUpsCompleted: number;
  revenueGenerated: number;
  conversionRate: number;
}

export default function LeadPerformancePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [filter, setFilter] = useState("month");
  const [employees, setEmployees] = useState<EmployeePerf[]>([]);
  const [callStats, setCallStats] = useState({ totalCalls: 0, avgDuration: 0, totalDuration: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/${tenantSlug}/leads/performance?filter=${filter}`
      );
      const json = await res.json();
      setEmployees(json.employees ?? []);
      setCallStats(json.callStats ?? { totalCalls: 0, avgDuration: 0, totalDuration: 0 });
    } catch {
      toast.error("Failed to load performance");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Performance" description="Track sales team metrics">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/app/${tenantSlug}/leads`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Leads
          </Link>
        </Button>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Calls" value={callStats.totalCalls} icon={Phone} />
        <StatCard
          label="Avg Duration"
          value={`${Math.floor(callStats.avgDuration / 60)}m ${callStats.avgDuration % 60}s`}
          icon={Phone}
        />
        <StatCard
          label="Call Time"
          value={`${Math.floor(callStats.totalDuration / 3600)}h`}
          icon={Phone}
        />
        <StatCard label="Active Reps" value={employees.length} icon={Target} />
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-3 font-medium">Employee</th>
                  <th className="text-right p-3 font-medium">Assigned</th>
                  <th className="text-right p-3 font-medium hidden sm:table-cell">Contacted</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">Qualified</th>
                  <th className="text-right p-3 font-medium">Won</th>
                  <th className="text-right p-3 font-medium hidden lg:table-cell">Calls</th>
                  <th className="text-right p-3 font-medium hidden lg:table-cell">Emails</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">Conv %</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.userId} className="border-b hover:bg-muted/20">
                    <td className="p-3">
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.role}</p>
                    </td>
                    <td className="p-3 text-right">{emp.totalLeadsAssigned}</td>
                    <td className="p-3 text-right hidden sm:table-cell">{emp.leadsContacted}</td>
                    <td className="p-3 text-right hidden md:table-cell">{emp.leadsQualified}</td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-amber-500" />
                        {emp.leadsWon}
                      </span>
                    </td>
                    <td className="p-3 text-right hidden lg:table-cell">{emp.callsMade}</td>
                    <td className="p-3 text-right hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {emp.emailsSent}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatCurrency(emp.revenueGenerated)}
                    </td>
                    <td className="p-3 text-right">{emp.conversionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employees.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                No performance data for this period
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
