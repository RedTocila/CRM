import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { SuperAdminSidebar } from "@/components/platform/super-admin-sidebar";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) redirect("/login");

  return (
    <div className="flex h-screen bg-background">
      <SuperAdminSidebar />
      <main className="relative z-0 flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
