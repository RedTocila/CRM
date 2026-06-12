import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/leads/constants";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  CONTACTED: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  QUALIFIED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  PROPOSAL_SENT: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  NEGOTIATION: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  WON: "bg-green-500/15 text-green-700 dark:text-green-300",
  LOST: "bg-red-500/15 text-red-700 dark:text-red-300",
  NOT_INTERESTED: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  FOLLOW_UP_NEEDED: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
};

export function LeadStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <Badge variant="secondary" className={cn("font-medium", STATUS_COLORS[status])}>
      {label}
    </Badge>
  );
}
