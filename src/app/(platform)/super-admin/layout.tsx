import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { Building2, CreditCard, LayoutDashboard, LogOut, Package, Shield } from "lucide-react";
import { signOut } from "@/lib/auth/signout";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const nav = [
  { href: "/super-admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/super-admin/companies", label: "Companies", icon: Building2 },
  { href: "/super-admin/plans", label: "Plans", icon: CreditCard },
  { href: "/super-admin/modules", label: "Modules", icon: Package },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) redirect("/login");

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-[272px] flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-accent text-white shadow-md">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Super Admin</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-muted">Platform</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/80">
            Management
          </p>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent/8 hover:text-sidebar-foreground transition-all"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/80">
            Templates
          </p>
          <Link
            href="/templates"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent/8 hover:text-sidebar-foreground transition-all"
          >
            <Package className="h-4 w-4" />
            CRM Templates
          </Link>
        </nav>

        <div className="space-y-0.5 border-t border-sidebar-border p-3">
          <ThemeToggle variant="sidebar" />
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent/8 hover:text-sidebar-foreground transition-all"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
