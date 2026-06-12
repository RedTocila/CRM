type EventHandler = (payload: Record<string, unknown>) => Promise<void> | void;

const handlers = new Map<string, EventHandler[]>();

export function onEvent(event: string, handler: EventHandler): void {
  const list = handlers.get(event) ?? [];
  list.push(handler);
  handlers.set(event, list);
}

export async function emitEvent(
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const list = handlers.get(event) ?? [];
  await Promise.allSettled(list.map((h) => h(payload)));
}

export const AUTOMATION_TRIGGERS = {
  LEAD_CREATED: "lead.created",
  LEAD_UPDATED: "lead.updated",
  DEAL_MOVED: "deal.moved",
  TASK_COMPLETED: "task.completed",
  FORM_SUBMITTED: "form.submitted",
} as const;
