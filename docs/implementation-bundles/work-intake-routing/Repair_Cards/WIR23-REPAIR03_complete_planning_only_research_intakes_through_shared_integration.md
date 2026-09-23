# WIR23-REPAIR03 — Complete Planning-Only Research Through Shared Integration

**Type:** Repair Plan / decomposition artifact  
**Parent:** WIR23 Architect Review  
**Status:** Decomposed for Implementer Reasoning Reduction experiment

## Defect

An approved Research outcome may correctly declare `no-implementation-plan-required`, but current workflow stops at `researchClosed`.

There is no durable Research completion checkpoint and the integration stack assumes every candidate owns a completed Plan.

The repair must not manufacture a fake Plan, Work Item, Phase, acceptance record, or production implementation merely to enter integration.

## Architectural decision

Integration operates on **completion evidence**, not intrinsically on Plans.

Introduce one explicit completion contract used by the candidate layer:

- `kind: "plan" | "research"`
- stable route decision identity;
- stable completion identity;
- completion revision;
- deterministic completion fingerprint;
- canonical completion source path.

Plan execution remains one producer of completion evidence. Approved no-plan Research becomes a second producer.

## Ordered child cards

1. **WIR23-REPAIR03A** — establish Research completion identity and lifecycle checkpoint.
2. **WIR23-REPAIR03B** — migrate IntegrationCandidate and Integration Repair from Plan-specific fields to generic completion evidence while preserving Plan behavior.
3. **WIR23-REPAIR03C** — expose Research completion through routed integration and UI, checkpointing before candidate construction and advancing the normal integration target after validation.

Do not combine these cards in one Implementer session.

## End state

Approved no-plan Research can:

Research assessment approved
→ deterministic Research completion resolved
→ accepted Research evidence checkpointed on the Work Intake branch
→ generic IntegrationCandidate constructed against current target
→ existing target-owned integration validation executed
→ target advanced only after passing validation
→ no Plan/Work Item/Phase manufactured.

Research requiring a Plan remains on the existing Plan workflow.
