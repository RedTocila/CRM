"use client";

interface BarItem {
  label: string;
  value: number;
}

export function SimpleBarChart({ data, maxBars = 8 }: { data: BarItem[]; maxBars?: number }) {
  const items = data.slice(0, maxBars);
  const max = Math.max(...items.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="truncate pr-2">{item.label}</span>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
      )}
    </div>
  );
}
