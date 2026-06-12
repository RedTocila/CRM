"use client";

import { useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationsBell } from "@/components/tenant/notifications-bell";

interface TenantHeaderProps {
  companyName: string;
}

export function TenantHeader({ companyName }: TenantHeaderProps) {
  const { data: session } = useSession();
  const initials = (session?.user?.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur-md px-6">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {session?.user?.isSuperAdmin ? "Super Admin · Workspace" : "Workspace"}
        </p>
        <p className="text-sm font-semibold">{companyName}</p>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationsBell />
        <div className="flex items-center gap-2 rounded-lg border bg-background pl-1 pr-3 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium leading-none">{session?.user?.name ?? "User"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{session?.user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
