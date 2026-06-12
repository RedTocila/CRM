import { AgentHub } from "@/components/agents/agent-hub";

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <AgentHub userId={userId} />;
}
