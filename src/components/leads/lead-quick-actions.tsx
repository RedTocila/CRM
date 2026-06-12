"use client";

import { Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LeadQuickActionsProps {
  tenantSlug: string;
  leadId: string;
  phone?: string | null;
  email?: string | null;
  size?: "sm" | "default" | "icon";
  onLogged?: () => void;
}

async function logCall(tenantSlug: string, leadId: string) {
  await fetch(`/api/v1/${tenantSlug}/leads/${leadId}/calls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ duration: 0, outcome: "Outbound call initiated", notes: "Call started from CRM" }),
  });
}

async function logEmail(tenantSlug: string, leadId: string, subject: string) {
  await fetch(`/api/v1/${tenantSlug}/leads/${leadId}/emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject }),
  });
}

export function LeadQuickActions({
  tenantSlug,
  leadId,
  phone,
  email,
  size = "sm",
  onLogged,
}: LeadQuickActionsProps) {
  const handleCall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!phone) {
      toast.error("No phone number on this lead");
      return;
    }
    try {
      await logCall(tenantSlug, leadId);
      onLogged?.();
    } catch {
      /* still open dialer */
    }
    window.location.href = `tel:${phone.replace(/\s/g, "")}`;
  };

  const handleEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!email) {
      toast.error("No email on this lead");
      return;
    }
    try {
      await logEmail(tenantSlug, leadId, `Email to ${email}`);
      onLogged?.();
    } catch {
      /* still open mail client */
    }
    window.location.href = `mailto:${email}`;
  };

  if (size === "icon") {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={!phone}
          onClick={handleCall}
          title={phone ? `Call ${phone}` : "No phone"}
        >
          <Phone className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={!email}
          onClick={handleEmail}
          title={email ? `Email ${email}` : "No email"}
        >
          <Mail className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={!phone}
        onClick={handleCall}
      >
        <Phone className="h-4 w-4 mr-1" /> Call
      </Button>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={!email}
        onClick={handleEmail}
      >
        <Mail className="h-4 w-4 mr-1" /> Email
      </Button>
    </div>
  );
}
