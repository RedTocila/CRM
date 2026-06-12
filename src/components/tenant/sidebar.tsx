"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Bot,
  Sparkles,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import * as Icons from "lucide-react";
import { cn, getModulePath } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export interface NavModule {
  id: string;
  name: string;
  icon: string;
  category: string;
  routes: { path: string; label: string }[];
}

interface TenantSidebarProps {
  tenantSlug: string;
  modules: NavModule[];
  companyName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

function getIcon(name: string): LucideIcon {
  const icon = (Icons as unknown as Record<string, LucideIcon>)[name];
  return icon ?? LayoutDashboard;
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-sidebar-accent/15 text-sidebar-accent-foreground"
          : "text-sidebar-muted hover:bg-sidebar-accent/8 hover:text-sidebar-foreground"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-accent" />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground"
        )}
      />
      <span className="truncate">{label}</span>
      {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
    </Link>
  );
}

export function TenantSidebar({
  tenantSlug,
  modules,
  companyName,
  logoUrl,
  primaryColor,
}: TenantSidebarProps) {
  const pathname = usePathname();
  const base = `/app/${tenantSlug}`;

  const isActive = (href: string) =>
    href === base ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);

  const sorted = [...modules].sort((a, b) => {
    const order = ["dashboard", "leads", "agents", "pipeline", "marketing", "email_campaigns", "forms", "ai_assistant", "team", "reports"];
    return order.indexOf(a.id) - order.indexOf(b.id);
  });

  return (
    <aside className="flex h-full w-[272px] flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName} className="h-10 w-10 rounded-xl object-cover ring-1 ring-sidebar-border" />
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md"
            style={{ backgroundColor: primaryColor ?? "hsl(var(--sidebar-accent))" }}
          >
            {companyName[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{companyName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-muted">
            <Sparkles className="h-3 w-3" />
            Workspace
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/80">
          Menu
        </p>
        {sorted.map((mod) => {
          const Icon = getIcon(mod.icon);
          const path = getModulePath(mod);
          const href = path ? `${base}${path}` : base;
          return (
            <NavLink
              key={mod.id}
              href={href}
              icon={Icon}
              label={mod.name}
              active={isActive(href)}
            />
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border p-3">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/80">
          Account
        </p>
        <NavLink
          href={`${base}/settings`}
          icon={Settings}
          label="Settings"
          active={isActive(`${base}/settings`)}
        />
        <ThemeToggle variant="sidebar" />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent/8 hover:text-sidebar-foreground transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function AiAssistantButton({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname();
  if (pathname.includes("/ai")) return null;
  return (
    <Link
      href={`/app/${tenantSlug}/ai`}
      className="fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:scale-105 hover:shadow-primary/35"
    >
      <Bot className="h-5 w-5" />
      <span className="text-sm font-medium">AI Assistant</span>
    </Link>
  );
}
