"use client";

import { Badge } from "@/components/ui/badge";
import { cn, formatLabel } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string } & Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string } & Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No records found",
}: DataTableProps<T>) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-dashed p-16 text-center">
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3.5">
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const label = formatLabel(status, "Unknown");
  const normalized = label.toUpperCase();
  const variant =
    normalized === "ACTIVE" || normalized === "WON" || normalized === "DONE" || normalized === "RESOLVED" || normalized === "QUALIFIED" || normalized === "CONVERTED" || normalized === "PAID" || normalized === "PROPOSAL_SENT"
      ? "default"
      : normalized === "SUSPENDED" || normalized === "LOST" || normalized === "CANCELLED" || normalized === "UNQUALIFIED" || normalized === "NOT_INTERESTED"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant} className="font-normal">{label}</Badge>;
}
