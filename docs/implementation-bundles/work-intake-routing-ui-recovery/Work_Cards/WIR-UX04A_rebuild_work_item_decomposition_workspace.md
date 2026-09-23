# WIR-UX04A — Rebuild Work Item Decomposition as an Architect Workspace

**Status:** IMPLEMENTER_READY  
**Depends on:** WIR-UX03  
**Type:** Contextual planning UX repair

## Objective

Replace the hidden `<details>` decomposition panel with a first-class contextual Architect Workspace that follows the same handoff, document, and Operator review model as other Architect-backed work.

## Governing invariant

Decomposition is an exceptional planning correction, not an advanced inline form hidden under the approved Plan.

It may alter the approved Plan only through the existing explicit Operator acceptance/revision service.

## Exact implementation

Create:

`src/renderer/app/WorkItemDecompositionWorkspace.tsx`

The Workspace is opened from the selected Work Item in Work Item Map/Planning and carries:

- intakeId;
- selected workItemId;
- return target.

It is not a permanent top-level routed stage and does not create a new durable workflow identity.

### Layout

Use `DocumentChatWorkspaceShell`.

Document column:

- approved Plan supporting tab;
- current decomposition proposal primary tab when present;
- readable sibling/direct-to-phased proposal;
- evidence/rationale;
- resulting structure preview;
- explicit Accept Plan Change / Request Revised Proposal disposition.

Architect column:

- embedded ChatGPT;
- Prepare Handoff;
- Copy Handoff;
- Refresh;
- Reload ChatGPT.

### Completion

On accepted decomposition:

- refresh the approved Plan;
- return to Work Item Map;
- select `resumeWorkItemId`;
- show bounded feedback explaining that the original candidate was superseded.

On revision request:

- remain in decomposition workspace;
- enable revised handoff.

### Retire old panel

Delete or retire `WorkItemDecompositionPanel.tsx`.

No `<details>` decomposition interaction remains in Plan or execution screens.

## Bounded continuation

If the current work-item map card is not yet implemented when this card runs sequentially, provide the open/return callback contract expected by WIR-UX05A and expose a temporary Plan-level "Review decomposition" action. Do not stop.

## Validation

Prove:

- decomposition workspace mounts embedded Architect;
- proposal is document content, not raw JSON;
- accepted proposal returns `resumeWorkItemId`;
- request revision preserves proposal context;
- Plan approval itself is not changed by merely opening decomposition.

Use the existing decomposition service tests for domain behavior; add only renderer interaction proof needed for the Workspace.
