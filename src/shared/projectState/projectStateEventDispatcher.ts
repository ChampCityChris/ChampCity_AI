import type { ProjectId } from "./domainContracts";
import type { ProjectStateOutboxDeliveryPort, ProjectStateOutboxEvent } from "./projectStateStore";
import { ProjectStateStoreError } from "./projectStateStore";

/** A sink must treat event.id as its idempotency key; delivery is at least once. */
export interface ProjectStateEventSink {
  deliver(event: ProjectStateOutboxEvent): Promise<void>;
}

export function createProjectStateEventDispatcher(outbox: ProjectStateOutboxDeliveryPort, sink: ProjectStateEventSink) {
  let dispatchTail: Promise<void> = Promise.resolve();
  return {
    async dispatch(projectId: ProjectId, limit = 100): Promise<string[]> {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new ProjectStateStoreError("INVALID_STATE", "Outbox dispatch limit must be between 1 and 100.");
      let release!: () => void;
      const prior = dispatchTail;
      dispatchTail = new Promise<void>(resolve => { release = resolve; });
      await prior;
      try {
        const events = await outbox.listPendingOutbox(projectId, limit);
        const delivered: string[] = [];
        for (const event of events) {
          await sink.deliver(event);
          if (!await outbox.acknowledgeOutbox(projectId, event.id)) throw new ProjectStateStoreError("INVALID_STATE", "Committed outbox event disappeared before acknowledgment.");
          delivered.push(event.id);
        }
        return delivered;
      } finally { release(); }
    },
  };
}
