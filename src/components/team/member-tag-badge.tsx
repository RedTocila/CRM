import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TAG_STYLES: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  AGENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  DEVELOPER: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  MANAGER: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
};

export function MemberTagBadge({
  tag,
  className,
}: {
  tag?: string | null;
  className?: string;
}) {
  if (!tag) return null;
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", TAG_STYLES[tag], className)}>
      {tag.charAt(0) + tag.slice(1).toLowerCase()}
    </Badge>
  );
}
