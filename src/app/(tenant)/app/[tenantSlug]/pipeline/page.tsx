import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { PipelineManager } from "@/components/pipeline/pipeline-manager";

const ADMIN_ROLES = new Set(["owner", "admin"]);

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await auth();
  const isAdmin =
    session?.user?.isSuperAdmin || ADMIN_ROLES.has(session?.user?.roleSlug ?? "");

  if (!isAdmin) {
    redirect(`/app/${tenantSlug}/leads/kanban`);
  }

  return <PipelineManager />;
}
