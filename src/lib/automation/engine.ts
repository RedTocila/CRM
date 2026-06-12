import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitEvent, onEvent } from "@/lib/events/emitter";

interface AutomationTrigger {
  type: string;
  config?: Record<string, unknown>;
}

interface AutomationCondition {
  field: string;
  operator: string;
  value: unknown;
}

interface AutomationAction {
  type: string;
  config: Record<string, unknown>;
}

function evaluateConditions(
  conditions: AutomationCondition[],
  data: Record<string, unknown>
): boolean {
  if (!conditions.length) return true;
  return conditions.every((c) => {
    const val = data[c.field];
    switch (c.operator) {
      case "eq":
        return val === c.value;
      case "neq":
        return val !== c.value;
      case "contains":
        return String(val).includes(String(c.value));
      default:
        return true;
    }
  });
}

async function executeAction(
  action: AutomationAction,
  companyId: string,
  data: Record<string, unknown>
): Promise<void> {
  switch (action.type) {
    case "create_task":
      await prisma.task.create({
        data: {
          companyId,
          title: String(action.config.title ?? "Automated task"),
          description: action.config.description as string | undefined,
          createdById: String(action.config.userId ?? data.userId ?? ""),
          assigneeId: action.config.assigneeId as string | undefined,
        },
      });
      break;
    case "update_field": {
      const { entityType, entityId, field, value } = action.config as Record<string, string>;
      if (entityType === "lead" && entityId) {
        await prisma.lead.update({
          where: { id: entityId },
          data: { [field]: value },
        });
      }
      break;
    }
    case "webhook": {
      const url = action.config.url as string;
      if (url) {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, data }),
        });
      }
      break;
    }
    case "send_notification":
    case "send_email":
    case "assign_user":
      break;
  }
}

export async function runAutomation(
  automationId: string,
  triggerData: Record<string, unknown>
): Promise<void> {
  const automation = await prisma.automation.findUnique({ where: { id: automationId } });
  if (!automation?.isActive) return;

  const conditions = automation.conditions as unknown as AutomationCondition[];
  if (!evaluateConditions(conditions, triggerData)) return;

  const run = await prisma.automationRun.create({
    data: { automationId, status: "RUNNING", triggerData: triggerData as Prisma.InputJsonValue },
  });

  try {
    const actions = automation.actions as unknown as AutomationAction[];
    for (const action of actions) {
      await executeAction(action, automation.companyId, triggerData);
    }
    await prisma.automationRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  } catch (error) {
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
  }
}

export async function processAutomationsForEvent(
  event: string,
  companyId: string,
  data: Record<string, unknown>
): Promise<void> {
  const automations = await prisma.automation.findMany({
    where: { companyId, isActive: true },
  });

  for (const automation of automations) {
    const trigger = automation.trigger as unknown as AutomationTrigger;
    if (trigger.type === event) {
      await runAutomation(automation.id, data);
    }
  }
}

export function initAutomationListeners(): void {
  const events = ["lead.created", "lead.updated", "deal.moved", "task.completed", "form.submitted"];
  for (const event of events) {
    onEvent(event, async (payload) => {
      const companyId = payload.companyId as string;
      if (companyId) {
        await processAutomationsForEvent(event, companyId, payload);
      }
    });
  }
}

void emitEvent;
