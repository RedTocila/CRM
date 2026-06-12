import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-600",
  MEDIUM: "bg-blue-500/10 text-blue-600",
  HIGH: "bg-orange-500/10 text-orange-600",
  URGENT: "bg-red-500/10 text-red-600",
};

export function LeadPriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant="outline" className={cn("text-xs", COLORS[priority])}>
      {priority}
    </Badge>
  );
}
