"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CreditCard, LayoutDashboard, LogOut, Package, Shield } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const nav = [
  { href: "/super-admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/super-admin/companies", label: "Companies", icon: Building2 },
  { href: "/super-admin/plans", label: "Plans", icon: CreditCard },
  { href: "/super-admin/modules", label: "Modules", icon: Package },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        router.push(href);
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative z-10 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-sidebar-accent/15 text-sidebar-accent-foreground"
          : "text-sidebar-muted hover:bg-sidebar-accent/8 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 pointer-events-none" />
      <span className="pointer-events-none">{label}</span>
    </Link>
  );
}

export function SuperAdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="relative z-20 flex w-[272px] flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-accent text-white shadow-md">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Super Admin</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-muted">Platform</p>
        </div>
      </div>

      <nav className="relative z-10 flex-1 space-y-0.5 overflow-y-auto p-3">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/80">
          Management
        </p>
        {nav.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href, item.exact)}
          />
        ))}
      </nav>

      <div className="relative z-10 space-y-0.5 border-t border-sidebar-border p-3">
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
